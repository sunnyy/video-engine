/**
 * LayoutTab.jsx
 * src/ui/Editor/zones/tabs/LayoutTab.jsx
 */
import React from "react";
import { transitionsRegistry } from "../../../../core/registries/transitionsRegistry";

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] mb-[2px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>
  );
}

function NumSlider({ label, value, onChange, min = 0, max = 100, step = 1, unit = "%" }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="flex justify-between"><Label>{label}</Label><span className="text-[10px] font-mono text-[#7070a0]">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <Label>{label}</Label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[5px] px-2 py-[4px] text-[11px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function LayoutTab({ slot, zone, zoneDef, setZoneLayout }) {
  const x      = zone.x              ?? zoneDef?.x              ?? 0;
  const y      = zone.y              ?? zoneDef?.y              ?? 0;
  const width  = zone.width          ?? zoneDef?.width          ?? 100;
  const height = zone.height         ?? zoneDef?.height         ?? 100;
  const zIndex = zone.zIndex         ?? zoneDef?.zIndex         ?? 1;
  const start  = zone.start          ?? zoneDef?.start          ?? 0;
  const end    = zone.end            !== undefined ? zone.end   : (zoneDef?.end ?? null);
  const enter  = zone.enterAnimation ?? zoneDef?.enterAnimation ?? "fadeIn";
  const exit   = zone.exitAnimation  ?? zoneDef?.exitAnimation  ?? "none";

  const enters = Object.keys(transitionsRegistry.enter || {});
  const exits  = Object.keys(transitionsRegistry.exit  || {});

  return (
    <div className="flex flex-col gap-3 py-1">

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <NumSlider label="X" value={x} onChange={v => setZoneLayout(slot,"x",v)} />
        <NumSlider label="Y" value={y} onChange={v => setZoneLayout(slot,"y",v)} />
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <NumSlider label="Width"  value={width}  onChange={v => setZoneLayout(slot,"width",v)}  min={5} />
        <NumSlider label="Height" value={height} onChange={v => setZoneLayout(slot,"height",v)} min={5} />
      </div>

      {/* Z-Index */}
      <NumSlider label="Z-Index" value={zIndex} onChange={v => setZoneLayout(slot,"zIndex",v)} min={1} max={20} step={1} unit="" />

      {/* Timing */}
      <div className="grid grid-cols-2 gap-2">
        <NumSlider label="Start" value={start} onChange={v => setZoneLayout(slot,"start",v)} min={0} max={30} step={0.1} unit="s" />
        <div className="flex flex-col gap-[2px]">
          <div className="flex justify-between">
            <Label>End</Label>
            <span className="text-[10px] font-mono text-[#7070a0]">{end === null ? "auto" : `${end}s`}</span>
          </div>
          <div className="flex items-center gap-1">
            <input type="range" min={0} max={30} step={0.1}
              value={end === null ? 30 : end}
              onChange={e => { const v = Number(e.target.value); setZoneLayout(slot,"end", v >= 30 ? null : v); }}
              className="flex-1 accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
            {end !== null && (
              <button onClick={() => setZoneLayout(slot,"end",null)}
                className="text-[9px] text-[#7c5cfc] border-0 bg-transparent cursor-pointer">auto</button>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <div className="grid grid-cols-2 gap-2">
        <Sel label="Enter" value={enter} onChange={v => setZoneLayout(slot,"enterAnimation",v)} options={enters} />
        <Sel label="Exit"  value={exit}  onChange={v => setZoneLayout(slot,"exitAnimation",v)}  options={exits}  />
      </div>

    </div>
  );
}