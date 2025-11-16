const http = require("http");
const { URL } = require("url");
const { DataStore } = require("./store");
const { generateAssistantReply } = require("./ollamaClient");
const { runFineTuneJob } = require("./fineTuneJobs");
const { MessageStreamHub } = require("./sseHub");

const PORT = Number(process.env.PORT ?? 4000);
const store = new DataStore();
const hub = new MessageStreamHub();
const MAX_DATASET_LENGTH = Number(process.env.MAX_FINE_TUNE_DATASET ?? 50000);

//3.- Coordinate the asynchronous Ollama fine-tune workflow for each request.
const orchestrateFineTune = async ({ fineTune, datasetText, referenceUrl, task }) => {
  const safeText = datasetText?.slice(0, MAX_DATASET_LENGTH) ?? "";
  try {
    await runFineTuneJob({
      fineTune,
      datasetText: safeText,
      referenceUrl,
      taskTitle: task.title,
      onStage: (stage, message) => {
        store.updateFineTune(fineTune.id, { status: stage });
        store.appendFineTuneLog(fineTune.id, stage, message);
      }
    });
    store.updateFineTune(fineTune.id, {
      status: "succeeded",
      result_model: fineTune.target_model
    });
  } catch (err) {
    store.updateFineTune(fineTune.id, {
      status: "failed",
      error_message: err?.message ?? "Fine-tune failed"
    });
  }
};

//1.- Prepare a naive route table capable of decoding Express-style parameters.
const routes = [];
function addRoute(method, path, handler) {
  const keys = [];
  const pattern = path.replace(/:[^/]+/g, (segment) => {
    keys.push(segment.slice(1));
    return "([^/]+)";
  });
  const regex = new RegExp(`^${pattern}$`);
  routes.push({ method, regex, keys, handler });
}

//2.- Lightweight helpers for JSON handling and errors.
const sendJson = (res, status, data) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });

const applyCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
};

//4.- Register REST routes covering the UI surface.
addRoute("GET", "/projects", async ({ res }) => {
  sendJson(res, 200, store.listProjects());
});

addRoute("POST", "/projects", async ({ req, res }) => {
  const body = await readJson(req);
  const project = store.createProject(body);
  sendJson(res, 201, project);
});

addRoute("GET", "/projects/:projectId", async ({ res, params }) => {
  const project = store.getProject(params.projectId);
  sendJson(res, 200, project);
});

addRoute("PUT", "/projects/:projectId", async ({ req, res, params }) => {
  const body = await readJson(req);
  const project = store.updateProject(params.projectId, body);
  sendJson(res, 200, project);
});

addRoute("DELETE", "/projects/:projectId", async ({ res, params }) => {
  store.deleteProject(params.projectId);
  sendJson(res, 200, { success: true });
});

addRoute("GET", "/projects/:projectId/tasks", async ({ res, params }) => {
  sendJson(res, 200, store.listTasks(params.projectId));
});

addRoute("POST", "/projects/:projectId/tasks", async ({ req, res, params }) => {
  const body = await readJson(req);
  const task = store.createTask(params.projectId, body);
  sendJson(res, 201, task);
});

addRoute("GET", "/projects/:projectId/tasks/:taskId", async ({ res, params }) => {
  sendJson(res, 200, store.getTask(params.projectId, params.taskId));
});

addRoute("PUT", "/projects/:projectId/tasks/:taskId", async ({ req, res, params }) => {
  const body = await readJson(req);
  sendJson(res, 200, store.updateTask(params.projectId, params.taskId, body));
});

addRoute("DELETE", "/projects/:projectId/tasks/:taskId", async ({ res, params }) => {
  store.deleteTask(params.projectId, params.taskId);
  sendJson(res, 200, { success: true });
});

addRoute(
  "GET",
  "/projects/:projectId/tasks/:taskId/fine-tunes",
  async ({ res, params }) => {
    const rows = store.listFineTunes(params.projectId, params.taskId);
    sendJson(res, 200, rows);
  }
);

addRoute(
  "GET",
  "/projects/:projectId/tasks/:taskId/fine-tunes/:fineTuneId",
  async ({ res, params }) => {
    const row = store.getFineTune(
      params.projectId,
      params.taskId,
      params.fineTuneId
    );
    sendJson(res, 200, row);
  }
);

addRoute(
  "POST",
  "/projects/:projectId/tasks/:taskId/fine-tunes",
  async ({ req, res, params }) => {
    const body = await readJson(req);
    if (!body?.base_model || typeof body.base_model !== "string") {
      sendJson(res, 400, { error: "base_model is required" });
      return;
    }
    const datasetName =
      typeof body.dataset_name === "string" && body.dataset_name.trim()
        ? body.dataset_name.trim()
        : "Training dataset";
    const datasetText =
      typeof body.dataset_text === "string"
        ? body.dataset_text.slice(0, MAX_DATASET_LENGTH)
        : "";
    const referenceUrl =
      typeof body.reference_url === "string" && body.reference_url.trim()
        ? body.reference_url.trim()
        : null;
    if (!datasetText.trim() && !referenceUrl) {
      sendJson(res, 400, {
        error: "dataset_text or reference_url is required"
      });
      return;
    }
    const targetModel =
      typeof body.target_model === "string" && body.target_model.trim()
        ? body.target_model.trim()
        : `project${params.projectId}-task${params.taskId}-ft-${Date.now()}`;
    const fineTune = store.createFineTune(params.projectId, params.taskId, {
      base_model: body.base_model.trim(),
      target_model: targetModel,
      dataset_name: datasetName,
      reference_url: referenceUrl,
      dataset_preview: datasetText.slice(0, 2000)
    });
    const task = store.getTask(params.projectId, params.taskId);
    sendJson(res, 202, fineTune);
    orchestrateFineTune({
      fineTune,
      datasetText,
      referenceUrl,
      task
    }).catch((err) => {
      console.error("fine-tune orchestration error", err);
    });
  }
);

