/**
 * MyRulesSection.jsx
 * src/ui/Editor/MyRulesSection.jsx
 */
import React, { useState } from "react";
import { useUserRules } from "../../hooks/useUserRules";

function RuleInput({ onAdd, placeholder, accentColor }) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  };

  return (
    <div className="flex gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value.slice(0, 120))}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 bg-[#16162a] border border-[rgba(255,255,255,0.12)] rounded-[8px] px-4 py-[10px] text-[14px] text-[#e8e8f0] placeholder-[#55556a] focus:outline-none transition-colors"
        style={{ "--tw-ring-color": accentColor }}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
      />
      <button onClick={submit}
        className="px-4 py-[10px] rounded-[8px] text-[13px] font-bold cursor-pointer transition-all hover:opacity-90 border-0 shrink-0"
        style={{ background: accentColor, color: "#fff" }}>
        Add
      </button>
    </div>
  );
}

function RuleTag({ text, onRemove, color }) {
  return (
    <div className="flex items-center gap-3 px-4 py-[10px] rounded-[8px] group"
      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}>
      <span className="flex-1 text-[14px] text-[#e8e8f0] leading-snug">{text}</span>
      <button onClick={onRemove}
        className="text-[14px] bg-transparent border-0 cursor-pointer shrink-0 transition-opacity opacity-40 group-hover:opacity-100"
        style={{ color: color.label }}>
        ✕
      </button>
    </div>
  );
}

function RuleList({ type, rules, onRemove, onAdd, max, emptyLabel, placeholder, color }) {
  const isdo = type === "do";
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center text-[14px] font-bold"
            style={{ background: color.bg, border: `1.5px solid ${color.border}`, color: color.label }}>
            {isdo ? "✓" : "✕"}
          </div>
          <span className="text-[15px] font-bold" style={{ color: color.label }}>
            {isdo ? "Always do" : "Never do"}
          </span>
        </div>
        <span className="text-[12px] font-mono px-2 py-[2px] rounded-[5px]"
          style={{ background: color.bg, color: color.label }}>
          {rules.length}/{max}
        </span>
      </div>

      {/* Rules list */}
      <div className="flex flex-col gap-[6px]">
        {rules.length === 0 ? (
          <div className="text-[13px] px-4 py-3 rounded-[8px] bg-[#111118] border border-dashed border-[rgba(255,255,255,0.08)]"
            style={{ color: "#55556a" }}>
            {emptyLabel}
          </div>
        ) : (
          rules.map((rule, i) => (
            <RuleTag key={i} text={rule} color={color} onRemove={() => onRemove(type, i)} />
          ))
        )}
      </div>

      {/* Input */}
      {rules.length < max && (
        <RuleInput
          onAdd={text => onAdd(type, text)}
          placeholder={placeholder}
          accentColor={color.label}
        />
      )}
    </div>
  );
}

export default function MyRulesSection() {
  const { rules, addRule, removeRule, MAX_RULES } = useUserRules();

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0d0d18] px-6 py-6 gap-7">

      {/* Header */}
      <div>
        <h2 className="text-[24px] font-bold text-[#e8e8f0]"
          style={{ fontFamily: "'Syne', sans-serif" }}>My Rules</h2>
        <p className="text-[14px] text-[#7070a0] mt-1 leading-relaxed">
          These rules are injected into every AI generation.<br />
          Think of them as your permanent creative brief.
        </p>
      </div>

      {/* DO */}
      <RuleList
        type="do"
        rules={rules.do}
        onAdd={addRule}
        onRemove={removeRule}
        max={MAX_RULES}
        emptyLabel="Nothing yet — add what the AI should always do."
        placeholder='e.g. Always end with a strong CTA'
        color={{
          bg:     "rgba(0,212,120,0.08)",
          border: "rgba(0,212,120,0.25)",
          label:  "#00d478",
        }}
      />

      <div className="h-[1px] bg-[rgba(255,255,255,0.06)]" />

      {/* DON'T */}
      <RuleList
        type="dont"
        rules={rules.dont}
        onAdd={addRule}
        onRemove={removeRule}
        max={MAX_RULES}
        emptyLabel="Nothing yet — add what the AI should never do."
        placeholder='e.g. Never use filler phrases'
        color={{
          bg:     "rgba(248,113,113,0.08)",
          border: "rgba(248,113,113,0.25)",
          label:  "#f87171",
        }}
      />

      {/* Footer note */}
      <div className="mt-auto pt-5 border-t border-[rgba(255,255,255,0.06)]">
        <p className="text-[12px] text-[#55556a] leading-relaxed">
          Max {MAX_RULES} rules per category · 120 characters each · Saved locally on this device
        </p>
      </div>

    </div>
  );
}
