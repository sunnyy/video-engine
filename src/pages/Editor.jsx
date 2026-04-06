import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { getProjectById } from "../services/projects/projectService";

import Header from "../ui/Editor/Header";
import Sidebar from "../ui/Editor/Sidebar";
import BeatList from "../ui/Editor/BeatList";
import SystemMessage from "../ui/Editor/SystemMessage";
import EditorPanel from "../ui/Editor/EditorPanel";
import CanvasPreview from "../ui/Editor/CanvasPreview";

export default function Editor() {
  const { id } = useParams();

  const setProject     = useProjectStore((s) => s.setProject);
  const setDatabaseId  = useProjectStore((s) => s.setDatabaseId);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("beats");
  const [beatTab, setBeatTab] = useState("layout");
  const [selectedZoneIds, setSelectedZoneIds] = useState(new Set());

  useEffect(() => {
    async function load() {
      const data = await getProjectById(id);
      setDatabaseId(data.id);
      setProjectName(data.name);
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

  const handleDeleteZone = (zoneId) => {
    const { project, activeBeatId, updateBeat } = useProjectStore.getState();
    if (!project || !activeBeatId) return;
    const beat = project.beats.find(b => b.id === activeBeatId);
    if (!beat) return;
    const newZones = { ...beat.zones };
    delete newZones[zoneId];
    updateBeat(activeBeatId, { zones: newZones });
  };

  const selectedZoneId = selectedZoneIds.size === 1 ? [...selectedZoneIds][0] : null;

  const handleSelectZone = (id, modifierHeld = false) => {
    if (id === null) {
      setSelectedZoneIds(new Set());
      return;
    }
    // Auto-switch sidebar to Beats tab and BeatEditor to Zones tab
    setActiveTab("beats");
    setBeatTab("zones");
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

  const is169 = project.meta?.orientation === "16:9";

  // Widen canvas column for landscape so the 16:9 preview has enough height
  const cols = is169
    ? { sidebar: "5%", beatList: "13%", canvas: "44%", panel: "38%" }
    : { sidebar: "7%", beatList: "18%", canvas: "35%", panel: "40%" };

  return (
    <div className="flex flex-col h-screen bg-[#13131f] text-[#e8e8f0] overflow-hidden">
      <Header />
      <SystemMessage />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: cols.sidebar }}>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        <div style={{ width: cols.beatList }}>
          <BeatList setActiveTab={setActiveTab} />
        </div>

        <div style={{ width: cols.canvas }}>
          <CanvasPreview selectedZoneIds={selectedZoneIds} onSelectZone={handleSelectZone} onDeleteZone={handleDeleteZone} />
        </div>

        <div style={{ width: cols.panel }}>
          <EditorPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            beatTab={beatTab}
            setBeatTab={setBeatTab}
            selectedZoneId={selectedZoneId}
            selectedZoneIds={selectedZoneIds}
            onSelectZone={handleSelectZone}
          />
        </div>
      </div>
    </div>
  );
}