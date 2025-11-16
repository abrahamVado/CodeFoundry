const { randomUUID } = require("crypto");

//1.- Provide a reusable ISO timestamp helper to keep records consistent.
const now = () => new Date().toISOString();

//2.- Build a deterministic incremental id generator per entity type.
const createIdTracker = () => ({
  project: 1,
  task: 1,
  group: 1,
  run: 1,
  message: 1
});

class DataStore {
  //3.- Initialize the in-memory collections and immediately seed demo data.
  constructor() {
    this.counters = createIdTracker();
    this.projects = [];
    this.tasks = [];
    this.groups = [];
    this.runs = [];
    this.messages = [];
    this.fineTunes = [];
    this.seed();
  }

  //4.- Centralize id creation to avoid collisions across the store.
  nextId(key) {
    const id = this.counters[key];
    this.counters[key] += 1;
    return id;
  }

  //5.- Pre-populate a tiny workspace so the UI is usable immediately.
  seed() {
    const project = this.createProject({
      title: "LLM Workspace",
      description: "Demo project seeded automatically.",
      base_prompt:
        "You are CodeFoundry Assistant, a precise engineer focused on actionable, reproducible suggestions."
    });

    const taskOne = this.createTask(project.id, {
      title: "Draft onboarding plan",
      description: "Summarize what new contributors should learn first.",
      status: "running",
      priority: 1,
      task_prompt:
        "Expand on the project base prompt by outlining onboarding steps for future agents."
    });

    const run = this.createRun(taskOne.id);
    this.addMessage(run.id, "system", project.base_prompt);
    this.addMessage(run.id, "assistant", "Hello! Ready to discuss the onboarding plan whenever you are.");

    const taskTwo = this.createTask(project.id, {
      title: "Evaluate UI polish",
      description: "Collect quick wins to make the dashboard pop.",
      status: "idle",
      priority: 2
    });

    const group = this.createGroup(project.id, {
      title: "Initial backlog",
      description: "Seed work captured from the kickoff meeting."
    });
    this.assignTasksToGroup(project.id, group.id, [taskOne.id, taskTwo.id]);
  }

  //6.- Helper that guarantees a project exists before continuing.
  ensureProject(projectId) {
    const project = this.projects.find((p) => p.id === Number(projectId));
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    return project;
  }

  //7.- Helper that guarantees a task exists.
  ensureTask(taskId) {
    const task = this.tasks.find((t) => t.id === Number(taskId));
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return task;
  }

