/* global vi, beforeEach, afterEach, it, expect */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TasksTab } from "../TasksTab";
import type { Task } from "../../../api/types";

//1.- Mock every API surface the component touches so we can control responses.
const mockApi = vi.hoisted(() => ({
  listTasks: vi.fn(),
  listRuns: vi.fn(),
  startRunForTask: vi.fn(),
  listMessages: vi.fn(),
  deleteTask: vi.fn(),
  createMessage: vi.fn(),
  subscribeToMessages: vi.fn(),
  listFineTunes: vi.fn(),
  createFineTune: vi.fn(),
  updateTask: vi.fn()
}));

vi.mock("../../../api/client", () => ({
  api: mockApi
}));

const sampleTasks: Task[] = [
  {
    id: 1,
    project_id: 1,
    title: "Write scaffolding",
    description: "Stub out the UI",
    status: "idle",
    priority: 1,
    task_prompt: null,
    created_at: "2023-01-01",
    updated_at: "2023-01-02",
    runs_count: 4,
    active_model: null,
    active_fine_tune_id: null
  },
  {
    id: 2,
    project_id: 1,
    title: "Feature spec",
    description: "Outline the feature",
    status: "running",
    priority: 2,
    task_prompt: null,
    created_at: "2023-01-03",
    updated_at: "2023-01-04",
    runs_count: 2,
    active_model: null,
    active_fine_tune_id: null
  }
];

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.listTasks.mockResolvedValue(sampleTasks);
  mockApi.listRuns.mockResolvedValue([
    {
      id: 10,
      task_id: 1,
      status: "running",
      started_at: "2023-01-01",
      finished_at: null,
      run_summary: null
    }
  ]);
  mockApi.listMessages.mockResolvedValue([]);
  mockApi.startRunForTask.mockResolvedValue({
    id: 30,
    task_id: 2,
    status: "running",
    started_at: "2023-01-05",
    finished_at: null,
    run_summary: null
  });
  mockApi.deleteTask.mockResolvedValue({ success: true });
  mockApi.subscribeToMessages.mockReturnValue(() => {});
  mockApi.listFineTunes.mockResolvedValue([]);
  mockApi.createFineTune.mockResolvedValue({
    id: "ft-1",
    project_id: 1,
    task_id: 1,
    base_model: "llama",
    target_model: "task-ft",
    dataset_name: "ds",
    dataset_reference: null,
    dataset_preview: null,
    status: "succeeded",
    created_at: "2023-01-01",
    updated_at: "2023-01-01",
    result_model: "task-ft",
    error_message: null,
    logs: []
  });
  mockApi.updateTask.mockResolvedValue(sampleTasks[0]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("selects tasks when pressing Enter and Space", async () => {
  render(<TasksTab projectId={1} />);

  const firstRow = await screen.findByTestId("task-row-1");
  const secondRow = await screen.findByTestId("task-row-2");

  await waitFor(() =>
    expect(firstRow.getAttribute("aria-pressed")).toBe("true")
  );

  //2.- Trigger the Enter key to mimic activating the row.
  secondRow.focus();
  fireEvent.keyDown(secondRow, { key: "Enter" });
  await waitFor(() =>
    expect(secondRow.getAttribute("aria-pressed")).toBe("true")
  );

  //3.- Trigger the Space key to ensure it also toggles selection.
  firstRow.focus();
  fireEvent.keyDown(firstRow, { key: " " });
  await waitFor(() =>
    expect(firstRow.getAttribute("aria-pressed")).toBe("true")
  );
});

it("only deletes when the delete button is activated", async () => {
  const user = userEvent.setup();
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

  render(<TasksTab projectId={1} />);

  const secondRow = await screen.findByTestId("task-row-2");
  fireEvent.keyDown(secondRow, { key: "Enter" });

  await waitFor(() => expect(confirmSpy).not.toHaveBeenCalled());
  expect(mockApi.deleteTask).not.toHaveBeenCalled();

  //4.- Click the explicit delete button and ensure only then the API call happens.
  const deleteButton = await screen.findByRole("button", {
    name: "Delete Write scaffolding"
  });
  await user.click(deleteButton);

  await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
  expect(mockApi.deleteTask).toHaveBeenCalledWith(1, 1);
});
