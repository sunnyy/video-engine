/**
 * LayoutSelector.jsx
 * src/ui/Editor/LayoutSelector.jsx
 */
import React, { useState } from "react";
import { useProjectStore }  from "../../store/useProjectStore";
import { layoutRegistry, getLayoutDef } from "../../core/layoutRegistry.js";
import { backgroundPatternRegistry } from "../../core/backgroundPatternRegistry.js";
import ZonePicker    from "./zonePicker/ZonePickerModal";
import LayoutPreview from "./LayoutPreview";

const TRANSITION_OPTIONS = [
  "cut","fade","dissolve","dipBlack","dipWhite",
  "slideLeft","slideRight","slideUp","slideDown",
  "zoom","whipPan","spin","glitch","flash",
];

function FieldLabel({ children }) {
  return (
    <div className="text-[11px] font-bold tracking-widest uppercase text-[#9494a8] mb-[4px]"
      style={{ fontFamily:"'JetBrains Mono', monospace" }}>
      {children}
    </div>
  );
}

/* ── Content pool helpers ── */
function buildContentPools(oldBeatZones, oldLayoutDef) {
  const oldDefZones = oldLayoutDef?.zones || [];
  const oldDefIds   = new Set(oldDefZones.map(z => z.id));
  const assetPool   = [];
  const textPool    = [];

  oldDefZones
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach(zoneDef => {
      const beatZone = oldBeatZones[zoneDef.id] || {};
      const item = {
        content:    beatZone.content    || null,
        style:      { ...(zoneDef.style || {}), ...(beatZone.style || {}) },
        background: beatZone.background || {},
      };
      if (zoneDef.type === "asset") assetPool.push(item);
      else if (zoneDef.type === "text") textPool.push(item);
    });

  const customZones = {};
  Object.entries(oldBeatZones).forEach(([id, zone]) => {
    if (!oldDefIds.has(id)) customZones[id] = zone;
  });

  return { assetPool, textPool, customZones };
}

function migrateZones(oldBeatZones, oldLayoutDef, newLayoutDef) {
  if (!newLayoutDef) return {};
  const { assetPool, textPool, customZones } = buildContentPools(oldBeatZones, oldLayoutDef);

  let assetIdx = 0;
  let textIdx  = 0;
  const newZones = {};

  newLayoutDef.zones.forEach(zoneDef => {
    if (zoneDef.type === "asset") {
      const item       = assetPool[assetIdx++] || null;
      const hasContent = !!(item?.content?.asset?.src || item?.content?.kind === "avatar");
      newZones[zoneDef.id] = {
        content:    hasContent ? item.content : { kind: "asset", asset: { src: null, type: "image", objectFit: "cover" } },
        style:      hasContent ? { ...(zoneDef.style || {}), ...(item?.style || {}) } : {},
        background: item?.background || {},
      };
    } else if (zoneDef.type === "text") {
      const item       = textPool[textIdx++] || null;
      const hasContent = !!(item?.content?.text);
      newZones[zoneDef.id] = {
        content:    hasContent ? item.content : { kind: "text", text: "" },
        style:      hasContent ? { ...(zoneDef.style || {}), ...(item?.style || {}) } : { ...(zoneDef.style || {}) },
        background: item?.background || {},
      };
    }
  });

  Object.entries(customZones).forEach(([id, zone]) => { newZones[id] = zone; });
  return newZones;
}

function applyLayoutDefaults(zones, newDef) {
  const result      = { ...zones };
  const placeholders = ["Your headline here", "Supporting text", "More details", "Call to action"];
  let textIdx = 0;

  (newDef?.zones || [])
    .filter(z => z.type === "text")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach(zoneDef => {
      const existing     = result[zoneDef.id];
      const hasRealText  = existing?.content?.text?.trim().length > 0;
      if (!hasRealText) {
        result[zoneDef.id] = {
          ...(existing || {}),
          content: { kind: "text", text: placeholders[textIdx] || "" },
          style:   existing?.style || zoneDef.style || {},
        };
      }
      textIdx++;
    });

  return result;
}

/* ── Compatibility scoring ──
 * Returns { score, missingAssets, missingTexts, lostAssets, lostTexts }
 * score 1.0 = perfect, 0.0 = completely incompatible
 */
