import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Project } from "../api/types";

export const ProjectFormPage: React.FC = () => {
  const { projectId } = useParams();
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrompt, setBasePrompt] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    const id = Number(projectId);
    api
      .getProject(id)
      .then((p: Project) => {
        setTitle(p.title);
        setDescription(p.description ?? "");
        setBasePrompt(p.base_prompt ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isEdit, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await api.updateProject(Number(projectId), {
          title,
          description,
          base_prompt: basePrompt
        });
      } else {
        const p = await api.createProject({
          title,
          description,
          base_prompt: basePrompt
        });
        navigate(`/projects/${p.id}`);
        return;
      }
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-lg font-semibold">
            {isEdit ? "Edit project" : "New project"}
          </h1>
          <p className="text-xs">
            Define basic metadata and the base system prompt.
          </p>
        </div>
      </header>

      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="max-w-2xl space-y-3 text-sm"
          >
            {error && (
              <div className="text-xs text-red-400 border border-red-500/40 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-300">Title</span>
              <input
                className="px-2 py-1 rounded-md bg-surfaceAlt border border-borderSubtle text-black"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-300">Description</span>
              <textarea
                className="px-2 py-1 rounded-md bg-surfaceAlt border border-borderSubtle min-h-[80px] text-black"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-300">Base system prompt</span>
              <textarea
                className="px-2 py-1 rounded-md bg-surfaceAlt border border-borderSubtle min-h-[140px] font-mono text-xs text-black"
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-accent text-sm px-3 py-1 rounded-md disabled:opacity-60"
              >
                {saving ? "Saving…" : isEdit ? "Save changes" : "Create project"}
              </button>
              <button
                type="button"
                className="text-xs text-slate-300"
                onClick={() =>
                  navigate(isEdit ? `/projects/${projectId}` : "/")
                }
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
