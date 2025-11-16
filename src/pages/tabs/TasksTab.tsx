import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type {
  Task,
  TaskRun,
  TaskMessage,
  FineTuneJob,
  FineTuneRequest
} from "../../api/types";
import { PrepareModelModal } from "./PrepareModelModal";

type Props = {
  projectId: number;
};

export const TasksTab: React.FC<Props> = ({ projectId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeRun, setActiveRun] = useState<TaskRun | null>(null);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streamWarning, setStreamWarning] = useState<string | null>(null);
  const [fineTunes, setFineTunes] = useState<FineTuneJob[]>([]);
  const [fineTunesLoading, setFineTunesLoading] = useState(false);
  const [fineTunesError, setFineTunesError] = useState<string | null>(null);
  const [prepareModalOpen, setPrepareModalOpen] = useState(false);

  const selected = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const loadTasks = () => {
    setLoading(true);
    api
      .listTasks(projectId)
      .then((rows) => {
        setTasks(rows);
        setSelectedTaskId((prev) => {
          if (prev && rows.some((task) => task.id === prev)) {
            return prev;
          }
          return rows[0]?.id ?? null;
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!selected?.id) {
      setFineTunes([]);
      setActiveRun(null);
      setMessages([]);
      setPrepareModalOpen(false);
      return;
    }
    let canceled = false;
    (async () => {
      const records = await loadFineTunes(selected.id);
      if (canceled) return;
      await ensureRunAndLoadChat(selected.id, records);
    })();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const ensureRunAndLoadChat = async (
    taskId: number,
    records?: FineTuneJob[]
  ) => {
    if (!selected || selected.id !== taskId) return;
    setChatError(null);
    const fineTuneRecords = records ?? fineTunes;
    if (selected.active_fine_tune_id) {
      const record = fineTuneRecords.find(
        (row) => row.id === selected.active_fine_tune_id
      );
      if (!record) {
        setChatError("Fine-tune metadata missing. Reload the task and try again.");
        setActiveRun(null);
        setMessages([]);
        return;
      }
      if (record.status !== "succeeded") {
        setChatError(
          `Fine-tuned model ${record.target_model} is ${record.status}. Wait until it succeeds before opening chat.`
        );
        setActiveRun(null);
        setMessages([]);
        return;
      }
    }
    setChatLoading(true);
    try {
      const runs = await api.listRuns(projectId, taskId);
      let run: TaskRun;
      if (runs.length > 0) {
        run = [...runs].sort(
          (a, b) =>
            new Date(b.started_at).getTime() -
            new Date(a.started_at).getTime()
        )[0];
        const desiredModel = selected.active_model ?? null;
        if (run.model !== desiredModel) {
          run = await api.startRunForTask(projectId, taskId);
        }
      } else {
        run = await api.startRunForTask(projectId, taskId);
      }
      setActiveRun(run);
      const msgs = await api.listMessages(run.id);
      setMessages(msgs);
    } catch (err: any) {
      setChatError(err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    const ok = window.confirm(
      `Delete task "${task.title}" and its runs/messages?`
    );
    if (!ok) return;

    try {
      await api.deleteTask(projectId, task.id);
      // If the deleted task is selected, clear selection
      if (selected?.id === task.id) {
        setSelectedTaskId(null);
        setActiveRun(null);
        setMessages([]);
      }
      loadTasks();
    } catch (err: any) {
      alert(`Failed to delete task: ${err.message}`);
    }
  };

  const loadFineTunes = async (
    taskId: number,
    options: { silent?: boolean } = {}
  ): Promise<FineTuneJob[]> => {
    if (!options.silent) {
      setFineTunesLoading(true);
      setFineTunesError(null);
    }
    try {
      const rows = await api.listFineTunes(projectId, taskId);
      setFineTunes(rows);
      return rows;
    } catch (err: any) {
      if (!options.silent) {
        setFineTunesError(err.message);
      }
      return [];
    } finally {
      if (!options.silent) {
        setFineTunesLoading(false);
      }
    }
  };


  const handleSelectTask = (task: Task) => {
    setSelectedTaskId(task.id);
  };

  const handleStartFineTune = async (payload: FineTuneRequest) => {
    if (!selected?.id) {
      throw new Error("Select a task before starting a fine-tune.");
    }
    await api.createFineTune(projectId, selected.id, payload);
    await loadFineTunes(selected.id);
  };

  const handleActivateFineTune = async (fineTuneId: string) => {
    if (!selected?.id) {
      throw new Error("Select a task before choosing a fine-tune.");
    }
    try {
      const updated = await api.updateTask(projectId, selected.id, {
        active_fine_tune_id: fineTuneId
      });
      setTasks((prev) =>
        prev.map((task) => (task.id === updated.id ? updated : task))
      );
      await ensureRunAndLoadChat(updated.id);
    } catch (err: any) {
      setFineTunesError(err.message);
      throw err;
    }
  };

  const hasPendingFineTune = useMemo(
    () =>
      fineTunes.some((ft) => !["succeeded", "failed"].includes(ft.status)),
    [fineTunes]
  );

  const activeFineTune = selected?.active_fine_tune_id
    ? fineTunes.find((ft) => ft.id === selected.active_fine_tune_id)
    : null;

  const defaultTargetModel = useMemo(() => {
    if (!selected) return "task-fine-tune";
    const slug = selected.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    return `${slug || "task"}-ft-${selected.id}`;
  }, [selected?.id, selected?.title]);

  useEffect(() => {
    if (!selected?.id || !hasPendingFineTune) {
      return;
    }
    const timer = setInterval(() => {
      loadFineTunes(selected.id, { silent: true });
    }, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, hasPendingFineTune]);

  //3.- Keep the split view in sync with the backend via SSE.
  useEffect(() => {
    if (!activeRun?.id) {
      setStreamWarning(null);
      return;
    }
    setStreamWarning(null);
    const unsubscribe = api.subscribeToMessages(activeRun.id, {
      onSnapshot: (msgs) => {
        setStreamWarning(null);
        setMessages(msgs);
      },
      onMessage: (msg) => {
        setStreamWarning(null);
        setMessages((prev) => {
          const index = prev.findIndex((item) => item.id === msg.id);
          if (index >= 0) {
            const clone = [...prev];
            clone[index] = msg;
            return clone;
          }
          return [...prev, msg];
        });
      },
      onError: () =>
        setStreamWarning(
          "Live updates temporarily paused. We will retry automatically."
        )
    });
    return () => unsubscribe();
  }, [activeRun?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeRun) return;
    setChatSending(true);
    setChatError(null);
    try {
      await api.createMessage(activeRun.id, {
        role: "user",
        content: input
      });
      setInput("");
    } catch (err: any) {
      setChatError(err.message);
    } finally {
      setChatSending(false);
    }
  };

  //1.- Track the keyboard keys that should activate the row.
  const activationKeys = new Set(["Enter", " "]);

  //2.- Provide keyboard support for the row semantics.
  const handleTaskKeyDown = (event: React.KeyboardEvent, task: Task) => {
    if (activationKeys.has(event.key)) {
      event.preventDefault();
      handleSelectTask(task);
    }
  };

  return (
    <>
      <div className="flex h-full">
        {/* Left column: task list */}
        <div className="w-[320px] border-r border-borderSoft bg-listBg flex flex-col">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-textMain">
            Tasks ({tasks.length})
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 text-xs">
          {loading && (
            <div className="text-textMuted text-sm px-2">Loading tasks…</div>
          )}
          {error && (
            <div className="text-danger text-xs px-2 mb-1">Error: {error}</div>
          )}
          {tasks.map((task) => {
            const isActive = selected?.id === task.id;
            return (
              <article
                key={task.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                data-testid={`task-row-${task.id}`}
                onClick={() => handleSelectTask(task)}
                onKeyDown={(event) => handleTaskKeyDown(event, task)}
                className={[
                  "w-full text-left rounded-xl px-3 py-2.5 border transition-colors",
                  isActive
                    ? "bg-accentSoft border-accent/30 shadow-sm"
                    : "bg-listBg border-transparent hover:bg-appBg",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
                ].join(" ")}
              >
              <div className="flex justify-between items-center mb-1">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-textMain">
                    {task.title}
                  </span>
                  <span className="text-[11px] text-textSoft capitalize">
                    {task.status}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${task.title}`}
                  className="ml-2 text-[11px] text-danger hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                  onClick={(e) => {
                    e.stopPropagation(); // don't select task when clicking delete
                    handleDeleteTask(task);
                  }}
                >
                  Delete
                </button>
              </div>
                {task.description && (
                  <p className="text-[11px] text-textMuted line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-1 text-[11px] text-textSoft2">
                  {typeof task.runs_count === "number" && (
                    <span className="px-2 py-0.5 rounded-full bg-chipBg">
                      {task.runs_count} runs
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-appBg">
                    Priority {task.priority}
                  </span>
                </div>
              </article>
            );
          })}

          {!loading && tasks.length === 0 && (
            <div className="text-textMuted text-sm px-2">
              No tasks yet. Use “New task” in the project header to create one.
            </div>
          )}
        </div>
      </div>

      {/* Right column: chat workspace */}
      <div className="flex-1 flex flex-col bg-sidebarBg/50">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-6 pt-4 pb-3 border-b border-borderSoft flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-textMain">
                    {selected.title}
                  </span>
                  {activeRun && (
                    <>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted">
                        Run #{activeRun.id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-appBg text-textMuted capitalize">
                        {activeRun.status}
                      </span>
                    </>
                  )}
                </div>
                {selected.description && (
                  <p className="text-[11px] text-textMuted max-w-xl">
                    {selected.description}
                  </p>
                )}
                <div className="mt-3 space-y-1 text-[11px]">
                  <p className="text-textSoft2">
                    Current model: <span className="text-textMain">{selected.active_model ?? "Workspace default"}</span>
                  </p>
                  {activeFineTune && (
                    <p className="text-textSoft2">
                      Fine-tune status: <span className="text-textMain capitalize">{activeFineTune.status}</span>
                    </p>
                  )}
                  {fineTunesError && (
                    <p className="text-danger">{fineTunesError}</p>
                  )}
                </div>
                {fineTunes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fineTunes.slice(0, 3).map((job) => (
                      <span
                        key={job.id}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-appBg text-textSoft capitalize"
                      >
                        {job.target_model}: {job.status}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {fineTunesLoading && (
                  <span className="text-[11px] text-textSoft2">Syncing fine-tunes…</span>
                )}
                <button
                  type="button"
                  className="text-xs rounded-full border border-borderSoft px-3 py-1 hover:bg-appBg"
                  onClick={() => setPrepareModalOpen(true)}
                >
                  Prepare model
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-sidebarBg/60">
              <div className="max-w-3xl mx-auto">
                {chatLoading && (
                  <div className="text-textMuted text-xs mb-2">
                    Loading chat…
                  </div>
                )}
                {chatError && (
                  <div className="text-danger text-xs mb-2">{chatError}</div>
                )}
                {streamWarning && (
                  <div className="text-xs text-orange-500 mb-2">{streamWarning}</div>
                )}
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
                    <div key={m.id} className={`flex ${alignClasses} mb-2`}>
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
                {!chatLoading && messages.length === 0 && (
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
              <div className="mx-auto flex items-center gap-2">
                <textarea
                  className="flex-1 rounded-2xl bg-appBg border border-borderSoft px-3 py-2 text-xs text-textMain placeholder:text-textSoft2 min-h-[44px] max-h-32 focus:outline-none focus:border-accent"
                  placeholder="Discuss this task with the model, suggest changes, or ask for next steps…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={chatSending || !activeRun}
                  className="rounded-full bg-accent text-white text-sm px-4 py-2 h-[40px] hover:bg-accentHover"
                >
                  {chatSending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-textMuted">
            Select a task on the left to open the chat workspace.
          </div>
        )}
      </div>
      </div>
      <PrepareModelModal
        open={Boolean(prepareModalOpen && selected)}
        onClose={() => setPrepareModalOpen(false)}
        fineTunes={fineTunes}
        onStart={handleStartFineTune}
        onActivate={handleActivateFineTune}
        activeFineTuneId={selected?.active_fine_tune_id ?? null}
        defaultBaseModel={selected?.active_model ?? "llama3.1"}
        defaultTargetModel={defaultTargetModel}
      />
    </>
  );
};
