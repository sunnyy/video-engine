import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry.js";
import blockRegistry from "../../core/blockRegistry";
import ZonePickerModal from "./zonePicker/ZonePickerModal";
import ZoneCard from "./zones/ZoneCard";

export default function ZonesSection({ beat, project }) {

  const updateBeat = useProjectStore((s) => s.updateBeat);
  const [picker, setPicker] = useState(null);

  const layout    = layoutRegistry[beat.layout];
  const zones     = beat.zones  || {};
  const zoneSlots = layout?.zones || [];

  if (!layout) return null;

  const openPicker = (slot, type) => setPicker({ slot, type });

  /* ── Asset normalisation ── */
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

  /* ── Duration sync ── */
  const getRequiredDuration = (block) => {
    if (!block?.type) return 0;
    const min = blockRegistry[block.type]?.minDuration || 2;
    if (block.type === "ListReveal") {
      return Math.max(min, (block.props?.items?.length || 0) * 0.6);
    }
    if (block.type === "Slideshow") {
      return Math.max(min, (block.props?.images?.length || 0) * 1.2);
    }
    return min;
  };

  const syncBeatDuration = (zonesData) => {
    let max = 0;
    Object.values(zonesData).forEach((z) => {
      const req = getRequiredDuration(z?.content?.block);
      if (req > max) max = req;
    });
    if (max > (beat.duration_sec || 0)) {
      updateBeat(beat.id, { duration_sec: max });
    }
  };

  /* ── Core zone updater ── */
  const updateZone = (slot, newData) => {
    const newZones = {
      ...zones,
      [slot]: { ...(zones?.[slot] || {}), ...newData },
    };
    updateBeat(beat.id, { zones: newZones });
    syncBeatDuration(newZones);
  };

  /* ── Content ── */
  const updateContentProp = (slot, key, value) => {
    const zone    = zones?.[slot] || {};
    const content = zone.content  || {};
    const asset   = content.asset || {};
    const block   = content.block || {};

    if (content.kind === "asset") {
      updateZone(slot, { content: { ...content, asset: { ...asset, [key]: value } } });
      return;
    }
    if (content.kind === "block") {
      updateZone(slot, {
        content: {
          ...content,
          block: { ...block, props: { ...(block.props || {}), [key]: value } },
        },
      });
    }
  };

  const setContent = (slot, data) => {
    data = normalizeAsset(data);
    if (data.kind === "block") {
      updateZone(slot, { content: { kind: "block", block: data.block } });
      return;
    }
    if (data.kind === "color") {
      updateZone(slot, { content: { kind: "color", color: data.color } });
      return;
    }
    if (data.kind === "asset") {
      updateZone(slot, {
        content: {
          kind: "asset",
          asset: { type: data.asset.type, src: data.asset.src, objectFit: "cover", animation: "none" },
        },
      });
    }
  };

  /* ── Background ── */
  const setBackground = (slot, data) => {
    data = normalizeAsset(data);
    if (data.kind === "color") {
      updateZone(slot, { background: { kind: "color", color: data.color, backgroundSize: data.backgroundSize || "auto" } });
      return;
    }
    if (data.kind === "asset") {
      updateZone(slot, {
        background: {
          kind: "asset",
          asset: { type: data.asset.type, src: data.asset.src, objectFit: "cover", transition: "none" },
        },
      });
    }
  };

  const updateBackgroundProp = (slot, key, value) => {
    const zone  = zones?.[slot] || {};
    const bg    = zone.background || {};
    const asset = bg.asset || {};
    updateZone(slot, { background: { ...bg, asset: { ...asset, [key]: value } } });
  };

  /* ── Block ── */
  const setVariant = (slot, variant) => {
    const zone    = zones?.[slot] || {};
    const content = zone.content  || {};
    updateZone(slot, {
      content: { ...content, block: { ...(content.block || {}), variant } },
    });
  };

  const updateBlockProp = (slot, key, value) => {
    const zone    = zones?.[slot] || {};
    const content = zone.content  || {};
    const block   = content.block || {};
    updateZone(slot, {
      content: {
        ...content,
        block: { ...block, props: { ...(block.props || {}), [key]: value } },
      },
    });
  };

  /* ── Styling ── */
  const setPadding = (slot, side, value) => {
    const zone    = zones?.[slot] || {};
    const style   = zone.style    || {};
    const padding = style.padding || {};
    updateZone(slot, {
      style: { ...style, padding: { ...padding, [side]: Number(value) } },
    });
  };

  /**
   * setZoneStyle — updates any top-level style key:
   *   borderRadius, border, shadow, opacity
   */
  const setZoneStyle = (slot, key, value) => {
    const zone  = zones?.[slot] || {};
    const style = zone.style    || {};
    updateZone(slot, {
      style: { ...style, [key]: value },
    });
  };

  /* ── Picker ── */
  const handleSelect = (asset) => {
    if (!picker) return;
    if (picker.type === "content")    setContent(picker.slot, asset);
    if (picker.type === "background") setBackground(picker.slot, asset);
    setPicker(null);
  };

  /* ── Clear ── */
  const clearContent = (slot) => {
    const zone = zones?.[slot] || {};
    updateZone(slot, { ...zone, content: {} });
  };

  const clearBackground = (slot) => {
    const zone = zones?.[slot] || {};
    updateZone(slot, { ...zone, background: {} });
  };

  return (
    <div>
      <div
        className="mb-4 text-[11px] font-bold tracking-[0.1em] uppercase text-[#9494a8]"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Zones
      </div>

      <div className="flex flex-col gap-3">
        {zoneSlots.map((slot) => {
          const zone = zones?.[slot] || {};
          return (
            <ZoneCard
              key={slot}
              slot={slot}
              zone={zone}
              openPicker={openPicker}
              setVariant={setVariant}
              updateBlockProp={updateBlockProp}
              updateContentProp={updateContentProp}
              setPadding={setPadding}
              setZoneStyle={setZoneStyle}
              updateBackgroundProp={updateBackgroundProp}
              clearContent={clearContent}
              clearBackground={clearBackground}
            />
          );
        })}
      </div>

      {picker && (
        <ZonePickerModal
          orientation={project.meta.orientation}
          mode={picker.type}
          onSelect={handleSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}