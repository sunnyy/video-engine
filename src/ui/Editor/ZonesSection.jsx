/**
 * ZonesSection.jsx
 * src/ui/Editor/ZonesSection.jsx
 */
import { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { getLayoutDef } from "../../core/layoutRegistry.js";
import { OVERLAY_TYPES } from "../../core/overlayRegistry";
import ZonePickerModal from "./zonePicker/ZonePickerModal";
import ZoneEditor from "./ZoneEditor";
import OverlayEditor from "./OverlayEditor";

/* ── Multi-zone alignment panel ── */
function MultiAlignPanel({ selectedZoneIds, beat, zoneDefs, zones, updateBeat }) {
  const ids = [...selectedZoneIds];

  // Resolve effective x/y/w/h for each selected zone (merge layoutDef + beat override)
  const getRect = (id) => {
    const def = zoneDefs.find(d => d.id === id) || {};
    const bz  = zones[id] || {};
    return {
      id,
      x: bz.x ?? def.x ?? 0,
      y: bz.y ?? def.y ?? 0,
      w: bz.width  ?? def.width  ?? 20,
      h: bz.height ?? def.height ?? 20,
    };
  };

  const apply = (patches) => {
    // patches: { [id]: { x?, y?, width?, height? } }
    const newZones = { ...zones };
    for (const [id, patch] of Object.entries(patches)) {
      newZones[id] = { ...(zones[id] || {}), ...patch };
    }
    updateBeat(beat.id, { zones: newZones });
  };

  const align = (type) => {
    const rects = ids.map(getRect);
    const patches = {};

    if (type === "left") {
      const minX = Math.min(...rects.map(r => r.x));
      rects.forEach(r => { patches[r.id] = { x: minX }; });
    } else if (type === "center-h") {
      const avgCx = rects.reduce((s, r) => s + r.x + r.w / 2, 0) / rects.length;
      rects.forEach(r => { patches[r.id] = { x: avgCx - r.w / 2 }; });
    } else if (type === "right") {
      const maxR = Math.max(...rects.map(r => r.x + r.w));
      rects.forEach(r => { patches[r.id] = { x: maxR - r.w }; });
    } else if (type === "top") {
      const minY = Math.min(...rects.map(r => r.y));
      rects.forEach(r => { patches[r.id] = { y: minY }; });
    } else if (type === "middle-v") {
      const avgCy = rects.reduce((s, r) => s + r.y + r.h / 2, 0) / rects.length;
      rects.forEach(r => { patches[r.id] = { y: avgCy - r.h / 2 }; });
    } else if (type === "bottom") {
      const maxB = Math.max(...rects.map(r => r.y + r.h));
      rects.forEach(r => { patches[r.id] = { y: maxB - r.h }; });
    } else if (type === "dist-h") {
      const sorted = [...rects].sort((a, b) => a.x - b.x);
      const totalW = sorted.reduce((s, r) => s + r.w, 0);
      const span   = (sorted[sorted.length - 1].x + sorted[sorted.length - 1].w) - sorted[0].x;
      const gap    = (span - totalW) / (sorted.length - 1);
      let cursor   = sorted[0].x;
      sorted.forEach(r => { patches[r.id] = { x: Math.round(cursor * 10) / 10 }; cursor += r.w + gap; });
    } else if (type === "dist-v") {
      const sorted = [...rects].sort((a, b) => a.y - b.y);
      const totalH = sorted.reduce((s, r) => s + r.h, 0);
      const span   = (sorted[sorted.length - 1].y + sorted[sorted.length - 1].h) - sorted[0].y;
      const gap    = (span - totalH) / (sorted.length - 1);
      let cursor   = sorted[0].y;
      sorted.forEach(r => { patches[r.id] = { y: Math.round(cursor * 10) / 10 }; cursor += r.h + gap; });
    }

    apply(patches);
  };

  const BTN = "h-[34px] rounded-[8px] border cursor-pointer transition-all flex items-center justify-center gap-[6px] px-2 text-[12px] font-bold";
  const S   = { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#9090b0" };
  const SH  = { background: "rgba(124,92,252,0.15)", borderColor: "#7c5cfc", color: "#c4b5fd" };

  const Btn = ({ type, title, children }) => (
    <button className={BTN} style={S} title={title}
      onClick={() => align(type)}
      onMouseEnter={e => Object.assign(e.currentTarget.style, SH)}
      onMouseLeave={e => Object.assign(e.currentTarget.style, S)}
    >{children}</button>
  );

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7878a0]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Align {ids.length} zones
        </span>
      </div>

      {/* Align row */}
      <div>
        <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#55556a] mb-2"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>Align</div>
        <div className="grid grid-cols-6 gap-[5px]">
          <Btn type="left" title="Align left edges">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="1" width="2" height="16" rx="1" fill="currentColor" opacity=".5"/><rect x="4" y="3" width="8" height="4" rx="1" fill="currentColor"/><rect x="4" y="10" width="11" height="4" rx="1" fill="currentColor"/></svg>
          </Btn>
          <Btn type="center-h" title="Align horizontal centers">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="8" y="1" width="2" height="16" rx="1" fill="currentColor" opacity=".5"/><rect x="3" y="3" width="12" height="4" rx="1" fill="currentColor"/><rect x="5" y="10" width="8" height="4" rx="1" fill="currentColor"/></svg>
          </Btn>
          <Btn type="right" title="Align right edges">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="14" y="1" width="2" height="16" rx="1" fill="currentColor" opacity=".5"/><rect x="6" y="3" width="8" height="4" rx="1" fill="currentColor"/><rect x="3" y="10" width="11" height="4" rx="1" fill="currentColor"/></svg>
          </Btn>
          <Btn type="top" title="Align top edges">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="2" width="16" height="2" rx="1" fill="currentColor" opacity=".5"/><rect x="3" y="4" width="4" height="8" rx="1" fill="currentColor"/><rect x="10" y="4" width="4" height="11" rx="1" fill="currentColor"/></svg>
          </Btn>
          <Btn type="middle-v" title="Align vertical centers">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="8" width="16" height="2" rx="1" fill="currentColor" opacity=".5"/><rect x="3" y="3" width="4" height="12" rx="1" fill="currentColor"/><rect x="10" y="5" width="4" height="8" rx="1" fill="currentColor"/></svg>
          </Btn>
          <Btn type="bottom" title="Align bottom edges">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="14" width="16" height="2" rx="1" fill="currentColor" opacity=".5"/><rect x="3" y="6" width="4" height="8" rx="1" fill="currentColor"/><rect x="10" y="3" width="4" height="11" rx="1" fill="currentColor"/></svg>
          </Btn>
        </div>
      </div>

      {/* Distribute row — only meaningful with 3+ zones */}
      {ids.length >= 3 && (
        <div>
          <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#55556a] mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>Distribute</div>
          <div className="flex gap-[5px]">
            <Btn type="dist-h" title="Equal horizontal spacing">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="4" width="2" height="10" rx="1" fill="currentColor" opacity=".5"/><rect x="15" y="4" width="2" height="10" rx="1" fill="currentColor" opacity=".5"/><rect x="4" y="6" width="3" height="6" rx="1" fill="currentColor"/><rect x="11" y="6" width="3" height="6" rx="1" fill="currentColor"/><rect x="7.5" y="8" width="3" height="2" rx=".5" fill="currentColor" opacity=".4"/></svg>
            </Btn>
            <Btn type="dist-v" title="Equal vertical spacing">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="1" width="10" height="2" rx="1" fill="currentColor" opacity=".5"/><rect x="4" y="15" width="10" height="2" rx="1" fill="currentColor" opacity=".5"/><rect x="6" y="4" width="6" height="3" rx="1" fill="currentColor"/><rect x="6" y="11" width="6" height="3" rx="1" fill="currentColor"/><rect x="8" y="7.5" width="2" height="3" rx=".5" fill="currentColor" opacity=".4"/></svg>
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ZonesSection({ beat, project, selectedZoneId, selectedZoneIds, onSelectZone }) {
  const updateBeat       = useProjectStore((s) => s.updateBeat);
  const updateBeatSilent = useProjectStore((s) => s.updateBeatSilent);

  const [picker,           setPicker]          = useState(null);        // { slot, type }
  const [addZonePicker,    setAddZonePicker]   = useState(false);
  const [selectedOverlay,  setSelectedOverlay] = useState(null);        // overlay id

  const layoutDef = getLayoutDef(beat.layout);
  const zones     = beat.zones || {};
  const zoneDefs  = layoutDef?.zones || [];

  const selectedZoneDef  = zoneDefs.find(z => z.id === selectedZoneId) || null;
  // Merge layout def defaults so ZoneEditor sees the effective values (e.g. zIndex from layout def)
  const selectedZoneData = { ...(selectedZoneDef || {}), ...(zones[selectedZoneId] || {}) };
  const selectedZoneType = selectedZoneData.type || selectedZoneDef?.type || "asset";

  const beatOverlays = Array.isArray(beat.overlays) ? beat.overlays : [];

  const openPicker = (slot, type) => setPicker({ slot, type });

  const normalizeAsset = (data) => {
    if (!data) return data;
    if (data.kind) return data;
    if (data.url) {
      const src  = data.url;
      const type = src.endsWith(".mp4") || src.endsWith(".webm") ? "video" : "image";
      return { kind: "asset", asset: { type, src } };
    }
    return data;
  };

  const updateZone = (slot, newData) => {
    const newZones = { ...zones, [slot]: { ...(zones[slot] || {}), ...newData } };
    updateBeat(beat.id, { zones: newZones });
  };

  const updateZoneSilent = (slot, newData) => {
    const newZones = { ...zones, [slot]: { ...(zones[slot] || {}), ...newData } };
    updateBeatSilent(beat.id, { zones: newZones });
  };

  // Called when user picks content from the "add zone" picker
  const handleAddZoneSelect = (asset) => {
    const data = normalizeAsset(asset) || asset;

    // ── Overlay element picked ──
    if (data?.kind === "overlay") {
      const newOverlay  = { ...data.overlay, id: data.overlay?.id || `ov_${Date.now()}` };
      const newOverlays = [...beatOverlays, newOverlay];
      updateBeat(beat.id, { overlays: newOverlays });
      setAddZonePicker(false);
      setSelectedOverlay(newOverlay.id);
      return;
    }

    // ── Zone-based content ──
    const id = `custom_${Date.now()}`;
    let zoneData;
    if (data?.kind === "text") {
      zoneData = {
        type: "text", x: 5, y: 35, width: 90, height: 5,
        zIndex: 10, start: 0, end: null,
        enterAnimation: "fadeIn", exitAnimation: "none",
        content: { kind: "text", text: data.text || "Your text here" },
        style: { fontSize: 36, fontWeight: 700, color: "#ffffff", textAlign: "center", ...(data.style || {}) },
        background: {},
      };
    } else if (data?.kind === "decorative") {
      zoneData = {
        type: "decorative", x: 10, y: 10, width: 30, height: 30,
        zIndex: 10, start: 0, end: null,
        enterAnimation: "fadeIn", exitAnimation: "none",
        content: { decorativeId: data.decorativeId || null },
        style: { color: "#ffffff", opacity: 1, strokeWidth: 3 },
        background: {},
      };
    } else if (data?.kind === "icon") {
      const def = data.defaults || {};
      // Phosphor icon (from Iconify) or local registry
      const iconContent = data.iconify
        ? { iconify: data.iconify, ...(data.iconId ? { iconId: data.iconId } : {}) }
        : { iconId: data.iconId };
      zoneData = {
        type: "icon", x: 30, y: 35, width: 40, height: 30,
        zIndex: 10, start: 0, end: null,
        enterAnimation: "fadeIn", exitAnimation: "none",
        content: iconContent,
        style: { color: def.color || "#ffffff", opacity: 1, filled: true, strokeWidth: 0 },
        background: {},
      };
    } else {
      zoneData = {
        type: "asset", x: 10, y: 10, width: 80, height: 30,
        zIndex: 10, start: 0, end: null,
        enterAnimation: "fadeIn", exitAnimation: "none",
        content: data?.kind ? data : { kind: "asset", asset: { src: null, type: "image", objectFit: "cover" } },
        style: {}, background: {},
      };
    }

    const newZones = { ...zones, [id]: zoneData };
    updateBeat(beat.id, { zones: newZones });
    setAddZonePicker(false);
    onSelectZone(id);
  };

  const deleteZone = (slot) => {
    const isLayoutZone = zoneDefs.some(z => z.id === slot);
    if (isLayoutZone) {
      // Layout zone — can't remove from def, track in deletedZones
      const prev = beat.deletedZones || [];
      if (!prev.includes(slot)) {
        updateBeat(beat.id, { deletedZones: [...prev, slot] });
      }
    } else {
      // Custom zone — remove from zones dict entirely
      const newZones = { ...zones };
      delete newZones[slot];
      updateBeat(beat.id, { zones: newZones });
    }
    if (selectedZoneId === slot) onSelectZone(null);
  };

  const updateTextContent  = (slot, text) => {
    const zone = zones[slot] || {};
    updateZone(slot, { content: { ...zone.content, kind: "text", text } });
  };

  const updateTextStyle     = (slot, key, value) =>
    updateZone(slot, { style: { ...(zones[slot]?.style || {}), [key]: value } });

  const updateTextStyleBulk = (slot, styleObj) =>
    updateZone(slot, { style: { ...(zones[slot]?.style || {}), ...styleObj } });

  const updateContentProp   = (slot, key, value) => {
    const zone    = zones[slot] || {};
    const content = zone.content || {};
    if (content.kind === "asset") {
      updateZone(slot, { content: { ...content, asset: { ...(content.asset || {}), [key]: value } } });
    }
  };

  const setContent = (slot, data) => {
    data = normalizeAsset(data);
    if (data.kind === "icon") {
      const iconContent = data.iconify
        ? { iconify: data.iconify, ...(data.iconId ? { iconId: data.iconId } : {}) }
        : { iconId: data.iconId };
      const def = data.defaults || {};
      updateZone(slot, {
        type: "icon",
        content: iconContent,
        style: { ...(zones[slot]?.style || {}), color: def.color || "#ffffff", opacity: 1 },
      });
      return;
    }
    if (data.kind === "text") {
      updateZone(slot, { type: "text", content: { kind: "text", text: data.text || "" } });
      return;
    }
    if (data.kind === "block") {
      updateZone(slot, { type: "asset", content: { kind: "block", block: data.block } });
      return;
    }
    if (data.kind === "color") {
      updateZone(slot, { type: "asset", content: { kind: "color", color: data.color } });
      return;
    }
    if (data.kind === "asset") {
      const existing = zones[slot]?.content?.asset || {};
      updateZone(slot, { type: "asset", content: { kind: "asset", asset: {
        src: data.asset.src, type: data.asset.type,
        objectFit:       existing.objectFit       || "cover",
        motion:          existing.motion          || "none",
        enterTransition: existing.enterTransition || "none",
        exitTransition:  existing.exitTransition  || "none",
      }}});
    }
  };

  const setBackground = (slot, data) => {
    data = normalizeAsset(data);
    if (data.kind === "pattern") {
      updateZone(slot, { background: { kind: "pattern", key: data.key } });
      return;
    }
    if (data.kind === "color") {
      updateZone(slot, { background: { kind: "color", color: data.color, backgroundSize: data.backgroundSize || "auto" } });
      return;
    }
    if (data.kind === "asset") {
      updateZone(slot, { background: { kind: "asset", asset: { type: data.asset.type, src: data.asset.src, objectFit: "cover" } } });
    }
  };


  const setZoneStyle       = (slot, key, value) => updateZone(slot,       { style: { ...(zones[slot]?.style || {}), [key]: value } });
  const setZoneStyleSilent = (slot, key, value) => updateZoneSilent(slot, { style: { ...(zones[slot]?.style || {}), [key]: value } });
  const setZoneLayout       = (slot, key, value) => updateZone(slot,       { [key]: value });
  const setZoneLayoutSilent = (slot, key, value) => updateZoneSilent(slot, { [key]: value });
  // Patch layout fields AND style keys in one atomic call (prevents second call clobbering first)
  const patchZoneSilent = (slot, layoutPatch, stylePatch) => {
    const cur = zones[slot] || {};
    const merged = { ...cur, ...(layoutPatch || {}) };
    if (stylePatch) merged.style = { ...(cur.style || {}), ...stylePatch };
    const newZones = { ...zones, [slot]: merged };
    updateBeatSilent(beat.id, { zones: newZones });
  };

  const updateBlockProp = (slot, key, val) => {
    const content = zones[slot]?.content || {};
    const block   = content.block || {};
    updateZone(slot, { content: { ...content, block: { ...block, props: { ...(block.props || {}), [key]: val } } } });
  };

  const clearContent    = (slot) => updateZone(slot, { content: {} });
  const clearBackground = (slot) => updateZone(slot, { background: {} });

  const handleSelect = (asset) => {
    if (!picker) return;
    if (picker.type === "content")    setContent(picker.slot, asset);
    if (picker.type === "background") setBackground(picker.slot, asset);
    setPicker(null);
  };

  /* ── Overlay CRUD ── */
  const updateOverlay = (updated) => {
    const newOverlays = beatOverlays.map(o => o.id === updated.id ? updated : o);
    updateBeat(beat.id, { overlays: newOverlays });
  };

  const deleteOverlay = (id) => {
    const newOverlays = beatOverlays.filter(o => o.id !== id);
    updateBeat(beat.id, { overlays: newOverlays });
    if (selectedOverlay === id) setSelectedOverlay(null);
  };

  const activeOverlay = selectedOverlay
    ? beatOverlays.find(o => o.id === selectedOverlay) || null
    : null;

  // Build the unified zone + overlay list
  const defZoneIds   = new Set(zoneDefs.map(z => z.id));
  const TYPE_COLOR   = { asset: "#7c5cfc", avatar: "#a78bfa", text: "#fb923c", decorative: "#22d3ee", element: "#eab308", block: "#ec4899", icon: "#94a3b8" };

  const deletedZonesSet = new Set(beat.deletedZones || []);

  const allRows = [
    // Layout-defined zones (excluding ones the user has deleted or hidden)
    ...zoneDefs.filter(z => !deletedZonesSet.has(z.id) && !zones[z.id]?.hidden).map(z => {
      const zData = zones[z.id] || {};
      const type  = zData.type || z.type || "asset";
      return { id: z.id, name: z.label || z.id, type, isCustom: false, isOverlay: false };
    }),
    // Custom zones added by the pipeline or user (not in the layout def, not hidden)
    ...Object.entries(zones).filter(([id]) => !defZoneIds.has(id) && !zones[id]?.hidden).map(([id, z]) => {
      const type = z.type || "asset";
      const name = type === "text"
        ? (z.content?.text?.slice(0, 16) || "Text")
        : type === "decorative"
        ? (z.content?.iconId ? "Icon" : (z.content?.shape || "Shape"))
        : "Asset";
      return { id, name, type, isCustom: true, isOverlay: false };
    }),
    // Overlays
    ...beatOverlays.map(ov => ({
      id: ov.id, name: OVERLAY_TYPES[ov.type]?.label || ov.type,
      type: "overlay", isCustom: false, isOverlay: true,
      ovIcon: OVERLAY_TYPES[ov.type]?.icon || "◈",
    })),
  ];

  const activeRowId = selectedZoneId || (activeOverlay ? activeOverlay.id : null);

  return (
    <div className="flex flex-col h-full">

      {/* ── Zone / Overlay list ── */}
      <div className="shrink-0 mb-3">
        <div className="flex items-center justify-between mb-[6px]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#55556a]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>Zones</span>
          <button
            onClick={() => setAddZonePicker(true)}
            className="px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold text-[#7c5cfc] border border-[rgba(124,92,252,0.3)] hover:bg-[rgba(124,92,252,0.1)] bg-transparent cursor-pointer"
          >+ Add Zone</button>
        </div>

        <div className="flex flex-wrap gap-[5px]">
          {allRows.map(row => {
            const isActive     = activeRowId === row.id;
            // Only color/label as "avatar" when the user has explicitly activated avatar mode on this zone
            const isExplicitAvatarZone = beat?.avatarZone === row.id && project?.meta?.mode === "talking_head";
            // Layout-def zones typed "avatar" display as "asset" unless avatar mode is active
            const effectiveType = isExplicitAvatarZone ? "avatar" : (row.type === "avatar" ? "asset" : row.type);
            const dot          = row.isOverlay ? "#6366f1" : (TYPE_COLOR[effectiveType] || "#7070a0");
            const displayName  = row.isOverlay
              ? `${row.ovIcon} ${row.name}`
              : row.id.startsWith("custom_")
                ? row.name
                : row.id;
            const typeLabel = effectiveType;
            const isHidden  = !row.isOverlay && (zones[row.id]?.hidden === true);
            return (
              <button
                key={row.id}
                onClick={() => {
                  if (row.isOverlay) {
                    setSelectedOverlay(isActive ? null : row.id);
                    onSelectZone(null);
                  } else {
                    onSelectZone(isActive ? null : row.id);
                    setSelectedOverlay(null);
                  }
                }}
                title={typeLabel}
                className="group flex items-center gap-[6px] px-[10px] py-[6px] rounded-[7px] transition-all cursor-pointer border text-left"
                style={isActive
                  ? { background: `${dot}20`, borderColor: `${dot}55`, color: "#e8e8f0", opacity: isHidden ? 0.5 : 1 }
                  : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)", color: "#7070a0", opacity: isHidden ? 0.4 : 1 }
                }
              >
                <span className="shrink-0 w-[6px] h-[6px] rounded-full"
                  style={{ background: dot, opacity: isActive ? 1 : 0.6 }} />
                <span className="text-[13px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {displayName}
                </span>
                <span className="text-[11px] font-mono" style={{ color: isActive ? dot : "#9090b0" }}>
                  {typeLabel}
                </span>
                {isHidden && <span className="text-[9px] text-[#55556a]" title="Hidden">◌</span>}
                {row.isCustom && (
                  <span
                    onClick={e => { e.stopPropagation(); deleteZone(row.id); }}
                    className="text-[9px] text-[#55556a] hover:text-[#f87171] cursor-pointer leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</span>
                )}
              </button>
            );
          })}

          {allRows.length === 0 && (
            <div className="text-[11px] text-[#55556a] font-mono">No zones on this beat</div>
          )}
        </div>
      </div>

      <div className="h-[1px] bg-[rgba(255,255,255,0.05)] shrink-0 mb-3" />

      {/* ── Editor area ── */}
      {!activeRowId && !(selectedZoneIds?.size > 1) && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-30">
          <span className="text-[11px] text-[#9494a8] text-center font-mono">Select a zone above to edit</span>
        </div>
      )}

      {selectedZoneIds?.size > 1 && (
        <div className="flex-1 overflow-y-auto">
          <MultiAlignPanel
            selectedZoneIds={selectedZoneIds}
            beat={beat}
            zoneDefs={zoneDefs}
            zones={zones}
            updateBeat={updateBeat}
          />
        </div>
      )}

      {!!selectedZoneId && (
        <div className="flex-1 overflow-y-auto">
          <ZoneEditor
            beatId={beat.id}
            beat={beat}
            project={project}
            slot={selectedZoneId}
            zone={selectedZoneData}
            zoneDef={selectedZoneDef}
            zoneType={selectedZoneType}
            openPicker={openPicker}
            updateTextContent={updateTextContent}
            updateTextStyle={updateTextStyle}
            updateTextStyleBulk={updateTextStyleBulk}
            updateContentProp={updateContentProp}
            updateBlockProp={updateBlockProp}
            setZoneStyle={setZoneStyle}
            setZoneStyleSilent={setZoneStyleSilent}
            setZoneLayout={setZoneLayout}
            setZoneLayoutSilent={setZoneLayoutSilent}
            patchZoneSilent={patchZoneSilent}
            clearContent={clearContent}
            clearBackground={clearBackground}
            onDelete={() => deleteZone(selectedZoneId)}
            allZoneZIndices={Object.entries(zones)
              .filter(([id]) => id !== selectedZoneId)
              .map(([id, z]) => {
                const def = zoneDefs.find(d => d.id === id);
                return z.zIndex ?? def?.zIndex ?? 1;
              })
              .concat(
                zoneDefs
                  .filter(d => d.id !== selectedZoneId && !(d.id in zones))
                  .map(d => d.zIndex ?? 1)
              )}
          />
        </div>
      )}

      {!selectedZoneId && activeOverlay && (
        <div className="flex-1 overflow-y-auto">
          <OverlayEditor
            overlay={activeOverlay}
            onUpdate={updateOverlay}
            onDelete={() => deleteOverlay(activeOverlay.id)}
          />
        </div>
      )}

      {/* ── Pickers ── */}
      {picker && (
        <ZonePickerModal
          orientation={project.meta.orientation}
          mode={picker.type}
          allowedTabs={picker.type === "background" ? ["colors"] : undefined}
          onSelect={handleSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {addZonePicker && (
        <ZonePickerModal
          orientation={project.meta.orientation}
          mode="content"
          allowedTabs={["assets","gallery","text","blocks","colors","shapes","icons"]}
          onSelect={handleAddZoneSelect}
          onClose={() => setAddZonePicker(false)}
        />
      )}

    </div>
  );
}
