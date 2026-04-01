/**
 * SystemMessage.jsx
 * src/ui/Editor/SystemMessage.jsx
 * #33 — system hints, warnings, and project scorer shown above the editor
 */
import React, { useState, useMemo } from "react";
import { useProjectStore } from "../../store/useProjectStore";

function analyzeProject(project) {
  const messages = [];
  if (!project?.beats?.length) return messages;

  const beats = project.beats;

  // Empty zones
  const emptyZones = beats.flatMap((b, i) =>
    Object.entries(b.zones || {})
      .filter(([, z]) => !z?.content?.asset?.src && z?.role === "asset")
      .map(([slot]) => `Beat ${i + 1} · ${slot}`)
  );
  if (emptyZones.length > 0) {
    messages.push({
      type:    "warning",
      icon:    "⚠️",
      text:    `${emptyZones.length} zone${emptyZones.length > 1 ? "s" : ""} missing assets: ${emptyZones.slice(0, 3).join(", ")}${emptyZones.length > 3 ? "…" : ""}`,
    });
  }

  // No music
  if (!project.audio?.music) {
    messages.push({ type: "tip", icon: "🎵", text: "No background music selected. Add one in the Audio tab." });
  }

  // No TTS
  if (!project.audio?.tts) {
    messages.push({ type: "tip", icon: "🎙️", text: "No voice/TTS uploaded. Add one in the Audio tab for best results." });
  }

  // All same layout
  const layouts = beats.map(b => b.layout);
  const uniqueLayouts = new Set(layouts);
  if (uniqueLayouts.size === 1 && beats.length > 2) {
    messages.push({ type: "tip", icon: "🎨", text: "All beats use the same layout. Consider varying them for more visual interest." });
  }

  // Useless background (scale 100% + colored bg = bg invisible)
  const hiddenBg = beats.filter(b =>
    Object.values(b.zones || {}).some(z =>
      (z?.style?.scale ?? 1) >= 1 && z?.background?.kind === "color" && z?.background?.color
    )
  );
  if (hiddenBg.length > 0) {
    messages.push({ type: "tip", icon: "🖼️", text: `${hiddenBg.length} zone(s) have a background set but Scale is 100% — background won't be visible.` });
  }

  // Ready message (no warnings)
  if (messages.filter(m => m.type === "warning").length === 0) {
    messages.unshift({ type: "success", icon: "✅", text: "Your video looks ready! Check the preview, then export when satisfied." });
  }

  return messages;
}

export default function SystemMessage() {
  const project = useProjectStore((s) => s.project);
  const [dismissed, setDismissed] = useState(new Set());

  const messages = useMemo(() => analyzeProject(project), [project]);
  const visible  = messages.filter((_, i) => !dismissed.has(i));

  if (!visible.length) return null;

  const TYPE_STYLES = {
    success: { border: "rgba(45,212,191,0.3)", bg: "rgba(45,212,191,0.06)", text: "#2dd4bf" },
    warning: { border: "rgba(251,146,60,0.3)", bg: "rgba(251,146,60,0.06)", text: "#fb923c" },
    tip:     { border: "rgba(255,255,255,0.07)", bg: "rgba(255,255,255,0.02)", text: "#9494a8" },
  };

  // Show only the top message (most important first)
  const msg   = visible[0];
  const idx   = messages.indexOf(msg);
  const style = TYPE_STYLES[msg.type] || TYPE_STYLES.tip;

  return (
    <div className="flex items-center gap-3 px-4 py-[10px] border-b mx-0"
      style={{ borderColor: style.border, background: style.bg }}>
      <span className="text-[16px] shrink-0">{msg.icon}</span>
      <span className="flex-1 text-[13px]" style={{ color: style.text }}>{msg.text}</span>
      {visible.length > 1 && (
        <span className="text-[12px] text-[#55556a] shrink-0">{visible.length} hints</span>
      )}
      <button onClick={() => setDismissed(d => new Set([...d, idx]))}
        className="text-[#55556a] hover:text-[#e8e8f0] bg-transparent border-0 cursor-pointer text-[14px] shrink-0">
        ✕
      </button>
    </div>
  );
}