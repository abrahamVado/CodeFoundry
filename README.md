# LLM Project Frontend Scaffold

React + Vite + Tailwind frontend for the LLM Project Manager.

This is a **pure frontend scaffold** built to talk to the backend described previously:

- Backend base URL: `http://localhost:4000` (configurable via `VITE_API_BASE_URL`).
- Implements:
  - Project list
  - Project creation / edition
  - Project dashboard with tabs:
    - Tasks
    - Task groups
    - Runs / overview
  - Task chat page:
    - Messages per task run
    - User can send messages (stored via backend)

## Stack

- Vite
- React 18
- TypeScript
- React Router
- Tailwind CSS

## Install

```bash
npm install
```

Create `.env` (optional):

```bash
echo "VITE_API_BASE_URL=http://localhost:4000" > .env
```

If omitted, it defaults to `http://localhost:4000`.

## Run

```bash
npm run dev
```

App is served on `http://localhost:5173`.

## Main routes

- `/` – Project list
- `/projects/new` – New project form
- `/projects/:projectId/edit` – Edit project
- `/projects/:projectId` – Project dashboard (tabs: tasks, groups, runs)
- `/projects/:projectId/tasks/:taskId/runs/:runId` – Task chat page for a specific run

## How it maps to backend

- Projects:
  - `GET /projects`
  - `POST /projects`
  - `GET /projects/:projectId`
  - `PUT /projects/:projectId`
  - `DELETE /projects/:projectId`

- Tasks:
  - `GET /projects/:projectId/tasks`
  - `POST /projects/:projectId/tasks`
  - `GET /projects/:projectId/tasks/:taskId`
  - `PUT /projects/:projectId/tasks/:taskId`
  - `DELETE /projects/:projectId/tasks/:taskId`

- Groups:
  - `GET /projects/:projectId/groups`
  - `POST /projects/:projectId/groups`
  - `PUT /projects/:projectId/groups/:groupId`
  - `DELETE /projects/:projectId/groups/:groupId`
  - `POST /projects/:projectId/groups/:groupId/tasks` – assign tasks to group

- Runs:
  - `GET /projects/:projectId/runs`
  - `GET /projects/:projectId/runs?taskId=123`
  - `POST /projects/:projectId/runs/tasks/:taskId/start`
  - `PUT /projects/:projectId/runs/:runId`

- Messages:
  - `GET /runs/:runId/messages`
  - `POST /runs/:runId/messages`

You can now:

1. Run the backend on `http://localhost:4000`.
2. Run this frontend on `http://localhost:5173`.
3. Navigate the UI:
   - Create projects.
   - Create tasks, groups.
   - Start runs for tasks.
   - Open the task chat page for a run and send messages.

Later you can plug in an LLM call (Ollama/OpenAI/etc.) in the backend messages route so that sending a user message also triggers an assistant reply and persists it as another message.