function getCompatibility(beat, targetLayoutDef, currentLayoutDef) {
  if (!targetLayoutDef) return { score: 0, label: "Unknown" };

  const beatZones   = beat.zones || {};
  const defZones    = currentLayoutDef?.zones || [];

  // Count real content in current beat
  let realAssets = 0;
  let realTexts  = 0;

  defZones.forEach(z => {
    const bz = beatZones[z.id];
    if (z.type === "asset" && bz?.content?.asset?.src) realAssets++;
    if (z.type === "text"  && bz?.content?.text?.trim()) realTexts++;
  });
  // Also count custom zones
  const defIds = new Set(defZones.map(z => z.id));
  Object.entries(beatZones).forEach(([id, z]) => {
    if (defIds.has(id)) return;
    if (z.type === "asset" && z.content?.asset?.src) realAssets++;
    if (z.type === "text"  && z.content?.text?.trim()) realTexts++;
  });

  // Count slots in target layout
  const targetAssets = targetLayoutDef.zones.filter(z => z.type === "asset").length;
  const targetTexts  = targetLayoutDef.zones.filter(z => z.type === "text").length;

  const lostAssets = Math.max(0, realAssets - targetAssets);
  const lostTexts  = Math.max(0, realTexts  - targetTexts);
  const totalReal  = realAssets + realTexts;
  const totalLost  = lostAssets + lostTexts;

  const score = totalReal === 0 ? 1 : 1 - (totalLost / totalReal);

  return { score, lostAssets, lostTexts, targetAssets, targetTexts };
}

