import React from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectFormPage } from "./pages/ProjectFormPage";
import { ProjectDashboardPage } from "./pages/ProjectDashboardPage";
import { TaskChatPage } from "./pages/TaskChatPage";

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProjectListPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:projectId/edit" element={<ProjectFormPage />} />
        <Route path="/projects/:projectId" element={<ProjectDashboardPage />} />
        <Route
          path="/projects/:projectId/tasks/:taskId/runs/:runId"
          element={<TaskChatPage />}
        />
      </Routes>
    </Layout>
  );
};

export default App;
