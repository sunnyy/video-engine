import React, { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry.js";
import { captionStyleRegistry } from "../../core/captionStyleRegistry";

const STYLES = [
  "tiktokClean",
  "reelsBold",
  "minimalGlass",
  "premiumBlock",
  "kineticPop",
  "cinematicSubtitle",
  "neonPulse",
  "luxuryGold",
  "brutalImpact",
  "glassHighlight",
  "viralGradient",
  "softMinimal",
  "modernOutline",
  "highContrastFlash",
];

const ANIMATIONS = ["fade", "word_reveal", "word_pop", "pop", "wave", "slide"];

const POSITIONS = ["top", "middle", "bottom"];

export default function CaptionsSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [tab, setTab] = useState("content");

  const layout = layoutRegistry[beat.layout];
  const structure = layout?.structure || {};

  if (!structure.caption) return null;

  const caption = beat.caption || {
    show: true,
    style: "tiktokClean",
    animation: "fade",
    position: "bottom",
  };

  const previewText = beat.spoken || "Your caption preview text";

  const updateCaption = (key, value) => {
    updateBeat(beat.id, {
      caption: {
        ...caption,
        [key]: value,
      },
    });
  };

  const updateSpoken = (value) => {
    updateBeat(beat.id, {
      spoken: value,
    });
  };

  const applyStyleToAllBeats = () => {
    const updatedBeats = project.beats.map((b) => ({
      ...b,
      caption: {
        ...b.caption,
        style: caption.style,
      },
    }));

    setProject({
      ...project,
      beats: updatedBeats,
    });
  };

  const renderPreviewStyle = (styleKey) => {
    const styleConfig =
      captionStyleRegistry[styleKey]?.() ||
      captionStyleRegistry.tiktokClean();

    const words = previewText.split(" ").slice(0, 10);
    const isActive = caption.style === styleKey;

    return (
      <div
        key={styleKey}
        onClick={() => updateCaption("style", styleKey)}
        className={`cursor-pointer rounded-[8px] border p-3 transition ${
          isActive
            ? "border-[#7c5cfc] bg-[#1c1c28]"
            : "border-[rgba(255,255,255,0.06)] bg-[#16161f] hover:border-[rgba(255,255,255,0.15)]"
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.1em] text-[#55556a] mb-2">
          {styleKey}
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "8px",
            background: "#0b0b10",
            ...styleConfig.container,
          }}
        >
          {words.map((word, index) => (
            <span
              key={index}
              style={{
                display: "inline-block",
                marginRight: 6,
                ...styleConfig.word,
                fontSize: 13,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("content")}
          className={`px-3 py-[4px] text-[11px] rounded-[6px] border transition ${
            tab === "content"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Caption
        </button>

        <button
          onClick={() => setTab("style")}
          className={`px-3 py-[4px] text-[11px] rounded-[6px] border transition ${
            tab === "style"
              ? "bg-[#1c1c28] border-[#7c5cfc] text-[#e8e8f0]"
              : "bg-[#16161f] border-[rgba(255,255,255,0.06)] text-[#9494a8]"
          }`}
        >
          Style
        </button>
      </div>

      {tab === "content" && (
        <div className="flex gap-4 flex-wrap">

          {/* Caption text */}
          <div className="flex flex-col flex-1 min-w-[260px]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#55556a] mb-1">
              Caption
            </div>

            <textarea
              value={beat.spoken || ""}
              onChange={(e) => updateSpoken(e.target.value)}
              className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[6px] p-3 text-[12px] text-[#e8e8f0] h-[80px] focus:border-[#7c5cfc] outline-none"
            />
          </div>

          {/* Duration + toggle */}
          <div className="flex flex-col gap-3">

            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#55556a] mb-1">
                Duration
              </div>

              <input
                type="number"
                min={1}
                value={beat.duration_sec}
                onChange={(e) =>
                  updateBeat(beat.id, {
                    duration_sec: Number(e.target.value),
                  })
                }
                className="w-[80px] bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-1 text-[12px] text-[#e8e8f0]"
              />
            </div>

            <label className="flex items-center gap-2 text-[11px] text-[#9494a8]">
              <input
                type="checkbox"
                checked={caption.show}
                onChange={(e) => updateCaption("show", e.target.checked)}
              />
              Show Caption
            </label>
          </div>

          {/* Animation */}
          <div className="w-[160px]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#55556a] mb-1">
              Animation
            </div>

            <select
              value={caption.animation}
              onChange={(e) => updateCaption("animation", e.target.value)}
              className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-1 text-[12px] text-[#e8e8f0]"
            >
              {ANIMATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div className="w-[160px]">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#55556a] mb-1">
              Position
            </div>

            <select
              value={caption.position || "bottom"}
              onChange={(e) => updateCaption("position", e.target.value)}
              className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-2 py-1 text-[12px] text-[#e8e8f0]"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

        </div>
      )}

      {tab === "style" && (
        <div className="flex flex-col gap-3">

          <button
            onClick={applyStyleToAllBeats}
            className="self-start text-[11px] px-3 py-[4px] rounded-[6px] bg-[#1c1c28] border border-[rgba(255,255,255,0.06)] text-[#e8e8f0] hover:border-[#7c5cfc]"
          >
            Apply Style to All Beats
          </button>

          <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
            {STYLES.map(renderPreviewStyle)}
          </div>

        </div>
      )}
    </div>
  );
}