import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore.js";
import { layoutRegistry } from "../../core/layoutRegistry.js";
import { captionStyleRegistry, captionStyleKeys } from "../../core/captionStyleRegistry.jsx";

const PREVIEW_TEXT = "This changes everything";
const FPS = 30;
const LOOP_FRAMES = 270; // 9 seconds at 30fps — enough to see the full animation

/* ─────────────────────────────────────────────────────────────
   CaptionPreview
   Runs its own rAF loop so each card animates independently.
   Uses a canvas-free approach: just a div with the rendered JSX,
   scaled down to fit the card.
───────────────────────────────────────────────────────────── */
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
        transform: "scale(0.28)",
        transformOrigin: "center center",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {rendered}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   POSITION BUTTONS
───────────────────────────────────────────────────────────── */
const POSITIONS = [
  { key: "top",    label: "Top"    },
  { key: "middle", label: "Mid"    },
  { key: "bottom", label: "Bottom" },
];

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function CaptionsSection({ beat }) {

  const updateBeat = useProjectStore((s) => s.updateBeat);
  const project    = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);

  const [tab, setTab] = useState("style");

  /* guard: only show when layout supports captions */
  const layout = layoutRegistry[beat.layout];
  if (!layout?.structure?.caption) return null;

  const caption = beat.caption || {
    show:     true,
    text:     beat.spoken || "",
    style:    captionStyleKeys[0],
    position: "bottom",
  };

  const brandColor = project?.meta?.brand_color
    ?? project?.visualIdentity?.colorStory?.accent
    ?? "#00F2EA";

  const updateCaption = (key, value) => {
    updateBeat(beat.id, {
      caption: { ...caption, [key]: value },
    });
  };

  const applyStyleToAllBeats = () => {
    const beats = project.beats.map((b) => ({
      ...b,
      caption: { ...b.caption, style: caption.style },
    }));
    setProject({ ...project, beats });
  };

  /* ── TAB NAV ── */
  const tabs = [
    { key: "style",    label: "Style"    },
    { key: "content",  label: "Content"  },
    { key: "position", label: "Position" },
  ];

  return (
    <div className="flex flex-col gap-3">

      {/* Tab bar */}
      <div className="flex gap-[3px] bg-[#16161f] border border-[#ffffff08] rounded-[10px] p-[3px]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-[6px] rounded-[7px] text-[11px] font-medium transition-all
              ${tab === key
                ? "bg-[#1c1c28] text-[#e8e8f0] shadow-sm"
                : "text-[#55556a] hover:text-[#9494a8]"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── STYLE TAB ── */}
      {tab === "style" && (
        <div className="flex flex-col gap-3">

          {/* Apply to all */}
          <button
            onClick={applyStyleToAllBeats}
            className="text-[11px] font-medium py-[7px] rounded-[8px] border border-[#ffffff10] text-[#9494a8] hover:text-[#e8e8f0] hover:border-[#ffffff20] hover:bg-[#16161f] transition-all"
          >
            Apply to All Beats
          </button>

          {/* Style grid */}
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {captionStyleKeys.map((key) => {
              const isSelected = caption.style === key;
              const entry = captionStyleRegistry[key];
              return (
                <div
                  key={key}
                  onClick={() => updateCaption("style", key)}
                  className="cursor-pointer rounded-[10px] overflow-hidden flex flex-col"
                  style={{
                    border: isSelected
                      ? "1.5px solid #7c5cfc"
                      : "1px solid rgba(255,255,255,0.2)",
                    background: "#0e0e15",
                    boxShadow: isSelected
                      ? "0 0 0 1px #7c5cfc, 0 0 16px rgba(124,92,252,0.2)"
                      : "none",
                  }}
                >
                  {/* Preview area */}
                  <div
                    style={{
                      minHeight: 90,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      background: key === "editorialSerif"
                        ? "linear-gradient(160deg,#f5f3ee,#e8e4db)"
                        : "linear-gradient(160deg,#0d0d18,#050510)",
                      position: "relative",
                    }}
                  >
                    <CaptionPreview styleKey={key} brandColor={brandColor} />
                  </div>

                  {/* Label */}
                  <div
                    className="px-2 py-[5px] border-t border-[rgba(255,255,255,0.05)]"
                    style={{
                      fontFamily: "inherit",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: isSelected ? "#a78fff" : "rgba(148,148,168,0.7)",
                      textAlign: "center",
                    }}
                  >
                    {entry?.label ?? key}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONTENT TAB ── */}
      {tab === "content" && (
        <div className="flex flex-col gap-3">

          {/* Show / hide toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#9494a8]">Show Caption</span>
            <button
              onClick={() => updateCaption("show", !caption.show)}
              className="w-[30px] h-[16px] rounded-full relative transition-all"
              style={{
                background: caption.show ? "#7c5cfc" : "#1c1c28",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 1,
                  left: caption.show ? 14 : 2,
                  width: 12,
                  height: 12,
                  background: "#fff",
                  borderRadius: "50%",
                  transition: "left 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                }}
              />
            </button>
          </div>

          {/* Text override */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-[#55556a] font-bold">
              Caption Text
            </span>
            <textarea
              value={caption.text || beat.spoken || ""}
              onChange={(e) => updateCaption("text", e.target.value)}
              className="bg-[#16161f] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-3 text-[13px] text-[#e8e8f0] resize-none focus:border-[#7c5cfc] focus:outline-none transition-colors"
              rows={3}
              placeholder="Caption text (defaults to spoken text)"
            />
          </div>

        </div>
      )}

      {/* ── POSITION TAB ── */}
      {tab === "position" && (
        <div className="flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-widest text-[#55556a] font-bold">
            Vertical Position
          </span>
          <div className="flex gap-2 bg-[#16161f] border border-[#ffffff08] rounded-[8px] p-[3px]">
            {POSITIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => updateCaption("position", key)}
                className={`flex-1 text-[11px] font-medium py-[6px] rounded-[6px] capitalize transition-all
                  ${caption.position === key
                    ? "bg-[#1c1c28] text-[#e8e8f0] shadow-sm"
                    : "text-[#55556a] hover:text-[#9494a8]"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}