import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { getProjectById } from "../services/projects/projectService";

import ScriptStep from "../ui/Workflow/ScriptStep";
import TalkingHeadStep from "../ui/Workflow/TalkingHeadStep";

import Header from "../ui/Editor/Header";
import Preview from "../ui/Editor/Preview";
import Sidebar from "../ui/Editor/Sidebar";
import EditorPanel from "../ui/Editor/EditorPanel";

export default function Editor() {
  const { id } = useParams();
  const setProject = useProjectStore((s) => s.setProject);
  const setDatabaseId = useProjectStore((s) => s.setDatabaseId);
  const project = useProjectStore((s) => s.project);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("beats");

  useEffect(() => {
    async function load() {
      const data = await getProjectById(id);

      setDatabaseId(data.id);
      setProject(data.safe_project_json);

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading || !project) return null;

  if (!project.workflow.script_completed) {
    return <ScriptStep />;
  }

  if (
    project.meta.mode === "talking_head" &&
    !project.workflow.avatar_completed
  ) {
    return <TalkingHeadStep />;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <Header />

      <div className="flex flex-1 gap-6 mt-6">
        <div className="flex-1 flex-col mr-10">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="flex-1 flex justify-center mt-4">
            <EditorPanel activeTab={activeTab} />
          </div>
        </div>
        <Preview />
      </div>
    </div>
  );
}