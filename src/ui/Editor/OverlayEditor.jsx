/**
 * OverlayEditor.jsx
 * src/ui/Editor/OverlayEditor.jsx
 *
 * Unified inline editor for beat-level overlay elements.
 * Renders common props (anchor, motion, delay) + type-specific props.
 */
import { useState } from "react";
import { ANCHOR_LABELS, OVERLAY_TYPES } from "../../core/overlayRegistry";

const MOTION_OPTIONS = ["pop", "slideUp", "slideLeft", "slam", "fade"];

const ANCHOR_OPTIONS = Object.entries(ANCHOR_LABELS).map(([value, label]) => ({ value, label }));

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2 mb-[10px]">
      <div className="text-[11px] text-[#7070a0] w-[80px] shrink-0">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-[6px] px-3 py-[6px] text-[12px] text-[#e8e8f0] placeholder-[#55556a] focus:outline-none"
      onFocus={e => e.target.style.borderColor = "#7c5cfc"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-[6px] px-3 py-[6px] text-[12px] text-[#e8e8f0] focus:outline-none cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value || o} value={o.value || o}>
          {o.label || o}
        </option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange, min = 0, max = 10, step = 0.1 }) {
  return (
    <input
      type="number"
      value={value ?? 0}
      min={min} max={max} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-[6px] px-3 py-[6px] text-[12px] text-[#e8e8f0] focus:outline-none"
    />
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={e => onChange(e.target.value)}
        className="w-[30px] h-[28px] rounded-[4px] border border-[rgba(255,255,255,0.1)] cursor-pointer bg-transparent p-0"
      />
      <input
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-[#111118] border border-[rgba(255,255,255,0.1)] rounded-[6px] px-3 py-[6px] text-[12px] text-[#e8e8f0] focus:outline-none font-mono"
      />
    </div>
  );
}

/* ── Type-specific props ── */
function TypeSpecificProps({ overlay, update }) {
  switch (overlay.type) {
    case "HeadlineText":
      return (
        <>
          <Row label="Text"><TextInput value={overlay.text} onChange={v => update("text", v)} placeholder="HEADLINE TEXT" /></Row>
          <Row label="Size"><NumberInput value={overlay.size} onChange={v => update("size", v)} min={20} max={200} step={2} /></Row>
          <Row label="Color"><ColorInput value={overlay.color} onChange={v => update("color", v)} /></Row>
        </>
      );

    case "Badge":
      return (
        <>
          <Row label="Text"><TextInput value={overlay.text} onChange={v => update("text", v)} placeholder="LIVE" /></Row>
          <Row label="Color"><ColorInput value={overlay.color} onChange={v => update("color", v)} /></Row>
          <Row label="Style">
            <SelectInput value={overlay.variant} onChange={v => update("variant", v)} options={["pill","outline","solid"]} />
          </Row>
          <Row label="Size"><NumberInput value={overlay.size} onChange={v => update("size", v)} min={10} max={60} step={1} /></Row>
        </>
      );

    case "StatCallout":
      return (
        <>
          <Row label="Value"><TextInput value={overlay.value} onChange={v => update("value", v)} placeholder="↑ 94%" /></Row>
          <Row label="Label"><TextInput value={overlay.label} onChange={v => update("label", v)} placeholder="Engagement" /></Row>
          <Row label="Color"><ColorInput value={overlay.color} onChange={v => update("color", v)} /></Row>
          <Row label="Size"><NumberInput value={overlay.size} onChange={v => update("size", v)} min={20} max={100} step={2} /></Row>
        </>
      );

    case "HighlightBox":
      return (
        <>
          <Row label="Text"><TextInput value={overlay.text} onChange={v => update("text", v)} placeholder="Key insight here" /></Row>
          <Row label="Bg Color"><ColorInput value={overlay.color} onChange={v => update("color", v)} /></Row>
          <Row label="Text Color"><ColorInput value={overlay.textColor} onChange={v => update("textColor", v)} /></Row>
          <Row label="Size"><NumberInput value={overlay.size} onChange={v => update("size", v)} min={14} max={80} step={2} /></Row>
        </>
      );

    case "LiveDot":
      return (
        <>
          <Row label="Text"><TextInput value={overlay.text} onChange={v => update("text", v)} placeholder="LIVE" /></Row>
          <Row label="Color"><ColorInput value={overlay.color} onChange={v => update("color", v)} /></Row>
        </>
      );

    case "EmojiFloat": {
      const emojisStr = (overlay.emojis || []).join("  ");
      return (
        <Row label="Emojis">
          <TextInput
            value={emojisStr}
            onChange={v => update("emojis", v.trim().split(/\s+/).filter(Boolean))}
            placeholder="❤️  🔥  😍"
          />
        </Row>
      );
    }

    case "ArrowPointer":
      return (
        <>
          <Row label="Direction">
            <SelectInput value={overlay.direction} onChange={v => update("direction", v)} options={["down","up","left","right"]} />
          </Row>
          <Row label="Color"><ColorInput value={overlay.color} onChange={v => update("color", v)} /></Row>
          <Row label="Size"><NumberInput value={overlay.size} onChange={v => update("size", v)} min={20} max={100} step={2} /></Row>
        </>
      );

    default:
      return null;
  }
}

export default function OverlayEditor({ overlay, onUpdate, onDelete }) {
  if (!overlay) return null;

  const update = (key, value) => onUpdate({ ...overlay, [key]: value });

  const typeDef = OVERLAY_TYPES[overlay.type];
  const allowedAnchors = typeDef?.allowedAnchors
    ? ANCHOR_OPTIONS.filter(a => typeDef.allowedAnchors.includes(a.value))
    : ANCHOR_OPTIONS;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[13px] font-bold text-[#e8e8f0]">{typeDef?.label || overlay.type}</div>
          <div className="text-[11px] text-[#55556a]">Overlay element</div>
        </div>
        <button
          onClick={onDelete}
          className="text-[11px] px-3 py-[5px] rounded-[6px] bg-transparent border border-[rgba(248,113,113,0.3)] text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Type-specific */}
      <TypeSpecificProps overlay={overlay} update={update} />

      {/* Common: Anchor */}
      <Row label="Position">
        <SelectInput value={overlay.anchor} onChange={v => update("anchor", v)} options={allowedAnchors} />
      </Row>

      {/* Common: Motion */}
      <Row label="Motion">
        <SelectInput value={overlay.motion} onChange={v => update("motion", v)} options={MOTION_OPTIONS} />
      </Row>

      {/* Common: Delay */}
      <Row label="Delay (s)">
        <NumberInput value={overlay.delay} onChange={v => update("delay", v)} min={0} max={5} step={0.1} />
      </Row>
    </div>
  );
}
