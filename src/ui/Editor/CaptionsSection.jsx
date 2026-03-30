import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore.js";
import { layoutRegistry } from "../../core/layoutRegistry.js";
import { captionStyleRegistry, captionStyleKeys } from "../../core/captionStyleRegistry.jsx";

const PREVIEW_TEXT = "This changes everything";
const FPS = 30;
const LOOP_FRAMES = 270;

function CaptionPreview({ styleKey, brandColor }) {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let f = 0;
    const loop = () => {
      f = (f + 1) % LOOP_FRAMES;
      setFrame(f);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const styleEntry = captionStyleRegistry[styleKey];
  if (!styleEntry) return null;

  const rendered = styleEntry.render({
    text: PREVIEW_TEXT,
    frame,
    fps: FPS,
    brandColor: brandColor || "#00F2EA",
  });

  return (
    <div
      style={{
        width: 700,
        transform: "scale(0.40)",
        transformOrigin: "center center",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {rendered}
    </div>
  );
}

const POSITIONS = [
  { key: "top", label: "Top" },
  { key: "middle", label: "Middle" },
  { key: "bottom", label: "Bottom" },
];

export default function CaptionsSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const layout = layoutRegistry[beat.layout];
  if (!layout?.structure?.caption) return null;

  const caption = beat.caption || {
    show: true,
    text: beat.spoken || "",
    style: captionStyleKeys[0],
    position: "bottom",
  };

  const brandColor = project?.meta?.brand_color ?? project?.visualIdentity?.colorStory?.accent ?? "#00F2EA";

  const update = (key, value) => {
    updateBeat(beat.id, { caption: { ...caption, [key]: value } });
  };

  const applyToAll = () => {
    const beats = project.beats.map((b) => ({
      ...b,
      caption: { ...b.caption, style: caption.style },
    }));
    setProject({ ...project, beats });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Show / Text */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#e8e8f0]">Show Caption</span>
          <button
            onClick={() => update("show", !caption.show)}
            className="w-[36px] h-[20px] rounded-full relative transition-all shrink-0"
            style={{
              background: caption.show ? "#7c5cfc" : "#1c1c28",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: caption.show ? 17 : 2,
                width: 14,
                height: 14,
                background: "#fff",
                borderRadius: "50%",
                transition: "left 0.15s",
              }}
            />
          </button>
        </div>

        <div className="flex flex-col gap-[6px]">
          <span
            className="text-[14px] font-bold tracking-widest uppercase text-[#55556a]"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}
          >
            Text
          </span>
          <textarea
            value={caption.text || beat.spoken || ""}
            onChange={(e) => update("text", e.target.value)}
            rows={3}
            placeholder="Defaults to spoken text"
            className="bg-[#111118] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-2 text-[20px] text-[#e8e8f0] resize-none focus:border-[#7c5cfc] focus:outline-none transition-colors leading-relaxed"
          />
        </div>
      </div>

      {/* ── Position ── */}
      <div className="flex flex-col gap-2">
        <span
          className="text-[11px] font-bold tracking-widest uppercase text-[#55556a]"
          style={{ fontFamily: "'JetBrains Mono',monospace" }}
        >
          Position
        </span>
        <div className="flex gap-[3px] bg-[#0e0e15] border border-[rgba(255,255,255,0.04)] rounded-[8px] p-[3px]">
          {POSITIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => update("position", key)}
              className={`flex-1 py-[8px] rounded-[6px] text-[14px]  text-[#e8e8f0] font-semibold transition-all bg-[#1c1c28] border-0
                ${caption.position === key ? "border-2 border-blue-500" : "border-gray-500  hover:text-[#7070a0]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Style grid — scrollable, shows ~3-4 at a time ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[11px] font-bold tracking-widest uppercase text-[#55556a]"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}
          >
            Caption Style
          </span>
          <button
            onClick={applyToAll}
            className="text-[11px] text-[#7c5cfc] hover:text-[#9d7fff] transition-colors bg-transparent border-0 cursor-pointer"
          >
            Apply to all
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pr-[2px]" style={{ maxHeight: 420 }}>
          {captionStyleKeys.map((key) => {
            const isSelected = caption.style === key;
            const entry = captionStyleRegistry[key];
            return (
              <div
                key={key}
                onClick={() => update("style", key)}
                className="cursor-pointer rounded-[10px] overflow-hidden flex flex-col shrink-0"
                style={{
                  border: isSelected ? "1.5px solid #7c5cfc" : "1px solid rgba(255,255,255,0.07)",
                  background: "#111118",
                  boxShadow: isSelected ? "0 0 0 1px #7c5cfc40, 0 0 16px rgba(124,92,252,0.15)" : "none",
                }}
              >
                <div
                  style={{
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    background:
                      key === "editorialSerif"
                        ? "linear-gradient(160deg,#f5f3ee,#e8e4db)"
                        : "linear-gradient(160deg,#0d0d18,#050510)",
                  }}
                >
                  <CaptionPreview styleKey={key} brandColor={brandColor} />
                </div>
                <div
                  style={{
                    padding: "5px 8px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textAlign: "center",
                    color: isSelected ? "#a78fff" : "rgba(148,148,168,0.6)",
                  }}
                >
                  {entry?.label ?? key}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
