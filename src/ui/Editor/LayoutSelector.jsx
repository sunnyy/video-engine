import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
import ZonePicker from "./zonePicker/ZonePickerModal";
import LayoutPreview from "./LayoutPreview";

export default function LayoutSelector({ beat }) {
  const project = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState("content");

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
    .filter(([name, layout]) => {
      if (layout.orientations && !layout.orientations.includes(orientation)) return false;

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
        content: { kind: null },
        background: { kind: null },
        style: {},
      };
    });

    updateBeat(beat.id, {
      layout,
      zones,
    });
  };

  const setLayoutBackground = (asset) => {
    let background;

    if (asset.kind === "color") {
      background = {
        type: "color",
        value: asset.color,
        objectFit: "cover",
      };
    } else {
      const src = asset.asset?.src || asset.url;

      const isVideo = src?.endsWith(".mp4") || src?.endsWith(".webm");

      background = {
        type: isVideo ? "video" : "image",
        value: src,
        objectFit: "cover",
      };
    }

    updateBeat(beat.id, { layoutBackground: background });
  };

  const removeLayoutBackground = () => {
    updateBeat(beat.id, {
      layoutBackground: {
        type: "color",
        value: "#000000",
        objectFit: "cover",
      },
    });
  };

  const setLayoutPadding = (value) => {
    updateBeat(beat.id, {
      layoutPadding: Number(value),
    });
  };

  const setObjectFit = (fit) => {
    const bg = beat.layoutBackground;
    if (!bg) return;

    updateBeat(beat.id, {
      layoutBackground: {
        ...bg,
        objectFit: fit,
      },
    });
  };

  const bg = beat.layoutBackground;
  const padding = beat.layoutPadding || 0;

  const renderPreview = () => {
    if (!bg) return null;

    if (bg.type === "color" || bg.type === "gradient") {
      return <div className="absolute inset-0" style={{ background: bg.value }} />;
    }

    if (bg.type === "image") {
      return (
        <img
          src={bg.value}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: bg.objectFit || "cover",
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
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: bg.objectFit || "cover",
          }}
        />
      );
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="mb-4 text-base bg-gray-100 px-2 py-1 font-semibold uppercase">Layout</h4>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("content")}
          className={`px-3 py-1 rounded text-[12px] ${tab === "content" ? "bg-black text-white" : "bg-white"}`}
        >
          Structure
        </button>

        <button
          onClick={() => setTab("background")}
          className={`px-3 py-1 rounded text-[12px] ${tab === "background" ? "bg-black text-white" : "bg-white"}`}
        >
          Background
        </button>

        <button
          onClick={() => setTab("styling")}
          className={`px-3 py-1 rounded text-[12px] ${tab === "styling" ? "bg-black text-white" : "bg-white"}`}
        >
          Styling
        </button>
      </div>

      {tab === "content" && (
        <div className="flex d-flex  gap-3">
          {layouts.map((layout) => (
            <div
              key={layout}
              onClick={() => handleSelect(layout)}
              className={`cursor-pointer p-[3px] rounded border ${
                beat.layout === layout ? "border-black ring-2 ring-black" : "border-gray-200"
              }`}
            >
              <LayoutPreview layout={layout} />

              {/* <div className="text-[11px] mt-1 text-center">{layout}</div> */}
            </div>
          ))}
        </div>
      )}

      {tab === "background" && (
        <div>
          <div
            className="relative w-[140px] h-[90px] border rounded cursor-pointer overflow-hidden"
            onClick={() => setPickerOpen(true)}
          >
            {renderPreview()}

            {!bg && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">Select</div>
            )}
          </div>

          <div className="mt-2 flex gap-2">
            <button onClick={() => setPickerOpen(true)} className="text-xs border px-2 py-1 rounded">
              Change
            </button>

            <button onClick={removeLayoutBackground} className="text-xs border px-2 py-1 rounded">
              Reset
            </button>
          </div>

          {bg && (bg.type === "image" || bg.type === "video") && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setObjectFit("cover")}
                className={`text-xs px-2 py-1 border rounded ${bg.objectFit === "cover" ? "bg-black text-white" : ""}`}
              >
                Cover
              </button>

              <button
                onClick={() => setObjectFit("contain")}
                className={`text-xs px-2 py-1 border rounded ${
                  bg.objectFit === "contain" ? "bg-black text-white" : ""
                }`}
              >
                Contain
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "styling" && (
        <div>
          <div className="text-xs mb-1">Padding</div>

          <input
            type="number"
            value={padding}
            min={0}
            onChange={(e) => setLayoutPadding(e.target.value)}
            className="w-[120px] border px-2 py-1 rounded text-sm"
          />
        </div>
      )}

      {pickerOpen && (
        <ZonePicker
          mode="background"
          orientation={project.meta.orientation}
          onSelect={(asset) => {
            setLayoutBackground(asset);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
