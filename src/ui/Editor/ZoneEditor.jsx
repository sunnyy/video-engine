/**
 * ZoneEditor.jsx — grouped, collapsible zone editor
 */
import { useState, useEffect } from "react";
import { transitionsRegistry } from "../../../src/core/transitionsRegistry";
import { motionsRegistry }     from "../../../src/core/motionsRegistry";
import { useProjectStore }     from "../../../src/store/useProjectStore";
import { textStylePresets }    from "../../../src/core/textStylePresets";
import { backgroundPatternRegistry } from "../../../src/core/backgroundPatternRegistry";
import { TEXT_EFFECT_OPTIONS } from "../../../src/core/textEffectRegistry.jsx";
import { ANIMATED_BORDER_OPTIONS } from "../../../src/core/animatedBorderRegistry.js";
import { ASSET_SHINE_OPTIONS }     from "../../../src/core/assetShineRegistry.jsx";
import decorativeShapeRegistry, { renderDecorativeSVG, DECORATIVE_SHAPE_OPTIONS } from "../../../src/core/decorativeShapeRegistry.js";
import iconRegistry, { ICON_OPTIONS, renderIconSVG } from "../../../src/core/iconRegistry.jsx";
import blockEditors            from "./blocks/blockEditors";

/* ── Font options ── */
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

const FONT_WEIGHTS = [
  { label: "Reg",   value: 400 },
  { label: "Med",   value: 500 },
  { label: "Semi",  value: 600 },
  { label: "Bold",  value: 700 },
  { label: "Xtra",  value: 800 },
  { label: "Black", value: 900 },
];

/* ── Primitive UI atoms ── */
function Label({ children }) {
  return (
    <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#9494a8] mb-[6px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>
  );
}

const ACTIVE_BTN   = { background: "rgba(124,92,252,0.18)", borderColor: "#7c5cfc", color: "#c4b5fd" };
const INACTIVE_BTN = { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#b0b0c8" };

function BtnGroup({ options, value, onChange, fullWidth = false }) {
  return (
    <div className={`flex gap-[4px] ${fullWidth ? "w-full" : ""}`}>
      {options.map(({ label, value: v, title }) => (
        <button key={v} title={title || label}
          onClick={() => onChange(v)}
          className={`${fullWidth ? "flex-1" : "px-[10px]"} py-[7px] rounded-[7px] text-[12px] font-bold border cursor-pointer transition-all flex items-center justify-center`}
          style={value === v ? ACTIVE_BTN : INACTIVE_BTN}
        >{label}</button>
      ))}
    </div>
  );
}

function ToggleBtn({ active, onClick, children, title }) {
  return (
    <button title={title} onClick={onClick}
      className="w-[32px] h-[30px] rounded-[7px] border cursor-pointer transition-all text-[14px] font-bold flex items-center justify-center"
      style={active ? ACTIVE_BTN : INACTIVE_BTN}
    >{children}</button>
  );
}

function Slider({ label, value, onChangeSilent, onCommit, onStart, min = 0, max = 100, step = 1, unit = "", right }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-[6px]">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {right}
          <span className="text-[12px] font-mono text-[#c0c0d8]">{value}{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onPointerDown={onStart}
        onChange={e => onChangeSilent(Number(e.target.value))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 4 }} />
    </div>
  );
}

function ColorRow({ label, value, onChange, onClear }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2 bg-[#0e0e1a] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-[8px]">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0" />
        <span className="text-[12px] font-mono text-[#b0b0c8] flex-1 truncate">{value}</span>
        {onClear && (
          <button onClick={onClear}
            className="text-[11px] text-[#7070a0] hover:text-[#f87171] bg-transparent border-0 cursor-pointer">clear</button>
        )}
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0e0e1a] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-[9px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239494a8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

/* ── Collapsible section wrapper ── */
function Section({ title, icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-[8px] px-0 group bg-transparent border-0 cursor-pointer"
      >
        <span className="flex items-center gap-[6px]">
          {icon && <span className="text-[12px] opacity-60">{icon}</span>}
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#55556a] group-hover:text-[#9494a8] transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>{title}</span>
          {badge && <span className="text-[9px] px-[5px] py-[1px] rounded-[4px] bg-[rgba(124,92,252,0.15)] text-[#7c5cfc] font-bold">{badge}</span>}
        </span>
        <span className="text-[#3a3a55] group-hover:text-[#7070a0] text-[10px] transition-all"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && <div className="pb-5">{children}</div>}
      <div className="h-[1px] bg-[rgba(255,255,255,0.04)]" />
    </div>
  );
}

/* ── Rotation control with snap buttons ── */
function RotationControl({ value, onChangeSilent, onCommit, onStart, label = "Rotation" }) {
  const snap = (deg) => {
    onStart?.();
    const next = Math.max(-180, Math.min(180, value + deg));
    onChangeSilent(next);
    setTimeout(onCommit, 0);
  };
  const reset = () => { onStart?.(); onChangeSilent(0); setTimeout(onCommit, 0); };
  return (
    <div>
      <div className="flex justify-between items-center mb-[5px]">
        <Label>{label}</Label>
        <div className="flex items-center gap-[3px]">
          {[{ d: -90, l: "↺90" }, { d: -45, l: "↺45" }].map(({ d, l }) => (
            <button key={l} onClick={() => snap(d)}
              className="px-[5px] py-[2px] rounded-[4px] text-[9px] font-bold border cursor-pointer transition-all"
              style={INACTIVE_BTN}>{l}</button>
          ))}
          <button onClick={reset}
            className="px-[5px] py-[2px] rounded-[4px] text-[9px] font-bold border cursor-pointer text-[#55556a] hover:text-[#e8e8f0] bg-transparent border-[rgba(255,255,255,0.06)]">{value}°</button>
          {[{ d: 45, l: "↻45" }, { d: 90, l: "↻90" }].map(({ d, l }) => (
            <button key={l} onClick={() => snap(d)}
              className="px-[5px] py-[2px] rounded-[4px] text-[9px] font-bold border cursor-pointer transition-all"
              style={INACTIVE_BTN}>{l}</button>
          ))}
        </div>
      </div>
      <input type="range" min={-180} max={180} step={1} value={value}
        onPointerDown={onStart}
        onChange={e => onChangeSilent(Number(e.target.value))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height: 3 }} />
    </div>
  );
}

