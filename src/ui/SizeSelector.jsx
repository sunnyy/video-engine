/**
 * SizeSelector.jsx — universal aspect-ratio size selector for the IMAGE services
 * (image-generation, product-poster, banner-design, thumbnail, virtual-tryon).
 *
 * One shared, consistently-styled control. Values are canonical ASPECT IDs
 * ("1:1" | "4:5" | "9:16" | "16:9") — the backend resolves these to blank
 * canvases via shared/aiImage.js → blankForKey. Each service passes the relevant
 * subset via `options`; styling + behavior are identical everywhere.
 */

// Canonical aspect catalog — label + a proportional glyph (in px) for the chip.
export const ASPECTS = {
  "1:1":  { label: "1:1",  desc: "Square",    gw: 15, gh: 15 },
  "4:5":  { label: "4:5",  desc: "Portrait",  gw: 13, gh: 16 },
  "9:16": { label: "9:16", desc: "Vertical",  gw: 11, gh: 18 },
  "16:9": { label: "16:9", desc: "Landscape", gw: 20, gh: 11 },
};

/**
 * <SizeSelector value onChange options accent />
 * @param value     current aspect id
 * @param onChange  (id) => void
 * @param options   array of aspect ids, e.g. ["1:1","4:5","9:16"]
 * @param accent    accent color (per-service theme)
 */
export default function SizeSelector({
  value,
  onChange,
  options = ["1:1", "4:5", "9:16", "16:9"],
  accent = "#7c5cfc",
  label = "Size",
}) {
  return (
    <div>
      {label ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: "#9090c0", marginBottom: 8 }}>{label}</div>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((id) => {
          const a = ASPECTS[id] ?? { label: id, desc: "", gw: 15, gh: 15 };
          const sel = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange?.(id)}
              style={{
                flex: "1 1 0", minWidth: 84, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${sel ? accent + "88" : "rgba(255,255,255,0.14)"}`,
                color: sel ? "#fff" : "#7878a8", transition: "all 0.15s",
              }}
            >
              <span style={{
                display: "block", width: a.gw, height: a.gh, borderRadius: 2,
                border: `2px solid ${sel ? accent : "#7878a8"}`,
              }} />
              <span style={{ fontSize: 12, fontWeight: 800 }}>{a.label}</span>
              {a.desc ? <span style={{ fontSize: 9, opacity: 0.7 }}>{a.desc}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
