import { useState } from "react";
import { Clock } from "lucide-react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";

/**
 * Duration field. Options vary per service (AI Video 30/45/60; SaaS 10-15/15-30/…),
 * so the option list is passed in from the service registry.
 */

export const meta = { id: "duration", apiKey: "duration", label: "Duration", icon: "⏱️", default: 30 };

export const DEFAULT_DURATIONS = [
  { id: 30, label: "30s" },
  { id: 45, label: "45s" },
  { id: 60, label: "60s" },
];

export function DurationField({ value, onChange, options = DEFAULT_DURATIONS, accent = THEME.accent }) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.id === value) ?? options[0];
  return (
    <>
      <FieldChip icon={<Clock size={16} />} label="Duration" value={cur?.label ?? ""} onClick={() => setOpen(true)} accent={accent} />
      {open && (
        <FieldModal title="Duration" onClose={() => setOpen(false)} width={400}>
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
