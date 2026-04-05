import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { getProjectById } from "../services/projects/projectService";

import ScriptStep from "../ui/Workflow/ScriptStep";
import TalkingHeadStep from "../ui/Workflow/TalkingHeadStep";

import Header from "../ui/Editor/Header";
import Sidebar from "../ui/Editor/Sidebar";
import BeatList from "../ui/Editor/BeatList";
import SystemMessage from "../ui/Editor/SystemMessage";
import EditorPanel from "../ui/Editor/EditorPanel";
import CanvasPreview from "../ui/Editor/CanvasPreview";

export default function Editor() {
  const { id } = useParams();

  const setProject = useProjectStore((s) => s.setProject);
  const setDatabaseId = useProjectStore((s) => s.setDatabaseId);
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("beats");
  const [selectedZoneIds, setSelectedZoneIds] = useState(new Set());

  useEffect(() => {
    async function load() {
      const data = await getProjectById(id);
      setDatabaseId(data.id);
      setProject(data.safe_project_json);
      setLoading(false);
    }
    load();
  }, [id]);

  // Clear zone selection when active beat changes
  useEffect(() => {
    setSelectedZoneIds(new Set());
  }, [activeBeatId]);

  if (loading || !project) return null;
  if (!project.workflow.script_completed) return <ScriptStep />;
  if (project.meta.mode === "talking_head" && !project.workflow.avatar_completed) return <TalkingHeadStep />;

  const selectedZoneId = selectedZoneIds.size === 1 ? [...selectedZoneIds][0] : null;

  const handleSelectZone = (id, modifierHeld = false) => {
    if (id === null) {
      setSelectedZoneIds(new Set());
      return;
    }
    if (modifierHeld) {
      setSelectedZoneIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedZoneIds(new Set([id]));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#13131f] text-[#e8e8f0] overflow-hidden">
      <Header />
      <SystemMessage />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[7%]">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div className="w-[18%]">
          <BeatList setActiveTab={setActiveTab} />
        </div>

        <div className="w-[35%]">
          <CanvasPreview selectedZoneIds={selectedZoneIds} onSelectZone={handleSelectZone} />
        </div>

        <div className="w-[40%]">
          <EditorPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedZoneId={selectedZoneId}
            selectedZoneIds={selectedZoneIds}
            onSelectZone={handleSelectZone}
          />
        </div>
      </div>
    </div>
  );
}
