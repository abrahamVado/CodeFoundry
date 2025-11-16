import React from "react";

export const ProjectListPage: React.FC = () => {
  //1.- Let the welcome card scale with the viewport so empty states do not look boxed-in.
  return (
    <div className="flex h-full w-full items-center justify-center bg-appBg/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-listBg shadow-card border border-borderSoft px-6 py-5 text-center">
        <h1 className="text-sm font-semibold text-textMain mb-2">
          Welcome to LLM Project Manager
        </h1>
        <p className="text-xs text-textMuted">
          Use the project list on the left to open a workspace, or click the{" "}
          <span className="font-semibold">+</span> button to create a new
          project.
        </p>
      </div>
    </div>
  );
};
