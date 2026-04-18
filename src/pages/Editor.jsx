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
  const [activeTab, setActiveTab] = useState("beats");
  const [beatTab, setBeatTab] = useState("layout");
  const [selectedZoneIds, setSelectedZoneIds] = useState(new Set());
  const [showReviewBanner, setShowReviewBanner] = useState(!!location.state?.showReviewPrompt);

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
      <Header />

      {showReviewBanner && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, #1a1a2e, #16213e)",
            borderBottom: "1px solid #7c5cfc44",
            padding: "10px 20px",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: "#c8c8e0", fontWeight: 500 }}>
              Your video is ready — review before exporting:
            </span>
            <span style={{ fontSize: 12, color: "#9090b0" }}>
              Check images &amp; text on each beat &nbsp;·&nbsp; Swap any images that don't fit &nbsp;·&nbsp; Tweak
              zones if needed &nbsp;·&nbsp; Then export
            </span>
          </div>
          <button
            onClick={() => setShowReviewBanner(false)}
            style={{
              background: "none",
              border: "none",
              color: "#6060a0",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "0 4px",
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 flex-col" style={{ width: "70%" }}>
          <div className="flex flex-1 min-h-0 overflow-hidden" style={{ width: "100%" }}>
            <div style={{ width: "10%", height: "100%" }}>
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>

            <div style={{ width: "25%", height: "100%" }}>
              <BeatList setActiveTab={setActiveTab} setBeatTab={setBeatTab} />
            </div>

            <div style={{ width: "65%", minWidth: "65%", height: "100%" }}>
              <SystemMessage />

              <CanvasPreview
                selectedZoneIds={selectedZoneIds}
                onSelectZone={handleSelectZone}
                onDeleteZone={handleDeleteZone}
              />
            </div>
          </div>
        </div>

        <div style={{ width: "30%" }}>
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
