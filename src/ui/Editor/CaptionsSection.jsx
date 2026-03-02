import React from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { captionStyleRegistry } from "../../core/captionStyleRegistry";

const STYLES = ["tiktokClean", "reelsBold", "minimalGlass", "premiumBlock", "kineticPop", "cinematicSubtitle"];

const ANIMATIONS = ["fade", "word_reveal", "word_pop"];
const POSITIONS = ["top", "middle", "bottom"];

export default function CaptionsSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);

  const previewText = beat.spoken || "Your caption here";

  if (!beat) return null;

  const caption = beat.caption || {
    show: true,
    style: "clean",
    animation: "fade",
    position: "bottom",
  };

  const updateCaption = (key, value) => {
    updateBeat(beat.id, {
      caption: {
        ...caption,
        [key]: value,
      },
    });
  };

  const renderPreviewStyle = (styleKey) => {
    const styleConfig = captionStyleRegistry[styleKey]?.() || captionStyleRegistry.clean();

    const words = previewText.split(" ");

    return (
      <div
        key={styleKey}
        onClick={() => updateCaption("style", styleKey)}
        className={`cursor-pointer rounded-lg border transition mb-5 ${
          caption.style === styleKey ? "border-indigo-500" : "border-gray-200"
        }`}
      >
        {/* Style Name */}
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

        {/* Caption Preview */}
        <div
          style={{
            textAlign: "center",
            lineHeight: 1.2,
            background: "#f6f6f6",
            padding: "10px",
            borderStyle: "solid",
            borderWidth: "1px",
            borderColor: "#ddd",
            ...styleConfig.container,
          }}
        >
          {words.map((word, index) => {
            const isLast = index === words.length - 1;

            const highlightStyle = styleConfig.activeWord && isLast ? styleConfig.activeWord : {};

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
      {/* Header */}
      <div className="flex items-center gap-3 m-0">
        <h4 className="text-sm text-black font-semibold uppercase">Caption Settings</h4>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={caption.show} onChange={(e) => updateCaption("show", e.target.checked)} />
          Show Caption
        </label>
      </div>

      <div className="flex gap-4">
        <div className="w-[70%]">
          <h4 className="text-sm text-black font-semibold uppercase m-0 mb-2">Style</h4>
          <div className="flex flex-col flex-1 max-h-[200px] overflow-y-auto border-2 border-red-500 p-4"
          style={{
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "#ddd",
            borderRadius: "5px"
          }}>
            {STYLES.map(renderPreviewStyle)}
          </div>
        </div>

        <div className="w-[30%] flex flex-col gap-4">
          <div>
            <h4 className="text-sm text-black font-semibold uppercase m-0 mb-1">Animation</h4>
            <select
              value={caption.animation}
              onChange={(e) => updateCaption("animation", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {ANIMATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="text-sm text-black font-semibold uppercase m-0 mb-1">Position</h4>
            <select
              value={caption.position}
              onChange={(e) => updateCaption("position", e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
