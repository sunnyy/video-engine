import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore.js";
import { layoutRegistry } from "../../core/registries/layoutRegistry.js";
import { captionStyleRegistry, captionStyleKeys } from "../../core/registries/captionStyleRegistry.jsx";

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

// Resolve legacy string position to number
function resolvePositionY(p) {
  if (typeof p === "number") return p;
  if (p === "top")    return 15;
  if (p === "middle") return 50;
  return 80;
}

export default function CaptionsSection({ beat }) {
  const updateBeat = useProjectStore((s) => s.updateBeat);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const layout          = layoutRegistry[beat.layout];
  const captionStrategy = layout?.captionStrategy ?? "always";

  const caption = beat.caption || {
    show:     true,
    text:     beat.spoken || "",
    style:    captionStyleKeys[0],
    position: 80,
  };

  const brandColor = project?.meta?.brand?.color
    ?? project?.meta?.brand_color
    ?? project?.visualIdentity?.colorStory?.accent
    ?? "#00F2EA";

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

      {/* Strategy notice for text-zone layouts */}
      {captionStrategy === "never" && (
        <div className="flex items-start gap-2 px-3 py-[10px] rounded-[10px] bg-[rgba(124,92,252,0.08)] border border-[rgba(124,92,252,0.2)]">
          <span className="text-[14px] shrink-0 mt-[1px]">ℹ️</span>
          <p className="text-[11px] text-[#9494a8] leading-relaxed m-0 p-0">
            This view has built-in text zones. Captions are <strong className="text-[#a78fff]">hidden by default</strong> to avoid overlap. Enable below if needed.
          </p>
        </div>
      )}
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
            rows={2}
            placeholder="Defaults to spoken text"
            className="bg-[#111118] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-2 text-[20px] text-[#e8e8f0] resize-none focus:border-[#7c5cfc] focus:outline-none transition-colors leading-relaxed"
          />
        </div>
      </div>

      {/* ── Position ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-bold tracking-widest uppercase text-[#55556a]"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}
          >
            Position
          </span>
          <span className="text-[11px] text-[#7c5cfc] font-mono">
            {resolvePositionY(caption.position)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#55556a]">Top</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={resolvePositionY(caption.position)}
            onChange={(e) => update("position", Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: "#7c5cfc" }}
          />
          <span className="text-[10px] text-[#55556a]">Bottom</span>
        </div>
      </div>

      {/* ── Font Size ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#55556a]"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            Font Size
          </span>
          <span className="text-[11px] text-[#7c5cfc] font-mono">{caption.fontSize ?? 100}%</span>
        </div>
        <input
          type="range" min={50} max={200} step={5}
          value={caption.fontSize ?? 100}
          onChange={(e) => update("fontSize", Number(e.target.value))}
          className="w-full"
          style={{ accentColor: "#7c5cfc" }}
        />
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

        <div className="flex flex-col gap-4 overflow-y-auto pr-[2px]" style={{ maxHeight: 300 }}>
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