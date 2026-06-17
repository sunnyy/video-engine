import { useState } from "react";
import { Smartphone } from "lucide-react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";

/**
 * Orientation (aspect ratio) field — universal across all video services EXCEPT
 * Add Captions (which keeps the user's uploaded video's own ratio). Options are
 * universal, defined once here; services just set a default in the registry.
 */

export const meta = { id: "orientation", apiKey: "orientation", label: "Orientation", default: "9:16" };

export const ORIENTATIONS = [
  { id: "9:16", label: "9:16", desc: "Portrait" },
  { id: "1:1",  label: "1:1",  desc: "Square" },
  { id: "16:9", label: "16:9", desc: "Landscape" },
];

export function OrientationField({ value, onChange, options = ORIENTATIONS, accent = THEME.accent, tinted = false }) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.id === value) ?? options[0];
  return (
    <>
      <FieldChip icon={<Smartphone size={16} />} label="Orientation" value={cur?.label ?? ""} onClick={() => setOpen(true)} accent={accent} tinted={tinted} />
      {open && (
        <FieldModal title="Orientation" onClose={() => setOpen(false)} width={400}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {options.map(o => {
              const sel = value === o.id;
              return (
                <button key={o.id} onClick={() => { onChange?.(o.id); setOpen(false); }}
                  style={{ padding: "11px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 13, textAlign: "center", background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)", border: `1px solid ${sel ? accent + "66" : THEME.border}`, color: sel ? "#fff" : THEME.muted }}>
                  {o.label}
                  {o.desc ? <span style={{ display: "block", fontSize: 10, opacity: 0.7, marginTop: 2 }}>{o.desc}</span> : null}
                </button>
              );
            })}
          </div>
        </FieldModal>
      )}
    </>
  );
}
