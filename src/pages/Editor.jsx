import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { getProjectById } from "../services/projects/projectService";

import ScriptStep from "../ui/Workflow/ScriptStep";
import TalkingHeadStep from "../ui/Workflow/TalkingHeadStep";

import Header from "../ui/Editor/Header";
import Sidebar from "../ui/Editor/Sidebar";
import SystemMessage from "../ui/Editor/SystemMessage";
import EditorPanel from "../ui/Editor/EditorPanel";
import Preview from "../ui/Editor/Preview";

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

  if (project.meta.mode === "talking_head" && !project.workflow.avatar_completed) {
    return <TalkingHeadStep />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#13131f] text-[#e8e8f0] overflow-hidden">
      <Header />

      <div className="flex flex-1 min-h-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col h-full min-h-0 bg-[#0b0b10]">
          <SystemMessage />
          <EditorPanel activeTab={activeTab} />
        </div>

        <Preview />
      </div>
    </div>
  );
}
