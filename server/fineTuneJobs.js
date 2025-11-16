const { pullModel, createModel, pushModel } = require("./ollamaClient");

//1.- Normalize Ollama's verbose status chunks into concise log messages.
const chunkToMessage = (chunk) =>
  chunk?.status || chunk?.response || chunk?.detail || JSON.stringify(chunk);

//2.- Render a Modelfile that bakes in the dataset summary provided by the UI.
function buildFineTuneModelfile({
  baseModel,
  datasetName,
  datasetText,
  referenceUrl,
  taskTitle
}) {
  const trimmedDataset = datasetText?.trim() || "";
  const referenceLine = referenceUrl ? `Reference: ${referenceUrl}` : "";
  const contextBlock = [
    `Task: ${taskTitle}`,
    `Dataset: ${datasetName}`,
    referenceLine,
    trimmedDataset
  ]
    .filter(Boolean)
    .join("\n\n");

  return [`FROM ${baseModel}`, `SYSTEM """${contextBlock}"""`].join("\n");
}

//3.- Execute the pull/create/push sequence while emitting structured progress updates.
async function runFineTuneJob({
  fineTune,
  datasetText,
  referenceUrl,
  taskTitle,
  onStage
}) {
  await pullModel(fineTune.base_model, (chunk) =>
    onStage?.("pulling", chunkToMessage(chunk))
  );

  const modelfile = buildFineTuneModelfile({
    baseModel: fineTune.base_model,
    datasetName: fineTune.dataset_name,
    datasetText,
    referenceUrl,
    taskTitle
  });

  await createModel(fineTune.target_model, modelfile, (chunk) =>
    onStage?.("training", chunkToMessage(chunk))
  );

  await pushModel(fineTune.target_model, (chunk) =>
    onStage?.("pushing", chunkToMessage(chunk))
  );
}

module.exports = { buildFineTuneModelfile, runFineTuneJob };
