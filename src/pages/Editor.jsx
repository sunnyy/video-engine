import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useProjectStore } from "../store/useProjectStore";
import { getProjectById } from "../services/projects/projectService";

import Header from "../ui/Editor/Header";
import SystemMessage from "../ui/Editor/SystemMessage";
import Sidebar from "../ui/Editor/Sidebar";
import BeatList from "../ui/Editor/BeatList";
import EditorPanel from "../ui/Editor/EditorPanel";
import CanvasPreview from "../ui/Editor/CanvasPreview";

export default function Editor() {
  const { id } = useParams();

  const setProject = useProjectStore((s) => s.setProject);
  const setDatabaseId = useProjectStore((s) => s.setDatabaseId);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [renderProgress, setRenderProgress] = useState(null); // null = idle, 0-100 = rendering
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
    const beat = project.beats.find((b) => b.id === activeBeatId);
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

  return (
    <div className="flex flex-col h-screen bg-[#13131f] text-[#e8e8f0] overflow-hidden">
      <Header progress={renderProgress} setProgress={setRenderProgress} />

      {/* Render lock overlay */}
      {renderProgress !== null && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(7,7,16,0.82)",
          backdropFilter: "blur(4px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 20,
          pointerEvents: "all",
        }}>
          {/* Spinner */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "3px solid rgba(245,197,24,0.15)",
            borderTopColor: "#f5c518",
            animation: "spin 0.9s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0", marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>
              Rendering…
            </div>
            <div style={{ fontSize: 14, color: "#9494a8", fontFamily: "'JetBrains Mono',monospace" }}>
              {renderProgress}% complete — please don't close this tab
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: 280, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #f5c518, #f97316)",
              width: `${renderProgress}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 flex-col" style={{ width: "65%" }}>
          <div className="flex flex-1 min-h-0 overflow-hidden" style={{ width: "100%" }}>
            <div style={{ width: "10%", height: "100%" }}>
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div style={{ width: "28%", height: "100%" }}>
              <BeatList setActiveTab={setActiveTab} setBeatTab={setBeatTab} />
            </div>

            <div className="flex flex-col min-h-0" style={{ width: "62%", minWidth: "62%", height: "100%" }}>
              <SystemMessage />

              <CanvasPreview
                selectedZoneIds={selectedZoneIds}
                onSelectZone={handleSelectZone}
                onDeleteZone={handleDeleteZone}
              />
            </div>
          </div>
        </div>

        <div style={{ width: "35%" }}>
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
