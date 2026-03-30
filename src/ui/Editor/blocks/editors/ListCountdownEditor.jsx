/**
 * ListCountdownEditor.jsx
 * Place at: src/ui/Editor/blocks/editors/ListCountdownEditor.jsx
 *
 * Receives: { slot, block, updateBlockProp }
 * block.props keys: title, items, accent
 * items shape: [{ title, desc, value }]
 */
import React from "react";
import { LIST_COUNTDOWN_DEFAULTS } from "../../../../remotion/blocks/ListCountdownBlock";
import { Field, TextInput, ColorPicker } from "./editorComponents";

function ItemRow({ item, index, onChange, onRemove }) {
  const set = (key, val) => onChange(index, { ...item, [key]: val });

  return (
    <div style={{
      background: "#16161f",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold tracking-widest uppercase text-[#55556a]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Item {index + 1}
        </span>
        <button
          onClick={() => onRemove(index)}
          className="text-[#55556a] hover:text-[#f87171] text-[12px] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Title */}
      <input
        type="text"
        value={item.title || ""}
        onChange={e => set("title", e.target.value)}
        placeholder="Item title"
        className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[5px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none"
      />

      {/* Desc */}
      <input
        type="text"
        value={item.desc || ""}
        onChange={e => set("desc", e.target.value)}
        placeholder="Short description (optional)"
        className="w-full bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[5px] text-[11px] text-[#9494a8] focus:border-[#7c5cfc] focus:outline-none"
      />

      {/* Value (bar fill %) */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#55556a] w-[32px] shrink-0">Bar</span>
        <input
          type="range"
          min={0} max={100}
          value={item.value ?? 50}
          onChange={e => set("value", Number(e.target.value))}
          className="flex-1 accent-[#7c5cfc] h-[3px]"
        />
        <span className="text-[11px] font-mono text-[#9494a8] w-[36px] text-right">
          {item.value ?? 50}%
        </span>
      </div>
    </div>
  );
}

export default function ListCountdownEditor({ slot, block, updateBlockProp }) {
  const props = { ...LIST_COUNTDOWN_DEFAULTS, ...(block?.props || {}) };
  const items = props.items || [];
  const set   = (key, val) => updateBlockProp(slot, key, val);

  const updateItem = (index, updated) => {
    const next = [...items];
    next[index] = updated;
    set("items", next);
  };

  const addItem = () => {
    set("items", [...items, { title: "New reason", desc: "", value: 70 }]);
  };

  const removeItem = (index) => {
    set("items", items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4 mt-3">

      <Field label="Title">
        <TextInput
          value={props.title}
          onChange={v => set("title", v)}
          placeholder="Top reasons to start today"
        />
      </Field>

      <Field label="Items (countdown order: last = #1)">
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              index={i}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ))}
          <button
            onClick={addItem}
            className="text-[11px] text-[#7c5cfc] hover:text-[#9d7fff] py-[6px] border border-dashed border-[rgba(124,92,252,0.3)] rounded-[7px] transition-colors"
          >
            + Add item
          </button>
        </div>
      </Field>

      <Field label="Accent colour">
        <ColorPicker value={props.accent} onChange={v => set("accent", v)} />
      </Field>

    </div>
  );
}