/**
 * ZoneEditor.jsx
 * src/ui/Editor/ZoneEditor.jsx
 */
import React, { useEffect } from "react";
import { transitionsRegistry } from "../../../src/core/transitionsRegistry";
import { motionsRegistry }     from "../../../src/core/motionsRegistry";
import { useProjectStore }     from "../../../src/store/useProjectStore";
import { textStylePresets }    from "../../../src/core/textStylePresets";
import { backgroundPatternRegistry } from "../../../src/core/backgroundPatternRegistry";
import { TEXT_EFFECT_OPTIONS } from "../../../src/core/textEffectRegistry.jsx";
import blockEditors            from "./blocks/blockEditors";

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
    <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#7070a0] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[8px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237070a0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

/* Slider with undo batching — silent on drag, commit on mouseUp */
function Slider({ label, value, onChangeSilent, onCommit, min = 0, max = 100, step = 1, unit = "" }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-[5px]">
        <Label>{label}</Label>
        <span className="text-[11px] font-mono text-[#55556a]">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChangeSilent(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 3 }}
      />
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#3a3a55] mb-3 mt-1"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>
  );
}

function Divider() {
  return <div className="h-[1px] bg-[rgba(255,255,255,0.05)] my-4" />;
}

function ZoneBgRow({ bg, slot, openPicker, clearBackground, padding, setStyleSilent, commit }) {
  const bgStyle = bg?.kind === "pattern"
    ? (backgroundPatternRegistry[bg.key]?.style || { background: "#111" })
    : bg?.kind === "color"
    ? { background: bg.color, backgroundSize: bg.backgroundSize || "auto" }
    : null;

  return (
    <div className="flex flex-col gap-3 mb-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Zone Background</Label>
          <div className="flex items-center gap-2">
            <div
              onClick={() => openPicker(slot, "background")}
              className="relative w-[36px] h-[28px] rounded-[6px] border border-[rgba(255,255,255,0.1)] overflow-hidden cursor-pointer shrink-0 bg-[#0b0b10] hover:border-[#7c5cfc] transition-colors"
            >
              {bgStyle && <div className="absolute inset-0" style={bgStyle} />}
              {!bgStyle && <div className="absolute inset-0 flex items-center justify-center text-[#55556a] text-[14px]">+</div>}
            </div>
            <button onClick={() => openPicker(slot, "background")}
              className="text-[11px] text-[#7c5cfc] hover:text-[#9d7fff] bg-transparent border-0 cursor-pointer">
              {bgStyle ? "Change" : "Add"}
            </button>
            {bgStyle && (
              <button onClick={() => clearBackground(slot)}
                className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer ml-auto">
                clear
              </button>
            )}
          </div>
          {bg?.kind === "pattern" && bg.key && (
            <div className="text-[9px] font-mono text-[#55556a] mt-1 truncate">{bg.key}</div>
          )}
        </div>
        <Slider label="Padding" value={padding}
          onChangeSilent={v => setStyleSilent("contentPadding", v)}
          onCommit={commit} min={0} max={120} unit="px" />
      </div>
    </div>
  );
}

