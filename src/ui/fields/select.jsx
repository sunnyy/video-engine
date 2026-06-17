import { useState } from "react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";

/**
 * Generic single-select field — a chip that opens a modal of options. Used for
 * service-specific selects (tone, theme, accent, …) that aren't universal fields.
 * Options: { id, label, color? } (color renders a swatch dot, e.g. accent picker).
 */
export function SelectField({ icon, label, value, onChange, options = [], accent = THEME.accent, tinted = false }) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.id === value) ?? options[0];
  return (
    <>
      <FieldChip icon={icon} label={label} value={cur?.label ?? ""} onClick={() => setOpen(true)} accent={accent} tinted={tinted} />
      {open && (
        <FieldModal title={label} onClose={() => setOpen(false)} width={440}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {options.map(o => {
              const sel = value === o.id;
              return (
                <button key={o.id} onClick={() => { onChange?.(o.id); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: 13, background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)", border: `1px solid ${sel ? accent + "66" : THEME.border}`, color: sel ? "#fff" : THEME.muted }}>
                  {o.color && <span style={{ width: 14, height: 14, borderRadius: 4, background: o.color, border: "1px solid rgba(255,255,255,0.2)" }} />}
                  {o.label}
                </button>
              );
            })}
          </div>
        </FieldModal>
      )}
    </>
  );
}
