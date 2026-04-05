/**
 * ZonesSection.jsx
 * src/ui/Editor/ZonesSection.jsx
 */
import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { getLayoutDef } from "../../core/layoutRegistry.js";
import ZonePickerModal from "./zonePicker/ZonePickerModal";
import ZoneEditor from "./ZoneEditor";

export default function ZonesSection({ beat, project, selectedZoneId, onSelectZone }) {
  const updateBeat       = useProjectStore((s) => s.updateBeat);
  const updateBeatSilent = useProjectStore((s) => s.updateBeatSilent);

  const [picker,        setPicker]        = useState(null); // { slot, type }
  const [addZonePicker, setAddZonePicker] = useState(false); // open picker to add new zone

  const layoutDef = getLayoutDef(beat.layout);
  const zones     = beat.zones || {};
  const zoneDefs  = layoutDef?.zones || [];

  const selectedZoneDef  = zoneDefs.find(z => z.id === selectedZoneId) || null;
  const selectedZoneData = zones[selectedZoneId] || {};
  const selectedZoneType = selectedZoneDef?.type || selectedZoneData.type || "asset";

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

  /* ── Zone update helpers (normal — pushes history) ── */
  const updateZone = (slot, newData) => {
    const newZones = { ...zones, [slot]: { ...(zones[slot] || {}), ...newData } };
    updateBeat(beat.id, { zones: newZones });
  };

  /* ── Zone update silent (no history — for sliders while dragging) ── */
  const updateZoneSilent = (slot, newData) => {
    const newZones = { ...zones, [slot]: { ...(zones[slot] || {}), ...newData } };
    updateBeatSilent(beat.id, { zones: newZones });
  };

  // Called when user picks content from the "add zone" picker
  const handleAddZoneSelect = (asset) => {
    const id  = `custom_${Date.now()}`;
    const data = normalizeAsset(asset) || asset;

    let zoneData;
    if (data?.kind === "text") {
      // Text preset selected
      zoneData = {
        type: "text", x: 5, y: 35, width: 90, height: 25,
        zIndex: 10, start: 0, end: null,
        enterAnimation: "fadeIn", exitAnimation: "none",
        content: { kind: "text", text: data.text || "Your text here" },
        style: { fontSize: 36, fontWeight: 700, color: "#ffffff", textAlign: "center", ...(data.style || {}) },
        background: {},
      };
    } else {
      // Asset/element/color/block
      zoneData = {
        type: "asset", x: 10, y: 10, width: 80, height: 40,
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

  const updateTextContent = (slot, text) => {
    const zone = zones[slot] || {};
    updateZone(slot, { content: { ...zone.content, kind: "text", text } });
  };

  const updateTextStyle = (slot, key, value) =>
    updateZone(slot, { style: { ...(zones[slot]?.style || {}), [key]: value } });

  // Apply multiple style keys at once — avoids stale state from looping updateTextStyle
  const updateTextStyleBulk = (slot, styleObj) =>
    updateZone(slot, { style: { ...(zones[slot]?.style || {}), ...styleObj } });

  const updateContentProp = (slot, key, value) => {
    const zone    = zones[slot] || {};
    const content = zone.content || {};
    if (content.kind === "asset") {
      updateZone(slot, { content: { ...content, asset: { ...(content.asset || {}), [key]: value } } });
    }
  };

  const setContent = (slot, data) => {
    data = normalizeAsset(data);
    if (data.kind === "block") { updateZone(slot, { content: { kind: "block", block: data.block } }); return; }
    if (data.kind === "color") { updateZone(slot, { content: { kind: "color", color: data.color } }); return; }
    if (data.kind === "asset") {
      const existing = zones[slot]?.content?.asset || {};
      updateZone(slot, { content: { kind: "asset", asset: {
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
    if (data.kind === "color") {
      updateZone(slot, { background: { kind: "color", color: data.color, backgroundSize: data.backgroundSize || "auto" } });
      return;
    }
    if (data.kind === "asset") {
      updateZone(slot, { background: { kind: "asset", asset: { type: data.asset.type, src: data.asset.src, objectFit: "cover" } } });
    }
  };

  const updateBackgroundProp = (slot, key, value) => {
    const bg = zones[slot]?.background || {};
    updateZoneSilent(slot, { background: { ...bg, asset: { ...(bg.asset || {}), [key]: value } } });
  };

  const setZoneStyle       = (slot, key, value) => updateZone(slot,       { style: { ...(zones[slot]?.style || {}), [key]: value } });
  const setZoneStyleSilent = (slot, key, value) => updateZoneSilent(slot, { style: { ...(zones[slot]?.style || {}), [key]: value } });
  const setZoneLayout       = (slot, key, value) => updateZone(slot,       { [key]: value });
  const setZoneLayoutSilent = (slot, key, value) => updateZoneSilent(slot, { [key]: value });

  const clearContent    = (slot) => updateZone(slot, { content: {} });
  const clearBackground = (slot) => updateZone(slot, { background: {} });

  const handleSelect = (asset) => {
    if (!picker) return;
    if (picker.type === "content")    setContent(picker.slot, asset);
    if (picker.type === "background") setBackground(picker.slot, asset);
    setPicker(null);
  };

  return (
    <div className="flex flex-col h-full">

      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="text-[11px] font-bold tracking-widest uppercase text-[#9494a8]"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          {selectedZoneId ? `Zone: ${selectedZoneId}` : "Zones"}
        </div>
        <button onClick={() => setAddZonePicker(true)}
          className="px-2 py-[3px] rounded-[5px] text-[10px] font-bold text-[#7c5cfc] border border-[rgba(124,92,252,0.3)] hover:bg-[rgba(124,92,252,0.1)] bg-transparent cursor-pointer">
          + Add Zone
        </button>
      </div>

      

      {!selectedZoneId && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-40">
          <span className="text-[32px]">👆</span>
          <span className="text-[12px] text-[#9494a8] text-center">Click a zone on the canvas<br/>to edit it</span>
        </div>
      )}

      {selectedZoneId && (
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
            updateBackgroundProp={updateBackgroundProp}
            setZoneStyle={setZoneStyle}
            setZoneStyleSilent={setZoneStyleSilent}
            setZoneLayout={setZoneLayout}
            setZoneLayoutSilent={setZoneLayoutSilent}
            clearContent={clearContent}
            clearBackground={clearBackground}
            onDelete={() => deleteZone(selectedZoneId)}
          />
        </div>
      )}

      {picker && (
        <ZonePickerModal
          orientation={project.meta.orientation}
          mode={picker.type}
          onSelect={handleSelect}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Add zone picker — opens full picker so user can pick any content type */}
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