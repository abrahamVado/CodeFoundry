import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { TaskRun } from "../../api/types";
import { useNavigate } from "react-router-dom";

type Props = {
  projectId: number;
};

export const RunsTab: React.FC<Props> = ({ projectId }) => {
  const [runs, setRuns] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .listRuns(projectId)
      .then(setRuns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [projectId]);

  return (
    <div className="flex flex-col h-full bg-listBg px-6 py-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-textMain">Runs overview</h2>
      </div>

      {loading && (
        <div className="text-textMuted text-sm">Loading runs…</div>
      )}
      {error && (
        <div className="text-danger text-xs mb-2">Error: {error}</div>
      )}

      <div className="space-y-2 text-xs">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-2xl border border-borderSoft bg-sidebarBg/80 px-4 py-3 flex items-center justify-between gap-3 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-textMain">
                  {run.task_title ?? `Task #${run.task_id}`}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-chipBg text-textMuted">
                  Run #{run.id}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-appBg text-textMuted capitalize">
                  {run.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-textSoft2">
                <span>
                  Started: {new Date(run.started_at).toLocaleString()}
                </span>
                {run.finished_at && (
                  <span>
                    Finished: {new Date(run.finished_at).toLocaleString()}
                  </span>
                )}
              </div>
              {run.run_summary && (
                <p className="mt-1 text-[11px] text-textMuted line-clamp-2 max-w-xl">
                  {run.run_summary}
                </p>
              )}
            </div>
            <button
              className="rounded-full border border-borderSoft px-3 py-1 text-[11px] text-textMuted hover:bg-appBg"
              onClick={() =>
                navigate(
                  `/projects/${projectId}/tasks/${run.task_id}/runs/${run.id}`
                )
              }
            >
              Open chat
            </button>
          </div>
        ))}

        {!loading && runs.length === 0 && (
          <div className="text-textMuted text-sm">
            No runs yet. Start one from the Tasks tab.
          </div>
        )}
      </div>
    </div>
  );
};
