import { useState } from "react";
import { Palette } from "lucide-react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";
import { StylePanel, VISUAL_STYLES } from "./style.jsx";
import { ThemePanel, AccentPanel } from "./themeField.jsx";

/**
 * LookField — ONE chip that wraps Visual Style + Theme + Accent into a single
 * "Customize" modal, so the chatbox isn't three Auto chips. Everything defaults to
 * Auto (the engine/director picks per topic — no extra model call); the user only
 * changes what they want. The chip always reads "Customize"; a dot marks when any
 * of the three has been set.
 */
export function LookField({
  styleId = "auto", onStyleChange, styleOptions = VISUAL_STYLES,
  theme = "auto", onThemeChange,
  accentColor = null, onAccentChange,
  accentColor2 = null, onAccentChange2,  // optional secondary accent (pair)
  accent = THEME.accent,
}) {
  const [open, setOpen] = useState(false);
  const customized = (styleId && styleId !== "auto") || (theme && theme !== "auto") || !!accentColor || !!accentColor2;

  return (
    <>
      <FieldChip
        icon={<Palette size={16} />}
        label="Style"
        value={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {customized ? "Custom" : "Auto"}
            {customized && <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block" }} />}
          </span>
        }
        onClick={() => setOpen(true)}
        accent={accent}
      />
      {open && (
        <FieldModal title="Customize the look" onClose={() => setOpen(false)} width={940}>
          <Section title="Visual style">
            <StylePanel value={styleId} onChange={onStyleChange} options={styleOptions} accent={accent} row />
          </Section>
          {/* Theme (left) + Accent colour (right) share one row — Theme only needs 3 cards. */}
          <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 22 }}>
            <div style={{ flex: "0 0 auto" }}>
              <Header>Theme</Header>
              <ThemePanel value={theme} onChange={onThemeChange} accent={accent} row />
            </div>
            <div style={{ flex: "1 1 300px", minWidth: 260 }}>
              <Header>Accent colour</Header>
              <AccentPanel value={accentColor} onChange={onAccentChange} value2={accentColor2} onChange2={onAccentChange2} accent={accent} row />
            </div>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ marginTop: 6, width: "100%", padding: "11px", borderRadius: 10, border: "none",
              background: accent, color: "#0b0b12", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            Save
          </button>
        </FieldModal>
      )}
    </>
  );
}

function Header({ children }) {
  return <div style={{ fontSize: 13.5, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{children}</div>;
}

function Section({ title, children, last }) {
  return (
    <div style={{ marginBottom: last ? 22 : 34 }}>
      <Header>{title}</Header>
      {children}
    </div>
  );
}
