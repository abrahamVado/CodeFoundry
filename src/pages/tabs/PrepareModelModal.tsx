import React, { useEffect, useMemo, useState } from "react";
import type { FineTuneJob, FineTuneRequest } from "../../api/types";

type Props = {
  open: boolean;
  onClose: () => void;
  fineTunes: FineTuneJob[];
  onStart: (payload: FineTuneRequest) => Promise<void>;
  onActivate: (fineTuneId: string) => Promise<void>;
  activeFineTuneId: string | null | undefined;
  defaultBaseModel: string;
  defaultTargetModel: string;
};

//1.- Centralize the modal that walks users through preparing training data + fine-tunes.
export const PrepareModelModal: React.FC<Props> = ({
  open,
  onClose,
  fineTunes,
  onStart,
  onActivate,
  activeFineTuneId,
  defaultBaseModel,
  defaultTargetModel
}) => {
  const [baseModel, setBaseModel] = useState(defaultBaseModel);
  const [targetModel, setTargetModel] = useState(defaultTargetModel);
  const [datasetName, setDatasetName] = useState("Task training set");
  const [datasetText, setDatasetText] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setBaseModel(defaultBaseModel);
    setTargetModel(defaultTargetModel);
  }, [open, defaultBaseModel, defaultTargetModel]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setDatasetText((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  const resetForm = () => {
    setDatasetText("");
    setReferenceUrl("");
    setDatasetName("Task training set");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!datasetText.trim() && !referenceUrl.trim()) {
      setError("Provide either inline training text or a reference URL.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onStart({
        base_model: baseModel,
        target_model: targetModel,
        dataset_name: datasetName,
        dataset_text: datasetText,
        reference_url: referenceUrl || undefined
      });
      resetForm();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit fine-tune.");
    } finally {
      setSubmitting(false);
    }
  };

  const jobRows = useMemo(() => fineTunes, [fineTunes]);

  const handleActivateClick = async (fineTuneId: string) => {
    setActivationError(null);
    setActivatingId(fineTuneId);
    try {
      await onActivate(fineTuneId);
    } catch (err: any) {
      setActivationError(err.message ?? "Unable to set the active fine-tune.");
    } finally {
      setActivatingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-sidebarBg w-full max-w-3xl rounded-2xl shadow-xl border border-borderSoft max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-borderSoft flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-textMain">Prepare a specialized model</h2>
            <p className="text-[12px] text-textMuted">
              Pull a base model, feed it curated data, and push the tuned artifact back to Ollama.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-sm text-textMuted hover:text-textMain"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <form onSubmit={handleSubmit} className="bg-listBg rounded-xl border border-borderSoft p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-textSoft font-semibold">Base model</span>
                <input
                  className="border border-borderSoft rounded-lg px-2 py-1 bg-appBg text-textMain"
                  value={baseModel}
                  onChange={(e) => setBaseModel(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-textSoft font-semibold">Target model name</span>
                <input
                  className="border border-borderSoft rounded-lg px-2 py-1 bg-appBg text-textMain"
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-textSoft font-semibold">Dataset name</span>
              <input
                className="border border-borderSoft rounded-lg px-2 py-1 bg-appBg text-textMain"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-textSoft font-semibold">Inline training snippets</span>
              <textarea
                className="border border-borderSoft rounded-lg px-3 py-2 bg-appBg text-textMain min-h-[120px]"
                placeholder="Paste or type representative dialogues, instructions, or domain FAQs…"
                value={datasetText}
                onChange={(e) => setDatasetText(e.target.value)}
              />
              <span className="text-[11px] text-textSoft2">
                {datasetText.length} characters
              </span>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-textSoft font-semibold">Reference URL (optional)</span>
              <input
                className="border border-borderSoft rounded-lg px-2 py-1 bg-appBg text-textMain"
                placeholder="https://example.com/dataset.json"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-textSoft font-semibold">Upload text file (optional)</span>
              <input
                type="file"
                accept=".txt,.md,.json"
                onChange={handleFileChange}
                className="text-[11px] text-textSoft"
              />
            </label>
            {error && <div className="text-danger text-[12px]">{error}</div>}
            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-accent text-white text-sm"
                disabled={submitting}
              >
                {submitting ? "Launching…" : "Start fine-tune"}
              </button>
            </div>
          </form>

          <section>
            <h3 className="text-[13px] font-semibold text-textMain mb-2">Fine-tune history</h3>
            {jobRows.length === 0 ? (
              <p className="text-[12px] text-textSoft">
                No fine-tune attempts yet. Launch one above to reserve a model for this task.
              </p>
            ) : (
              <div className="space-y-3">
                {jobRows.map((job) => {
                  const lastLog = job.logs[job.logs.length - 1]?.message;
                  const isActive = job.id === activeFineTuneId;
                  const canActivate = job.status === "succeeded" && !isActive;
                  return (
                    <article
                      key={job.id}
                      className="border border-borderSoft rounded-xl p-3 bg-listBg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-textMain">
                            {job.target_model}
                          </p>
                          <p className="text-[11px] text-textSoft">
                            Base: {job.base_model} · Dataset: {job.dataset_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[11px] capitalize bg-appBg text-textSoft">
                            {job.status}
                          </span>
                          <button
                            type="button"
                            className={`text-[11px] underline ${
                              canActivate ? "text-accent" : "text-textSoft2"
                            }`}
                            disabled={!canActivate || activatingId === job.id}
                            onClick={() => handleActivateClick(job.id)}
                          >
                            {activatingId === job.id
                              ? "Saving…"
                              : isActive
                              ? "In use"
                              : "Use for chat"}
                          </button>
                        </div>
                      </div>
                      {lastLog && (
                        <p className="mt-2 text-[12px] text-textMuted">
                          {lastLog}
                        </p>
                      )}
                      {job.error_message && (
                        <p className="mt-2 text-[12px] text-danger">{job.error_message}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            {activationError && (
              <p className="text-[12px] text-danger mt-2">{activationError}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
