import { useState } from "react";

/**
 * ScriptConfirmModal — shared script preview/confirmation for the chatbox services.
 * Shows the generated script split by scene with an editable line each. No rewrite/
 * chat — just tweak the text and confirm. The whole video is built from this script,
 * so this is the user's chance to get it right before producing.
 *
 * Props:
 *   scenes       array of scene objects (each has the spoken line under `scriptKey`)
 *   scriptKey    field holding the spoken line (default "script_segment")
 *   onConfirm    fn(editedScenes) — scenes with updated lines
 *   onCancel     fn()
 *   accent       hex
 *   title/sub    optional copy
 */

const T = { surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a" };

export default function ScriptConfirmModal({
  scenes = [],
  scriptKey = "script_segment",
  onConfirm,
  onCancel,
  accent = "#7c5cfc",
  title = "Review your script",
  sub = "Your whole video is built from this — tweak any line before we generate.",
  confirmLabel = "Looks good — Generate",
  singleBlock = false,   // one continuous script (e.g. SaaS narration) → no "Scene N" labels
}) {
  const [lines, setLines] = useState(() => scenes.map(s => s?.[scriptKey] ?? ""));
  const setLine = (i, v) => setLines(arr => arr.map((x, j) => (j === i ? v : x)));

  const confirm = () => onConfirm?.(scenes.map((s, i) => ({ ...s, [scriptKey]: (lines[i] ?? "").trim() })));
  const empty = lines.every(l => !l.trim());

  return (
    <div
      onClick={onCancel}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 600, maxWidth: "100%", maxHeight: "86vh", display: "flex", flexDirection: "column", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}
      >
        <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>{title}</div>
            <button onClick={onCancel} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{sub}</div>
        </div>

        <div style={{ padding: "16px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {scenes.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: accent, marginBottom: 6 }}>
                {singleBlock ? "Voiceover script" : `Scene ${i + 1}${s?.intent ? ` · ${s.intent}` : ""}`}
              </div>
              <textarea
                value={lines[i] ?? ""}
                onChange={(e) => setLine(i, e.target.value)}
                rows={2}
                style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit", lineHeight: 1.5, padding: "10px 12px", outline: "none" }}
              />
            </div>
          ))}
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
            style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={confirm} disabled={empty}
            style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: empty ? `${accent}40` : accent, color: "#fff", fontSize: 13, fontWeight: 800, cursor: empty ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
