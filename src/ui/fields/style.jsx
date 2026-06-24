import { useState } from "react";
import { Palette } from "lucide-react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";
import StylePreview from "./StylePreview.jsx";

/**
 * Style field. Style vocabularies are service-specific (AI Video has 7 presets,
 * SaaS/Typography have their own), so options are passed in from the registry.
 * Each option: { id, label, desc?, colors? }.
 */

export const meta = { id: "style", apiKey: "styleId", label: "Visual style", default: "auto" };

/**
 * Universal visual-style set — the fallback for any service that doesn't pass its
 * own options. Hand-curated styles will be added here later so every service
 * shares one growing style library. (AI Video keeps its own backend-mapped set.)
 */
export const VISUAL_STYLES = [
  { id: "cinematic", label: "Cinematic", desc: "Moody, filmic, atmospheric",  colors: ["#0a0a0a", "#f59e0b"] },
  { id: "minimal",   label: "Minimal",   desc: "Clean, spacious, restrained", colors: ["#f8fafc", "#0f172a"] },
  { id: "bold",      label: "Bold",      desc: "Loud blocks, huge type",      colors: ["#ec4899", "#facc15"] },
  { id: "editorial", label: "Editorial", desc: "Premium print, refined",      colors: ["#c2410c", "#1e3a8a"] },
  { id: "vibrant",   label: "Vibrant",   desc: "Punchy, colorful, energetic", colors: ["#22d3ee", "#a855f7"] },
];

/** The selectable grid of style cards — reusable inside any modal (standalone field
 *  or the combined "Customize" modal). onDone fires on a pick so a wrapper can close. */
export function StylePanel({ value, onChange, onDone, options = VISUAL_STYLES, accent = THEME.accent, row = false }) {
  const container = row
    ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, alignItems: "stretch", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.22) transparent" }
    : { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 };
  const cardExtra = row ? { flex: "0 0 158px", width: 158 } : {};
  return (
    <div style={container}>
      {options.map(s => {
        const sel = value === s.id;
        return (
          <button key={s.id} onClick={() => { onChange?.(sel ? "auto" : s.id); onDone?.(); }}
            style={{ ...cardExtra, display: "flex", flexDirection: "column", textAlign: "left", padding: "9px 10px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)", border: `1px solid ${sel ? accent + "66" : THEME.border}` }}>
            <StylePreview id={s.id} colors={s.colors} />
            <div style={{ fontSize: 12, fontWeight: 700, color: sel ? "#fff" : THEME.text }}>{s.label}</div>
            {s.desc && <div style={{ fontSize: 10, color: THEME.faint, marginTop: 2, lineHeight: 1.3 }}>{s.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

export function StyleField({ value, onChange, options = VISUAL_STYLES, accent = THEME.accent }) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.id === value) ?? options[0];
  return (
    <>
      <FieldChip icon={<Palette size={16} />} label="Style" value={cur?.label ?? "Auto"} onClick={() => setOpen(true)} accent={accent} />
      {open && (
        <FieldModal title="Visual style" onClose={() => setOpen(false)}>
          <StylePanel value={value} onChange={onChange} onDone={() => setOpen(false)} options={options} accent={accent} />
        </FieldModal>
      )}
    </>
  );
}
