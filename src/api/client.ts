import type {
  Project,
  Task,
  TaskGroup,
  TaskRun,
  TaskMessage,
  FineTuneJob,
  FineTuneRequest,
  TasksAsCodePayload
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

type MessageStreamHandlers = {
  onSnapshot?: (messages: TaskMessage[]) => void;
  onMessage?: (message: TaskMessage) => void;
  onError?: (event: Event) => void;
};

//1.- Encapsulate the SSE wiring used by both the chat page and tabs.
function subscribeToMessageStream(runId: number, handlers: MessageStreamHandlers) {
  if (typeof EventSource === "undefined") {
    console.warn("EventSource is unavailable in this environment.");
    handlers.onError?.(new Event("error"));
    return () => {};
  }
  const streamUrl = `${API_BASE_URL}/runs/${runId}/messages/stream`;
  const source = new EventSource(streamUrl);

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "snapshot") {
        handlers.onSnapshot?.(payload.messages ?? []);
      } else if (payload.type === "append") {
        handlers.onMessage?.(payload.message);
      }
    } catch (err) {
      console.error("message stream parse error", err);
    }
  };

  source.onerror = (event) => {
    handlers.onError?.(event);
  };

  return () => {
    source.close();
  };
}

// Projects
export const api = {
  listProjects: () => request<Project[]>("/projects"),
  getProject: (projectId: number) => request<Project>(`/projects/${projectId}`),
  createProject: (data: Partial<Project>) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        base_prompt: data.base_prompt
      })
    }),
  updateProject: (projectId: number, data: Partial<Project>) =>
    request<Project>(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
  deleteProject: (projectId: number) =>
    request<{ success: boolean }>(`/projects/${projectId}`, {
      method: "DELETE"
    }),

  // Tasks
  listTasks: (projectId: number) =>
    request<Task[]>(`/projects/${projectId}/tasks`),
  getTask: (projectId: number, taskId: number) =>
    request<Task>(`/projects/${projectId}/tasks/${taskId}`),
  createTask: (projectId: number, data: Partial<Task>) =>
    request<Task>(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  updateTask: (projectId: number, taskId: number, data: Partial<Task>) =>
    request<Task>(`/projects/${projectId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
  deleteTask: (projectId: number, taskId: number) =>
    request<{ success: boolean }>(`/projects/${projectId}/tasks/${taskId}`, {
      method: "DELETE"
    }),
  listFineTunes: (projectId: number, taskId: number) =>
    request<FineTuneJob[]>(
      `/projects/${projectId}/tasks/${taskId}/fine-tunes`
    ),
  getFineTune: (projectId: number, taskId: number, fineTuneId: string) =>
    request<FineTuneJob>(
      `/projects/${projectId}/tasks/${taskId}/fine-tunes/${fineTuneId}`
    ),
  createFineTune: (projectId: number, taskId: number, payload: FineTuneRequest) =>
    request<FineTuneJob>(
      `/projects/${projectId}/tasks/${taskId}/fine-tunes`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    ),

  // Task groups
  listTaskGroups: (projectId: number) =>
    request<TaskGroup[]>(`/projects/${projectId}/groups`),
  createTaskGroup: (projectId: number, data: Partial<TaskGroup>) =>
    request<TaskGroup>(`/projects/${projectId}/groups`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  updateTaskGroup: (projectId: number, groupId: number, data: Partial<TaskGroup>) =>
    request<TaskGroup>(`/projects/${projectId}/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
  deleteTaskGroup: (projectId: number, groupId: number) =>
    request<{ success: boolean }>(`/projects/${projectId}/groups/${groupId}`, {
      method: "DELETE"
    }),
  assignTasksToGroup: (projectId: number, groupId: number, taskIds: number[]) =>
    request<{ success: boolean }>(`/projects/${projectId}/groups/${groupId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ taskIds })
    }),
  removeTaskFromGroup: (projectId: number, groupId: number, taskId: number) =>
    request<{ success: boolean }>(
      `/projects/${projectId}/groups/${groupId}/tasks/${taskId}`,
      { method: "DELETE" }
    ),

  // Runs
  listRuns: (projectId: number, taskId?: number) => {
    const q = taskId ? `?taskId=${taskId}` : "";
    return request<TaskRun[]>(`/projects/${projectId}/runs${q}`);
  },
  startRunForTask: (projectId: number, taskId: number) =>
    request<TaskRun>(`/projects/${projectId}/runs/tasks/${taskId}/start`, {
      method: "POST"
    }),
  updateRun: (projectId: number, runId: number, data: Partial<TaskRun>) =>
    request<TaskRun>(`/projects/${projectId}/runs/${runId}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  // Messages
  listMessages: (runId: number) =>
    request<TaskMessage[]>(`/runs/${runId}/messages`),
  createMessage: (runId: number, data: { role?: string; content: string }) =>
    request<TaskMessage>(`/runs/${runId}/messages`, {
      method: "POST",
      body: JSON.stringify(data)
    }),
  subscribeToMessages: subscribeToMessageStream,
  // Tasks as code
  getTasksAsCode: (projectId: number) =>
    request<TasksAsCodePayload>(`/projects/${projectId}/tasks-as-code`),

  updateTasksAsCode: (projectId: number, payload: TasksAsCodePayload) =>
    request<{ ok: boolean }>(`/projects/${projectId}/tasks-as-code`, {
      method: "PUT",
      body: JSON.stringify(payload)
    })
};

