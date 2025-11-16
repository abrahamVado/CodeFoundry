import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Project } from "../api/types";

//1.- Define the catalog of repositories and languages so the UI can render helpful choices with descriptive labels and logos.
const REPOSITORIES = [
  {
    id: "repo-frontend",
    name: "Frontend UI",
    description: "Existing React interface ready for new workflows."
  },
  {
    id: "repo-backend",
    name: "Backend API",
    description: "Python FastAPI service with shared models."
  },
  {
    id: "repo-mobile",
    name: "Mobile Client",
    description: "React Native repo tailored for mobile devices."
  }
];

const LANGUAGES = [
  { id: "ts", name: "TypeScript", logo: "🟦" },
  { id: "js", name: "JavaScript", logo: "🟨" },
  { id: "py", name: "Python", logo: "🐍" },
  { id: "rb", name: "Ruby", logo: "💎" },
  { id: "go", name: "Go", logo: "🔵" },
  { id: "rs", name: "Rust", logo: "🦀" },
  { id: "kt", name: "Kotlin", logo: "🟣" },
  { id: "swift", name: "Swift", logo: "🟠" },
  { id: "java", name: "Java", logo: "☕" },
  { id: "php", name: "PHP", logo: "🐘" },
  { id: "cs", name: "C#", logo: "♯" },
  { id: "cpp", name: "C++", logo: "➕" }
];

export const ProjectFormPage: React.FC = () => {
  const { projectId } = useParams();
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [basePrompt, setBasePrompt] = useState("");
  //2.- Manage the selection state for repository and programming language controls so we can capture the user's choices.
  const [repositoryMode, setRepositoryMode] = useState<"existing" | "new">("existing");
  const [selectedRepository, setSelectedRepository] = useState(
    REPOSITORIES[0]?.id ?? ""
  );
  const [newRepositoryName, setNewRepositoryName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(
    LANGUAGES[0]?.id ?? ""
  );
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

            <section className="border border-borderSubtle rounded-lg p-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
                  Repository source
                </p>
                <p className="text-xs text-slate-400">
                  Select an existing repository or scaffold a new one for this project.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="repositoryMode"
                    value="existing"
                    checked={repositoryMode === "existing"}
                    onChange={() => setRepositoryMode("existing")}
                    className="text-accent"
                  />
                  Use existing repository
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="repositoryMode"
                    value="new"
                    checked={repositoryMode === "new"}
                    onChange={() => setRepositoryMode("new")}
                    className="text-accent"
                  />
                  Create a new repository
                </label>
              </div>
              {repositoryMode === "existing" ? (
                <div className="space-y-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">Select repository</span>
                    <select
                      className="px-2 py-1 rounded-md bg-surfaceAlt border border-borderSubtle text-black"
                      value={selectedRepository}
                      onChange={(e) => setSelectedRepository(e.target.value)}
                    >
                      {REPOSITORIES.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-xs text-slate-400">
                    {REPOSITORIES.find((repo) => repo.id === selectedRepository)?.description ??
                      "Pick the repo that will receive this work."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-300">New repository name</span>
                    <input
                      className="px-2 py-1 rounded-md bg-surfaceAlt border border-borderSubtle text-black"
                      value={newRepositoryName}
                      onChange={(e) => setNewRepositoryName(e.target.value)}
                      placeholder="e.g. ai-helper-service"
                    />
                  </label>
                  <p className="text-xs text-slate-400">
                    Provide a descriptive name so we can bootstrap a clean repository for you.
                  </p>
                </div>
              )}
            </section>

            <section className="border border-borderSubtle rounded-lg p-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
                  Primary language
                </p>
                <p className="text-xs text-slate-400">
                  Choose the main language for the agent runs—each option includes its logo for clarity.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LANGUAGES.map((language) => (
                  <label
                    key={language.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition ${
                      selectedLanguage === language.id
                        ? "border-accent bg-accent/10"
                        : "border-borderSubtle"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="language"
                      value={language.id}
                      checked={selectedLanguage === language.id}
                      onChange={() => setSelectedLanguage(language.id)}
                    />
                    <span className="text-2xl" aria-hidden="true">
                      {language.logo}
                    </span>
                    <span className="text-sm font-medium">{language.name}</span>
                  </label>
                ))}
              </div>
            </section>

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
