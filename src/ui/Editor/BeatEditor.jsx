import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";

import ZonesSection    from "./ZonesSection";
import BeatSection     from "./BeatSection";
import CaptionsSection from "./CaptionsSection";
import SFXSection      from "./SFXSection";

if (typeof document !== "undefined" && !document.getElementById("editor-fonts")) {
  const link = document.createElement("link");
  link.id = "editor-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

const TABS = [
  { key: "beat",    label: "Beat",    color: "#7c5cfc" },
  { key: "zones",   label: "Zones",   color: "#f97316" },
  { key: "caption", label: "Caption", color: "#3b9eff" },
  { key: "sfx",     label: "SFX",     color: "#f0e040" },
];

export default function BeatEditor({ selectedZoneId, selectedZoneIds, onSelectZone, setActiveTab, beatTab, setBeatTab }) {
  const project      = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);
  const [localTab, setLocalTab] = useState("zones");

  const tab    = beatTab    ?? localTab;
  const setTab = setBeatTab ?? setLocalTab;

  if (!project || !activeBeatId) return null;

  const activeBeat = project.beats.find((b) => b.id === activeBeatId);
  if (!activeBeat) return null;

  const handleSelectZone = (id, modifierHeld) => {
    if (id !== null) setTab("zones");
    onSelectZone?.(id, modifierHeld);
  };

  return (
    <div className="flex-1 w-[70%] min-w-[320px] flex flex-col border-l border-[rgba(255,255,255,0.06)] ml-4 overflow-hidden">

      {/* Tab bar */}
      <div className="flex items-center gap-[2px] px-4 pt-4 pb-0 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(({ key, label, color }) => {
          const isActive = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className="relative px-4 py-[9px] text-[18px] font-bold transition-all"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "none", border: "none", cursor: "pointer",
                color: isActive ? "#ffffff" : "#66666a",
                borderBottom: isActive ? `4px solid ${color}` : "2px solid transparent",
                marginBottom: -1,
              }}>
              {label}
            </button>
          );
        })}
        <div className="ml-auto mb-2">
          <span className="px-2 py-[3px] text-[14px] rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[#16161f] text-[#55556a]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            BEAT #{activeBeat.order + 1}
          </span>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {tab === "beat"     && <BeatSection beat={activeBeat} isFirst={activeBeat.order === 0} />}
        {tab === "zones"    && (
          <ZonesSection
            beat={activeBeat}
            project={project}
            selectedZoneId={selectedZoneId}
            selectedZoneIds={selectedZoneIds}
            onSelectZone={handleSelectZone}
          />
        )}
        {tab === "caption"  && <CaptionsSection beat={activeBeat} />}
        {tab === "sfx"      && <SFXSection beat={activeBeat} />}
      </div>

    </div>
  );
}