export default function LayoutSelector({ beat }) {
  const project    = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [confirmLayout, setConfirmLayout] = useState(null); // layout awaiting confirmation

  if (!project) return null;

  const currentDef = getLayoutDef(beat.layout);
  const layouts    = Object.values(layoutRegistry);

  // Score all layouts
  const scored = layouts.map(layout => ({
    ...layout,
    compat: getCompatibility(beat, getLayoutDef(layout.id), currentDef),
  }));

  // Sort: current first, then perfect matches, then partial, then incompatible
  const sorted = [
    ...scored.filter(l => l.id === beat.layout),
    ...scored.filter(l => l.id !== beat.layout && l.compat.score === 1),
    ...scored.filter(l => l.id !== beat.layout && l.compat.score > 0 && l.compat.score < 1),
    ...scored.filter(l => l.id !== beat.layout && l.compat.score === 0),
  ];

  const doSwitch = (layoutId) => {
    const oldDef = getLayoutDef(beat.layout);
    const newDef = getLayoutDef(layoutId);
    let zones    = migrateZones(beat.zones || {}, oldDef, newDef);
    zones        = applyLayoutDefaults(zones, newDef);
    updateBeat(beat.id, { layout: layoutId, zones });
    setConfirmLayout(null);
  };

  const handleSelect = (layout) => {
    if (layout.id === beat.layout) return;
    const { lostAssets, lostTexts } = layout.compat;
    if (lostAssets > 0 || lostTexts > 0) {
      setConfirmLayout(layout);
    } else {
      doSwitch(layout.id);
    }
  };

  const setLayoutBackground = (asset) => {
    let background;
    if (asset.kind === "pattern") {
      background = { type: "pattern", value: asset.key };
    } else if (asset.kind === "color") {
      background = { type: "color", value: asset.color, backgroundSize: asset.backgroundSize || "auto", objectFit: "cover" };
    } else {
      const src     = asset.asset?.src || asset.url;
      const isVideo = src?.endsWith(".mp4") || src?.endsWith(".webm");
      background    = { type: isVideo ? "video" : "image", value: src, objectFit: "cover" };
    }
    updateBeat(beat.id, { layoutBackground: background });
  };

  const bg      = beat.layoutBackground;
  const padding = beat.layoutPadding || 0;

  const renderBgPreview = () => {
    if (!bg) return null;
    if (bg.type === "pattern") {
      const entry = backgroundPatternRegistry[bg.value];
      return <div className="absolute inset-0" style={entry?.style || { background: "#0b0b10" }} />;
    }
    if (bg.type === "color" || bg.type === "gradient") return <div className="absolute inset-0" style={{ background: bg.value, backgroundSize: bg.backgroundSize || "cover" }} />;
    if (bg.type === "image") return <img src={bg.value} className="absolute inset-0 w-full h-full object-cover" />;
    if (bg.type === "video") return <video src={bg.value} muted loop className="absolute inset-0 w-full h-full object-cover" />;
  };

  const bgLabel = bg?.type === "pattern" ? (bg.value || "pattern") : bg?.type === "color" ? "custom color" : bg?.type || null;

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
              <div className="flex flex-col">
                <button onClick={() => setPickerOpen(true)}
                  className="text-[12px] text-[#7c5cfc] hover:text-[#9d7fff] transition-colors bg-transparent border-0 cursor-pointer text-left">
                  {bg ? "Change" : "Add"}
                </button>
                {bgLabel && (
                  <span className="text-[9px] font-mono text-[#55556a] truncate max-w-[100px]">{bgLabel}</span>
                )}
              </div>
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
              <input type="range" min={0} max={120} value={padding}
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

        <div className="grid gap-2" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))" }}>
          {sorted.map(layout => {
            const isCurrent     = layout.id === beat.layout;
            const { score, lostAssets, lostTexts } = layout.compat;
            const isPerfect     = score === 1;
            const isPartial     = score > 0 && score < 1;
            const isIncompat    = score === 0 && !isCurrent;
            const lostCount     = lostAssets + lostTexts;

            return (
              <div key={layout.id}
                onClick={() => !isCurrent && handleSelect(layout)}
                className="cursor-pointer group"
                style={{ opacity: isIncompat ? 0.45 : 1 }}
              >
                <div className="relative">
                  <LayoutPreview layout={layout.id} isActive={isCurrent} />

                  {/* Partial match badge */}
                  {isPartial && !isCurrent && (
                    <div className="absolute top-1 left-1 bg-[#f59e0b] text-[#0b0b10] text-[8px] font-bold px-[3px] py-[1px] rounded-[3px] leading-none">
                      -{lostCount}
                    </div>
                  )}

                  {/* Incompatible badge */}
                  {isIncompat && (
                    <div className="absolute top-1 left-1 bg-[#ef4444] text-white text-[8px] font-bold px-[3px] py-[1px] rounded-[3px] leading-none">
                      ⚠
                    </div>
                  )}

                  {/* Perfect / current badge */}
                  {isPerfect && !isCurrent && (
                    <div className="absolute top-1 left-1 bg-[#22c55e] text-white text-[8px] font-bold px-[3px] py-[1px] rounded-[3px] leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                      ✓
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-center mt-[4px] truncate"
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    color: isCurrent ? "#7c5cfc" : isIncompat ? "#55556a" : "#9494a8",
                  }}>
                  {layout.label || layout.id}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 px-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-[#22c55e]" />
            <span className="text-[9px] text-[#55556a]">Compatible</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-[#f59e0b]" />
            <span className="text-[9px] text-[#55556a]">Partial (some content lost)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-[#ef4444]" />
            <span className="text-[9px] text-[#55556a]">Incompatible</span>
          </div>
        </div>
      </div>

      {/* Confirmation modal for partial/incompatible */}
      {confirmLayout && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-[#16161f] border border-[rgba(255,255,255,0.1)] rounded-[16px] p-6 max-w-[320px] w-full mx-4 flex flex-col gap-4">
            <div className="text-[16px] font-bold text-white">Switch layout?</div>
            <div className="text-[13px] text-[#9494a8] leading-relaxed">
              Switching to <span className="text-white font-semibold">{confirmLayout.label}</span> will lose{" "}
              {confirmLayout.compat.lostAssets > 0 && (
                <span className="text-[#f59e0b]">{confirmLayout.compat.lostAssets} image{confirmLayout.compat.lostAssets > 1 ? "s" : ""}</span>
              )}
              {confirmLayout.compat.lostAssets > 0 && confirmLayout.compat.lostTexts > 0 && " and "}
              {confirmLayout.compat.lostTexts > 0 && (
                <span className="text-[#f59e0b]">{confirmLayout.compat.lostTexts} text zone{confirmLayout.compat.lostTexts > 1 ? "s" : ""}</span>
              )}
              {" "}that don't fit this layout.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLayout(null)}
                className="flex-1 py-[8px] rounded-[8px] text-[13px] font-bold text-[#9494a8] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] bg-transparent cursor-pointer transition-colors">
                Cancel
              </button>
              <button
                onClick={() => doSwitch(confirmLayout.id)}
                className="flex-1 py-[8px] rounded-[8px] text-[13px] font-bold text-white bg-[#7c5cfc] hover:bg-[#6a4de0] border-0 cursor-pointer transition-colors">
                Switch Anyway
              </button>
            </div>
          </div>
        </div>
      )}

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