export default function ZoneEditor({
  beatId,
  slot, zone, zoneDef, zoneType,
  openPicker,
  updateTextContent, updateTextStyle, updateTextStyleBulk,
  updateContentProp, updateBlockProp,
  updateBackgroundProp,
  setZoneStyle, setZoneLayout,
  setZoneStyleSilent, setZoneLayoutSilent,
  patchZoneSilent,
  clearContent, clearBackground,
  onDelete,
}) {
  const commitBeat = useProjectStore(s => s.commitBeat);

  const safeZone = zone || {};
  const content  = safeZone.content    || {};
  const style    = safeZone.style      || {};

  const isText  = zoneType === "text";
  const isBlock = content.kind === "block";

  const enters  = Object.keys(transitionsRegistry.enter || {});
  const exits   = Object.keys(transitionsRegistry.exit  || {});
  const motions = Object.keys(motionsRegistry || {});

  const start   = safeZone.start          ?? zoneDef?.start          ?? 0;
  const end     = safeZone.end            !== undefined ? safeZone.end : (zoneDef?.end ?? null);
  const enter   = safeZone.enterAnimation ?? zoneDef?.enterAnimation ?? "fadeIn";
  const exit    = safeZone.exitAnimation  ?? zoneDef?.exitAnimation  ?? "none";
  const radius  = style.borderRadius ?? 0;
  const shadow  = style.shadowBlur   ?? 0;
  const padding = style.contentPadding ?? 0;
  const bg      = safeZone.background || {};

  const commit = () => commitBeat(beatId);

  // Helpers — silent versions for sliders
  const setStyleSilent  = (key, val) => setZoneStyleSilent(slot, key, val);
  const setLayoutSilent = (key, val) => setZoneLayoutSilent(slot, key, val);

  // Layer order — compute from OTHER zones only
  const otherZIndices = Object.entries(
    useProjectStore.getState().project?.beats?.find(b => b.id === beatId)?.zones || {}
  ).filter(([key]) => key !== slot).map(([, z]) => z.zIndex ?? 1);
  const currentZIndex = safeZone.zIndex ?? 1;
  const maxZ = otherZIndices.length ? Math.max(...otherZIndices) : currentZIndex;
  const minZ = otherZIndices.length ? Math.min(...otherZIndices) : currentZIndex;
  const isAtFront = otherZIndices.length > 0 && currentZIndex > maxZ;
  const isAtBack  = currentZIndex <= 1 && (otherZIndices.length === 0 || currentZIndex <= minZ);
  const bringToFront  = () => setZoneLayout(slot, "zIndex", maxZ + 1);
  const moveForward   = () => setZoneLayout(slot, "zIndex", currentZIndex + 1);
  const moveBackward  = () => setZoneLayout(slot, "zIndex", Math.max(1, currentZIndex - 1));
  const sendToBack    = () => setZoneLayout(slot, "zIndex", Math.max(1, minZ - 1));

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Delete") return;
      if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
      e.preventDefault();
      onDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDelete]);

  return (
    <div className="pb-6">

      {/* ── TEXT ── */}
      {isText && (
        <>
          <SectionTitle>Text</SectionTitle>
          <div className="flex gap-3 mb-4">
            {/* Type switcher */}
            <div
              onClick={() => openPicker(slot, "content")}
              className="relative shrink-0 rounded-[10px] overflow-hidden cursor-pointer group border-2 border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc] transition-colors flex flex-col items-center justify-center gap-1 bg-[#0e0e1a]"
              style={{ width: 80, height: 80 }}
            >
              <span className="text-[24px] pointer-events-none">T</span>
              <span className="text-[9px] text-[#9494a8] font-mono pointer-events-none">Text</span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
              </div>
            </div>
            <textarea
              value={content.text || ""}
              onChange={e => updateTextContent(slot, e.target.value)}
              rows={4}
              placeholder="Enter text..."
              className="flex-1 bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none placeholder-[#55556a]"
            />
          </div>

          {/* Style Presets — single call applies all keys at once */}
          <div className="mb-4">
            <Label>Presets</Label>
            <div className="flex gap-[5px] flex-wrap mt-[5px]">
              {textStylePresets.map(preset => {
                const isActive = (style._presetId === preset.id);
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      const { fontSize, fontWeight, textAlign, ...flair } = preset.style;
                      const flairStyle = flair.background
                        ? flair
                        : { ...flair, background: "transparent" };
                      updateTextStyleBulk(slot, { ...flairStyle, _presetId: preset.id });
                    }}
                    className="px-[12px] py-[6px] rounded-[6px] text-[14px] font-bold border-0 cursor-pointer transition-all hover:scale-105"
                    style={{
                      background:  preset.style.background || "rgba(255,255,255,0.08)",
                      color:       preset.style.color || "#ffffff",
                      fontFamily:  preset.style.fontFamily || "inherit",
                      outline:     isActive ? "2px solid #7c5cfc" : "2px solid transparent",
                      outlineOffset: "2px",
                      boxShadow:   isActive ? "0 0 8px rgba(124,92,252,0.6)" : "none",
                    }}
                    title={`Apply ${preset.label}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <Sel label="Font" value={style.fontFamily ?? "inherit"} onChange={v => updateTextStyle(slot,"fontFamily",v)} options={FONT_FAMILIES} />
            <Sel label="Align" value={style.textAlign ?? "center"} onChange={v => updateTextStyle(slot,"textAlign",v)}
              options={[{label:"Left",value:"left"},{label:"Center",value:"center"},{label:"Right",value:"right"}]} />
            <Sel label="Weight" value={String(style.fontWeight ?? 700)} onChange={v => updateTextStyle(slot,"fontWeight",Number(v))}
              options={[{label:"Regular",value:"400"},{label:"Medium",value:"500"},{label:"Semi",value:"600"},{label:"Bold",value:"700"},{label:"Extra",value:"800"},{label:"Black",value:"900"}]} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Slider label="Font Size" value={Math.round(parseFloat(style.fontSize ?? 32))}
              onChangeSilent={v => {
                const curFont = parseFloat(style.fontSize ?? 32);
                const curH    = safeZone.height ?? zoneDef?.height ?? 20;
                const newH    = curFont > 0 ? Math.max(3, Math.round(curH * (v / curFont))) : curH;
                patchZoneSilent(slot, { height: newH }, { fontSize: v });
              }}
              onCommit={commit} min={10} max={300} unit="px" />
            <Slider label="Opacity" value={Math.round((style.opacity ?? 1)*100)}
              onChangeSilent={v => setStyleSilent("opacity", v/100)}
              onCommit={commit} min={0} max={100} unit="%" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Slider label="Line Height"
              value={Math.round(parseFloat(style.lineHeight ?? 1.15) * 100) / 100}
              onChangeSilent={v => setStyleSilent("lineHeight", v)}
              onCommit={commit} min={0.7} max={3} step={0.05} unit="×" />
            <Slider label="Letter Spacing"
              value={Math.round(parseFloat(style.letterSpacing ?? 0) * 10) / 10}
              onChangeSilent={v => setStyleSilent("letterSpacing", v)}
              onCommit={commit} min={-10} max={50} step={0.5} unit="px" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Slider label="Border Radius" value={radius}
              onChangeSilent={v => setStyleSilent("borderRadius", v)}
              onCommit={commit} min={0} max={200} unit="px" />
            <Slider label="Padding" value={padding}
              onChangeSilent={v => setStyleSilent("contentPadding", v)}
              onCommit={commit} min={0} max={100} unit="px" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Text Color</Label>
              <div className="flex items-center gap-2 bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[7px]">
                <input type="color" value={style.color ?? "#ffffff"} onChange={e => updateTextStyle(slot,"color",e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0" />
                <span className="text-[11px] font-mono text-[#7070a0] truncate">{style.color ?? "#ffffff"}</span>
              </div>
            </div>
            <div>
              <Label>BG Color</Label>
              <div className="flex items-center gap-2 bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[7px]">
                <input type="color"
                  value={!style.background || style.background === "transparent" ? "#000000" : style.background}
                  onChange={e => updateTextStyle(slot,"background",e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0" />
                <button onClick={() => updateTextStyle(slot,"background","transparent")}
                  className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer ml-auto">clear</button>
              </div>
            </div>
          </div>

          {/* Zone Background + Padding */}
          <ZoneBgRow bg={bg} slot={slot} openPicker={openPicker} clearBackground={clearBackground}
            padding={padding} setStyleSilent={setStyleSilent} commit={commit} />

          {/* ── Text Effect ── */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <div>
              <Label>Text Effect</Label>
              <select value={style.textEffect ?? "none"}
                onChange={e => setZoneStyle(slot, "textEffect", e.target.value)}
                className="w-full bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[7px] text-[12px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
                {TEXT_EFFECT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {(style.textEffect && style.textEffect !== "none") && (
              <Slider label="Effect Speed"
                value={Math.round((style.textEffectSpeed ?? 1.0) * 10) / 10}
                onChangeSilent={v => setStyleSilent("textEffectSpeed", v)}
                onCommit={commit} min={0.25} max={3.0} step={0.25} unit="x" />
            )}
          </div>
        </>
      )}

      {/* ── BLOCK ── */}
      {isBlock && (() => {
        const BlockEditor = blockEditors[content.block?.type];
        return (
          <>
            <SectionTitle>Block</SectionTitle>
            <div className="flex gap-4 mb-4">
              {/* Type switcher */}
              <div
                onClick={() => openPicker(slot, "content")}
                className="relative shrink-0 rounded-[10px] overflow-hidden cursor-pointer group border-2 border-[rgba(124,92,252,0.3)] hover:border-[#7c5cfc] transition-colors flex flex-col items-center justify-center gap-1 bg-[#0e0e1a]"
                style={{ width: 120, height: 120 }}
              >
                <span className="text-[28px] pointer-events-none">⬛</span>
                <span className="text-[10px] text-[#a78bfa] font-mono pointer-events-none truncate w-full text-center px-1">{content.block?.type || "Block"}</span>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
                </div>
              </div>
              <div className="flex-1 flex items-center">
                <span className="text-[11px] text-[#55556a] font-mono leading-relaxed">Click the card to switch to a different block, image, or text.</span>
              </div>
            </div>
            {BlockEditor
              ? <><BlockEditor slot={slot} block={content.block} updateBlockProp={updateBlockProp} /><Divider /></>
              : <div className="text-[11px] text-[#55556a] font-mono mb-4">No editor for: {content.block?.type}</div>
            }
          </>
        );
      })()}

      {/* ── ASSET ── */}
      {!isText && !isBlock && (
        <>
          <SectionTitle>Asset</SectionTitle>
          <div className="flex gap-4 mb-4">

            {/* Preview */}
            <div className="relative shrink-0 rounded-[10px] overflow-hidden cursor-pointer group border-2 border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc] transition-colors"
              style={{ width: 100, height: 130 }}
              onClick={() => openPicker(slot, "content")}>
              {content.asset?.src ? (
                <img src={content.asset.src} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#0e0e1a] flex flex-col items-center justify-center gap-1 opacity-50">
                  <span className="text-[22px]">＋</span>
                  <span className="text-[9px] text-[#9494a8] text-center px-1">Add Asset</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {content.asset?.src ? "Change" : "Add"}
                </span>
              </div>
              {content.asset?.src && (
                <button onClick={e => { e.stopPropagation(); clearContent(slot); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#ff4444] text-white text-[10px] flex items-center justify-center border-0 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  ✕
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <Sel label="Object Fit" value={content.asset?.objectFit || "cover"} onChange={v => updateContentProp(slot,"objectFit",v)} options={["cover","contain"]} />
                <Slider label="Rounded" value={radius}
                  onChangeSilent={v => setStyleSilent("borderRadius", v)}
                  onCommit={commit} min={0} max={300} unit="px" />
                <Slider label="Shadow" value={shadow}
                  onChangeSilent={v => setStyleSilent("shadowBlur", v)}
                  onCommit={commit} min={0} max={100} unit="px" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Sel label="Enter" value={enter} onChange={v => setZoneLayout(slot,"enterAnimation",v)} options={enters} />
                <Sel label="Exit"  value={exit}  onChange={v => setZoneLayout(slot,"exitAnimation",v)}  options={exits}  />
                <Sel label="Motion" value={content.asset?.motion || "none"} onChange={v => updateContentProp(slot,"motion",v)} options={motions} />
              </div>
            </div>
          </div>

          {/* Zone Background + Padding */}
          <ZoneBgRow bg={bg} slot={slot} openPicker={openPicker} clearBackground={clearBackground}
            padding={padding} setStyleSilent={setStyleSilent} commit={commit} />
        </>
      )}


      <Divider />

      {/* ── LAYER ORDER ── */}
      <div className="flex items-center gap-2 mb-4">
        <Label>Layer</Label>
        <span className="text-[11px] font-mono text-[#55556a] ml-1">z{currentZIndex}</span>
        <div className="flex gap-[4px] ml-auto">
          {[
            { label: "⤒", title: "Bring to Front", action: bringToFront, disabled: isAtFront },
            { label: "↑", title: "Move Forward",   action: moveForward,  disabled: isAtFront },
            { label: "↓", title: "Move Backward",  action: moveBackward, disabled: isAtBack  },
            { label: "⤓", title: "Send to Back",   action: sendToBack,   disabled: isAtBack  },
          ].map(({ label, title, action, disabled }) => (
            <button
              key={title}
              onClick={action}
              disabled={disabled}
              title={title}
              className="w-[28px] h-[28px] rounded-[6px] text-[13px] font-bold border flex items-center justify-center cursor-pointer transition-all"
              style={disabled
                ? { background: "transparent", borderColor: "rgba(255,255,255,0.05)", color: "#2e2e45", cursor: "not-allowed" }
                : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#9494a8" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── TIMING ── */}
      <SectionTitle>Timing</SectionTitle>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <Slider label="Start" value={Number(start.toFixed(1))}
          onChangeSilent={v => setLayoutSilent("start", v)}
          onCommit={commit} min={0} max={30} step={0.1} unit="s" />
        <div>
          <div className="flex justify-between items-center mb-[5px]">
            <Label>End</Label>
            <span className="text-[11px] font-mono text-[#55556a]">{end === null ? "auto" : `${Number(end).toFixed(1)}s`}</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={30} step={0.1}
              value={end === null ? 30 : end}
              onChange={e => { const v = Number(e.target.value); setLayoutSilent("end", v >= 30 ? null : v); }}
              onMouseUp={commit} onTouchEnd={commit}
              className="flex-1 accent-[#7c5cfc] cursor-pointer" style={{ height: 3 }} />
            {end !== null && (
              <button onClick={() => setZoneLayout(slot,"end",null)}
                className="text-[9px] text-[#7c5cfc] border-0 bg-transparent cursor-pointer shrink-0">auto</button>
            )}
          </div>
        </div>
      </div>

      <Divider />


      {/* ── DELETE ── */}
      <button onClick={onDelete}
        className="w-full py-[8px] rounded-[8px] text-[12px] font-bold text-[#ff6060] border border-[rgba(255,60,60,0.15)] hover:bg-[rgba(255,60,60,0.08)] bg-transparent cursor-pointer transition-colors">
        Delete Zone <span className="opacity-30 text-[10px] ml-1">Del</span>
      </button>

    </div>
  );
}