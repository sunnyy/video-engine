import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry.js";
import ZonePicker from "./zonePicker/ZonePickerModal";
import LayoutPreview from "./LayoutPreview";

const transitionOptions = [
  "none",
  "crossfade",
  "slideLeft",
  "slideRight",
  "zoomIn",
  "zoomOut",
  "blurFade",
];

export default function LayoutSelector({ beat }) {

  const project = useProjectStore((s) => s.project);
  const updateBeat = useProjectStore((s) => s.updateBeat);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState("structure");

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

    // Keep all existing zone content — only fill zones that don't exist yet
    const existingZones = beat.zones || {};
    const zones = { ...existingZones };

    (layoutDef.zones || []).forEach((z) => {
      if (!zones[z]) {
        zones[z] = {
          content:    {},
          background: {},
          style:      {},
        };
      }
    });

    updateBeat(beat.id, { layout, zones });

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

  const setTransition = (type) => {

    updateBeat(beat.id, {
      transition: {
        type,
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

    <div className="flex flex-col gap-4">

      {/* Tabs */}

      <div className="flex gap-2">

        <button
          onClick={() => setTab("structure")}
          className={`px-3 py-[4px] text-[13px] rounded-[6px] border transition ${
            tab === "structure"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Structure
        </button>

        <button
          onClick={() => setTab("background")}
          className={`px-3 py-[4px] text-[13px] rounded-[6px] border transition ${
            tab === "background"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Background
        </button>

        <button
          onClick={() => setTab("styling")}
          className={`px-3 py-[4px] text-[13px] rounded-[6px] border transition ${
            tab === "styling"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Styling
        </button>

        <button
          onClick={() => setTab("transition")}
          className={`px-3 py-[4px] text-[13px] rounded-[6px] border transition ${
            tab === "transition"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Transition
        </button>

      </div>

      {tab === "structure" && (

        <div className="grid grid-cols-8 gap-3">

          {layouts.map((layout) => (

            <div
              key={layout}
              onClick={() => handleSelect(layout)}
              className={`cursor-pointer rounded-[8px] border p-[4px] transition ${
                beat.layout === layout
                  ? "border-[#f5c518] ring-1 ring-[#f5c518]"
                  : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]"
              }`}
            >

              <LayoutPreview layout={layout} />

            </div>

          ))}

        </div>

      )}

      {tab === "background" && (

        <div>

          <div
            className="relative w-[140px] h-[90px] border border-[rgba(255,255,255,0.06)] rounded-[6px] cursor-pointer overflow-hidden bg-[#16161f]"
            onClick={() => setPickerOpen(true)}
          >

            {renderPreview()}

            {!bg && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#55556a]">
                Select
              </div>
            )}

          </div>

          <div className="mt-2 flex gap-2">

            <button
              onClick={() => setPickerOpen(true)}
              className="text-[11px] px-2 py-[3px] border border-[rgba(255,255,255,0.06)] rounded-[6px] bg-[#16161f] text-[#9494a8]"
            >
              Change
            </button>

            <button
              onClick={removeLayoutBackground}
              className="text-[11px] px-2 py-[3px] border border-[rgba(255,255,255,0.06)] rounded-[6px] bg-[#16161f] text-[#9494a8]"
            >
              Reset
            </button>

          </div>

          {bg && (bg.type === "image" || bg.type === "video") && (

            <div className="flex gap-2 mt-2">

              <button
                onClick={() => setObjectFit("cover")}
                className={`text-[11px] px-2 py-[3px] border rounded-[6px] ${
                  bg.objectFit === "cover"
                    ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
                    : "border-[rgba(255,255,255,0.06)] text-[#9494a8]"
                }`}
              >
                Cover
              </button>

              <button
                onClick={() => setObjectFit("contain")}
                className={`text-[11px] px-2 py-[3px] border rounded-[6px] ${
                  bg.objectFit === "contain"
                    ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
                    : "border-[rgba(255,255,255,0.06)] text-[#9494a8]"
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

          <div className="text-[11px] text-[#55556a] mb-1">
            Padding
          </div>

          <input
            type="range"
            min={0}
            max={60}
            value={padding}
            onChange={(e) => setLayoutPadding(e.target.value)}
            className="w-[200px]"
          />

          <div className="text-[11px] text-[#9494a8] mt-1">
            {padding}px
          </div>

        </div>

      )}

      {tab === "transition" && (

        <div className="w-[200px]">

          <select
            value={beat.transition?.type || "none"}
            onChange={(e) => setTransition(e.target.value)}
            className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-[4px] text-[12px] text-[#e8e8f0]"
          >

            {transitionOptions.map((opt) => (

              <option key={opt} value={opt}>
                {opt}
              </option>

            ))}

          </select>

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