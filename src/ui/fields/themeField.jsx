import { useState } from "react";
import { Sun, Droplet } from "lucide-react";
import { FieldChip, FieldModal, THEME as T } from "./Field.jsx";
import { THEME_OPTIONS } from "../../services/ai/shared/themeRegistry.js";

const ACCENT_PRESETS = ["#7C3AED", "#22D3EE", "#FFD600", "#F97316", "#EC4899", "#22C55E", "#3B82F6", "#EF4444"];

/**
 * ThemeField — overall colour theme (Auto / Light / Medium / Dark). Enforced by the engine.
 */
export function ThemeField({ value, onChange, accent = T.accent }) {
  const [open, setOpen] = useState(false);
  const cur = THEME_OPTIONS.find((o) => o.id === value) ?? THEME_OPTIONS[0];
  return (
    <>
      <FieldChip icon={<Sun size={16} />} label="Theme" value={cur?.label ?? "Auto"} onClick={() => setOpen(true)} accent={accent} />
      {open && (
        <FieldModal title="Theme" onClose={() => setOpen(false)} width={440}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {THEME_OPTIONS.map((o) => {
              const sel = value === o.id || (!value && o.id === "auto");
              return (
                <button key={o.id} onClick={() => { onChange?.(o.id); setOpen(false); }}
                  style={{
                    flex: "1 1 130px", padding: "12px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                    background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${sel ? accent + "66" : T.border}`, color: sel ? "#fff" : T.muted,
                  }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 7 }}>
                    {(o.colors || []).map((c, i) => (
                      <span key={i} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: "1px solid rgba(255,255,255,0.18)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{o.desc}</div>
                </button>
              );
            })}
          </div>
        </FieldModal>
      )}
    </>
  );
}

/**
 * AccentField — optional pinned accent colour (null = Auto, let the theme/topic decide).
 */
export function AccentField({ value, onChange, accent = T.accent }) {
  const [open, setOpen] = useState(false);
  const swatch = value
    ? <span style={{ width: 14, height: 14, borderRadius: 3, background: value, display: "block", border: "1px solid rgba(255,255,255,0.25)" }} />
    : <Droplet size={15} />;
  return (
    <>
      <FieldChip icon={swatch} label="Accent" value={value ? "Custom" : "Auto"} onClick={() => setOpen(true)} accent={accent} />
      {open && (
        <FieldModal title="Accent Colour" onClose={() => setOpen(false)} width={320}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => { onChange?.(null); setOpen(false); }}
              style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", fontWeight: 700, fontSize: 13,
                background: !value ? `${accent}1c` : "rgba(255,255,255,0.03)", border: `1px solid ${!value ? accent + "66" : T.border}`, color: !value ? "#fff" : T.muted }}>
              Auto — let the theme decide
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={value || "#7c5cfc"} onChange={(e) => onChange?.(e.target.value)}
                style={{ width: 48, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
              <span style={{ fontSize: 12, color: T.muted, fontFamily: "monospace" }}>{value || "No accent pinned"}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ACCENT_PRESETS.map((c) => (
                <button key={c} onClick={() => { onChange?.(c); setOpen(false); }}
                  style={{ width: 26, height: 26, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }} title={c} />
              ))}
            </div>
          </div>
        </FieldModal>
      )}
    </>
  );
}