addRoute("GET", "/projects/:projectId/groups", async ({ res, params }) => {
  sendJson(res, 200, store.listGroups(params.projectId));
});

addRoute("POST", "/projects/:projectId/groups", async ({ req, res, params }) => {
  const group = store.createGroup(params.projectId, await readJson(req));
  sendJson(res, 201, group);
});

addRoute(
  "PUT",
  "/projects/:projectId/groups/:groupId",
  async ({ req, res, params }) => {
    const group = store.updateGroup(
      params.projectId,
      params.groupId,
      await readJson(req)
    );
    sendJson(res, 200, group);
  }
);

addRoute(
  "DELETE",
  "/projects/:projectId/groups/:groupId",
  async ({ res, params }) => {
    store.deleteGroup(params.projectId, params.groupId);
    sendJson(res, 200, { success: true });
  }
);

addRoute(
  "POST",
  "/projects/:projectId/groups/:groupId/tasks",
  async ({ req, res, params }) => {
    const body = await readJson(req);
    store.assignTasksToGroup(params.projectId, params.groupId, body.taskIds ?? []);
    sendJson(res, 200, { success: true });
  }
);

addRoute(
  "DELETE",
  "/projects/:projectId/groups/:groupId/tasks/:taskId",
  async ({ res, params }) => {
    store.removeTaskFromGroup(params.projectId, params.groupId, params.taskId);
    sendJson(res, 200, { success: true });
  }
);

addRoute(
  "GET",
  "/projects/:projectId/runs",
  async ({ res, params, query }) => {
    const taskId = query.get("taskId");
    const runs = store.listRuns(params.projectId, taskId ? Number(taskId) : undefined);
    sendJson(res, 200, runs);
  }
);

addRoute(
  "POST",
  "/projects/:projectId/runs/tasks/:taskId/start",
  async ({ res, params }) => {
    try {
      const run = store.startRunForTask(params.projectId, params.taskId);
      sendJson(res, 201, run);
    } catch (err) {
      err.statusCode = err.statusCode ?? 400;
      throw err;
    }
  }
);

addRoute(
  "PUT",
  "/projects/:projectId/runs/:runId",
  async ({ req, res, params }) => {
    const run = store.updateRun(
      params.projectId,
      params.runId,
      await readJson(req)
    );
    sendJson(res, 200, run);
  }
);

addRoute("GET", "/runs/:runId/messages", async ({ res, params }) => {
  sendJson(res, 200, store.listMessages(params.runId));
});

addRoute(
  "GET",
  "/runs/:runId/messages/stream",
  async ({ req, res, params }) => {
    store.listMessages(params.runId); // validate run id
    const stop = hub.register(params.runId, res);
    hub.sendSnapshot(params.runId, store.listMessages(params.runId), res);
    req.on("close", stop);
  }
);

addRoute("GET", "/projects/:projectId/tasks-as-code", async ({ res, params }) => {
  sendJson(res, 200, store.getTasksAsCode(params.projectId));
});

addRoute(
  "PUT",
  "/projects/:projectId/tasks-as-code",
  async ({ req, res, params }) => {
    const payload = await readJson(req);
    const result = store.updateTasksAsCode(params.projectId, payload);
    sendJson(res, 200, result);
  }
);

addRoute("POST", "/runs/:runId/messages", async ({ req, res, params }) => {
  const body = await readJson(req);
  if (!body?.content) {
    sendJson(res, 400, { error: "content is required" });
    return;
  }
  const runId = Number(params.runId);
  const userMessage = store.addMessage(runId, body.role ?? "user", body.content);
  hub.sendAppend(runId, userMessage);

  const context = store.getRunContext(runId);
  const history = [];
  if (context.project.base_prompt) {
    history.push({ role: "system", content: context.project.base_prompt });
  }
  if (context.task.task_prompt) {
    history.push({ role: "system", content: context.task.task_prompt });
  }
  context.messages.forEach((msg) => {
    history.push({ role: msg.role, content: msg.content });
  });

  const assistantText = await generateAssistantReply({
    history,
    model: context.run.model ?? context.task.active_model ?? undefined
  });
  const assistantMessage = store.addMessage(runId, "assistant", assistantText);
  hub.sendAppend(runId, assistantMessage);
  sendJson(res, 201, userMessage);
});

//5.- Spin up the HTTP server with CORS + routing support.
const server = http.createServer(async (req, res) => {
  try {
    applyCors(res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (!req.url) {
      sendJson(res, 400, { error: "Invalid request" });
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const route = routes.find(
      (entry) => entry.method === req.method && entry.regex.test(pathname)
    );

    if (!route) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const match = route.regex.exec(pathname);
    const params = {};
    route.keys.forEach((key, index) => {
      params[key] = match[index + 1];
    });

    await route.handler({ req, res, params, query: parsedUrl.searchParams });
  } catch (err) {
    console.error("server error", err);
    if (res.headersSent) {
      res.end();
      return;
    }
    sendJson(res, err?.statusCode ?? 500, { error: err?.message ?? "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`LLM backend listening on http://localhost:${PORT}`);
});
