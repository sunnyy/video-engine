/**
 * StatExplosionEditor.jsx
 * Fix #16 — 2-column grid layout
 */
import React from "react";
import { STAT_EXPLOSION_DEFAULTS } from "../../../../remotion/blocks/StatExplosionBlock";
import { Field, TextInput, ColorPicker } from "./editorComponents";

export default function StatExplosionEditor({ slot, block, updateBlockProp }) {
  const props = { ...STAT_EXPLOSION_DEFAULTS, ...(block?.props || {}) };
  const set   = (key, val) => updateBlockProp(slot, key, val);

  return (
    <div className="flex flex-col gap-3 mt-2">

      {/* Number row — prefix / value / suffix inline */}
      <Field label="Number">
        <div className="flex gap-2">
          <input type="text" value={props.prefix} onChange={e => set("prefix", e.target.value)}
            placeholder="$" className="w-[40px] bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-2 py-[6px] text-[13px] text-[#e8e8f0] text-center focus:border-[#7c5cfc] focus:outline-none font-mono" />
          <input type="text" value={props.value} onChange={e => set("value", e.target.value)}
            placeholder="2.4" className="flex-1 bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-3 py-[6px] text-[13px] text-[#e8e8f0] text-center focus:border-[#7c5cfc] focus:outline-none font-mono font-bold" />
          <input type="text" value={props.suffix} onChange={e => set("suffix", e.target.value)}
            placeholder="B" className="w-[40px] bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-2 py-[6px] text-[13px] text-[#e8e8f0] text-center focus:border-[#7c5cfc] focus:outline-none font-mono" />
        </div>
        <div className="flex justify-between text-[9px] text-[#55556a] px-1 mt-1" style={{fontFamily:"monospace"}}>
          <span>prefix</span><span>value</span><span>suffix</span>
        </div>
      </Field>

      {/* 2-column grid for remaining fields */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label">
          <TextInput value={props.label} onChange={v => set("label", v)} placeholder="Revenue generated" />
        </Field>
        <Field label="Description">
          <TextInput value={props.description} onChange={v => set("description", v)} placeholder="In Q4 2024" />
        </Field>
        <Field label="Badge">
          <TextInput value={props.badge} onChange={v => set("badge", v)} placeholder="↑ 38% YoY" />
        </Field>
        <Field label="Accent">
          <ColorPicker value={props.accent} onChange={v => set("accent", v)} />
        </Field>
      </div>

    </div>
  );
}