  //8.- Helper that guarantees a run exists.
  ensureRun(runId) {
    const run = this.runs.find((r) => r.id === Number(runId));
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }
    return run;
  }

  //9.- Helper that guarantees a group exists.
  ensureGroup(projectId, groupId) {
    const group = this.groups.find(
      (g) => g.project_id === Number(projectId) && g.id === Number(groupId)
    );
    if (!group) {
      throw new Error(`Group ${groupId} not found for project ${projectId}`);
    }
    return group;
  }

  //10.- Produce project list enriched with aggregate stats.
  listProjects() {
    return this.projects.map((project) => ({
      ...project,
      task_count: this.tasks.filter((t) => t.project_id === project.id).length,
      last_run_at: this.runs
        .filter((r) => this.tasks.find((t) => t.id === r.task_id)?.project_id === project.id)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]?.started_at || null
    }));
  }

  //11.- Create a new project and persist it.
  createProject(data) {
    const project = {
      id: this.nextId("project"),
      title: data.title ?? "Untitled project",
      description: data.description ?? null,
      base_prompt: data.base_prompt ?? null,
      created_at: now(),
      updated_at: now()
    };
    this.projects.push(project);
    return project;
  }

  //12.- Update an existing project.
  updateProject(projectId, patch) {
    const project = this.ensureProject(projectId);
    Object.assign(project, patch, { updated_at: now() });
    return project;
  }

  //13.- Remove a project alongside nested entities.
  deleteProject(projectId) {
    const project = this.ensureProject(projectId);
    this.projects = this.projects.filter((p) => p.id !== project.id);
    const taskIds = this.tasks.filter((t) => t.project_id === project.id).map((t) => t.id);
    this.tasks = this.tasks.filter((t) => t.project_id !== project.id);
    this.groups = this.groups.filter((g) => g.project_id !== project.id);
    const runIds = this.runs.filter((r) => taskIds.includes(r.task_id)).map((r) => r.id);
    this.runs = this.runs.filter((r) => !runIds.includes(r.id));
    this.messages = this.messages.filter((m) => !runIds.includes(m.task_run_id));
    this.fineTunes = this.fineTunes.filter((ft) => ft.project_id !== project.id);
    return project;
  }

  //14.- Retrieve a single project.
  getProject(projectId) {
    return this.ensureProject(projectId);
  }

  //15.- List every task for a project including quick stats.
  listTasks(projectId) {
    this.ensureProject(projectId);
    return this.tasks
      .filter((t) => t.project_id === Number(projectId))
      .map((task) => ({
        ...task,
        runs_count: this.runs.filter((run) => run.task_id === task.id).length
      }));
  }

  //16.- Create a new task under a project.
  createTask(projectId, data) {
    this.ensureProject(projectId);
    const task = {
      id: this.nextId("task"),
      project_id: Number(projectId),
      title: data.title ?? "Untitled task",
      description: data.description ?? null,
      status: data.status ?? "idle",
      priority: data.priority ?? 1,
      task_prompt: data.task_prompt ?? null,
      created_at: now(),
      updated_at: now(),
      group_ids: [],
      active_fine_tune_id: null,
      active_model: null
    };
    this.tasks.push(task);
    return task;
  }

  //17.- Update an existing task.
  updateTask(projectId, taskId, patch) {
    const task = this.tasks.find(
      (t) => t.id === Number(taskId) && t.project_id === Number(projectId)
    );
    if (!task) {
      throw new Error(`Task ${taskId} not found for project ${projectId}`);
    }
    const updates = { ...patch };
    if (Object.prototype.hasOwnProperty.call(updates, "active_fine_tune_id")) {
      const desired = updates.active_fine_tune_id;
      delete updates.active_fine_tune_id;
      if (desired === null) {
        task.active_fine_tune_id = null;
        task.active_model = null;
      } else {
        const fineTune = this.ensureFineTuneForTask(
          projectId,
          taskId,
          desired
        );
        if (fineTune.status !== "succeeded") {
          throw new Error("Fine-tune must succeed before activation");
        }
        task.active_fine_tune_id = fineTune.id;
        task.active_model = fineTune.result_model ?? fineTune.target_model;
      }
    }
    Object.assign(task, updates, { updated_at: now() });
    return task;
  }

  //18.- Delete a task and cascade child records.
  deleteTask(projectId, taskId) {
    const task = this.updateTask(projectId, taskId, {});
    this.tasks = this.tasks.filter((t) => t.id !== task.id);
    this.groups.forEach((group) => {
      group.task_ids = group.task_ids.filter((id) => id !== task.id);
    });
    const runs = this.runs.filter((r) => r.task_id === task.id).map((r) => r.id);
    this.runs = this.runs.filter((r) => r.task_id !== task.id);
    this.messages = this.messages.filter((m) => !runs.includes(m.task_run_id));
    this.fineTunes = this.fineTunes.filter((ft) => ft.task_id !== task.id);
    return task;
  }

  //19.- Retrieve one task.
  getTask(projectId, taskId) {
    return this.updateTask(projectId, taskId, {});
  }

  //20.- Create a new task group.
  createGroup(projectId, data) {
    this.ensureProject(projectId);
    const group = {
      id: this.nextId("group"),
      project_id: Number(projectId),
      title: data.title ?? "Untitled group",
      description: data.description ?? null,
      created_at: now(),
      updated_at: now(),
      task_ids: []
    };
    this.groups.push(group);
    return group;
  }

  //21.- Update a group definition.
  updateGroup(projectId, groupId, patch) {
    const group = this.ensureGroup(projectId, groupId);
    Object.assign(group, patch, { updated_at: now() });
    return group;
  }

  //22.- Delete a group and clear relationships.
  deleteGroup(projectId, groupId) {
    const group = this.ensureGroup(projectId, groupId);
    this.groups = this.groups.filter((g) => g.id !== group.id);
    this.tasks.forEach((task) => {
      task.group_ids = task.group_ids.filter((id) => id !== group.id);
    });
    return group;
  }

  //23.- Assign tasks to a group.
  assignTasksToGroup(projectId, groupId, taskIds) {
    const group = this.ensureGroup(projectId, groupId);
    taskIds.forEach((taskId) => {
      const task = this.ensureTask(taskId);
      if (task.project_id !== group.project_id) {
        throw new Error("Task and group belong to different projects");
      }
      if (!group.task_ids.includes(task.id)) {
        group.task_ids.push(task.id);
      }
      if (!task.group_ids.includes(group.id)) {
        task.group_ids.push(group.id);
      }
    });
    return group;
  }

  //24.- Remove a task from a group.
  removeTaskFromGroup(projectId, groupId, taskId) {
    const group = this.ensureGroup(projectId, groupId);
    group.task_ids = group.task_ids.filter((id) => id !== Number(taskId));
    const task = this.ensureTask(taskId);
    task.group_ids = task.group_ids.filter((id) => id !== group.id);
    return group;
  }

  //25.- List groups for a project with task counts.
  listGroups(projectId) {
    this.ensureProject(projectId);
    return this.groups
      .filter((group) => group.project_id === Number(projectId))
      .map((group) => ({
        ...group,
        task_count: group.task_ids.length
      }));
  }

  //26.- Create a run tied to a task.
  createRun(taskId, options = {}) {
    const task = this.ensureTask(taskId);
    const run = {
      id: this.nextId("run"),
      task_id: task.id,
      status: "running",
      started_at: now(),
      finished_at: null,
      run_summary: null,
      task_title: task.title,
      model: options.model ?? task.active_model ?? null
    };
    this.runs.push(run);
    return run;
  }

  //27.- Update a run's metadata.
  updateRun(projectId, runId, patch) {
    const run = this.ensureRun(runId);
    const task = this.ensureTask(run.task_id);
    if (task.project_id !== Number(projectId)) {
      throw new Error(`Run ${runId} does not belong to project ${projectId}`);
    }
    Object.assign(run, patch);
    return run;
  }

  //28.- List runs optionally filtered by task.
  listRuns(projectId, taskId) {
    this.ensureProject(projectId);
    return this.runs.filter((run) => {
      const task = this.ensureTask(run.task_id);
      if (task.project_id !== Number(projectId)) {
        return false;
      }
      if (taskId) {
        return run.task_id === Number(taskId);
      }
      return true;
    });
  }

  //29.- Start a new run for a task (used by the UI shortcut).
  startRunForTask(projectId, taskId) {
    const task = this.updateTask(projectId, taskId, {});
    if (task.active_fine_tune_id) {
      const record = this.ensureFineTuneForTask(
        projectId,
        taskId,
        task.active_fine_tune_id
      );
      if (record.status !== "succeeded") {
        throw new Error("Fine-tuned model is not ready yet");
      }
    }
    task.status = "running";
    return this.createRun(task.id, { model: task.active_model ?? null });
  }

  //30.- List messages for a run ordered by creation time.
  listMessages(runId) {
    this.ensureRun(runId);
    return this.messages
      .filter((msg) => msg.task_run_id === Number(runId))
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }

  //31.- Persist a message and return it.
  addMessage(runId, role, content) {
    const run = this.ensureRun(runId);
    const message = {
      id: this.nextId("message"),
      task_run_id: run.id,
      role,
      content,
      created_at: now(),
      uuid: randomUUID()
    };
    this.messages.push(message);
    return message;
  }

  //32.- Provide the rich prompt context consumed by the LLM client.
  getRunContext(runId) {
    const run = this.ensureRun(runId);
    const task = this.ensureTask(run.task_id);
    const project = this.ensureProject(task.project_id);
    const messages = this.listMessages(run.id);
    return { project, task, run, messages };
  }

  //33.- Represent tasks and groups as the tasks-as-code contract.
  getTasksAsCode(projectId) {
    const project = this.ensureProject(projectId);
    const groups = this.listGroups(projectId).map((group) => ({
      id: group.id,
      title: group.title,
      description: group.description ?? undefined,
      tasks: group.task_ids.map((taskId) => {
        const task = this.ensureTask(taskId);
        return {
          id: task.id,
          title: task.title,
          description: task.description ?? undefined,
          status: task.status,
          priority: task.priority
        };
      })
    }));
    const groupedTaskIds = new Set(groups.flatMap((group) => group.tasks.map((t) => t.id)));
    const ungrouped_tasks = this.tasks
      .filter((task) => task.project_id === Number(projectId) && !groupedTaskIds.has(task.id))
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        priority: task.priority
      }));
    return {
      project: {
        id: project.id,
        title: project.title,
        description: project.description ?? undefined
      },
      groups,
      ungrouped_tasks
    };
  }

  //34.- Update tasks/groups via the tasks-as-code contract.
  updateTasksAsCode(projectId, payload) {
    this.ensureProject(projectId);
    const touchedGroups = new Set();
    const touchedTasks = new Set();

    payload.groups.forEach((groupPayload) => {
      const group = groupPayload.id
        ? this.ensureGroup(projectId, groupPayload.id)
        : this.createGroup(projectId, groupPayload);
      touchedGroups.add(group.id);
      group.title = groupPayload.title;
      group.description = groupPayload.description ?? null;
      group.updated_at = now();
      group.task_ids = [];

      groupPayload.tasks.forEach((taskPayload) => {
        const task = taskPayload.id
          ? this.updateTask(projectId, taskPayload.id, {})
          : this.createTask(projectId, taskPayload);
        touchedTasks.add(task.id);
        task.title = taskPayload.title;
        task.description = taskPayload.description ?? null;
        task.status = taskPayload.status ?? task.status;
        task.priority = taskPayload.priority ?? task.priority;
        task.updated_at = now();
        task.group_ids = [...new Set([group.id])];
        if (!group.task_ids.includes(task.id)) {
          group.task_ids.push(task.id);
        }
      });
    });

    payload.ungrouped_tasks.forEach((taskPayload) => {
      const task = taskPayload.id
        ? this.updateTask(projectId, taskPayload.id, {})
        : this.createTask(projectId, taskPayload);
      touchedTasks.add(task.id);
      task.title = taskPayload.title;
      task.description = taskPayload.description ?? null;
      task.status = taskPayload.status ?? task.status;
      task.priority = taskPayload.priority ?? task.priority;
      task.group_ids = [];
    });

    // Remove groups not present in payload
    this.groups = this.groups.filter((group) => {
      if (group.project_id !== Number(projectId)) return true;
      return touchedGroups.has(group.id);
    });

    // Remove tasks belonging to project but omitted entirely
    this.tasks = this.tasks.filter((task) => {
      if (task.project_id !== Number(projectId)) return true;
      return touchedTasks.has(task.id);
    });

    return { ok: true };
  }

  //35.- Guarantee a fine-tune record exists before updating it.
  ensureFineTune(fineTuneId) {
    const record = this.fineTunes.find((ft) => ft.id === fineTuneId);
    if (!record) {
      throw new Error(`Fine-tune ${fineTuneId} not found`);
    }
    return record;
  }

  //36.- Enforce that a fine-tune belongs to the project/task tuple.
  ensureFineTuneForTask(projectId, taskId, fineTuneId) {
    const record = this.ensureFineTune(fineTuneId);
    if (
      record.project_id !== Number(projectId) ||
      record.task_id !== Number(taskId)
    ) {
      throw new Error(
        `Fine-tune ${fineTuneId} not found for project ${projectId} task ${taskId}`
      );
    }
    return record;
  }

  //37.- Create a brand new fine-tune request record.
  createFineTune(projectId, taskId, data) {
    const task = this.ensureTask(taskId);
    if (task.project_id !== Number(projectId)) {
      throw new Error(`Task ${taskId} does not belong to project ${projectId}`);
    }
    const fineTune = {
      id: randomUUID(),
      project_id: Number(projectId),
      task_id: task.id,
      base_model: data.base_model,
      target_model: data.target_model,
      dataset_name: data.dataset_name ?? "Training dataset",
      dataset_reference: data.reference_url ?? null,
      dataset_preview: data.dataset_preview ?? null,
      status: "queued",
      created_at: now(),
      updated_at: now(),
      result_model: null,
      error_message: null,
      logs: []
    };
    this.fineTunes.push(fineTune);
    return fineTune;
  }

  //38.- Append a log entry describing the latest Ollama status.
  appendFineTuneLog(fineTuneId, stage, message) {
    const record = this.ensureFineTune(fineTuneId);
    record.logs.push({
      id: randomUUID(),
      at: now(),
      stage,
      message
    });
    record.updated_at = now();
    return record;
  }

  //39.- Update status/error/result metadata for a fine-tune.
  updateFineTune(fineTuneId, patch) {
    const record = this.ensureFineTune(fineTuneId);
    Object.assign(record, patch, { updated_at: now() });
    return record;
  }

  //40.- Retrieve the historical fine-tunes for a task.
  listFineTunes(projectId, taskId) {
    this.ensureTask(taskId);
    return this.fineTunes
      .filter(
        (ft) =>
          ft.project_id === Number(projectId) && ft.task_id === Number(taskId)
      )
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  //41.- Fetch a specific fine-tune for the UI.
  getFineTune(projectId, taskId, fineTuneId) {
    return this.ensureFineTuneForTask(projectId, taskId, fineTuneId);
  }
}

module.exports = { DataStore };
