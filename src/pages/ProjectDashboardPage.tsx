import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Project, Task } from "../api/types";
import { TasksTab } from "./tabs/TasksTab";
import { GroupsTab } from "./tabs/GroupsTab";
import { RunsTab } from "./tabs/RunsTab";

type Mode = "view" | "create";

export const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("view"); // start in create mode
  const navigate = useNavigate();
  const location = useLocation();

  const id = Number(projectId);

  useEffect(() => {
    api
      .getProject(id)
      .then(setProject)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const currentTab =
    new URLSearchParams(location.search).get("tab") ?? "tasks";

  const setTab = (tab: string) => {
    const params = new URLSearchParams(location.search);
    params.set("tab", tab);
    navigate({ pathname: location.pathname, search: params.toString() });
  };

  const openNewTask = () => {
    setTab("tasks");
    setMode("create");
  };

  const closeNewTask = () => {
    setMode("view");
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    const ok = window.confirm(
      `Delete project "${project.title}" and all its tasks, groups and runs?`
    );
    if (!ok) return;

    try {
      await api.deleteProject(id);
      navigate("/"); // back to project list
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };


  const handleTaskCreated = (_task: Task) => {
    // Task insertion worked; return to normal workspace.
    setMode("view");
    setTab("tasks");
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-textMuted">
        Loading project…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-danger">
        {error ?? "Project not found"}
      </div>
    );
  }

  return (
    <div className="flex h-full bg-appBg/60">
      <div className="m-4 flex-1 rounded-2xl bg-listBg shadow-card flex flex-col overflow-hidden">
        {mode === "create" ? (
          <>
            {/* Header for task creator mode */}
            <header className="px-6 pt-4 pb-3 border-b border-borderSoft flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-sm font-semibold text-textMain">
                    New task in {project.title}
                  </h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted">
                    Task basics
                  </span>
                </div>
                {project.description && (
                  <p className="text-[11px] text-textMuted max-w-xl">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
              <button
                className="rounded-full border border-danger/40 text-danger px-3 py-1 text-[11px] hover:bg-danger/5"
                onClick={handleDeleteProject}
              >
                Delete project
              </button>

                <button
                  className="rounded-full border border-borderSoft px-3 py-1 text-textMuted hover:bg-appBg"
                  onClick={closeNewTask}
                >
                  View workspace
                </button>
                <Link
                  to="/"
                  className="rounded-full border border-borderSoft px-3 py-1 text-textMuted hover:bg-appBg"
                >
                  Back to projects
                </Link>
              </div>
            </header>

            {/* Task basics fills the whole workspace area */}
            <div className="flex-1 overflow-hidden bg-sidebarBg/60">
              <div className="h-full overflow-y-auto px-6 py-4">
                <TaskBasicsCreator
                  projectId={id}
                  onCreated={handleTaskCreated}
                  onCancel={closeNewTask}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Normal project workspace header */}
            <header className="px-6 pt-4 pb-3 border-b border-borderSoft flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-sm font-semibold text-textMain">
                    {project.title}
                  </h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted">
                    Project #{project.id}
                  </span>
                </div>
                {project.description && (
                  <p className="text-[11px] text-textMuted max-w-xl">
                    {project.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
              <button
                className="rounded-full border border-danger/40 text-danger px-3 py-1 text-[11px] hover:bg-danger/5"
                onClick={handleDeleteProject}
              >
                Delete project
              </button>

                <button
                  className="rounded-full bg-accent text-white px-3 py-1 hover:bg-accentHover"
                  onClick={openNewTask}
                >
                  + New task
                </button>
                <button
                  className="rounded-full border border-borderSoft px-3 py-1 text-textMuted hover:bg-appBg"
                  onClick={() => navigate(`/projects/${projectId}/edit`)}
                >
                  Edit details
                </button>
                <Link
                  to="/"
                  className="rounded-full border border-borderSoft px-3 py-1 text-textMuted hover:bg-appBg"
                >
                  Back to projects
                </Link>
              </div>
            </header>

            {/* Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-borderSoft flex items-center gap-2 text-xs">
              <button
                onClick={() => setTab("tasks")}
                className={[
                  "px-3 py-1.5 rounded-full transition-colors",
                  currentTab === "tasks"
                    ? "bg-accent text-white shadow-sm"
                    : "bg-appBg text-textMuted hover:bg-accentSoft/60"
                ].join(" ")}
              >
                Tasks
              </button>
              <button
                onClick={() => setTab("groups")}
                className={[
                  "px-3 py-1.5 rounded-full transition-colors",
                  currentTab === "groups"
                    ? "bg-accent text-white shadow-sm"
                    : "bg-appBg text-textMuted hover:bg-accentSoft/60"
                ].join(" ")}
              >
                Task groups
              </button>
              <button
                onClick={() => setTab("runs")}
                className={[
                  "px-3 py-1.5 rounded-full transition-colors",
                  currentTab === "runs"
                    ? "bg-accent text-white shadow-sm"
                    : "bg-appBg text-textMuted hover:bg-accentSoft/60"
                ].join(" ")}
              >
                Runs / overview
              </button>
            </div>

            {/* Workspace content */}
            <div className="flex-1 overflow-hidden bg-sidebarBg/60">
              {currentTab === "tasks" && <TasksTab projectId={id} />}
              {currentTab === "groups" && <GroupsTab projectId={id} />}
              {currentTab === "runs" && <RunsTab projectId={id} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * TaskBasicsCreator
 * - Full-width "Task basics" section
 * - Only inserts the task; all logic is local to this component.
 */
type TaskBasicsCreatorProps = {
  projectId: number;
  onCreated(task: Task): void;
  onCancel(): void;
};

const TaskBasicsCreator: React.FC<TaskBasicsCreatorProps> = ({
  projectId,
  onCreated,
  onCancel
}) => {
  type StartScope = "task" | "group" | "project";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [creating, setCreating] = useState(false);
  const [creatingAndStarting, setCreatingAndStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [startingScope, setStartingScope] = useState<StartScope | null>(null);
  const [startFeedback, setStartFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  //1.- Load all project tasks so we can send the correct IDs to the backend when the user kicks off a discussion.
  useEffect(() => {
    setTasksLoading(true);
    setTasksError(null);
    api
      .listTasks(projectId)
      .then((rows) => setExistingTasks(rows))
      .catch((err) => setTasksError(err.message))
      .finally(() => setTasksLoading(false));
  }, [projectId]);

  const startTasks = async (taskIds: number[], scope: StartScope) => {
    if (taskIds.length === 0) return;
    setStartingScope(scope);
    setStartFeedback(null);
    try {
      await api.startTaskDiscussions(projectId, { taskIds, scope });
      const successMessage =
        scope === "project"
          ? "Whole project sent to the backend."
          : scope === "group"
          ? "Selected group of tasks was started."
          : "Task sent to the backend to begin the discussion.";
      setStartFeedback({ kind: "success", message: successMessage });
      if (scope !== "project") {
        setSelectedTaskIds([]);
      }
    } catch (err: any) {
      setStartFeedback({ kind: "error", message: err.message });
    } finally {
      setStartingScope(null);
    }
  };

  const createTask = async (shouldStartAfterCreate: boolean) => {
    if (!title.trim()) return;
    setError(null);
    if (shouldStartAfterCreate) {
      setCreatingAndStarting(true);
    } else {
      setCreating(true);
    }
    try {
      const task = await api.createTask(projectId, {
        title,
        description,
        status: "idle",
        priority
      });
      setExistingTasks((prev) => [...prev, task]);
      if (shouldStartAfterCreate) {
        await startTasks([task.id], "task");
      }
      onCreated(task);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
      setCreatingAndStarting(false);
    }
  };

  //2.- Separate submit handlers so we can create only or create-and-start with different buttons.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTask(false);
  };

  const handleCreateAndStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    await createTask(true);
  };

  const toggleSelectedTask = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  //3.- Helper to decide the scope label for the group-start button.
  const getSelectedScope = (): StartScope =>
    selectedTaskIds.length > 1 ? "group" : "task";

  return (
    <div>
      <h2 className="text-xs font-semibold text-textMain mb-2">Task basics</h2>
      <p className="text-[11px] text-textMuted mb-3">
        Define what this task should do. These basics are persisted; you can
        extend the settings later.
      </p>

      {error && (
        <div className="mb-2 text-[11px] text-danger">
          Failed to create task: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        <div className="space-y-1">
          <label className="text-[11px] text-textSoft2">Title</label>
          <input
            className="w-full rounded-full bg-appBg border border-borderSoft px-3 py-1.5 text-xs text-textMain placeholder:text-textSoft2 focus:outline-none focus:border-accent"
            placeholder="Implement login flow for the admin panel…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-textSoft2">Description</label>
          <textarea
            className="w-full rounded-2xl bg-appBg border border-borderSoft px-3 py-2 text-xs text-textMain placeholder:text-textSoft2 min-h-[80px] focus:outline-none focus:border-accent"
            placeholder="Describe what the model should deliver for this task. This is the main context used when you chat with the model."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-textSoft2">Priority</label>
            <select
              className="w-full rounded-full bg-appBg border border-borderSoft px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-accent"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              <option value={0}>0 – Normal</option>
              <option value={1}>1 – High</option>
              <option value={2}>2 – Critical</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-2 items-center">
          <button
            type="submit"
            disabled={creating || creatingAndStarting || !title.trim()}
            className="rounded-full bg-accent text-white text-sm px-4 py-1.5 hover:bg-accentHover disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create task"}
          </button>
          <button
            type="button"
            disabled={creating || creatingAndStarting || !title.trim()}
            className="rounded-full border border-borderSoft text-textMain text-sm px-4 py-1.5 hover:bg-appBg disabled:opacity-60"
            onClick={handleCreateAndStart}
          >
            {creatingAndStarting ? "Creating & starting…" : "Create & start now"}
          </button>
          <button
            type="button"
            className="text-[11px] text-textMuted hover:underline"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-3xl border border-borderSoft bg-listBg/60 px-4 py-4">
        <div className="flex flex-col gap-1 mb-3">
          <h3 className="text-xs font-semibold text-textMain">Start discussions</h3>
          <p className="text-[11px] text-textMuted">
            You can talk to the model as much as you want before pressing start.
            When you are ready, send one task, a group of tasks, or the whole project to the backend.
          </p>
        </div>
        <div className="border border-borderSoft rounded-2xl bg-appBg/60 max-h-48 overflow-y-auto">
          {tasksLoading && (
            <div className="px-3 py-2 text-[11px] text-textMuted">
              Loading tasks…
            </div>
          )}
          {tasksError && (
            <div className="px-3 py-2 text-[11px] text-danger">
              {tasksError}
            </div>
          )}
          {!tasksLoading && !tasksError && existingTasks.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-textMuted">
              No tasks yet. Your freshly created task will show up here.
            </div>
          )}
          {existingTasks.map((task) => (
            <label
              key={task.id}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-borderSoft/40 last:border-b-0 text-[11px] text-textMain"
            >
              <input
                type="checkbox"
                checked={selectedTaskIds.includes(task.id)}
                onChange={() => toggleSelectedTask(task.id)}
              />
              <span className="line-clamp-1">{task.title}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={
              startingScope !== null || selectedTaskIds.length === 0
            }
            className="rounded-full bg-accent text-white text-xs px-4 py-1.5 hover:bg-accentHover disabled:opacity-60"
            onClick={() => startTasks(selectedTaskIds, getSelectedScope())}
          >
            {startingScope === getSelectedScope()
              ? "Starting…"
              : selectedTaskIds.length > 1
              ? "Start selected group"
              : "Start selected task"}
          </button>
          <button
            type="button"
            disabled={startingScope === "project" || existingTasks.length === 0}
            className="rounded-full border border-borderSoft text-textMain text-xs px-4 py-1.5 hover:bg-appBg disabled:opacity-60"
            onClick={() => startTasks(existingTasks.map((task) => task.id), "project")}
          >
            {startingScope === "project" ? "Starting project…" : "Start whole project"}
          </button>
        </div>
        {startFeedback && (
          <p
            className={`mt-2 text-[11px] ${
              startFeedback.kind === "success" ? "text-green" : "text-danger"
            }`}
          >
            {startFeedback.message}
          </p>
        )}
      </div>
    </div>
  );
};

