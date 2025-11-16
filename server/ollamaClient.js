const { setTimeout: delay } = require("timers/promises");

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1";
const DEFAULT_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434/api/chat";
const DEFAULT_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? DEFAULT_URL.replace(/\/api\/chat$/, "");
const REQUEST_TIMEOUT = Number(process.env.OLLAMA_TIMEOUT ?? 120000);

//1.- Normalize message history into the shape expected by Ollama.
const toOllamaMessages = (history) =>
  history.map((msg) => ({ role: msg.role, content: msg.content }));

//2.- Parse the newline-delimited JSON stream emitted by Ollama.
async function readStreamLines(stream, onLine) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.trim()) continue;
      try {
        onLine(JSON.parse(part));
      } catch (err) {
        console.warn("ollamaClient: failed to parse chunk", err);
      }
    }
  }
  if (buffer.trim()) {
    try {
      onLine(JSON.parse(buffer));
    } catch (err) {
      console.warn("ollamaClient: failed to parse tail chunk", err);
    }
  }
}

//3.- Build a graceful fallback when the Ollama server is unavailable.
function buildFallbackMessage(history) {
  const lastUser = [...history]
    .reverse()
    .find((msg) => msg.role === "user")?.content;
  const base =
    "Ollama is unreachable right now, so this message was created locally.";
  if (!lastUser) return `${base} Ask me again once the model is online.`;
  return `${base} You asked: "${lastUser}"`; // keep the reply deterministic.
}

//4.- Execute the HTTP request and collect the assistant response.
async function generateAssistantReply({ history, model = DEFAULT_MODEL, url = DEFAULT_URL }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const body = JSON.stringify({
    model,
    messages: toOllamaMessages(history),
    stream: true
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama HTTP ${res.status}`);
    }

    let fullText = "";
    await readStreamLines(res.body, (chunk) => {
      const delta = chunk?.message?.content ?? chunk?.response ?? "";
      fullText += delta;
    });

    return fullText.trim() || buildFallbackMessage(history);
  } catch (error) {
    console.warn("ollamaClient: falling back due to", error?.message ?? error);
    return buildFallbackMessage(history);
  } finally {
    clearTimeout(timeout);
  }
}

//5.- Small helper for tests to simulate slow responses deterministically.
async function simulateReply(history) {
  await delay(250);
  return buildFallbackMessage(history);
}

//6.- Shared helper powering the create/pull/push APIs that all return NDJSON streams.
async function runStreamingJob(path, payload, onChunk) {
  const res = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok || !res.body) {
    throw new Error(`Ollama ${path} HTTP ${res.status}`);
  }
  await readStreamLines(res.body, (chunk) => {
    onChunk?.(chunk);
  });
}

//7.- Wrap the Ollama pull/create/push endpoints so fine-tune orchestration stays tidy.
async function pullModel(model, onChunk) {
  await runStreamingJob("/api/pull", { model }, onChunk);
}

async function createModel(model, modelfile, onChunk) {
  await runStreamingJob("/api/create", { model, modelfile }, onChunk);
}

async function pushModel(model, onChunk) {
  await runStreamingJob("/api/push", { model }, onChunk);
}

module.exports = {
  generateAssistantReply,
  simulateReply,
  pullModel,
  createModel,
  pushModel
};
