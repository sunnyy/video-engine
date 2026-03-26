import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
import ZonePicker from "./zonePicker/ZonePickerModal";

export default function LayoutSelector({ beat }) {

  const project = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);

  const [pickerOpen,setPickerOpen] = useState(false);

  if (!project) return null;

  const mode = project.meta?.mode;

  const orientation =
    project.meta?.orientation === "9:16"
      ? "vertical"
      : project.meta?.orientation === "16:9"
      ? "horizontal"
      : project.meta?.width > project.meta?.height
      ? "horizontal"
      : "vertical";

  const layouts = Object.entries(layoutRegistry)
    .filter(([name,layout]) => {

      if (layout.orientations && !layout.orientations.includes(orientation))
        return false;

      if (mode === "faceless") {

        const prefersAvatar = layout.capability?.prefersAvatar ?? false;
        if (prefersAvatar) return false;

      }

      return true;

    })
    .map(([name]) => name);

  const handleSelect = (layout) => {

    const layoutDef = layoutRegistry[layout];

    const zones = {};

    (layoutDef.zones || []).forEach((z) => {

      zones[z] = {
        content: { kind:null },
        background: { kind:null },
        style: {}
      };

    });

    updateBeat(beat.id,{
      layout,
      zones
    });

  };

  const setLayoutBackground = (asset) => {

    let background;

    if (asset.kind === "color") {

      background = {
        type:"color",
        value:asset.color,
        objectFit:"cover"
      };

    } else if (asset.kind === "asset") {

      const src = asset.asset?.src || asset.url;

      const isVideo =
        src.endsWith(".mp4") ||
        src.endsWith(".webm");

      background = {
        type:isVideo ? "video" : "image",
        value:src,
        objectFit:"cover"
      };

    } else if (asset.url) {

      const src = asset.url;

      const isVideo =
        src.endsWith(".mp4") ||
        src.endsWith(".webm");

      background = {
        type:isVideo ? "video" : "image",
        value:src,
        objectFit:"cover"
      };

    }

    updateBeat(beat.id,{ layoutBackground:background });

  };

  const removeLayoutBackground = () => {

    updateBeat(beat.id,{
      layoutBackground:{
        type:"color",
        value:"#000000",
        objectFit:"cover"
      }
    });

  };

  const setLayoutPadding = (value) => {

    updateBeat(beat.id,{
      layoutPadding:Number(value)
    });

  };

  const setObjectFit = (fit) => {

    const bg = beat.layoutBackground;
    if (!bg) return;

    updateBeat(beat.id,{
      layoutBackground:{
        ...bg,
        objectFit:fit
      }
    });

  };

  const bg = beat.layoutBackground;
  const padding = beat.layoutPadding || 0;

  const renderPreview = () => {

    if (!bg) return null;

    if (bg.type === "color" || bg.type === "gradient") {

      return (
        <div
          className="absolute inset-0"
          style={{ background:bg.value }}
        />
      );

    }

    if (bg.type === "image") {

      return (
        <img
          src={bg.value}
          style={{
            position:"absolute",
            inset:0,
            width:"100%",
            height:"100%",
            objectFit:bg.objectFit || "cover"
          }}
        />
      );

    }

    if (bg.type === "video") {

      return (
        <video
          src={bg.value}
          muted
          loop
          style={{
            position:"absolute",
            inset:0,
            width:"100%",
            height:"100%",
            objectFit:bg.objectFit || "cover"
          }}
        />
      );

    }

  };

  return (

    <div className="space-y-6">

      <div>

        <h4 className="text-sm font-semibold uppercase mb-2">
          Layout
        </h4>

        <div className="flex gap-3 flex-wrap">

          {layouts.map((layout)=>(

            <button
              key={layout}
              onClick={()=>handleSelect(layout)}
              className={`px-4 py-2 border rounded ${
                beat.layout === layout
                  ? "bg-black text-white"
                  : "bg-white"
              }`}
            >
              {layout}
            </button>

          ))}

        </div>

      </div>

      <div>

        <h4 className="text-sm font-semibold uppercase mb-2">
          Layout Background
        </h4>

        <div
          className="relative w-[120px] h-[80px] border rounded cursor-pointer overflow-hidden"
          onClick={()=>setPickerOpen(true)}
        >

          {renderPreview()}

          {!bg && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
              Select
            </div>
          )}

        </div>

        <div className="mt-2 flex gap-2">

          <button
            onClick={()=>setPickerOpen(true)}
            className="text-[11px] border px-2 py-1 rounded"
          >
            Change
          </button>

          <button
            onClick={removeLayoutBackground}
            className="text-[11px] border px-2 py-1 rounded"
          >
            Reset
          </button>

        </div>

        {bg && (bg.type === "image" || bg.type === "video") && (

          <div className="flex gap-2 mt-2">

            <button
              onClick={()=>setObjectFit("cover")}
              className={`text-[11px] px-2 py-1 border rounded ${
                bg.objectFit === "cover" ? "bg-black text-white" : ""
              }`}
            >
              Cover
            </button>

            <button
              onClick={()=>setObjectFit("contain")}
              className={`text-[11px] px-2 py-1 border rounded ${
                bg.objectFit === "contain" ? "bg-black text-white" : ""
              }`}
            >
              Contain
            </button>

          </div>

        )}

      </div>

      <div>

        <h4 className="text-sm font-semibold uppercase mb-2">
          Layout Padding
        </h4>

        <input
          type="number"
          value={padding}
          min={0}
          onChange={(e)=>setLayoutPadding(e.target.value)}
          className="w-[100px] border px-2 py-1 rounded text-sm"
        />

      </div>

      {pickerOpen && (

        <ZonePicker
          mode="background"
          orientation={project.meta.orientation}
          onSelect={(asset)=>{

            setLayoutBackground(asset);
            setPickerOpen(false);

          }}
          onClose={()=>setPickerOpen(false)}
        />

      )}

    </div>

  );

}