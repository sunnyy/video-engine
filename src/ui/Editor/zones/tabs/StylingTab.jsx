/**
 * StylingTab.jsx
 * src/ui/Editor/zones/tabs/StylingTab.jsx
 *
 * Simple styling controls for asset presentation inside a zone:
 * - Padding (one slider, all 4 sides equal)
 * - Border Radius
 * - Box Shadow blur intensity
 */
import React from "react";

function SliderRow({ label, value, onChange, min = 0, max = 60, step = 1, unit = "px" }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex justify-between items-center">
        <span
          className="text-[10px] font-bold tracking-widest uppercase text-[#55556a]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {label}
        </span>
        <span className="text-[11px] font-mono text-[#9494a8]">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] h-[3px] cursor-pointer"
      />
    </div>
  );
}

export default function StylingTab({ slot, zone, setPadding, setZoneStyle }) {
  const padding      = zone?.style?.padding      || {};
  const borderRadius = zone?.style?.borderRadius ?? 0;
  const shadowBlur   = zone?.style?.shadowBlur   ?? 0;

  // Single value controls all 4 sides equally
  const paddingValue = padding.top ?? 0;

  const handlePadding = (val) => {
    setPadding(slot, "top",    val);
    setPadding(slot, "right",  val);
    setPadding(slot, "bottom", val);
    setPadding(slot, "left",   val);
  };

  return (
    <div className="flex flex-col gap-5 mt-1">

      <SliderRow
        label="Padding"
        value={paddingValue}
        onChange={handlePadding}
        min={0}
        max={60}
      />

      <SliderRow
        label="Border Radius"
        value={borderRadius}
        onChange={v => setZoneStyle && setZoneStyle(slot, "borderRadius", v)}
        min={0}
        max={80}
      />

      <SliderRow
        label="Shadow"
        value={shadowBlur}
        onChange={v => setZoneStyle && setZoneStyle(slot, "shadowBlur", v)}
        min={0}
        max={60}
      />

    </div>
  );
}