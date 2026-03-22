import React from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { layoutRegistry } from "../../core/layoutRegistry";
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

  // FIXED: apply only STYLE
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
        className={`cursor-pointer rounded-lg border transition mb-4 ${
          isActive
            ? "border-indigo-500 ring-2 ring-indigo-300"
            : "border-gray-200"
        }`}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#666",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {styleKey}
        </div>

        <div
          style={{
            textAlign: "center",
            background: "#333",
            padding: "10px",
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
                fontSize: 14,
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
    <div className="flex-1 w-full">
      <div className="flex items-center gap-3 mb-4">
        <h4 className="text-sm font-semibold uppercase m-0">
          Caption Settings
        </h4>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={caption.show}
            onChange={(e) => updateCaption("show", e.target.checked)}
          />
          Show Caption
        </label>
      </div>

      <div className="flex gap-4">
        <div className="w-[70%]">
          <div className="flex mb-2 items-center">
            <h4 className="text-sm font-semibold uppercase">Style</h4>

            <button
              onClick={applyStyleToAllBeats}
              className="text-xs px-2 py-1 border rounded ml-4"
            >
              Apply Style to All Beats
            </button>
          </div>

          <div
            className="flex flex-col max-h-[140px] overflow-y-auto p-3"
            style={{
              border: "1px solid #ddd",
              borderRadius: 5,
            }}
          >
            {STYLES.map(renderPreviewStyle)}
          </div>
        </div>

        <div className="w-[30%] flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-semibold uppercase mb-1">
              Animation
            </h4>

            <select
              value={caption.animation}
              onChange={(e) =>
                updateCaption("animation", e.target.value)
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {ANIMATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase mb-1">
              Position
            </h4>

            <select
              value={caption.position || "bottom"}
              onChange={(e) =>
                updateCaption("position", e.target.value)
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}