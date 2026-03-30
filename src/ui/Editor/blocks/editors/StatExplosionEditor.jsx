/**
 * StatExplosionEditor.jsx
 * Place at: src/ui/Editor/blocks/editors/StatExplosionEditor.jsx
 *
 * Receives: { slot, block, updateBlockProp }
 * block.props keys: prefix, value, suffix, label, description, badge, accent
 */
import React from "react";
import { STAT_EXPLOSION_DEFAULTS } from "../../../../remotion/blocks/StatExplosionBlock";
import {
  Field, TextInput, ColorPicker,
} from "./editorComponents";

export default function StatExplosionEditor({ slot, block, updateBlockProp }) {
  const props = { ...STAT_EXPLOSION_DEFAULTS, ...(block?.props || {}) };
  const set   = (key, val) => updateBlockProp(slot, key, val);

  return (
    <div className="flex flex-col gap-4 mt-3">

      {/* Number row */}
      <Field label="Number">
        <div className="flex gap-2">
          <input
            type="text"
            value={props.prefix}
            onChange={e => set("prefix", e.target.value)}
            placeholder="$"
            className="w-[42px] bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-2 py-[7px] text-[13px] text-[#e8e8f0] text-center focus:border-[#7c5cfc] focus:outline-none font-mono"
          />
          <input
            type="text"
            value={props.value}
            onChange={e => set("value", e.target.value)}
            placeholder="2.4"
            className="w-[80px] flex-1 bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-3 py-[7px] text-[13px] text-[#e8e8f0] text-center focus:border-[#7c5cfc] focus:outline-none font-mono font-bold"
          />
          <input
            type="text"
            value={props.suffix}
            onChange={e => set("suffix", e.target.value)}
            placeholder="B"
            className="w-[42px] bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[7px] px-2 py-[7px] text-[13px] text-[#e8e8f0] text-center focus:border-[#7c5cfc] focus:outline-none font-mono"
          />
        </div>
        <div className="flex justify-between text-[9px] text-[#55556a] px-1 mt-1" style={{fontFamily:"'JetBrains Mono',monospace"}}>
          <span>prefix</span><span>value</span><span>suffix</span>
        </div>
      </Field>

      <Field label="Label (above number)">
        <TextInput value={props.label} onChange={v => set("label", v)} placeholder="Revenue generated" />
      </Field>

      <Field label="Description (below number)">
        <TextInput value={props.description} onChange={v => set("description", v)} placeholder="In Q4 2024 alone" />
      </Field>

      <Field label="Badge text">
        <TextInput value={props.badge} onChange={v => set("badge", v)} placeholder="↑ 38% YoY growth" />
      </Field>

      <Field label="Accent colour">
        <ColorPicker value={props.accent} onChange={v => set("accent", v)} />
      </Field>

    </div>
  );
}