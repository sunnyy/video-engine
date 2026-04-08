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

export default function ZonesSection({ beat, project, selectedZoneId, onSelectZone }) {
  const updateBeat       = useProjectStore((s) => s.updateBeat);
  const updateBeatSilent = useProjectStore((s) => s.updateBeatSilent);

  const [picker,           setPicker]          = useState(null);        // { slot, type }
  const [addZonePicker,    setAddZonePicker]   = useState(false);
  const [selectedOverlay,  setSelectedOverlay] = useState(null);        // overlay id

  const layoutDef = getLayoutDef(beat.layout);
  const zones     = beat.zones || {};
  const zoneDefs  = layoutDef?.zones || [];

  const selectedZoneDef  = zoneDefs.find(z => z.id === selectedZoneId) || null;
  const selectedZoneData = zones[selectedZoneId] || {};
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
    const newZones = { ...zones };
    delete newZones[slot];
    updateBeat(beat.id, { zones: newZones });
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
        motion:          existing.motion          || "kenburns",
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

  // Determine what the main panel shows
  const showOverlayEditor = !selectedZoneId && activeOverlay;
  const showZoneEditor    = !!selectedZoneId;
  const showEmpty         = !selectedZoneId && !activeOverlay;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="text-[11px] font-bold tracking-widest uppercase text-[#9494a8]"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          {selectedZoneId ? `Zone: ${selectedZoneId}` : activeOverlay ? "Overlay" : "Zones"}
        </div>
        <button
          onClick={() => setAddZonePicker(true)}
          className="px-2 py-[3px] rounded-[5px] text-[10px] font-bold text-[#7c5cfc] border border-[rgba(124,92,252,0.3)] hover:bg-[rgba(124,92,252,0.1)] bg-transparent cursor-pointer"
        >
          + Add
        </button>
      </div>

      {/* ── Main editor area ── */}
      {showEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-40">
          <span className="text-[32px]">👆</span>
          <span className="text-[12px] text-[#9494a8] text-center">Click a zone on the canvas<br/>to edit it</span>
        </div>
      )}

      {showZoneEditor && (
        <div className="flex-1 overflow-y-auto">
          <ZoneEditor
            beatId={beat.id}
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
          />
        </div>
      )}

      {showOverlayEditor && (
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => setSelectedOverlay(null)}
            className="flex items-center gap-1 text-[11px] text-[#7070a0] hover:text-[#e8e8f0] mb-4 bg-transparent border-0 cursor-pointer p-0 transition-colors"
          >
            ← Back to elements
          </button>
          <OverlayEditor
            overlay={activeOverlay}
            onUpdate={updateOverlay}
            onDelete={() => deleteOverlay(activeOverlay.id)}
          />
        </div>
      )}

      {/* ── Overlay Elements list (always visible, below main area) ── */}
      {beatOverlays.length > 0 && (
        <div className="shrink-0 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#55556a] mb-2"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Elements on this beat
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {beatOverlays.map(ov => {
              const typeDef = OVERLAY_TYPES[ov.type];
              const isActive = selectedOverlay === ov.id;
              return (
                <button
                  key={ov.id}
                  onClick={() => {
                    setSelectedOverlay(isActive ? null : ov.id);
                    if (!isActive) onSelectZone(null); // deselect zone
                  }}
                  className="flex items-center gap-[5px] px-[8px] py-[4px] rounded-[6px] text-[11px] font-bold transition-all border cursor-pointer"
                  style={isActive
                    ? { background: "rgba(124,92,252,0.2)", borderColor: "#7c5cfc", color: "#a78bfa" }
                    : { background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#7070a0" }
                  }
                >
                  <span>{typeDef?.icon || "◈"}</span>
                  <span>{typeDef?.label || ov.type}</span>
                </button>
              );
            })}
          </div>
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
          allowedTabs={["assets","gallery","text","blocks","colors"]}
          onSelect={handleAddZoneSelect}
          onClose={() => setAddZonePicker(false)}
        />
      )}

    </div>
  );
}
