import React, { useEffect, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore";
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

const ANIMATIONS = ["fade", "word_reveal", "word_pop"];
const POSITIONS = ["top", "middle", "bottom"];

export default function CaptionsSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  const containerRef = useRef(null);
  const activeRef = useRef(null);

  if (!beat) return null;

  const caption = beat.caption || {
    show: true,
    style: "clean",
    animation: "fade",
    position: "bottom",
  };

  const previewText = beat.spoken || "Your caption here";

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [caption.style]);

  const updateCaption = (key, value) => {
    updateBeat(beat.id, {
      caption: {
        ...caption,
        [key]: value,
      },
    });
  };

  const renderPreviewStyle = (styleKey) => {
    const styleConfig =
      captionStyleRegistry[styleKey]?.() ||
      captionStyleRegistry.clean();

    const words = previewText.split(" ").slice(0, 11);
    const isActive = caption.style === styleKey;

    return (
      <div
        key={styleKey}
        ref={isActive ? activeRef : null}
        onClick={() => updateCaption("style", styleKey)}
        className={`cursor-pointer rounded-lg border transition mb-5 ${
          isActive ? "border-indigo-500 ring-2 ring-indigo-300" : "border-gray-200"
        }`}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#666",
            textTransform: "uppercase",
            marginBottom: 10,
            letterSpacing: 1,
          }}
        >
          {styleKey}
        </div>

        <div
          style={{
            textAlign: "center",
            lineHeight: 1.2,
            background: "#333",
            padding: "10px",
            border: "1px solid #ddd",
            ...styleConfig.container,
          }}
        >
          {words.map((word, index) => {
            const isLast = index === words.length - 1;
            const highlightStyle =
              styleConfig.activeWord && isLast
                ? styleConfig.activeWord
                : {};

            return (
              <span
                key={index}
                style={{
                  display: "inline-block",
                  marginRight: 8,
                  ...styleConfig.word,
                  ...highlightStyle,
                  fontSize: 18,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-semibold uppercase">
          Caption Settings
        </h4>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={caption.show}
            onChange={(e) =>
              updateCaption("show", e.target.checked)
            }
          />
          Show Caption
        </label>
      </div>

      <div className="flex gap-4">
        <div className="w-[70%]">
          <h4 className="text-sm font-semibold uppercase mb-2">
            Style
          </h4>
          <div
            ref={containerRef}
            className="flex flex-col max-h-[200px] overflow-y-auto p-4"
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
              value={caption.position}
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