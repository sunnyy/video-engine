import { useState } from "react";
import { Captions } from "lucide-react";
import { FieldChip, FieldModal, THEME } from "./Field.jsx";
import { AnimatedCaptionPreview, CAPTION_PREVIEWS } from "../components/CaptionStylePreview.jsx";
import { captionStyleLabels } from "../../core/registries/captionTimelineRegistry.jsx";

/**
 * CaptionStyleField — visual caption-style picker. Opens a modal showing each style's
 * actual thumbnail (from CaptionStylePreview) so users choose by sight, not by name.
 * options: [{ id, label }]; falls back to every preview key when omitted.
 */
export function CaptionStyleField({ value, onChange, options, accent = THEME.accent }) {
  const [open, setOpen] = useState(false);
  const keys = options?.length ? options.map((o) => o.id) : Object.keys(CAPTION_PREVIEWS);
  const curLabel = options?.find((o) => o.id === value)?.label ?? captionStyleLabels[value] ?? value;

  return (
    <>
      <FieldChip icon={<Captions size={16} />} label="Caption style" value={curLabel} onClick={() => setOpen(true)} accent={accent} />
      {open && (
        <FieldModal title="Caption style" onClose={() => setOpen(false)} width={760}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {keys.map((k) => {
              const sel = value === k;
              return (
                <button key={k} onClick={() => { onChange?.(k); setOpen(false); }}
                  style={{ textAlign: "left", padding: 8, borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    background: sel ? `${accent}1c` : "rgba(255,255,255,0.03)", border: `1px solid ${sel ? accent + "66" : THEME.border}` }}>
                  <AnimatedCaptionPreview styleKey={k} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: sel ? "#fff" : THEME.text, marginTop: 6 }}>
                    {captionStyleLabels[k] ?? k}
                  </div>
                </button>
              );
            })}
          </div>
        </FieldModal>
      )}
    </>
  );
}
