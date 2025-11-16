import React, { useEffect, useMemo, useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api
      .listProjects()
      .then((rows) => {
        setProjects(rows);
        if (location.pathname === "/" && rows.length > 0) {
          navigate(`/projects/${rows[0].id}?tab=tasks`, { replace: true });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    //1.- Load the available projects once and auto-navigate to the first entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    //2.- Close the sidebar drawer after navigation completes on small screens.
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    //3.- Add escape-key handling so users can dismiss the drawer without a pointer.
    if (!sidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  //4.- Build a shared sidebar body so both desktop and mobile drawers stay in sync.
  const sidebarContent = useMemo(
    () => (
      <div className="flex h-full flex-col">
        <a
          href="#main-content"
          className="absolute -left-[999px] top-auto z-50 h-px w-px overflow-hidden focus-visible:left-4 focus-visible:top-4 focus-visible:h-auto focus-visible:w-auto focus-visible:rounded-md focus-visible:bg-appBg focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-textMain focus-visible:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:overflow-visible"
        >
          Skip to content
        </a>
        <header className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-borderSoft/70">
          <div>
            <p className="text-sm font-semibold text-textMain">LLM Project Manager</p>
            <p className="text-xs text-textMuted">Local workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-accent text-white text-sm flex items-center justify-center hover:bg-accentHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              title="New project"
              onClick={() => navigate("/projects/new")}
            >
              +
            </button>
            <button
              type="button"
              className="rounded-full border border-borderSoft px-3 py-1 text-[11px] font-medium text-textMain hover:bg-sidebarBg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              Close
            </button>
          </div>
        </header>

        <div className="px-4 pb-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-textSoft2">
              Projects
            </span>
            {!loading && <span className="text-[11px] text-textSoft2">{projects.length}</span>}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 text-sm pr-1">
            {loading && (
              <div className="text-xs text-textMuted px-2 py-1">Loading projects…</div>
            )}
            {error && <div className="text-xs text-danger px-2 py-1">Error: {error}</div>}

            {projects.map((p) => (
              <NavLink
                key={p.id}
                to={`/projects/${p.id}?tab=tasks`}
                className={({ isActive }) =>
                  [
                    "block px-3 py-2 rounded-lg text-xs transition-colors border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    isActive
                      ? "bg-listBg border-accent/40 text-textMain shadow-sm"
                      : "bg-sidebarBg border-transparent text-textMuted hover:bg-accentSoft/40",
                  ].join(" ")
                }
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[13px] truncate">{p.title}</span>
                  {typeof p.task_count === "number" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted ml-2">
                      {p.task_count}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-0.5 text-[11px] text-textSoft2 line-clamp-2">{p.description}</p>
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
      </div>
    ),
    [error, loading, navigate, projects, setSidebarOpen]
  );

  //5.- Compose the responsive layout using header, nav, and main landmarks.
  return (
    <div className="min-h-screen w-full bg-appBg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-borderSoft bg-sidebarBg/70 backdrop-blur-sm">
        <div>
          <p className="text-sm font-semibold text-textMain">LLM Project Manager</p>
          <p className="text-xs text-textMuted">Local workspace</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-borderSoft px-3 py-1.5 text-xs font-semibold text-textMain hover:bg-sidebarBg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-controls="mobile-project-sidebar"
          aria-expanded={sidebarOpen}
        >
          Open projects
        </button>
      </header>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* //6.- Remove the centered max-width shell so the workspace can stretch edge-to-edge. */}
      <div className="flex flex-1 w-full px-4 pb-5 lg:px-8 lg:pb-8 overflow-hidden">
        <div className="flex w-full h-full flex-1 flex-col gap-4 lg:flex-row">
          <nav
            aria-label="Project navigation"
            className="relative hidden lg:flex lg:w-[260px] lg:min-w-[240px] lg:max-w-[260px] lg:flex-col lg:rounded-xl2 lg:border lg:border-borderSoft lg:bg-sidebarBg lg:shadow-card"
          >
            {sidebarContent}
          </nav>

          <main
            id="main-content"
            className="flex-1 w-full h-full min-h-0 rounded-xl2 border border-borderSoft bg-appBg/40 shadow-card overflow-hidden flex flex-col"
          >
            {children}
          </main>
        </div>
      </div>

      <nav
        id="mobile-project-sidebar"
        aria-label="Project navigation"
        className={`relative lg:hidden fixed inset-y-0 left-0 z-40 w-full max-w-xs transform border-r border-borderSoft bg-sidebarBg shadow-2xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </nav>
    </div>
  );
};
