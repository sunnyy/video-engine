/**
 * EditorPanel.jsx
 * src/ui/Editor/EditorPanel.jsx
 */
import { useState }        from "react";
import { useProjectStore } from "../../store/useProjectStore";
import BeatEditor          from "./BeatEditor";
import AudioSection        from "./AudioSection";
import AvatarSection       from "./AvatarSection";
import VideoOverlaySection from "./VideoOverlaySection";
import BrandingSection     from "./BrandingSection";
import FilesSection        from "./FilesSection";
import MyRulesSection      from "./MyRulesSection";

function ScriptPanel() {
  const project = useProjectStore((s) => s.project);
  const [copied, setCopied] = useState(false);

  if (!project) return null;

  const beats = project.beats || [];
  const fullScript = beats
    .filter(b => b.spoken?.trim())
    .map(b => b.spoken.trim())
    .join(" ");

  const copyAll = () => {
    navigator.clipboard.writeText(fullScript).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b10] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <span className="text-[13px] font-bold uppercase tracking-widest text-[#55556a]" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          Script
        </span>
        <button
          onClick={copyAll}
          disabled={!fullScript}
          className="text-[12px] px-3 py-[5px] rounded-[6px] border cursor-pointer transition-all disabled:opacity-30"
          style={{
            background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
            borderColor: copied ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)",
            color: copied ? "#22c55e" : "#9494a8",
          }}
        >
          {copied ? "Copied!" : "Copy All"}
        </button>
      </div>

      {/* Beat-by-beat script */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {beats.length === 0 && (
          <div className="text-[13px] text-[#33333f]">No beats yet.</div>
        )}
        {beats.map((beat, i) => (
          <div key={beat.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono text-[#55556a]">BEAT {i + 1}</span>
              {beat.intent && (
                <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-[rgba(124,92,252,0.1)] text-[#7c5cfc] font-mono">{beat.intent}</span>
              )}
            </div>
            {beat.spoken?.trim() ? (
              <p className="text-[14px] text-[#c8c8d8] leading-relaxed m-0">{beat.spoken.trim()}</p>
            ) : (
              <p className="text-[13px] text-[#33333f] italic m-0">No spoken text</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EditorPanel({
  activeTab, setActiveTab,
  beatTab, setBeatTab,
  selectedZoneId, selectedZoneIds, onSelectZone,
}) {
  const handleSelectZone = (id, modifierHeld) => {
    if (id !== null) { setActiveTab("beats"); setBeatTab("zones"); }
    onSelectZone(id, modifierHeld);
  };

  if (activeTab === "script") {
    return <ScriptPanel />;
  }

  if (activeTab === "audio") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <AudioSection />
      </div>
    );
  }

  if (activeTab === "avatar") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <AvatarSection />
      </div>
    );
  }

  if (activeTab === "videoOverlays") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-[#0b0b10] px-5 py-5">
        <VideoOverlaySection />
      </div>
    );
  }

  if (activeTab === "branding") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <BrandingSection />
      </div>
    );
  }

  if (activeTab === "files") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <FilesSection />
      </div>
    );
  }

  if (activeTab === "myRules") {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <MyRulesSection />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <div className="flex-1 flex min-h-0">
        <BeatEditor
          selectedZoneId={selectedZoneId}
          selectedZoneIds={selectedZoneIds}
          onSelectZone={handleSelectZone}
          setActiveTab={setActiveTab}
          beatTab={beatTab}
          setBeatTab={setBeatTab}
        />
      </div>
    </div>
  );
}
