import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry.js";

import LayoutSelector from "./LayoutSelector";
import ZonesSection from "./ZonesSection";
import CaptionsSection from "./CaptionsSection";
import OverlaySection from "./OverlaySection";

if (typeof document !== "undefined" && !document.getElementById("editor-fonts")) {
  const link = document.createElement("link");
  link.id = "editor-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

function Section({ label, color, children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4 rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#111118] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#16161f] transition cursor-pointer"
        style={{ background: "none", border: "none" }}
      >
        <div className="w-[5px] h-[20px] rounded-sm flex-shrink-0" style={{ background: color }} />

        <span
          className="flex-1 text-left text-[15px] font-bold tracking-[0.1em] uppercase text-[#bbb]"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {label}
        </span>

        <span
          className="text-[#55556a] text-2xl transition-transform duration-200"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {open && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  );
}

export default function BeatEditor() {
  const project = useProjectStore((s) => s.project);
  const activeBeatId = useProjectStore((s) => s.activeBeatId);

  if (!project || !activeBeatId) return null;

  const activeBeat = project.beats.find((b) => b.id === activeBeatId);
  if (!activeBeat) return null;

  const layout = layoutRegistry[activeBeat.layout];
  const structure = layout?.structure || {};
  const zones = activeBeat.zones || {};

  return (
    <div className="flex-1 w-[75%] min-w-[320px] overflow-y-auto border-r border-[rgba(255,255,255,0.06)] bg-[#0b0b10] px-6 py-5 ml-4">
      {/* Beat Header */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className="px-2 py-[4px] text-[10px] rounded-[4px] border border-[rgba(255,255,255,0.1)] bg-[#16161f] text-[#55556a]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          BEAT #{activeBeat.order + 1}
        </span>

        <h3 className="m-0 text-[16px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne', sans-serif" }}>
          Editing Beat #{activeBeat.order + 1}
        </h3>
      </div>

      {/* Layout */}
      <Section color="#7c5cfc" label="Layout">
        <LayoutSelector beat={activeBeat} />
      </Section>

      {/* Zones */}
      <Section color="#f97316" label="Zones">
        <ZonesSection beat={activeBeat} project={project} />
      </Section>

      {/* Caption */}
      {structure.caption && (
        <Section color="#3b9eff" label="Caption">
          <CaptionsSection beat={activeBeat} />
        </Section>
      )}

      {/* Overlays */}
      <Section color="#2dd4bf" label="Overlays">
        <OverlaySection beat={activeBeat} />
      </Section>
    </div>
  );
}
