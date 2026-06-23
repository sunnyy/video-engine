import { FileText } from "lucide-react";
import { THEME } from "./Field.jsx";

/**
 * ReviewToggleField — a simple on/off chip controlling the script-review gate.
 * OFF (default) = one-click direct generation; ON = review/edit the script first.
 * Controlled: parent owns the value and persists it via reviewScriptPref.
 */
export function ReviewToggleField({ value, onChange, accent = THEME.accent }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!value)}
      title="When on, review and edit the AI script before the video is produced. Off = generate in one click."
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10,
        background: value ? `${accent}1c` : "rgba(255,255,255,0.03)",
        border: `1px solid ${value ? accent + "66" : THEME.border}`,
        color: value ? "#fff" : THEME.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <FileText size={15} />
      {value ? "Review script: on" : "Review script: off"}
    </button>
  );
}
