/**
 * BackgroundTab.jsx
 * src/ui/Editor/zones/tabs/BackgroundTab.jsx
 */
import React from "react";
import { motionsRegistry } from "../../../../core/motionsRegistry";

function FieldLabel({ children }) {
  return (
    <div className="text-[14px] font-bold tracking-widest uppercase text-[#7070a0] mb-[4px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[5px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = "" }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex justify-between items-center">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[10px] font-mono text-[#7070a0]">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
    </div>
  );
}

export default function BackgroundTab({ slot, zone, openPicker, updateBackgroundProp, clearBackground }) {
  const bg      = zone?.background || {};
  const motions = Object.keys(motionsRegistry || {});

  if (!bg.kind) return (
    <div className="flex flex-col items-center justify-center gap-2 cursor-pointer py-6 opacity-50"
      onClick={() => openPicker(slot, "background")}>
      <div className="text-[28px] leading-none text-[#9494a8]">+</div>
      <span className="text-[11px] text-[#9494a8]">Add background</span>
    </div>
  );

  if (bg.kind === "color") return (
    <div className="flex flex-col items-center gap-3 py-3">
      <div className="w-full h-[48px] rounded-[8px] border border-[rgba(255,255,255,0.1)]"
        style={{ background: bg.color, backgroundSize: bg.backgroundSize || "auto" }} />
      <span className="text-[10px] font-mono text-[#7070a0] text-center break-all max-w-[140px]">
        {bg.color?.length > 30 ? "Gradient / Pattern" : bg.color}
      </span>
      <button onClick={() => openPicker(slot, "background")}
        className="text-[11px] text-[#7c5cfc] hover:text-[#9d7fff] transition-colors bg-transparent border-0 cursor-pointer">
        Change
      </button>
    </div>
  );

  if (bg.kind === "asset") {
    const opacity = bg.asset?.opacity ?? 1;
    const blur    = bg.asset?.blur    ?? 0;
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          <div>
            <FieldLabel>Fit</FieldLabel>
            <Sel value={bg.asset?.objectFit || "cover"} onChange={v => updateBackgroundProp(slot, "objectFit", v)} options={["cover", "contain"]} />
          </div>
          <div>
            <FieldLabel>Motion</FieldLabel>
            <Sel value={bg.asset?.motion || "none"} onChange={v => updateBackgroundProp(slot, "motion", v)} options={motions} />
          </div>
        </div>
        <div className="h-[1px] bg-[rgba(255,255,255,0.06)]" />
        <div className="flex flex-col gap-3">
          <Slider label="Opacity" value={Math.round(opacity * 100)} onChange={v => updateBackgroundProp(slot, "opacity", v / 100)} min={10} max={100} unit="%" />
          <Slider label="Blur"    value={blur}                      onChange={v => updateBackgroundProp(slot, "blur", v)}            min={0}  max={20}  unit="px" />
        </div>
      </div>
    );
  }

  return null;
}