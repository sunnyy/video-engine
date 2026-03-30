/**
 * ContentTab.jsx
 * src/ui/Editor/zones/tabs/ContentTab.jsx
 *
 * Two-column grid for dropdowns.
 * Full-width sliders below for Padding, Radius, Shadow.
 */
import React from "react";
import { transitionsRegistry } from "../../../../core/transitionsRegistry";
import { motionsRegistry }     from "../../../../core/motionsRegistry";

function FieldLabel({ children }) {
  return (
    <div
      className="text-[14px] font-bold tracking-widest uppercase text-[#7070a0] mb-[4px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </div>
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[5px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Slider({ label, value, onChange, min = 0, max = 60, unit = "px" }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex justify-between items-center">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[10px] font-mono text-[#7070a0]">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer"
        style={{ height: 2 }}
      />
    </div>
  );
}

export default function ContentTab({
  slot, zone, openPicker, updateContentProp,
  setPadding, setZoneStyle, clearContent,
}) {
  const content  = zone?.content || {};
  const style    = zone?.style   || {};

  const enters  = Object.keys(transitionsRegistry.enter || {});
  const exits   = Object.keys(transitionsRegistry.exit  || {});
  const motions = Object.keys(motionsRegistry || {});

  const radiusVal  = style.borderRadius ?? 0;
  const shadowVal  = style.shadowBlur   ?? 0;

  const allPadding = (v) => {
    setPadding(slot, "top",    v);
    setPadding(slot, "right",  v);
    setPadding(slot, "bottom", v);
    setPadding(slot, "left",   v);
  };

  /* ── Empty ── */
  if (!content.kind) return (
    <div
      className="flex flex-col items-center justify-center gap-2 cursor-pointer py-6 opacity-50"
      onClick={() => openPicker(slot, "content")}
    >
      <div className="text-[28px] leading-none text-[#9494a8]">+</div>
      <span className="text-[11px] text-[#9494a8]">Add content</span>
    </div>
  );

  /* ── Block ── */
  if (content.kind === "block") return (
    <div className="flex flex-col items-center justify-center gap-1 py-6">
      <div className="bg-[rgba(124,92,252,0.15)] text-[#a78fff] text-[12px] font-semibold px-3 py-[3px] rounded-[5px]">
        {content.block?.type}
      </div>
      <span className="text-[10px] text-[#7070a0]">Edit below ↓</span>
    </div>
  );

  /* ── Color ── */
  if (content.kind === "color") return (
    <div className="flex flex-col items-center justify-center gap-2 py-6">
      <div
        className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.12)]"
        style={{ background: content.color }}
      />
      <span className="text-[10px] font-mono text-[#7070a0]">{content.color}</span>
    </div>
  );

  /* ── Asset ── */
  return (
    <div className="flex flex-col gap-3">

      {/* 2-column dropdowns */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-3">

        <div>
          <FieldLabel>Fit</FieldLabel>
          <Sel
            value={content.asset?.objectFit || "cover"}
            onChange={v => updateContentProp(slot, "objectFit", v)}
            options={["cover", "contain"]}
          />
        </div>

        <div>
          <FieldLabel>Motion</FieldLabel>
          <Sel
            value={content.asset?.motion || "none"}
            onChange={v => updateContentProp(slot, "motion", v)}
            options={motions}
          />
        </div>

        <div>
          <FieldLabel>Enter</FieldLabel>
          <Sel
            value={content.asset?.enterTransition || "fadeIn"}
            onChange={v => updateContentProp(slot, "enterTransition", v)}
            options={enters}
          />
        </div>

        <div>
          <FieldLabel>Exit</FieldLabel>
          <Sel
            value={content.asset?.exitTransition || "none"}
            onChange={v => updateContentProp(slot, "exitTransition", v)}
            options={exits}
          />
        </div>

      </div>

      {/* Divider */}
      <div className="h-[1px] bg-[rgba(255,255,255,0.06)]" />

      {/* Full-width sliders */}
      <div className="flex flex-col gap-3">
        <Slider label="Scale"   value={Math.round((zone?.style?.scale ?? 1) * 100)} onChange={v => setZoneStyle && setZoneStyle(slot, "scale", v / 100)} min={50} max={100} unit="%" />
        <Slider label="Radius"  value={radiusVal}  onChange={v => setZoneStyle && setZoneStyle(slot, "borderRadius", v)} max={80} />
        <Slider label="Shadow"  value={shadowVal}  onChange={v => setZoneStyle && setZoneStyle(slot, "shadowBlur",   v)} max={60} />
      </div>

    </div>
  );
}