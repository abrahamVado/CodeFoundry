import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Project } from "../api/types";

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api
      .listProjects()
      .then((rows) => {
        setProjects(rows);
        // If we're on "/", auto-open first project
        if (location.pathname === "/" && rows.length > 0) {
          navigate(`/projects/${rows[0].id}?tab=tasks`, { replace: true });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen w-screen bg-appBg flex items-top pt-10 justify-center">
      <div className="h-[50vh] w-[50vw] bg-sidebarBg rounded-xl2 shadow-card overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-260px min-w-[240px] max-w-[260px] h-full border-r border-borderSoft bg-sidebarBg flex flex-col">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-textMain">
                LLM Project Manager
              </div>
              <div className="text-xs text-textMuted">Local workspace</div>
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-accent text-white text-sm flex items-center justify-center hover:bg-accentHover"
              title="New project"
              onClick={() => navigate("/projects/new")}
            >
              +
            </button>
          </div>

          {/* Projects section */}
          <div className="px-4 pb-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-textSoft2">
                Projects
              </span>
              {!loading && (
                <span className="text-[11px] text-textSoft2">
                  {projects.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 text-sm">
              {loading && (
                <div className="text-xs text-textMuted px-2 py-1">
                  Loading projects…
                </div>
              )}
              {error && (
                <div className="text-xs text-danger px-2 py-1">
                  Error: {error}
                </div>
              )}

              {projects.map((p) => (
                <NavLink
                  key={p.id}
                  to={`/projects/${p.id}?tab=tasks`}
                  className={({ isActive }) =>
                    [
                      "block px-3 py-2 rounded-lg text-xs transition-colors border",
                      isActive
                        ? "bg-listBg border-accent/40 text-textMain shadow-sm"
                        : "bg-sidebarBg border-transparent text-textMuted hover:bg-accentSoft/40"
                    ].join(" ")
                  }
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[13px] truncate">
                      {p.title}
                    </span>
                    {typeof p.task_count === "number" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted ml-2">
                        {p.task_count}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-0.5 text-[11px] text-textSoft2 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                </NavLink>
              ))}

              {!loading && !error && projects.length === 0 && (
                <div className="text-xs text-textMuted px-2 py-1">
                  No projects yet. Click + to create one.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content (workspace / forms / chat) */}
        <main className="flex-1 h-full bg-appBg/40">{children}</main>
      </div>
    </div>
  );
};
