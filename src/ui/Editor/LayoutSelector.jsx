/**
 * LayoutSelector.jsx
 * src/ui/Editor/LayoutSelector.jsx
 */
import React, { useState } from "react";
import { useProjectStore }  from "../../store/useProjectStore";
import { layoutRegistry, getLayoutDef } from "../../core/layoutRegistry.js";
import ZonePicker    from "./zonePicker/ZonePickerModal";
import LayoutPreview from "./LayoutPreview";

const TRANSITION_OPTIONS = [
  "cut","crossfade","slideLeft","slideRight",
  "zoomIn","zoomOut","blurFade","slideWhip","zoomCut","scaleJump",
];

function FieldLabel({ children }) {
  return (
    <div className="text-[11px] font-bold tracking-widest uppercase text-[#9494a8] mb-[4px]"
      style={{ fontFamily:"'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

/**
 * Migrate zone content when switching layouts.
 * Matches by type+order: asset-1→asset-1, text-1→text-1.
 * Preserves content, style overrides. Resets position to new layout defaults.
 * Custom (extra) zones are always preserved.
 */
function migrateZones(oldBeatZones, oldLayoutDef, newLayoutDef) {
  if (!newLayoutDef) return {};

  const oldAssets = (oldLayoutDef?.zones || [])
    .filter(z => z.type === "asset")
    .sort((a, b) => a.order - b.order)
    .map(z => oldBeatZones[z.id])
    .filter(z => z?.content?.asset?.src); // only keep zones that have actual content

  const oldTexts = (oldLayoutDef?.zones || [])
    .filter(z => z.type === "text")
    .sort((a, b) => a.order - b.order)
    .map(z => oldBeatZones[z.id])
    .filter(z => z?.content?.text); // only keep zones that have actual text

  const newZones = {};
  let assetIdx = 0;
  let textIdx  = 0;

  newLayoutDef.zones.forEach(zoneDef => {
    if (zoneDef.type === "asset" && assetIdx < oldAssets.length) {
      const old = oldAssets[assetIdx++];
      newZones[zoneDef.id] = {
        // Only carry over content and style, not position (use new layout's position)
        content:    old.content    || {},
        style:      old.style      || {},
        background: old.background || {},
      };
    } else if (zoneDef.type === "text" && textIdx < oldTexts.length) {
      const old = oldTexts[textIdx++];
      newZones[zoneDef.id] = {
        content:    old.content    || {},
        style:      old.style      || {},
        background: old.background || {},
      };
    }
    // else: leave zone empty — LayoutRenderer uses layout def defaults
  });

  // Preserve custom (extra) zones
  const oldDefIds = new Set((oldLayoutDef?.zones || []).map(z => z.id));
  Object.entries(oldBeatZones).forEach(([id, zone]) => {
    if (!oldDefIds.has(id)) newZones[id] = zone;
  });

  return newZones;
}

export default function LayoutSelector({ beat }) {
  const project    = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!project) return null;

  const layouts = Object.values(layoutRegistry);

  const handleSelect = (layoutId) => {
    if (layoutId === beat.layout) return;
    const oldDef = getLayoutDef(beat.layout);
    const newDef = getLayoutDef(layoutId);
    const zones  = migrateZones(beat.zones || {}, oldDef, newDef);
    updateBeat(beat.id, { layout: layoutId, zones });
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

      {/* Current layout panel */}
      <div className="flex gap-4 p-3 rounded-[12px] border border-[rgba(255,255,255,0.07)] bg-[#111118]">

        <div className="shrink-0" style={{ width:110 }}>
          <LayoutPreview layout={beat.layout} isActive={false} />
          <div className="text-[10px] text-center text-[#55556a] mt-1 truncate"
            style={{ fontFamily:"'JetBrains Mono',monospace" }}>
            {beat.layout}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div>
            <FieldLabel>Layout Background</FieldLabel>
            <div className="flex gap-2 items-center">
              <div className="relative w-[48px] h-[36px] rounded-[8px] border border-[rgba(255,255,255,0.08)] overflow-hidden cursor-pointer shrink-0 bg-[#0b0b10]"
                onClick={() => setPickerOpen(true)}>
                {renderBgPreview()}
                {!bg && <div className="absolute inset-0 flex items-center justify-center text-[#55556a] text-[16px]">+</div>}
              </div>
              <button onClick={() => setPickerOpen(true)}
                className="text-[12px] text-[#7c5cfc] hover:text-[#9d7fff] transition-colors bg-transparent border-0 cursor-pointer">
                {bg ? "Change" : "Add"}
              </button>
              {bg && (
                <button onClick={() => updateBeat(beat.id, { layoutBackground: { type:"color", value:"#000000" } })}
                  className="text-[12px] text-[#55556a] hover:text-[#f87171] transition-colors bg-transparent border-0 cursor-pointer">
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Padding</FieldLabel>
              <input type="range" min={0} max={60} value={padding}
                onChange={e => updateBeat(beat.id, { layoutPadding: Number(e.target.value) })}
                className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height:2 }} />
              <span className="text-[10px] font-mono text-[#7070a0]">{padding}px</span>
            </div>
            <div>
              <FieldLabel>Duration</FieldLabel>
              <input type="range" min={1} max={12} step={0.1} value={beat.duration_sec ?? 3.0}
                onChange={e => updateBeat(beat.id, { duration_sec: Math.round(Number(e.target.value)*10)/10 })}
                className="w-full accent-[#7c5cfc] cursor-pointer" style={{ height:2 }} />
              <span className="text-[10px] font-mono text-[#7070a0]">{(beat.duration_sec ?? 3.0).toFixed(1)}s</span>
            </div>
            <div>
              <FieldLabel>Transition</FieldLabel>
              <select value={beat.transition?.type || "cut"}
                onChange={e => updateBeat(beat.id, { transition: { type: e.target.value } })}
                className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[6px] px-1 py-[4px] text-[11px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none cursor-pointer">
                {TRANSITION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Layout grid */}
      <div>
        <div className="text-[11px] font-bold tracking-widest uppercase text-[#9494a8] mb-3"
          style={{ fontFamily:"'JetBrains Mono',monospace" }}>Select Layout</div>
        <div className="grid gap-2" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))" }}>
          {layouts.map(layout => (
            <div key={layout.id} onClick={() => handleSelect(layout.id)} className="cursor-pointer">
              <LayoutPreview layout={layout.id} isActive={beat.layout === layout.id} />
              <div className="text-[10px] text-center mt-[4px] truncate"
                style={{ fontFamily:"'JetBrains Mono',monospace", color: beat.layout === layout.id ? "#f5c518" : "#55556a" }}>
                {layout.label || layout.id}
              </div>
            </div>
          ))}
        </div>
      </div>

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