/* ── Zone background row ── */
function ZoneBgRow({ bg, slot, openPicker, clearBackground, padding, setStyleSilent, commit }) {
  const bgStyle = bg?.kind === "pattern"
    ? (backgroundPatternRegistry[bg.key]?.style || { background: "#111" })
    : bg?.kind === "color"
    ? { background: bg.color }
    : null;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Zone Background</Label>
        <div className="flex items-center gap-2">
          <div onClick={() => openPicker(slot, "background")}
            className="relative w-[36px] h-[28px] rounded-[6px] border border-[rgba(255,255,255,0.1)] overflow-hidden cursor-pointer shrink-0 bg-[#0b0b10] hover:border-[#7c5cfc] transition-colors">
            {bgStyle && <div className="absolute inset-0" style={bgStyle} />}
            {!bgStyle && <div className="absolute inset-0 flex items-center justify-center text-[#55556a] text-[14px]">+</div>}
          </div>
          <button onClick={() => openPicker(slot, "background")}
            className="text-[11px] text-[#7c5cfc] hover:text-[#9d7fff] bg-transparent border-0 cursor-pointer">
            {bgStyle ? "Change" : "Add"}
          </button>
          {bgStyle && (
            <button onClick={() => clearBackground(slot)}
              className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer ml-auto">clear</button>
          )}
        </div>
      </div>
      <Slider label="Padding" value={padding}
        onChangeSilent={v => setStyleSilent("contentPadding", v)}
        onCommit={commit} min={0} max={120} unit="px" />
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
export default function ZoneEditor({
  beatId, slot, zone, zoneDef, zoneType,
  openPicker,
  updateTextContent, updateTextStyle, updateTextStyleBulk,
  updateContentProp, updateBlockProp,
  setZoneStyle, setZoneLayout,
  setZoneStyleSilent, setZoneLayoutSilent,
  patchZoneSilent, clearContent, clearBackground, onDelete,
  allZoneZIndices,
}) {
  const commitBeat    = useProjectStore(s => s.commitBeat);
  const pushHistory   = useProjectStore(s => s._pushHistory);

  const safeZone = zone || {};
  const content  = safeZone.content || {};
  const style    = safeZone.style   || {};

  const isText       = zoneType === "text";
  const isDecorative = zoneType === "decorative" || zoneType === "icon";
  const isBlock      = content.kind === "block";

  const enters  = Object.keys(transitionsRegistry.enter || {});
  const exits   = Object.keys(transitionsRegistry.exit  || {});
  const motions = Object.keys(motionsRegistry || {});

  const start   = safeZone.start          ?? zoneDef?.start          ?? 0;
  const end     = safeZone.end            !== undefined ? safeZone.end : (zoneDef?.end ?? null);
  const enter   = safeZone.enterAnimation ?? zoneDef?.enterAnimation ?? "fadeIn";
  const exit    = safeZone.exitAnimation  ?? zoneDef?.exitAnimation  ?? "none";
  const radius  = style.borderRadius  ?? 0;
  const shadow  = style.shadowBlur    ?? 0;
  const padding = style.contentPadding ?? 0;
  const bg      = safeZone.background || {};
  const opacity = style.opacity ?? 1;
  const rotation = style.rotation ?? 0;

  // Parse skewX/skewY from style.transform string (e.g. "skewX(10deg) skewY(-5deg)")
  const parseSkew = (str, axis) => {
    if (!str) return 0;
    const m = str.match(new RegExp(`${axis}\\(([\\-\\d.]+)deg\\)`));
    return m ? parseFloat(m[1]) : 0;
  };
  const skewX = parseSkew(style.transform, "skewX");
  const skewY = parseSkew(style.transform, "skewY");
  const buildTransform = (x, y) => {
    const parts = [];
    if (x !== 0) parts.push(`skewX(${x}deg)`);
    if (y !== 0) parts.push(`skewY(${y}deg)`);
    return parts.join(" ") || "";
  };

  const commit = () => commitBeat(beatId);
  // Save to DB only — no history push (use with onStart={pushHistory} pattern)
  const commitSave = async () => {
    const { updateProject } = await import("../../../src/services/projects/projectService");
    const proj = useProjectStore.getState().project;
    const dbId = useProjectStore.getState().databaseId;
    if (proj && dbId) updateProject(dbId, proj);
  };
  const setStyleSilent  = (key, val) => setZoneStyleSilent(slot, key, val);
  const setLayoutSilent = (key, val) => setZoneLayoutSilent(slot, key, val);

  /* Layer z-index helpers — use effective z-indices (layout def merged) passed from ZonesSection */
  const otherZIndices = allZoneZIndices || [];
  const currentZIndex = safeZone.zIndex ?? zoneDef?.zIndex ?? 1;
  const maxZ = otherZIndices.length ? Math.max(...otherZIndices) : currentZIndex;
  const minZ = otherZIndices.length ? Math.min(...otherZIndices) : currentZIndex;
  const isAtFront = otherZIndices.length > 0 && currentZIndex >= maxZ;
  const isAtBack  = otherZIndices.length === 0 || currentZIndex <= minZ;

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Delete") return;
      if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
      e.preventDefault(); onDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDelete]);

  /* ── TEXT ── */
  if (isText) return (
    <div className="pb-6">

      {/* Content */}
      <Section title="Content" icon="✏️">
        <div className="flex gap-3 mb-4">
          <div onClick={() => openPicker(slot, "content")}
            className="relative shrink-0 rounded-[10px] overflow-hidden cursor-pointer group border-2 border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc] transition-colors flex flex-col items-center justify-center gap-1 bg-[#0e0e1a]"
            style={{ width: 72, height: 72 }}>
            <span className="text-[22px] pointer-events-none">T</span>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
              <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100">Change</span>
            </div>
          </div>
          <textarea value={content.text || ""} onChange={e => updateTextContent(slot, e.target.value)}
            rows={3} placeholder="Enter text…"
            className="flex-1 bg-[#0e0e1a] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-2 text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none placeholder-[#55556a]"
          />
        </div>
        {/* Style Presets */}
        <Label>Presets</Label>
        <div className="flex gap-[5px] flex-wrap mt-[5px]">
          {textStylePresets.map(preset => {
            const isActive = style._presetId === preset.id;
            return (
              <button key={preset.id}
                onClick={() => {
                  // Clear every property that presets control so stale values
                  // (e.g. fontStyle:"italic" from a previous preset) don't bleed through.
                  const PRESET_RESET = {
                    fontFamily:      "inherit",
                    fontWeight:      700,
                    fontStyle:       "normal",
                    textAlign:       "center",
                    color:           "#ffffff",
                    textShadow:      "none",
                    letterSpacing:   "normal",
                    lineHeight:      1.15,
                    background:      "transparent",
                    borderRadius:    0,
                    WebkitTextStroke: undefined,
                    textDecoration:  "none",
                    paddingLeft:     undefined,
                    borderLeft:      undefined,
                  };
                  // Only preserve fontSize (layout controls sizing).
                  const { fontSize, ...flair } = preset.style;
                  updateTextStyleBulk(slot, {
                    ...PRESET_RESET,
                    ...flair,
                    background: flair.background || "transparent",
                    _presetId: preset.id,
                  });
                }}
                className="px-[10px] py-[5px] rounded-[6px] text-[13px] font-bold border-0 cursor-pointer transition-all hover:scale-105"
                style={{
                  background:  preset.style.background || "rgba(255,255,255,0.08)",
                  color:       preset.style.color || "#fff",
                  fontFamily:  preset.style.fontFamily || "inherit",
                  outline:     isActive ? "2px solid #7c5cfc" : "2px solid transparent",
                  outlineOffset: "2px",
                }}
              >{preset.label}</button>
            );
          })}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" icon="Aa">
        {/* Font family */}
        <div className="mb-3">
          <Sel label="Font Family" value={style.fontFamily ?? "inherit"} onChange={v => updateTextStyle(slot, "fontFamily", v)} options={FONT_FAMILIES} />
        </div>

        {/* Font size + opacity */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Slider label="Size" value={Math.round(parseFloat(style.fontSize ?? 32))}
            onChangeSilent={v => {
              const curFont = parseFloat(style.fontSize ?? 32);
              const ratio   = curFont > 0 ? v / curFont : 1;
              const curW    = safeZone.width  ?? zoneDef?.width  ?? 50;
              const newW    = Math.max(5, Math.round(curW * ratio * 10) / 10);
              // Width scales with font size; TextAutoHeight governs height automatically
              patchZoneSilent(slot, { width: newW }, { fontSize: v });
            }}
            onCommit={commit} min={10} max={300} unit="px" />
          <Slider label="Opacity" value={Math.round(opacity * 100)}
            onChangeSilent={v => setStyleSilent("opacity", v / 100)}
            onCommit={commit} min={0} max={100} unit="%" />
        </div>

        {/* Font weight buttons */}
        <div className="mb-3">
          <Label>Weight</Label>
          <BtnGroup fullWidth options={FONT_WEIGHTS.map(w => ({ label: w.label, value: String(w.value) }))}
            value={String(style.fontWeight ?? 700)}
            onChange={v => updateTextStyle(slot, "fontWeight", Number(v))} />
        </div>

        {/* Style toggles (I/U/S) + Alignment buttons */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <Label>Style</Label>
            <div className="flex gap-[5px]">
              {[
                { label: "I", title: "Italic",        prop: "fontStyle",      val: "italic",       off: "normal", style: { fontStyle: "italic" } },
                { label: "U", title: "Underline",     prop: "textDecoration", val: "underline",    off: "none",   style: { textDecoration: "underline" } },
                { label: "S", title: "Strikethrough", prop: "textDecoration", val: "line-through", off: "none",   style: { textDecoration: "line-through" } },
              ].map(({ label, title, prop, val, off, style: s }) => (
                <ToggleBtn key={title} title={title}
                  active={style[prop] === val}
                  onClick={() => updateTextStyle(slot, prop, style[prop] === val ? off : val)}
                  style={s}
                ><span style={s}>{label}</span></ToggleBtn>
              ))}
            </div>
          </div>
          <div>
            <Label>Align</Label>
            <div className="flex gap-[4px]">
              {[
                { v: "left",    label: "⬦", title: "Left"    },
                { v: "center",  label: "◈", title: "Center"  },
                { v: "right",   label: "⬧", title: "Right"   },
                { v: "justify", label: "≡", title: "Justify" },
              ].map(({ v, label, title }) => (
                <button key={v} title={title}
                  onClick={() => updateTextStyle(slot, "textAlign", v)}
                  className="flex-1 py-[5px] rounded-[6px] text-[13px] border cursor-pointer transition-all"
                  style={(style.textAlign ?? "center") === v ? ACTIVE_BTN : INACTIVE_BTN}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ColorRow label="Text Color" value={style.color ?? "#ffffff"}
            onChange={v => updateTextStyle(slot, "color", v)} />
          <ColorRow label="BG Color"
            value={!style.background || style.background === "transparent" ? "#000000" : style.background}
            onChange={v => updateTextStyle(slot, "background", v)}
            onClear={() => updateTextStyle(slot, "background", "transparent")} />
        </div>

        {/* Text stroke */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Slider label="Stroke" value={style.textStrokeWidth ?? 0}
            onChangeSilent={v => setStyleSilent("textStrokeWidth", v)}
            onCommit={commit} min={0} max={15} step={0.5} unit="px" />
          {(style.textStrokeWidth ?? 0) > 0 && (
            <ColorRow label="Stroke Color" value={style.textStrokeColor ?? "#000000"}
              onChange={v => updateTextStyle(slot, "textStrokeColor", v)} />
          )}
        </div>

        {/* Text shadow — uses patchZoneSilent for atomic multi-key updates */}
        {(() => {
          const shadowBlur  = style.textShadowBlur  ?? 0;
          const shadowX     = style.textShadowX     ?? 2;
          const shadowY     = style.textShadowY     ?? 2;
          const shadowColor = style.textShadowColor ?? "#000000";
          const buildCSS    = (b, x, y, c) => b > 0 ? `${x}px ${y}px ${b}px ${c}` : "none";
          const patchShadow = (patch) => patchZoneSilent(slot, {}, {
            ...patch,
            textShadow: buildCSS(
              patch.textShadowBlur  ?? shadowBlur,
              patch.textShadowX     ?? shadowX,
              patch.textShadowY     ?? shadowY,
              patch.textShadowColor ?? shadowColor,
            ),
          });
          return (
            <div>
              <div className="flex items-center justify-between mb-[6px]">
                <Label>Text Shadow</Label>
                {shadowBlur > 0 && (
                  <button
                    onClick={() => updateTextStyleBulk(slot, { textShadow: "none", textShadowBlur: 0, textShadowX: 2, textShadowY: 2 })}
                    className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer"
                  >clear</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Slider label="Blur" value={shadowBlur}
                  onChangeSilent={v => patchShadow({ textShadowBlur: v })}
                  onCommit={commit} min={0} max={40} unit="px" />
                <Slider label="Offset X" value={shadowX}
                  onChangeSilent={v => patchShadow({ textShadowX: v })}
                  onCommit={commit} min={-30} max={30} unit="px" />
                <Slider label="Offset Y" value={shadowY}
                  onChangeSilent={v => patchShadow({ textShadowY: v })}
                  onCommit={commit} min={-30} max={30} unit="px" />
                <ColorRow label="Shadow Color" value={shadowColor}
                  onChange={v => updateTextStyleBulk(slot, {
                    textShadowColor: v,
                    textShadow: buildCSS(shadowBlur, shadowX, shadowY, v),
                  })} />
              </div>
            </div>
          );
        })()}
      </Section>

      {/* Spacing */}
      <Section title="Spacing & Shape" icon="⊞" defaultOpen={false}>
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
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Border Radius" value={radius}
            onChangeSilent={v => setStyleSilent("borderRadius", v)}
            onCommit={commit} min={0} max={200} unit="px" />
          <Slider label="Padding" value={padding}
            onChangeSilent={v => setStyleSilent("contentPadding", v)}
            onCommit={commit} min={0} max={100} unit="px" />
        </div>
      </Section>

      {/* Transform */}
      <Section title="Transform" icon="⟳" defaultOpen={false}>
        <div className="mb-3">
          <RotationControl value={rotation}
            onChangeSilent={v => setStyleSilent("rotation", v)} onStart={pushHistory} onCommit={commitSave} />
        </div>
        <Slider label="Text Curve" value={style.textCurve ?? 0}
          onChangeSilent={v => setStyleSilent("textCurve", v)}
          onCommit={commit} min={-80} max={80} step={5} unit="°" />
        <div className="mt-3">
          <Slider label="Skew X" value={skewX}
            onChangeSilent={v => setStyleSilent("transform", buildTransform(v, skewY))}
            onStart={pushHistory} onCommit={commitSave} min={-45} max={45} step={1} unit="°" />
        </div>
        <div className="mt-3">
          <Slider label="Skew Y" value={skewY}
            onChangeSilent={v => setStyleSilent("transform", buildTransform(skewX, v))}
            onStart={pushHistory} onCommit={commitSave} min={-45} max={45} step={1} unit="°" />
        </div>
      </Section>

      {/* Background */}
      <Section title="Background" icon="⬛" defaultOpen={false}>
        <ZoneBgRow bg={bg} slot={slot} openPicker={openPicker} clearBackground={clearBackground}
          padding={padding} setStyleSilent={setStyleSilent} commit={commit} />
      </Section>

      {/* Effects */}
      <Section title="Effects" icon="✨" defaultOpen={false}
        badge={style.textEffect && style.textEffect !== "none" ? style.textEffect : undefined}>
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Text Effect" value={style.textEffect ?? "none"}
            onChange={v => setZoneStyle(slot, "textEffect", v)} options={TEXT_EFFECT_OPTIONS} />
          {(style.textEffect && style.textEffect !== "none") && (
            <Slider label="Speed"
              value={Math.round((style.textEffectSpeed ?? 1.0) * 10) / 10}
              onChangeSilent={v => setStyleSilent("textEffectSpeed", v)}
              onCommit={commit} min={0.25} max={3.0} step={0.25} unit="x" />
          )}
        </div>
      </Section>

      {/* Transitions + Timing */}
      <Section title="Transitions & Timing" icon="▶" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Sel label="Enter" value={enter} onChange={v => setZoneLayout(slot, "enterAnimation", v)} options={enters} />
          <Sel label="Exit"  value={exit}  onChange={v => setZoneLayout(slot, "exitAnimation",  v)} options={exits}  />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Start" value={Number(start.toFixed(1))}
            onChangeSilent={v => setLayoutSilent("start", v)}
            onCommit={commit} min={0} max={30} step={0.1} unit="s" />
          <div>
            <div className="flex justify-between items-center mb-[5px]">
              <Label>End</Label>
              <span className="text-[11px] font-mono text-[#55556a]">{end === null ? "auto" : `${Number(end).toFixed(1)}s`}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={30} step={0.1} value={end === null ? 30 : end}
                onChange={e => { const v = Number(e.target.value); setLayoutSilent("end", v >= 30 ? null : v); }}
                onMouseUp={commit} onTouchEnd={commit}
                className="flex-1 accent-[#7c5cfc] cursor-pointer" style={{ height: 3 }} />
              {end !== null && (
                <button onClick={() => setZoneLayout(slot, "end", null)}
                  className="text-[9px] text-[#7c5cfc] border-0 bg-transparent cursor-pointer shrink-0">auto</button>
              )}
            </div>
          </div>
        </div>
      </Section>

      <LayerSection slot={slot} setZoneLayout={setZoneLayout} currentZIndex={currentZIndex} maxZ={maxZ} minZ={minZ} isAtFront={isAtFront} isAtBack={isAtBack} />

      <div className="pt-4">
        <button onClick={onDelete}
          className="w-full py-[8px] rounded-[8px] text-[12px] font-bold text-[#ff6060] border border-[rgba(255,60,60,0.15)] hover:bg-[rgba(255,60,60,0.08)] bg-transparent cursor-pointer transition-colors">
          Delete Zone <span className="opacity-30 text-[10px] ml-1">Del</span>
        </button>
      </div>
    </div>
  );

  /* ── BLOCK ── */
  if (isBlock) {
    const BlockEditor = blockEditors[content.block?.type];
    return (
      <div className="pb-6">
        <Section title="Block" icon="⬛">
          <div className="flex gap-4 mb-4">
            <div onClick={() => openPicker(slot, "content")}
              className="relative shrink-0 rounded-[10px] overflow-hidden cursor-pointer group border-2 border-[rgba(124,92,252,0.3)] hover:border-[#7c5cfc] transition-colors flex flex-col items-center justify-center gap-1 bg-[#0e0e1a]"
              style={{ width: 100, height: 100 }}>
              <span className="text-[24px] pointer-events-none">⬛</span>
              <span className="text-[10px] text-[#a78bfa] font-mono truncate w-full text-center px-1">{content.block?.type || "Block"}</span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100">Change</span>
              </div>
            </div>
            <div className="flex-1 flex items-center">
              <span className="text-[11px] text-[#55556a] font-mono leading-relaxed">Click to switch to a different block, image, or text.</span>
            </div>
          </div>
          {BlockEditor
            ? <BlockEditor slot={slot} block={content.block} updateBlockProp={updateBlockProp} />
            : <div className="text-[11px] text-[#55556a] font-mono">No editor for: {content.block?.type}</div>}
        </Section>
        <LayerSection slot={slot} setZoneLayout={setZoneLayout} currentZIndex={currentZIndex} maxZ={maxZ} minZ={minZ} isAtFront={isAtFront} isAtBack={isAtBack} />
        <div className="pt-4">
          <button onClick={onDelete}
            className="w-full py-[8px] rounded-[8px] text-[12px] font-bold text-[#ff6060] border border-[rgba(255,60,60,0.15)] hover:bg-[rgba(255,60,60,0.08)] bg-transparent cursor-pointer transition-colors">
            Delete Zone <span className="opacity-30 text-[10px] ml-1">Del</span>
          </button>
        </div>
      </div>
    );
  }

  /* ── DECORATIVE / ICON ── */
  if (isDecorative) {
    const iconId   = content.iconId || null;
    const shapeId  = content.shape || "circle";
    const reg      = iconId ? iconRegistry[iconId] : decorativeShapeRegistry[shapeId];
    const color    = style.color       || "#ffffff";
    const sw       = style.strokeWidth ?? (iconId ? 5 : 3);
    const filled   = style.filled      ?? (iconId ? reg?.defaultFilled ?? false : false);
    const gradType = style.gradientType || "none";

    const svg = iconId
      ? renderIconSVG(iconId, style)
      : renderDecorativeSVG(shapeId, style);

    const LINE_ORIENTATIONS = [
      { value: "horizontal",   label: "Horiz" },
      { value: "vertical",     label: "Vert"  },
      { value: "diagonal-45",  label: "/ 45°" },
      { value: "diagonal-135", label: "\\ 135°"},
    ];

    return (
      <div className="pb-6">
        <Section title={iconId ? "Icon" : "Shape"} icon={iconId ? "◈" : "⬡"}>
          {/* Preview */}
          {svg && (
            <div className="mb-4 flex justify-center">
              <div className="w-[70px] h-[50px] flex items-center justify-center">
                <svg viewBox={svg.viewBox} width="70" height="50"
                  style={{ display: "block", overflow: "visible", opacity: style.opacity ?? 1 }}
                  dangerouslySetInnerHTML={{ __html: svg.content }} />
              </div>
            </div>
          )}

          {/* Shape picker */}
          {!iconId && (
            <div className="mb-4">
              <Label>Type</Label>
              <div className="grid grid-cols-5 gap-[5px]">
                {Object.entries(decorativeShapeRegistry).map(([id, entry]) => {
                  const isActive = shapeId === id;
                  const previewSvg = renderDecorativeSVG(id, { ...entry.defaults, color: "#ffffff" });
                  return (
                    <button key={id}
                      onClick={() => {
                        const newDef = decorativeShapeRegistry[id]?.defaults || {};
                        setZoneStyle(slot, "color",       newDef.color       ?? "#ffffff");
                        setZoneStyle(slot, "strokeWidth", newDef.strokeWidth ?? 3);
                        setZoneStyle(slot, "filled",      newDef.filled      ?? false);
                        setZoneLayout(slot, "content", { ...(safeZone.content || {}), shape: id });
                      }}
                      className="flex flex-col items-center gap-1 py-2 rounded-[8px] border cursor-pointer transition-all"
                      style={isActive ? ACTIVE_BTN : INACTIVE_BTN}
                    >
                      {previewSvg
                        ? <svg viewBox={previewSvg.viewBox} width="22" height="22" style={{ display: "block", overflow: "visible" }} dangerouslySetInnerHTML={{ __html: previewSvg.content }} />
                        : <span className="text-[14px] text-white/60">{entry.icon}</span>}
                      <span className="text-[8px] font-mono text-[#7070a0]">{entry.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Icon picker */}
          {iconId && (
            <div className="mb-4">
              <Label>Switch Icon</Label>
              <div className="grid grid-cols-6 gap-[5px] mt-[5px]">
                {ICON_OPTIONS.map(opt => {
                  const isActive = iconId === opt.id;
                  const previewSvg = renderIconSVG(opt.id, { color: "#ffffff", filled: opt.defaultFilled });
                  return (
                    <button key={opt.id} title={opt.label}
                      onClick={() => setZoneLayout(slot, "content", { iconId: opt.id })}
                      className="w-full aspect-square rounded-[8px] border cursor-pointer transition-all flex items-center justify-center"
                      style={isActive ? ACTIVE_BTN : INACTIVE_BTN}
                    >
                      {previewSvg && <svg viewBox={previewSvg.viewBox} width="20" height="20" dangerouslySetInnerHTML={{ __html: previewSvg.content }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color */}
          <div className="mb-3">
            <ColorRow label="Color" value={color} onChange={v => setZoneStyle(slot, "color", v)} />
          </div>

          {/* Fill mode */}
          {!iconId && shapeId !== "line" && shapeId !== "arc" && shapeId !== "wave" && shapeId !== "dots" && (
            <div className="mb-3">
              <Label>Mode</Label>
              <BtnGroup fullWidth
                options={[{ label: "Outline", value: "false" }, { label: "Filled", value: "true" }]}
                value={String(filled)}
                onChange={v => setZoneStyle(slot, "filled", v === "true")} />
            </div>
          )}

          {/* Stroke width */}
          {!filled && (iconId || shapeId !== "dots") && (
            <div className="mb-3">
              <Slider label="Stroke Width" value={sw}
                onChangeSilent={v => setStyleSilent("strokeWidth", v)}
                onCommit={commit} min={1} max={20} step={1} unit="px" />
            </div>
          )}

          {/* Line orientation */}
          {!iconId && shapeId === "line" && (
            <div className="mb-3">
              <Label>Orientation</Label>
              <BtnGroup options={LINE_ORIENTATIONS.map(o => ({ label: o.label, value: o.value }))}
                value={style.orientation || "horizontal"}
                onChange={v => setZoneStyle(slot, "orientation", v)} />
            </div>
          )}

          {/* Shape-specific */}
          {!iconId && shapeId === "star" && (
            <Slider label="Points" value={style.points ?? 5}
              onChangeSilent={v => setStyleSilent("points", v)}
              onCommit={commit} min={3} max={12} step={1} />
          )}
          {!iconId && shapeId === "arc" && (
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Start°" value={style.startAngle ?? 0} onChangeSilent={v => setStyleSilent("startAngle", v)} onCommit={commit} min={0} max={360} step={5} unit="°" />
              <Slider label="End°"   value={style.endAngle ?? 180}  onChangeSilent={v => setStyleSilent("endAngle", v)}   onCommit={commit} min={0} max={360} step={5} unit="°" />
            </div>
          )}
          {!iconId && shapeId === "wave" && (
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Frequency" value={style.frequency ?? 2} onChangeSilent={v => setStyleSilent("frequency", v)} onCommit={commit} min={1} max={8} step={1} />
              <Slider label="Amplitude" value={Math.round((style.amplitude ?? 0.35) * 100)} onChangeSilent={v => setStyleSilent("amplitude", v / 100)} onCommit={commit} min={5} max={90} unit="%" />
            </div>
          )}
          {!iconId && shapeId === "dots" && (
            <Slider label="Count" value={style.count ?? 5} onChangeSilent={v => setStyleSilent("count", v)} onCommit={commit} min={2} max={12} step={1} />
          )}
          {!iconId && shapeId === "square" && (
            <Slider label="Corner Radius" value={style.borderRadius ?? 0} onChangeSilent={v => setStyleSilent("borderRadius", v)} onCommit={commit} min={0} max={50} unit="px" />
          )}
        </Section>

        {/* Transform */}
        <Section title="Transform" icon="⟳" defaultOpen={false}>
          <div className="mb-3">
            <RotationControl value={rotation} onChangeSilent={v => setStyleSilent("rotation", v)} onStart={pushHistory} onCommit={commitSave} />
          </div>
          <Slider label="Skew X" value={skewX}
            onChangeSilent={v => setStyleSilent("transform", buildTransform(v, skewY))}
            onStart={pushHistory} onCommit={commitSave} min={-45} max={45} step={1} unit="°" />
          <div className="mt-3">
            <Slider label="Skew Y" value={skewY}
              onChangeSilent={v => setStyleSilent("transform", buildTransform(skewX, v))}
              onStart={pushHistory} onCommit={commitSave} min={-45} max={45} step={1} unit="°" />
          </div>
          <div className="mt-3">
            <Slider label="Opacity" value={Math.round(opacity * 100)}
              onChangeSilent={v => setStyleSilent("opacity", v / 100)}
              onCommit={commit} min={0} max={100} unit="%" />
          </div>
        </Section>

        {/* Gradient (shapes only) */}
        {!iconId && (
          <Section title="Gradient" icon="◐" defaultOpen={false}
            badge={gradType !== "none" ? gradType : undefined}>
            <div className="flex items-center gap-2 mb-3">
              <BtnGroup fullWidth
                options={[{ label: "Off", value: "none" }, { label: "Linear", value: "linear" }, { label: "Radial", value: "radial" }]}
                value={gradType} onChange={v => setZoneStyle(slot, "gradientType", v)} />
            </div>
            {gradType !== "none" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <ColorRow label="Color 1" value={style.gradientColor1 || color} onChange={v => setZoneStyle(slot, "gradientColor1", v)} />
                  <ColorRow label="Color 2" value={style.gradientColor2 || "#000000"} onChange={v => setZoneStyle(slot, "gradientColor2", v)} />
                </div>
                {gradType === "linear" && (
                  <Slider label="Angle" value={style.gradientAngle ?? 90}
                    onChangeSilent={v => setStyleSilent("gradientAngle", v)}
                    onCommit={commit} min={0} max={360} step={5} unit="°" />
                )}
              </div>
            )}
          </Section>
        )}

        <LayerSection slot={slot} setZoneLayout={setZoneLayout} currentZIndex={currentZIndex} maxZ={maxZ} minZ={minZ} isAtFront={isAtFront} isAtBack={isAtBack} />

        <div className="pt-4">
          <button onClick={onDelete}
            className="w-full py-[8px] rounded-[8px] text-[12px] font-bold text-[#ff6060] border border-[rgba(255,60,60,0.15)] hover:bg-[rgba(255,60,60,0.08)] bg-transparent cursor-pointer transition-colors">
            Delete Zone <span className="opacity-30 text-[10px] ml-1">Del</span>
          </button>
        </div>
      </div>
    );
  }

  /* ── ASSET ── */
  return (
    <div className="pb-6">

      {/* Content */}
      <Section title="Content" icon="🖼">
        <div className="flex gap-4 mb-4">
          <div className="relative shrink-0 rounded-[10px] overflow-hidden cursor-pointer group border-2 border-[rgba(255,255,255,0.08)] hover:border-[#7c5cfc] transition-colors"
            style={{ width: 96, height: 120 }} onClick={() => openPicker(slot, "content")}>
            {content.asset?.src
              ? <img src={content.asset.src} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-[#0e0e1a] flex flex-col items-center justify-center gap-1 opacity-50">
                  <span className="text-[22px]">＋</span>
                  <span className="text-[9px] text-[#9494a8] text-center px-1">Add Asset</span>
                </div>}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
              <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100">{content.asset?.src ? "Change" : "Add"}</span>
            </div>
            {content.asset?.src && (
              <button onClick={e => { e.stopPropagation(); clearContent(slot); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#ff4444] text-white text-[10px] flex items-center justify-center border-0 cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity font-bold">✕</button>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {/* Object fit */}
            <div>
              <Label>Fit</Label>
              <BtnGroup fullWidth
                options={[{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }]}
                value={content.asset?.objectFit || "cover"}
                onChange={v => updateContentProp(slot, "objectFit", v)} />
            </div>
            <Slider label="Opacity" value={Math.round(opacity * 100)}
              onChangeSilent={v => setStyleSilent("opacity", v / 100)}
              onCommit={commit} min={0} max={100} unit="%" />
            <Slider label="Shadow" value={shadow}
              onChangeSilent={v => setStyleSilent("shadowBlur", v)}
              onCommit={commit} min={0} max={100} unit="px" />
          </div>
        </div>
      </Section>

      {/* Shape */}
      <Section title="Frame & Mask" icon="⬡" defaultOpen={false}>
        <div className="mb-3">
          <Slider label="Border Radius" value={radius}
            onChangeSilent={v => setStyleSilent("borderRadius", v)}
            onCommit={commit} min={0} max={300} unit="px" />
        </div>
        {/* Clip mask */}
        <div>
          <div className="flex items-center justify-between mb-[6px]">
            <Label>Clip / Mask Shape</Label>
            {style.clipShape && (
              <button onClick={() => setZoneStyle(slot, "clipShape", null)}
                className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer">remove</button>
            )}
          </div>
          <div className="flex flex-wrap gap-[5px]">
            {DECORATIVE_SHAPE_OPTIONS.filter(s => s.group !== "line" && s.group !== "gradient" && decorativeShapeRegistry[s.id]?.clipPath).map(opt => {
              const isActive = style.clipShape === opt.id;
              const preview  = renderDecorativeSVG(opt.id, { color: "#ffffff", filled: true });
              return (
                <button key={opt.id} title={opt.label}
                  onClick={() => setZoneStyle(slot, "clipShape", isActive ? null : opt.id)}
                  className="w-[36px] h-[36px] rounded-[8px] border cursor-pointer transition-all flex items-center justify-center"
                  style={isActive ? ACTIVE_BTN : INACTIVE_BTN}
                >
                  {preview
                    ? <svg viewBox={preview.viewBox} width="22" height="22" dangerouslySetInnerHTML={{ __html: preview.content }} />
                    : <span className="text-[14px] text-white/50">{opt.icon}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Effects */}
      <Section title="Effects" icon="✨" defaultOpen={false}
        badge={(style.animatedBorder || style.shineEffect) ? "on" : undefined}>
        {/* Animated border */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-[6px]">
            <Label>Animated Border</Label>
            {style.animatedBorder && (
              <button onClick={() => setZoneStyle(slot, "animatedBorder", null)}
                className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer">remove</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-[5px]">
            {ANIMATED_BORDER_OPTIONS.map(opt => {
              const isActive = style.animatedBorder === opt.id;
              return (
                <button key={opt.id} onClick={() => setZoneStyle(slot, "animatedBorder", isActive ? null : opt.id)}
                  title={opt.label}
                  className="flex items-center gap-[6px] px-3 py-[7px] rounded-[8px] text-[12px] font-bold border cursor-pointer transition-all"
                  style={isActive ? ACTIVE_BTN : INACTIVE_BTN}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: opt.swatchColor, flexShrink: 0, boxShadow: isActive ? `0 0 6px ${opt.swatchColor}` : "none" }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {style.animatedBorder && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Slider label="Width" value={style.animatedBorderWidth ?? 12}
                onChangeSilent={v => setStyleSilent("animatedBorderWidth", v)}
                onCommit={commit} min={4} max={60} step={1} unit="px" />
              <Slider label="Speed" value={Math.round((style.animatedBorderSpeed ?? 0.7) * 10) / 10}
                onChangeSilent={v => setStyleSilent("animatedBorderSpeed", v)}
                onCommit={commit} min={0.1} max={4} step={0.1} unit="×" />
            </div>
          )}
        </div>

        {/* Shine */}
        <div>
          <div className="flex items-center justify-between mb-[6px]">
            <Label>Shine Effect</Label>
            {style.shineEffect && (
              <button onClick={() => setZoneStyle(slot, "shineEffect", null)}
                className="text-[10px] text-[#55556a] hover:text-[#f87171] bg-transparent border-0 cursor-pointer">remove</button>
            )}
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {ASSET_SHINE_OPTIONS.map(opt => {
              const isActive = style.shineEffect === opt.value;
              return (
                <button key={opt.value} onClick={() => setZoneStyle(slot, "shineEffect", isActive ? null : opt.value)}
                  className="px-[8px] py-[4px] rounded-[6px] text-[11px] font-bold border cursor-pointer transition-all"
                  style={isActive ? ACTIVE_BTN : INACTIVE_BTN}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          {style.shineEffect && (
            <div className="mt-3">
              <Slider label="Speed" value={Math.round((style.shineSpeed ?? 1.0) * 10) / 10}
                onChangeSilent={v => setStyleSilent("shineSpeed", v)}
                onCommit={commit} min={0.25} max={4} step={0.25} unit="×" />
            </div>
          )}
        </div>
      </Section>

      {/* Background */}
      <Section title="Background" icon="⬛" defaultOpen={false}>
        <ZoneBgRow bg={bg} slot={slot} openPicker={openPicker} clearBackground={clearBackground}
          padding={padding} setStyleSilent={setStyleSilent} commit={commit} />
      </Section>

      {/* Transitions + Timing */}
      <Section title="Transitions & Timing" icon="▶" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Sel label="Enter"  value={enter}                              onChange={v => setZoneLayout(slot, "enterAnimation", v)} options={enters}  />
          <Sel label="Exit"   value={exit}                               onChange={v => setZoneLayout(slot, "exitAnimation",  v)} options={exits}   />
          <Sel label="Motion" value={content.asset?.motion || "none"}   onChange={v => updateContentProp(slot, "motion", v)}    options={motions}  />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Start" value={Number(start.toFixed(1))}
            onChangeSilent={v => setLayoutSilent("start", v)}
            onCommit={commit} min={0} max={30} step={0.1} unit="s" />
          <div>
            <div className="flex justify-between items-center mb-[5px]">
              <Label>End</Label>
              <span className="text-[11px] font-mono text-[#55556a]">{end === null ? "auto" : `${Number(end).toFixed(1)}s`}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={30} step={0.1} value={end === null ? 30 : end}
                onChange={e => { const v = Number(e.target.value); setLayoutSilent("end", v >= 30 ? null : v); }}
                onMouseUp={commit} onTouchEnd={commit}
                className="flex-1 accent-[#7c5cfc] cursor-pointer" style={{ height: 3 }} />
              {end !== null && (
                <button onClick={() => setZoneLayout(slot, "end", null)}
                  className="text-[9px] text-[#7c5cfc] border-0 bg-transparent cursor-pointer shrink-0">auto</button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Transform */}
      <Section title="Transform" icon="⟳" defaultOpen={false}>
        <div className="mb-3">
          <RotationControl value={rotation} onChangeSilent={v => setStyleSilent("rotation", v)} onStart={pushHistory} onCommit={commitSave} />
        </div>
        <Slider label="Skew X" value={skewX}
          onChangeSilent={v => setStyleSilent("transform", buildTransform(v, skewY))}
          onStart={pushHistory} onCommit={commitSave} min={-45} max={45} step={1} unit="°" />
        <div className="mt-3">
          <Slider label="Skew Y" value={skewY}
            onChangeSilent={v => setStyleSilent("transform", buildTransform(skewX, v))}
            onStart={pushHistory} onCommit={commitSave} min={-45} max={45} step={1} unit="°" />
        </div>
      </Section>

      <LayerSection slot={slot} setZoneLayout={setZoneLayout} currentZIndex={currentZIndex} maxZ={maxZ} minZ={minZ} isAtFront={isAtFront} isAtBack={isAtBack} />

      <div className="pt-4">
        <button onClick={onDelete}
          className="w-full py-[8px] rounded-[8px] text-[12px] font-bold text-[#ff6060] border border-[rgba(255,60,60,0.15)] hover:bg-[rgba(255,60,60,0.08)] bg-transparent cursor-pointer transition-colors">
          Delete Zone <span className="opacity-30 text-[10px] ml-1">Del</span>
        </button>
      </div>
    </div>
  );
}

/* ── Shared layer section ── */
function LayerSection({ slot, setZoneLayout, currentZIndex, maxZ, minZ, isAtFront, isAtBack }) {
  return (
    <Section title="Layer" icon="⧉" defaultOpen={false}>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-[#55556a]">z-index: {currentZIndex}</span>
        <div className="flex gap-[4px] ml-auto">
          {[
            { label: "⤒", title: "Bring to Front", action: () => setZoneLayout(slot, "zIndex", maxZ + 1), disabled: isAtFront },
            { label: "↑", title: "Move Forward",   action: () => setZoneLayout(slot, "zIndex", currentZIndex + 1), disabled: isAtFront },
            { label: "↓", title: "Move Backward",  action: () => setZoneLayout(slot, "zIndex", Math.max(1, currentZIndex - 1)), disabled: isAtBack },
            { label: "⤓", title: "Send to Back",   action: () => setZoneLayout(slot, "zIndex", Math.max(1, minZ - 1)), disabled: isAtBack },
          ].map(({ label, title, action, disabled }) => (
            <button key={title} onClick={action} disabled={disabled} title={title}
              className="w-[32px] h-[32px] rounded-[6px] text-[14px] font-bold border flex items-center justify-center cursor-pointer transition-all"
              style={disabled
                ? { background: "transparent", borderColor: "rgba(255,255,255,0.04)", color: "#2e2e45", cursor: "not-allowed" }
                : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#9494a8" }}
            >{label}</button>
          ))}
        </div>
      </div>
    </Section>
  );
}
