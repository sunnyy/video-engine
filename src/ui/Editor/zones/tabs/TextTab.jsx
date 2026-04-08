/**
 * TextTab.jsx
 * src/ui/Editor/zones/tabs/TextTab.jsx
 */
import React from "react";

const FONT_FAMILIES = [
  { label: "Default",          value: "inherit" },
  { label: "Bebas Neue",       value: "'Bebas Neue', sans-serif" },
  { label: "Syne",             value: "'Syne', sans-serif" },
  { label: "Outfit",           value: "'Outfit', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "JetBrains Mono",   value: "'JetBrains Mono', monospace" },
  { label: "Unbounded",        value: "'Unbounded', sans-serif" },
  { label: "Barlow Condensed", value: "'Barlow Condensed', sans-serif" },
];

function Label({ children }) {
  return (
    <div className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] mb-[3px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>
  );
}

function Sel({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[5px] px-2 py-[4px] text-[11px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  );
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, unit = "", decimals = 0 }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <div className="flex justify-between"><Label>{label}</Label><span className="text-[10px] font-mono text-[#7070a0]">{Number(value).toFixed(decimals)}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 2 }} />
    </div>
  );
}

export default function TextTab({ slot, zone, zoneDef, updateTextContent, updateTextStyle }) {
  const content    = zone?.content || {};
  const style      = zone?.style   || {};

  const text       = content.text      || "";
  const fontSize   = Math.round(parseFloat(style.fontSize    ?? zoneDef?.style?.fontSize    ?? 32));
  const fontWeight = style.fontWeight  ?? zoneDef?.style?.fontWeight  ?? 700;
  const fontFamily = style.fontFamily  ?? zoneDef?.style?.fontFamily  ?? "inherit";
  const color      = style.color       ?? zoneDef?.style?.color       ?? "#ffffff";
  const textAlign  = style.textAlign   ?? zoneDef?.style?.textAlign   ?? "center";
  const lineHeight     = parseFloat(style.lineHeight    ?? zoneDef?.style?.lineHeight    ?? 1.15);
  const letterSpacing  = parseFloat(style.letterSpacing ?? zoneDef?.style?.letterSpacing ?? 0);
  const opacity        = style.opacity     ?? zoneDef?.style?.opacity     ?? 1;
  const background     = style.background  ?? "transparent";

  return (
    <div className="flex flex-col gap-2 py-1">

      {/* Text */}
      <div>
        <Label>Text</Label>
        <textarea value={text} onChange={e => updateTextContent(slot, e.target.value)}
          rows={3} placeholder="Enter text..."
          className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[5px] px-2 py-[6px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none placeholder-[#55556a]" />
      </div>

      <div className="h-[1px] bg-[rgba(255,255,255,0.05)]" />

      {/* Font family */}
      <div>
        <Label>Font Family</Label>
        <Sel value={fontFamily} onChange={v => updateTextStyle(slot, "fontFamily", v)} options={FONT_FAMILIES} />
      </div>

      {/* Align + Weight */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Align</Label>
          <Sel value={textAlign} onChange={v => updateTextStyle(slot, "textAlign", v)}
            options={[{ label:"Left",value:"left" },{ label:"Center",value:"center" },{ label:"Right",value:"right" }]} />
        </div>
        <div>
          <Label>Weight</Label>
          <Sel value={String(fontWeight)} onChange={v => updateTextStyle(slot, "fontWeight", Number(v))}
            options={[{ label:"Regular",value:"400" },{ label:"Medium",value:"500" },{ label:"Semi Bold",value:"600" },{ label:"Bold",value:"700" },{ label:"Extra Bold",value:"800" },{ label:"Black",value:"900" }]} />
        </div>
      </div>

      <Slider label="Font Size"      value={fontSize}                    onChange={v => updateTextStyle(slot,"fontSize",v)}      min={10}   max={300}  step={1}    unit="px" />
      <Slider label="Line Height"    value={lineHeight}                  onChange={v => updateTextStyle(slot,"lineHeight",v)}    min={0.7}  max={3}    step={0.05} unit="×" decimals={2} />
      <Slider label="Letter Spacing" value={letterSpacing}               onChange={v => updateTextStyle(slot,"letterSpacing",v)} min={-10}  max={50}   step={0.5}  unit="px" decimals={1} />
      <Slider label="Opacity"        value={Math.round(opacity*100)}     onChange={v => updateTextStyle(slot,"opacity",v/100)}   min={10}   max={100}  step={1}    unit="%" />

      {/* Color + BG color */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Text Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={e => updateTextStyle(slot,"color",e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-[10px] font-mono text-[#7070a0] truncate">{color}</span>
          </div>
        </div>
        <div>
          <Label>BG Color</Label>
          <div className="flex items-center gap-2">
            <input type="color"
              value={background === "transparent" || !background ? "#000000" : background}
              onChange={e => updateTextStyle(slot,"background",e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
            <button onClick={() => updateTextStyle(slot,"background","transparent")}
              className="text-[9px] text-[#7070a0] hover:text-[#f87171] bg-transparent border-0 cursor-pointer">clear</button>
          </div>
        </div>
      </div>

    </div>
  );
}