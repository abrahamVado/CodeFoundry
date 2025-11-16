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

  //1.- Stretch the dashboard canvas so charts and tables can use the full viewport height.
  return (
    <div className="flex h-full w-full bg-appBg/60 p-4 sm:p-6">
      <div className="flex-1 rounded-2xl bg-listBg shadow-card flex flex-col overflow-hidden">
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
                  onDeleteProject={handleDeleteProject}
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
  onDeleteProject?: () => void;
};

//1.- Collapsible helper keeps preview-only placeholder sections consistent.
type CollapsibleSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  children,
  defaultOpen = false
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-borderSoft bg-appBg/60">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-xs font-semibold text-textMain">{title}</p>
          <p className="text-[11px] text-textMuted">{description}</p>
        </div>
        <span
          className={[
            "text-[11px] text-textMuted transition-transform",
            open ? "rotate-180" : "rotate-0"
          ].join(" ")}
        >
          ˅
        </span>
      </button>
      {open && <div className="border-t border-borderSoft px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
};

const TaskBasicsCreator: React.FC<TaskBasicsCreatorProps> = ({
  projectId,
  onCreated,
  onCancel,
  onDeleteProject
}) => {
  //1.- Capture all callbacks from the dashboard so this component can focus on the form flow only.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //2.- Preview-only local state for upcoming configuration placeholders.
  const [modelPreset, setModelPreset] = useState("balanced");
  const [inputVariables, setInputVariables] = useState("user_id, workspace_plan");
  const [automationToggles, setAutomationToggles] = useState({
    autoStart: false,
    notifyOwner: true,
    autoArchive: false
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleCron, setScheduleCron] = useState("0 9 * * 1");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const task = await api.createTask(projectId, {
        title,
        description,
        status: "idle",
        priority
      });
      onCreated(task);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="">
      <div className="">
        <h2 className="text-xs font-semibold text-textMain mb-2">
          Task basics
        </h2>
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

          {/* //3.- Model preset placeholder so users can preview presets. */}
          <CollapsibleSection
            title="Model preset"
            description="Preview which model family you expect to assign later."
            defaultOpen
          >
            <div className="space-y-2">
              <select
                className="w-full rounded-full bg-sidebarBg border border-borderSoft px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-accent"
                value={modelPreset}
                onChange={(e) => setModelPreset(e.target.value)}
              >
                <option value="balanced">Balanced – GPT-4o mini</option>
                <option value="fast">Fast – GPT-3.5 turbo</option>
                <option value="quality">Quality – GPT-4 turbo</option>
              </select>
              <p className="text-[10px] text-textMuted">
                Coming soon: this preset will sync with the backend automatically. For now
                it only lives in this preview.
              </p>
              <button
                type="button"
                disabled
                className="rounded-full border border-borderSoft px-3 py-1 text-[11px] text-textMuted opacity-60 cursor-not-allowed"
              >
                Apply preset (coming soon)
              </button>
            </div>
          </CollapsibleSection>

          {/* //4.- Input variables placeholder so teams can plan dynamic values. */}
          <CollapsibleSection
            title="Input variables"
            description="Sketch the variables you expect to feed into the task prompts."
          >
            <div className="space-y-2">
              <textarea
                className="w-full rounded-2xl bg-sidebarBg border border-borderSoft px-3 py-2 text-xs text-textMain placeholder:text-textSoft2 focus:outline-none focus:border-accent"
                rows={3}
                value={inputVariables}
                onChange={(e) => setInputVariables(e.target.value)}
                placeholder="user_id, workspace_plan, beta_flag"
              />
              <p className="text-[10px] text-textMuted">
                Coming soon: define structured variables and validation. For now this field
                is stored only in local state for planning.
              </p>
              <button
                type="button"
                disabled
                className="rounded-full border border-borderSoft px-3 py-1 text-[11px] text-textMuted opacity-60 cursor-not-allowed"
              >
                Save variables (coming soon)
              </button>
            </div>
          </CollapsibleSection>

          {/* //5.- Automation toggles placeholder for future workflow switches. */}
          <CollapsibleSection
            title="Automation toggles"
            description="Preview which automations should be available for this task."
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-textMain">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-borderSoft text-accent"
                  checked={automationToggles.autoStart}
                  onChange={(e) =>
                    setAutomationToggles((prev) => ({
                      ...prev,
                      autoStart: e.target.checked
                    }))
                  }
                />
                Auto-run after creation
              </label>
              <label className="flex items-center gap-2 text-xs text-textMain">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-borderSoft text-accent"
                  checked={automationToggles.notifyOwner}
                  onChange={(e) =>
                    setAutomationToggles((prev) => ({
                      ...prev,
                      notifyOwner: e.target.checked
                    }))
                  }
                />
                Notify owner when finished
              </label>
              <label className="flex items-center gap-2 text-xs text-textMain">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-borderSoft text-accent"
                  checked={automationToggles.autoArchive}
                  onChange={(e) =>
                    setAutomationToggles((prev) => ({
                      ...prev,
                      autoArchive: e.target.checked
                    }))
                  }
                />
                Auto-archive successful runs
              </label>
              <p className="text-[10px] text-textMuted">
                These switches are preview-only today. They won&apos;t trigger backend
                automations until the feature ships.
              </p>
              <button
                type="button"
                disabled
                className="rounded-full border border-borderSoft px-3 py-1 text-[11px] text-textMuted opacity-60 cursor-not-allowed"
              >
                Apply automations (coming soon)
              </button>
            </div>
          </CollapsibleSection>

          {/* //6.- Scheduling placeholder to plan cadence before backend support. */}
          <CollapsibleSection
            title="Scheduling"
            description="Outline when this task should run on its own once scheduling exists."
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-textMain">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-borderSoft text-accent"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                />
                Enable scheduling preview
              </label>
              <input
                className="w-full rounded-full bg-sidebarBg border border-borderSoft px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-accent disabled:opacity-50"
                placeholder="0 9 * * 1"
                value={scheduleCron}
                onChange={(e) => setScheduleCron(e.target.value)}
                disabled={!scheduleEnabled}
              />
              <p className="text-[10px] text-textMuted">
                Coming soon: Cron-style scheduling support. Use this preview to communicate
                intent with your team.
              </p>
              <button
                type="button"
                disabled
                className="rounded-full border border-borderSoft px-3 py-1 text-[11px] text-textMuted opacity-60 cursor-not-allowed"
              >
                Save schedule (coming soon)
              </button>
            </div>
          </CollapsibleSection>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="rounded-full bg-accent text-white text-sm px-4 py-1.5 hover:bg-accentHover "
            >
              {creating ? "Creating…" : "Create task"}
            </button>
            <button
              type="button"
              className="text-[11px] text-textMuted hover:underline"
              onClick={onCancel}
            >
              Cancel
            </button>
            {onDeleteProject && (
              //2.- Surface project deletion in the creation flow without re-implementing the logic here.
              <button
                type="button"
                className="rounded-full border border-danger/40 text-danger px-3 py-1 text-[11px] hover:bg-danger/5"
                onClick={onDeleteProject}
              >
                Delete project
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
