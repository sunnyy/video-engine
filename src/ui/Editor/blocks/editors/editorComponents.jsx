/**
 * editorComponents.jsx
 * Place at: src/ui/Editor/blocks/editors/editorComponents.jsx
 *
 * Shared primitives used by every block editor.
 * Import what you need:
 *   import { Field, TextInput, NumberInput, TextArea, ColorPicker, Toggle } from "./editorComponents";
 */
import React from "react";

/* ── Field wrapper with label ─────────────────────────────── */
export function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div
        className="text-[10px] font-bold tracking-widest uppercase text-[#55556a]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* ── Text input ───────────────────────────────────────────── */
export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors"
    />
  );
}

/* ── Number input ─────────────────────────────────────────── */
export function NumberInput({ value, onChange, min, max, step = 1, placeholder }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-3 py-[7px] text-[13px] text-[#e8e8f0] font-mono focus:border-[#7c5cfc] focus:outline-none transition-colors"
    />
  );
}

/* ── Textarea ─────────────────────────────────────────────── */
export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ""}
      placeholder={placeholder}
      rows={rows}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-3 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none transition-colors"
    />
  );
}

/* ── Color picker ─────────────────────────────────────────── */
export function ColorPicker({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#f0e040"}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 28, height: 28,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
          padding: 2,
          background: "none",
        }}
      />
      <span className="text-[12px] text-[#9494a8] font-mono">{value || "#f0e040"}</span>
      {label && <span className="text-[11px] text-[#55556a]">{label}</span>}
    </div>
  );
}

/* ── Toggle (show/hide boolean) ───────────────────────────── */
export function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-[12px] text-[#9494a8]">{label}</span>}
      <button
        onClick={() => onChange(!value)}
        className="w-[30px] h-[16px] rounded-full relative transition-all"
        style={{
          background: value ? "#7c5cfc" : "#1c1c28",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span style={{
          position: "absolute",
          top: 1,
          left: value ? 14 : 2,
          width: 12, height: 12,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}

/* ── Section divider ──────────────────────────────────────── */
export function Divider({ label }) {
  return (
    <div className="flex items-center gap-2 my-1">
      {label && (
        <span
          className="text-[9px] uppercase tracking-widest text-[#55556a] font-bold"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {label}
        </span>
      )}
      <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.05)]" />
    </div>
  );
}

/* ── List item editor (for arrays like items[]) ───────────── */
export function ListEditor({ items = [], onChange, placeholder = "Add item..." }) {
  const update = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const add    = () => onChange([...items, ""]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            value={typeof item === "string" ? item : item.title || ""}
            onChange={e => update(i, typeof item === "string" ? e.target.value : { ...item, title: e.target.value })}
            placeholder={placeholder}
            className="flex-1 bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-3 py-[6px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none"
          />
          <button
            onClick={() => remove(i)}
            className="text-[#55556a] hover:text-[#f87171] text-[14px] w-[20px] text-center transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-[11px] text-[#7c5cfc] hover:text-[#9d7fff] py-[6px] border border-dashed border-[rgba(124,92,252,0.3)] rounded-[7px] transition-colors"
      >
        + Add item
      </button>
    </div>
  );
}