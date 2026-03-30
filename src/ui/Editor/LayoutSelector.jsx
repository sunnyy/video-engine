/**
 * LayoutSelector.jsx
 * src/ui/Editor/LayoutSelector.jsx
 *
 * Top: current layout preview (left) + styling settings (right)
 * Bottom: layout grid for selection
 */
import React, { useState } from "react";
import { useProjectStore }  from "../../store/useProjectStore";
import { layoutRegistry }   from "../../core/layoutRegistry.js";
import ZonePicker           from "./zonePicker/ZonePickerModal";
import LayoutPreview        from "./LayoutPreview";
import backgroundPatternRegistry, { backgroundCategories } from "../../core/backgroundPatternRegistry";

const TRANSITION_OPTIONS = [
  "cut","crossfade","slideLeft","slideRight",
  "zoomIn","zoomOut","blurFade","slideWhip","zoomCut","scaleJump",
];

function FieldLabel({ children }) {
  return (
    <div className="text-[12px] font-bold tracking-widest uppercase text-[#9494a8] mb-[5px]"
      style={{ fontFamily:"'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

function Slider({ label, value, onChange, min=0, max=60, unit="px" }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[12px] font-mono text-[#9494a8]">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height:2 }} />
    </div>
  );
}

export default function LayoutSelector({ beat }) {
  const project    = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!project) return null;

  const mode        = project.meta?.mode;
  const orientation = project.meta?.orientation === "16:9" ? "horizontal" : "vertical";

  /* ── Filtered layout list ── */
  const layouts = Object.entries(layoutRegistry)
    .filter(([, layout]) => {
      if (layout.orientations && !layout.orientations.includes(orientation)) return false;
      if (mode === "faceless" && layout.capability?.prefersAvatar) return false;
      return true;
    })
    .map(([name]) => name);

  /* ── Add new layouts not yet in registry (preview only) ── */
  const extraLayouts = ["SixGrid","BigTopSmallBottom","SmallTopBigBottom","LeftHeavy","RightHeavy"];
  const allLayouts   = [...new Set([...layouts, ...extraLayouts])];

  /* ── Handlers ── */
  const handleSelect = (layout) => {
    const layoutDef    = layoutRegistry[layout];
    const existingZones = beat.zones || {};
    const zones         = { ...existingZones };
    (layoutDef?.zones || []).forEach(z => {
      if (!zones[z]) zones[z] = { content:{}, background:{}, style:{} };
    });
    updateBeat(beat.id, { layout, zones });
  };

  const setLayoutBackground = (asset) => {
    let background;
    if (asset.kind === "color") {
      background = { type:"color", value:asset.color, backgroundSize: asset.backgroundSize || "auto", objectFit:"cover" };
    } else {
      const src     = asset.asset?.src || asset.url;
      const isVideo = src?.endsWith(".mp4") || src?.endsWith(".webm");
      background    = { type: isVideo ? "video" : "image", value:src, objectFit:"cover" };
    }
    updateBeat(beat.id, { layoutBackground: background });
  };

  const bg      = beat.layoutBackground;
  const padding = beat.layoutPadding || 0;

  const renderBgPreview = () => {
    if (!bg) return null;
    if (bg.type === "color") return <div className="absolute inset-0" style={{ background:bg.value, backgroundSize: bg.backgroundSize || "auto" }} />;
    if (bg.type === "image") return <img src={bg.value} className="absolute inset-0 w-full h-full object-cover" />;
    if (bg.type === "video") return <video src={bg.value} muted loop className="absolute inset-0 w-full h-full object-cover" />;
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Current layout panel ── */}
      <div className="flex gap-4 p-3 rounded-[12px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">

        {/* Preview — 9:16 portrait */}
        <div className="shrink-0" style={{ width:110 }}>
          <LayoutPreview layout={beat.layout} isActive={false} />
          <div className="text-[11px] text-center text-[#55556a] mt-1 truncate"
            style={{ fontFamily:"'JetBrains Mono',monospace" }}>
            {beat.layout}
          </div>
        </div>

        {/* Settings */}
        <div className="flex-1 flex flex-col gap-3">

          {/* Background */}
          <div>
            <FieldLabel>Layout background</FieldLabel>
            <div className="flex gap-2 items-center">
              <div
                className="relative w-[56px] h-[40px] rounded-[8px] border border-[rgba(255,255,255,0.08)] overflow-hidden cursor-pointer shrink-0 bg-[#0b0b10]"
                onClick={() => setPickerOpen(true)}
              >
                {renderBgPreview()}
                {!bg && <div className="absolute inset-0 flex items-center justify-center text-[#55556a] text-[16px]">+</div>}
              </div>
              <button onClick={() => setPickerOpen(true)}
                className="text-[13px] text-[#7c5cfc] hover:text-[#9d7fff] transition-colors bg-transparent border-0 cursor-pointer">
                {bg ? "Change" : "Add"}
              </button>
              {bg && (
                <button
                  onClick={() => updateBeat(beat.id, { layoutBackground: { type:"color", value:"#000000", objectFit:"cover" } })}
                  className="text-[13px] text-[#55556a] hover:text-[#f87171] transition-colors bg-transparent border-0 cursor-pointer">
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Padding */}
          <Slider label="Padding" value={padding}
            onChange={v => updateBeat(beat.id, { layoutPadding: v })}
            max={60} />

          {/* Transition */}
          <div>
            <FieldLabel>Transition</FieldLabel>
            <select
              value={beat.transition?.type || "cut"}
              onChange={e => updateBeat(beat.id, { transition: { type: e.target.value } })}
              className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-2 py-[7px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer"
            >
              {TRANSITION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* ── Layout grid ── */}
      <div>
        <div className="text-[13px] font-bold tracking-widest uppercase text-[#9494a8] mb-3" style={{ fontFamily:"'JetBrains Mono',monospace" }}>Select Layout</div>
        <div className="grid gap-2" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))" }}>
          {allLayouts.map(layout => (
            <div key={layout} onClick={() => handleSelect(layout)} className="cursor-pointer">
              <LayoutPreview layout={layout} isActive={beat.layout === layout} />
              <div className="text-[10px] text-center mt-[4px] truncate"
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  color: beat.layout === layout ? "#f5c518" : "#55556a",
                }}>
                {layout}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Picker */}
      {pickerOpen && (
        <ZonePicker
          mode="background"
          orientation={project.meta.orientation}
          onSelect={asset => { setLayoutBackground(asset); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}

    </div>
  );
}