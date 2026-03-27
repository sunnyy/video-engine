import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
import blockRegistry from "../../core/blockRegistry";
import ZonePickerModal from "./zonePicker/ZonePickerModal";
import ZoneCard from "./zones/ZoneCard";

export default function ZonesSection({ beat, project }) {

  const updateBeat = useProjectStore((s)=>s.updateBeat);

  const layout = layoutRegistry[beat.layout];
  if (!layout) return null;

  const zones = beat.zones || {};
  const zoneSlots = layout.zones || [];

  const [picker,setPicker] = useState(null);

  const openPicker = (slot,type)=>{
    setPicker({slot,type});
  };

  const normalizeAsset = (data)=>{

    if (!data) return data;

    if (data.kind) return data;

    if (data.url) {

      const src = data.url;

      const type =
        src.endsWith(".mp4") ||
        src.endsWith(".webm")
          ? "video"
          : "image";

      return {
        kind:"asset",
        asset:{
          type,
          src
        }
      };

    }

    return data;

  };

  const getRequiredDuration = (block)=>{

    if (!block?.type) return 0;

    const minDuration = blockRegistry[block.type]?.minDuration || 2;

    if (block.type === "ListReveal") {

      const items = block.props?.items || [];
      return Math.max(minDuration, items.length * 0.6);

    }

    if (block.type === "Slideshow") {

      const images = block.props?.images || [];
      return Math.max(minDuration, images.length * 1.2);

    }

    return minDuration;

  };

  const syncBeatDuration = (zonesData)=>{

    let maxBlockDuration = 0;

    Object.values(zonesData).forEach((z)=>{

      const block = z?.content?.block;
      if (!block) return;

      const required = getRequiredDuration(block);

      if (required > maxBlockDuration) {
        maxBlockDuration = required;
      }

    });

    if (maxBlockDuration > (beat.duration_sec || 0)) {

      updateBeat(beat.id,{
        duration_sec:maxBlockDuration
      });

    }

  };

  const updateZone = (slot,newData)=>{

    const newZones = {
      ...zones,
      [slot]:{
        ...(zones?.[slot] || {}),
        ...newData
      }
    };

    updateBeat(beat.id,{ zones:newZones });

    syncBeatDuration(newZones);

  };

  const updateContentProp = (slot,key,value)=>{

    const zone = zones?.[slot] || {};
    const content = zone.content || {};
    const asset = content.asset || {};
    const block = content.block || {};

    if (content.kind === "asset") {

      updateZone(slot,{
        content:{
          ...content,
          asset:{
            ...asset,
            [key]:value
          }
        }
      });

      return;

    }

    if (content.kind === "block") {

      updateZone(slot,{
        content:{
          ...content,
          block:{
            ...block,
            props:{
              ...(block.props || {}),
              [key]:value
            }
          }
        }
      });

    }

  };

  const setContent = (slot,data)=>{

    data = normalizeAsset(data);

    if (data.kind === "block") {

      updateZone(slot,{
        content:{
          kind:"block",
          block:data.block
        }
      });

      return;

    }

    if (data.kind === "color") {

      updateZone(slot,{
        content:{
          kind:"color",
          color:data.color
        }
      });

      return;

    }

    if (data.kind === "asset") {

      updateZone(slot,{
        content:{
          kind:"asset",
          asset:{
            type:data.asset.type,
            src:data.asset.src,
            objectFit:"cover",
            animation:"none"
          }
        }
      });

    }

  };

  const setBackground = (slot,data)=>{

    data = normalizeAsset(data);

    if (data.kind === "color") {

      updateZone(slot,{
        background:{
          kind:"color",
          color:data.color
        }
      });

      return;

    }

    if (data.kind === "asset") {

      updateZone(slot,{
        background:{
          kind:"asset",
          asset:{
            type:data.asset.type,
            src:data.asset.src,
            objectFit:"cover",
            transition:"none"
          }
        }
      });

    }

  };

  const updateBackgroundProp = (slot,key,value)=>{

    const zone = zones?.[slot] || {};
    const bg = zone.background || {};
    const asset = bg.asset || {};

    updateZone(slot,{
      background:{
        ...bg,
        asset:{
          ...asset,
          [key]:value
        }
      }
    });

  };

  const setVariant = (slot,variant)=>{

    const zone = zones?.[slot] || {};
    const content = zone.content || {};

    updateZone(slot,{
      content:{
        ...content,
        block:{
          ...(content.block || {}),
          variant
        }
      }
    });

  };

  const updateBlockProp = (slot,key,value)=>{

    const zone = zones?.[slot] || {};
    const content = zone.content || {};
    const block = content.block || {};

    updateZone(slot,{
      content:{
        ...content,
        block:{
          ...block,
          props:{
            ...(block.props || {}),
            [key]:value
          }
        }
      }
    });

  };

  const setPadding = (slot,side,value)=>{

    const zone = zones?.[slot] || {};
    const style = zone.style || {};
    const padding = style.padding || {};

    updateZone(slot,{
      style:{
        ...style,
        padding:{
          ...padding,
          [side]:Number(value)
        }
      }
    });

  };

  const handleSelect = (asset)=>{

    if (!picker) return;

    if (picker.type === "content") setContent(picker.slot,asset);
    if (picker.type === "background") setBackground(picker.slot,asset);

    setPicker(null);

  };

  const clearContent = (slot)=>{

    const zone = zones?.[slot] || {};

    updateZone(slot,{
      ...zone,
      content:{}
    });

  };

  const clearBackground = (slot)=>{

    const zone = zones?.[slot] || {};

    updateZone(slot,{
      ...zone,
      background:{}
    });

  };

  return (

    <div>

      <h4 className="mb-4 text-base bg-gray-100 px-2 py-1 font-semibold uppercase">
        Zones
      </h4>

      <div className="flex gap-6 flex-wrap">

        {zoneSlots.map((slot)=>{

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
          onClose={()=>setPicker(null)}
        />

      )}

    </div>

  );

}