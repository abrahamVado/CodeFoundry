export type Project = {
  id: number;
  title: string;
  description: string | null;
  base_prompt: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  last_run_at?: string | null;
};

export type Task = {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: "idle" | "running" | "paused" | "done" | string;
  priority: number;
  task_prompt: string | null;
  created_at: string;
  updated_at: string;
  runs_count?: number;
};

export type TaskGroup = {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
};

export type TaskRun = {
  id: number;
  task_id: number;
  status: "running" | "finished" | "failed" | string;
  started_at: string;
  finished_at: string | null;
  run_summary: string | null;
  task_title?: string;
};

export type TaskMessage = {
  id: number;
  task_run_id: number;
  role: "system" | "assistant" | "user" | string;
  content: string;
  created_at: string;
};
export type TasksAsCodeTask = {
  id?: number;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
};

export type TasksAsCodeGroup = {
  id?: number;
  title: string;
  description?: string;
  tasks: TasksAsCodeTask[];
};

export type TasksAsCodePayload = {
  project: {
    id: number;
    title: string;
    description?: string;
  };
  groups: TasksAsCodeGroup[];
  ungrouped_tasks: TasksAsCodeTask[];
};
