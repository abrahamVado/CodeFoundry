import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Task, TaskMessage, TaskRun } from "../api/types";

export const TaskChatPage: React.FC = () => {
  const { projectId, taskId, runId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [run, setRun] = useState<TaskRun | null>(null);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pid = Number(projectId);
  const tid = Number(taskId);
  const rid = Number(runId);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [taskData, runs, msgs] = await Promise.all([
          api.getTask(pid, tid),
          api.listRuns(pid, tid),
          api.listMessages(rid)
        ]);
        setTask(taskData);
        const theRun = runs.find((r) => r.id === rid) ?? null;
        setRun(theRun);
        setMessages(msgs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pid, tid, rid]);

  const refreshMessages = async () => {
    const msgs = await api.listMessages(rid);
    setMessages(msgs);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.createMessage(rid, { role: "user", content: input });
      setInput("");
      await refreshMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-textMuted">
        Loading chat…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <header className="px-6 py-3 border-b border-borderSoft bg-listBg">
          <span className="text-sm font-semibold text-textMain">
            Task chat
          </span>
        </header>
        <div className="flex-1 flex items-center justify-center text-sm text-danger">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-appBg/60">
      <div className="m-4 flex-1 rounded-2xl bg-listBg shadow-card flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 pt-4 pb-3 border-b border-borderSoft flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-textMain">
                {task?.title ?? `Task #${taskId}`}
              </span>
              {run && (
                <>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted">
                    Run #{run.id}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-appBg text-textMuted capitalize">
                    {run.status}
                  </span>
                </>
              )}
            </div>
            {task?.description && (
              <p className="text-[11px] text-textMuted max-w-xl">
                {task.description}
              </p>
            )}
          </div>
          <button
            className="rounded-full border border-borderSoft px-3 py-1 text-[11px] text-textMuted hover:bg-appBg"
            onClick={() => navigate(`/projects/${projectId}?tab=tasks`)}
          >
            Back to project
          </button>
        </header>

        {/* Content: messages + context */}
        <div className="flex flex-1 overflow-hidden bg-sidebarBg/60">
          {/* Messages */}
          <main className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 text-sm">
              <div className="max-w-3xl mx-auto">
                {messages.map((m) => {
                  const isUser = m.role === "user";
                  const isAssistant = m.role === "assistant";
                  const bubbleClasses = isUser
                    ? "bg-accent text-white rounded-2xl rounded-br-md ml-auto"
                    : isAssistant
                    ? "bg-listBg text-textMain rounded-2xl rounded-bl-md mr-auto border border-borderSoft"
                    : "bg-appBg text-textMuted rounded-2xl mx-auto border border-borderSoft/60";

                  const alignClasses = isUser
                    ? "items-end"
                    : isAssistant
                    ? "items-start"
                    : "items-center";

                  return (
                    <div
                      key={m.id}
                      className={`flex ${alignClasses} mb-2`}
                    >
                      <div
                        className={`max-w-[75%] px-3 py-2 shadow-sm ${bubbleClasses}`}
                      >
                        <div className="text-[10px] uppercase tracking-wide mb-1 opacity-70">
                          {m.role}
                        </div>
                        <div className="text-[12px] leading-relaxed whitespace-pre-wrap">
                          {m.content}
                        </div>
                        <div className="mt-1 text-[9px] opacity-60 text-right">
                          {new Date(m.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-xs text-textMuted">
                    No messages yet. Send your first instruction to the model.
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="border-t border-borderSoft px-6 py-3 bg-listBg"
            >
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <textarea
                  className="flex-1 rounded-2xl bg-appBg border border-borderSoft px-3 py-2 text-xs text-textMain placeholder:text-textSoft2 min-h-[44px] max-h-32 focus:outline-none focus:border-accent"
                  placeholder="Reply to the model, suggest changes, or ask for the next steps…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-green text-white text-xs px-4 py-2 h-[40px] hover:bg-accentHover"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
              {error && (
                <div className="max-w-3xl mx-auto text-[11px] text-danger mt-1">
                  {error}
                </div>
              )}
            </form>
          </main>

          {/* Right context column */}
          <aside className="w-72 border-l border-borderSoft bg-listBg px-5 py-4 text-xs">
            <h3 className="text-xs font-semibold text-textMain mb-2">
              Run details
            </h3>
            {run ? (
              <div className="space-y-1 text-[11px] text-textSoft2">
                <div className="flex justify-between">
                  <span>Started</span>
                  <span>{new Date(run.started_at).toLocaleString()}</span>
                </div>
                {run.finished_at && (
                  <div className="flex justify-between">
                    <span>Finished</span>
                    <span>{new Date(run.finished_at).toLocaleString()}</span>
                  </div>
                )}
                {run.run_summary && (
                  <div className="mt-2">
                    <div className="text-[11px] text-textSoft2 mb-1">
                      Summary
                    </div>
                    <p className="text-[11px] text-textMain whitespace-pre-wrap">
                      {run.run_summary}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-textMuted">
                This run has no extra metadata yet.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
