/**
 * DecorativesTab.jsx
 * src/ui/Editor/zonePicker/tabs/DecorativesTab.jsx
 *
 * Picker tab for user-placed decorative elements (SVG + CSS).
 * Groups entries from decorativeRegistry by category/subtype.
 * Emits: { kind: "decorative", decorativeId: entry.id }
 */
import { useState } from "react";
import { decorativeRegistry } from "../../../../core/designLibrary/decorativeRegistry.js";

/* ── User-facing category labels ─────────────────────────────── */
const CATEGORY_LABELS = {
  "structural/corner":    "Corners",
  "structural/border":    "Borders",
  "accent/shape":         "Shapes",
  "accent/arrow":         "Arrows",
  "accent/sparkle":       "Sparkles",
  "accent/divider":       "Lines & Dividers",
  "atmospheric/pattern":  "Patterns",
};

/* ── Render a small preview for each entry ───────────────────── */
function EntryPreview({ entry }) {
  const PREVIEW_COLOR = "#a78bfa";

  if (entry.render === "svg" && entry.svg) {
    const svgStr = entry.svg.replace(/currentColor/g, PREVIEW_COLOR);
    const sized  = svgStr.replace(/<svg /, '<svg width="40" height="40" preserveAspectRatio="xMidYMid meet" ');
    return (
      <div
        style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}
        dangerouslySetInnerHTML={{ __html: sized }}
      />
    );
  }

  if (entry.render === "css_repeat" && entry.css) {
    const injectColor = (val) =>
      typeof val === "string" ? val.replace(/currentColor/g, PREVIEW_COLOR) : val;
    const css = Object.fromEntries(
      Object.entries(entry.css).map(([k, v]) => [k, injectColor(v)])
    );
    return (
      <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", ...css }} />
      </div>
    );
  }

  return <span style={{ fontSize: 20, opacity: 0.4 }}>◈</span>;
}

export default function DecorativesTab({ onSelect }) {
  /* Group registry by category/subtype key */
  const groups = {};
  for (const entry of decorativeRegistry) {
    const key = `${entry.category}/${entry.subtype}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }

  const orderedKeys = [
    "accent/shape",
    "accent/sparkle",
    "accent/arrow",
    "accent/divider",
    "structural/corner",
    "structural/border",
    "atmospheric/pattern",
  ].filter(k => groups[k]);

  const [openGroup, setOpenGroup] = useState(orderedKeys[0] || null);

  return (
    <div style={{ padding: "4px 2px" }}>
      {orderedKeys.map(key => {
        const label   = CATEGORY_LABELS[key] || key;
        const entries = groups[key] || [];
        const isOpen  = openGroup === key;

        return (
          <div key={key} style={{ marginBottom: 6 }}>
            {/* Group header */}
            <button
              onClick={() => setOpenGroup(isOpen ? null : key)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", borderRadius: 8, cursor: "pointer", border: "none",
                background: isOpen ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.03)",
                color: isOpen ? "#c4b5fd" : "#7878a0",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span>{label}</span>
              <span style={{ opacity: 0.5, fontSize: 10 }}>{isOpen ? "▲" : "▼"} {entries.length}</span>
            </button>

            {/* Grid */}
            {isOpen && (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
                gap: 6, padding: "8px 2px",
              }}>
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    title={entry.id.replace(/_/g, " ")}
                    onClick={() => onSelect({ kind: "decorative", decorativeId: entry.id })}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 4, padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "#0e0e1a",
                      transition: "border-color 0.15s, background 0.15s",
                      aspectRatio: "1",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "#7c5cfc";
                      e.currentTarget.style.background  = "rgba(124,92,252,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.background  = "#0e0e1a";
                    }}
                  >
                    <EntryPreview entry={entry} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
