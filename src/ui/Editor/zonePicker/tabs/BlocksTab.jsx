/**
 * BlocksTab.jsx  (shown as "Elements" in UI)
 * Two sections:
 *   1. Content Blocks  — fill an entire zone (StatExplosion, QuoteHighlight, …)
 *   2. Overlay Elements — float on top of a beat (Badge, LiveDot, …)
 *
 * Returns:
 *   Block   → { kind: "block",   block:   { type, variant, props } }
 *   Overlay → { kind: "overlay", overlay: { id, type, …defaults } }
 */
import { useState } from "react";
import blockRegistry, { getBlockDefaults } from "../../../../core/blockRegistry";
import { OVERLAY_TYPES, createOverlay }    from "../../../../core/overlayRegistry";
import { BLOCK_THUMBNAILS, OVERLAY_THUMBNAILS } from "./blockThumbnails";

const BLOCK_META = {
  StatExplosion:   { icon: "📊", desc: "Big number with label and badge"  },
  ListCountdown:   { icon: "📋", desc: "Ranked list with progress bars"   },
  QuoteHighlight:  { icon: "💬", desc: "Pull quote with accent line"      },
  BeforeAfter:     { icon: "↔️",  desc: "Before / After comparison"       },
  ProcessSteps:    { icon: "🔢", desc: "Sequential numbered steps"        },
  ProblemSolution: { icon: "✅", desc: "Problem vs solution split"        },
  HookImpact:      { icon: "⚡", desc: "Full-frame headline with CTA"     },
  Slideshow:       { icon: "🖼️",  desc: "Auto-cycling image sequence"     },
};

const OVERLAY_META = {
  HeadlineText:  { desc: "Bold text headline on the beat" },
  Badge:         { desc: "Status badge: LIVE, HOT, BREAKING…" },
  StatCallout:   { desc: "Floating stat with label" },
  HighlightBox:  { desc: "Cream box for key insight" },
  LiveDot:       { desc: "Pulsing live indicator" },
  EmojiFloat:    { desc: "Floating emoji row" },
  ArrowPointer:  { desc: "Animated directional arrow" },
};

function ElementCard({ thumbComponent: Thumb, name, desc, badge, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer rounded-[10px] flex flex-col overflow-hidden transition-all"
      style={{
        border: hovered ? "1.5px solid #7c5cfc" : "1.5px solid rgba(255,255,255,0.07)",
        background: hovered ? "#16163a" : "#111118",
      }}
    >
      {/* Thumbnail */}
      <div style={{ height: 86, background: "#08080f", position: "relative", overflow: "hidden" }}>
        {Thumb && <Thumb />}
        {badge && (
          <div style={{
            position: "absolute", top: 5, right: 5,
            fontSize: 7, fontWeight: 800,
            padding: "2px 5px", borderRadius: 3,
            background: "rgba(124,92,252,0.85)", color: "#fff",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            {badge}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2">
        <div className="text-[12px] font-bold text-[#e8e8f0] truncate">{name}</div>
        <div className="text-[10px] text-[#55556a] mt-[2px] leading-snug line-clamp-2">{desc}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#7c5cfc]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {title}
      </div>
      <div className="text-[10px] font-mono text-[#55556a] bg-[#111118] px-[6px] py-[1px] rounded-[4px]">
        {count}
      </div>
      <div className="flex-1 h-px bg-[rgba(255,255,255,0.05)]" />
    </div>
  );
}

export default function BlocksTab({ onSelect, onClose }) {

  const handleBlock = (type) => {
    const defaults = getBlockDefaults(type);
    const def      = blockRegistry[type];
    onSelect({
      kind:  "block",
      block: { type, variant: def?.variants?.[0] || "default", props: { ...defaults } },
    });
    onClose();
  };

  const handleOverlay = (type) => {
    const overlay = createOverlay(type);
    onSelect({ kind: "overlay", overlay });
    onClose();
  };

  const blockKeys   = Object.keys(blockRegistry);
  const overlayKeys = Object.keys(OVERLAY_META); // only the visual/graphic overlays (not ImageOverlay/VideoOverlay)

  return (
    <div className="overflow-y-auto pb-4">

      {/* ── Content Blocks ── */}
      <SectionHeader title="Content Blocks" count={blockKeys.length} />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {blockKeys.map(type => {
          const meta     = BLOCK_META[type] || { desc: "" };
          const Thumb    = BLOCK_THUMBNAILS[type];
          const variants = blockRegistry[type]?.variants?.length || 1;
          return (
            <ElementCard
              key={type}
              thumbComponent={Thumb}
              name={type}
              desc={meta.desc}
              badge={`${variants} var.`}
              onClick={() => handleBlock(type)}
            />
          );
        })}
      </div>

      {/* ── Overlay Elements ── */}
      <SectionHeader title="Overlay Elements" count={overlayKeys.length} />
      <div className="grid grid-cols-4 gap-3">
        {overlayKeys.map(type => {
          const def   = OVERLAY_TYPES[type];
          const meta  = OVERLAY_META[type] || { desc: "" };
          const Thumb = OVERLAY_THUMBNAILS[type];
          return (
            <ElementCard
              key={type}
              thumbComponent={Thumb}
              name={def?.label || type}
              desc={meta.desc}
              onClick={() => handleOverlay(type)}
            />
          );
        })}
      </div>

    </div>
  );
}
