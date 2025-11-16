import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { Task, TaskGroup } from "../../api/types";

type Props = {
  projectId: number;
};

export const GroupsTab: React.FC<Props> = ({ projectId }) => {
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.listTaskGroups(projectId), api.listTasks(projectId)])
      .then(([g, t]) => {
        setGroups(g);
        setTasks(t);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [projectId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.createTaskGroup(projectId, { title, description });
      setTitle("");
      setDescription("");
      loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group: TaskGroup) => {
    const ok = window.confirm(
      `Delete group "${group.title}"? Tasks will remain, only the group and memberships will be removed.`
    );
    if (!ok) return;

    try {
      await api.deleteTaskGroup(projectId, group.id);
      loadAll();
    } catch (err: any) {
      alert(`Failed to delete group: ${err.message}`);
    }
  };

  const handleRemoveTaskFromGroup = async (group: TaskGroup, task: Task) => {
    const ok = window.confirm(
      `Remove task "${task.title}" from group "${group.title}"?`
    );
    if (!ok) return;

    try {
      await api.removeTaskFromGroup(projectId, group.id, task.id);
      loadAll();
    } catch (err: any) {
      alert(`Failed to remove task from group: ${err.message}`);
    }
  };  

  const handleAssignTasks = async () => {
    if (!selectedGroupId || selectedTaskIds.length === 0) return;
    setSaving(true);
    try {
      await api.assignTasksToGroup(projectId, selectedGroupId, selectedTaskIds);
      setSelectedTaskIds([]);
      loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  //1.- Provide a disabled preview control that communicates the upcoming ability to remove tasks while creating a group.
  const futureRemovalPreview = (
    <button
      type="button"
      disabled
      className="w-full rounded-full border border-dashed border-borderSoft px-3 py-1.5 text-[11px] text-textSoft cursor-not-allowed"
    >
      Future setting: remove tasks during creation
    </button>
  );

  return (
    <div className="flex h-full">
      {/* List of groups */}
      <div className="flex-1 px-6 py-4 overflow-y-auto bg-listBg">
        <h2 className="text-xs font-semibold text-textMain mb-3">
          Task groups
        </h2>
        {loading && (
          <div className="text-textMuted text-sm">Loading groups…</div>
        )}
        {error && (
          <div className="text-danger text-xs mb-2">Error: {error}</div>
        )}

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl border border-borderSoft bg-sidebarBg/70 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-textMain">
                  {group.title}
                </span>
                {typeof group.task_count === "number" && (
                  <span className="px-2 py-0.5 rounded-full bg-chipBg text-[11px] text-textMuted">
                    {group.task_count} tasks
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-[11px] text-textMuted line-clamp-2">
                  {group.description}
                </p>
              )}
              <button
                type="button"
                className="text-[11px] text-danger hover:underline"
                onClick={() => handleDeleteGroup(group)}
              >
                Delete group
              </button>
            </div>
          ))}
        </div>

        {!loading && groups.length === 0 && (
          <div className="text-textMuted text-sm mt-2">
            No groups yet. Use the panels on the right to create and assign.
          </div>
        )}
      </div>

      {/* Right: create + assign */}
      <div className="w-[380px] border-l border-borderSoft bg-sidebarBg/50 flex flex-col">
        <div className="px-5 py-4 border-b border-borderSoft">
          <h3 className="text-xs font-semibold text-textMain mb-2">
            New group
          </h3>
          <form
            onSubmit={handleCreateGroup}
            className="space-y-2 text-xs"
            autoComplete="off"
          >
            <input
              className="w-full rounded-full bg-listBg border border-borderSoft px-3 py-1.5 text-xs text-textMain placeholder:text-textSoft2 focus:outline-none focus:border-accent"
              placeholder="Group title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full rounded-2xl bg-listBg border border-borderSoft px-3 py-2 text-xs text-textMain placeholder:text-textSoft2 min-h-[60px] focus:outline-none focus:border-accent"
              placeholder="Short description for this group…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {futureRemovalPreview}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-accent text-white text-xs px-4 py-1.5 hover:bg-accentHover disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create group"}
            </button>
          </form>
        </div>

        <div className="flex-1 px-5 py-4 text-xs overflow-y-auto">
          <h3 className="text-xs font-semibold text-textMain mb-2">
            Assign tasks
          </h3>
          <label className="flex flex-col gap-1 mb-2">
            <span className="text-[11px] text-textSoft2">Group</span>
            <select
              className="rounded-full bg-listBg border border-borderSoft px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-accent"
              value={selectedGroupId ?? ""}
              onChange={(e) =>
                setSelectedGroupId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">Select a group…</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          </label>

          <div className="border border-borderSoft rounded-2xl bg-listBg max-h-56 overflow-y-auto">
            {tasks.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-2 px-3 py-1.5 border-b border-borderSoft/40 last:border-b-0 text-[11px] text-textMain"
              >
                <input
                  type="checkbox"
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={() => toggleTaskSelection(task.id)}
                />
                <span>{task.title}</span>
              </label>
            ))}
            {tasks.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-textMuted">
                No tasks to assign yet.
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={saving || !selectedGroupId || selectedTaskIds.length === 0}
            className="mt-3 rounded-full bg-accent text-white text-xs px-4 py-1.5 hover:bg-accentHover disabled:opacity-60"
            onClick={handleAssignTasks}
          >
            {saving ? "Assigning…" : "Assign selected tasks"}
          </button>
        </div>
      </div>
    </div>
  );
};
