import { useState } from "react";
import { Sun, Droplet } from "lucide-react";
import { FieldChip, FieldModal, THEME as T } from "./Field.jsx";
import { THEME_OPTIONS, THEMES } from "../../services/ai/shared/themeRegistry.js";

// A representative video FRAME in the theme — real-feeling headline + subtext + accent
// (plus a soft glow on glowing themes) so each card reads as a theme, not a colour
// picker. Container-query units keep it crisp at any width. "Auto" = neutral placeholder.
const BASE = 260;
const u = (n) => `${+((n / BASE) * 100).toFixed(2)}cqw`;
const abs = { position: "absolute" };

function ThemeSample({ id }) {
  const t = THEMES[id];
  const frame = {
    position: "relative", width: "100%", aspectRatio: "5 / 4", flexShrink: 0, borderRadius: 10,
    overflow: "hidden", marginBottom: 8, containerType: "size",
    boxShadow: "0 6px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.06)",
  };
  if (!t) {
    // Auto = "we pick for you": show the three theme fields as bands + a sparkle badge.
    return (
      <div style={{ ...frame, display: "flex" }}>
        <div style={{ flex: 1, background: THEMES.light.background }} />
        <div style={{ flex: 1, background: THEMES.medium.background }} />
        <div style={{ flex: 1, background: THEMES.dark.background }} />
        <div style={{
          ...abs, left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          width: u(46), height: u(46), borderRadius: "50%", background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#7c3aed", fontSize: u(24), fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,.28)",
        }}>✦</div>
      </div>
    );
  }
  return (
    <div style={{ ...frame, background: `linear-gradient(135deg, ${t.background}, ${t.backgroundSecondary})` }}>
      {t.glow && (
        <div style={{ ...abs, width: u(130), height: u(130), borderRadius: "50%", right: u(-24), top: u(-32),
          background: t.defaultAccent, opacity: 0.22, filter: "blur(14px)" }} />
      )}
      <div style={{ ...abs, left: u(22), top: u(40), width: u(150), height: u(13), borderRadius: u(7), background: t.primaryText }} />
      <div style={{ ...abs, left: u(22), top: u(64), width: u(110), height: u(9), borderRadius: u(5), background: t.secondaryText }} />
      <div style={{ ...abs, left: u(22), top: u(80), width: u(80), height: u(9), borderRadius: u(5), background: t.secondaryText, opacity: 0.65 }} />
      <div style={{ ...abs, right: u(20), bottom: u(20), width: u(16), height: u(16), borderRadius: "50%", background: t.defaultAccent }} />
    </div>
  );
}

const ACCENT_PRESETS = ["#7C3AED", "#22D3EE", "#FFD600", "#F97316", "#EC4899", "#22C55E", "#3B82F6", "#EF4444"];

/** The theme-card grid — reusable inside any modal. onDone fires on a pick. */
export function ThemePanel({ value, onChange, onDone, accent = T.accent, row = false }) {
  const container = row
    ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, alignItems: "stretch", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.22) transparent" }
    : { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 };
  const cardExtra = row ? { flex: "0 0 158px", width: 158, display: "flex", flexDirection: "column" } : {};
  return (
    <div style={container}>
      {THEME_OPTIONS.map((o) => {
        const sel = value === o.id || (!value && o.id === "auto");
        return (
          <button key={o.id} onClick={() => { onChange?.(sel ? "auto" : o.id); onDone?.(); }}
            style={{
              ...cardExtra,
              padding: "9px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
              background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)",
              border: `1px solid ${sel ? accent + "66" : T.border}`, color: sel ? "#fff" : T.muted,
            }}>
            <ThemeSample id={o.id} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>{o.label}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{o.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

/** The accent picker (colour input + presets). onDone fires on a discrete pick (preset),
 *  NOT on every colour-input drag, so a wrapper can close cleanly. When onChange2 is
 *  provided, a second "Secondary" group is shown so users can pin a brand colour PAIR
 *  (primary + secondary); leaving either empty = Auto for that slot. */
export function AccentPanel({ value, onChange, value2, onChange2, onDone, accent = T.accent, row = false }) {
  const hasSecondary = typeof onChange2 === "function";
  const group = (label, val, setVal) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {hasSecondary && <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="color" value={val || "#7c5cfc"} onChange={(e) => setVal?.(e.target.value)}
            style={{ width: 48, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
          <span style={{ fontSize: 12, color: T.muted, fontFamily: "monospace" }}>{val || "Auto"}</span>
          {val && <button onClick={() => { setVal?.(null); onDone?.(); }} title="Clear (Auto)"
            style={{ fontSize: 11, color: T.faint, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>clear</button>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map((c) => (
            <button key={c} onClick={() => { setVal?.(val === c ? null : c); onDone?.(); }}
              style={{ width: 26, height: 26, borderRadius: 6, background: c, border: `1px solid ${val === c ? "#fff" : "rgba(255,255,255,0.2)"}`, cursor: "pointer" }} title={c} />
          ))}
        </div>
      </div>
    </div>
  );
  const container = row
    ? { display: "flex", gap: 28, flexWrap: "wrap" }
    : { display: "flex", flexDirection: "column", gap: 16 };
  return (
    <div style={container}>
      {group("Primary", value, onChange)}
      {hasSecondary && group("Secondary", value2, onChange2)}
    </div>
  );
}

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
          <ThemePanel value={value} onChange={onChange} onDone={() => setOpen(false)} accent={accent} />
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
          <AccentPanel value={value} onChange={onChange} onDone={() => setOpen(false)} accent={accent} />
        </FieldModal>
      )}
    </>
  );
}
