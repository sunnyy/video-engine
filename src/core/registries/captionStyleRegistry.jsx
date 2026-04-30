import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

function splitWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Which word index is active at this frame.
 *  If beatDurationMs is provided, intervalMs is calculated from beat duration / word count
 *  so all words complete exactly within the beat. */
function activeIndex(frame, fps, total, intervalMs = 370, overrideIntervalMs = null) {
  // overrideIntervalMs is already ms-per-word, use directly
  const resolvedInterval = overrideIntervalMs || intervalMs;
  const ms = (frame / fps) * 1000;
  return Math.min(Math.floor(ms / resolvedInterval), total - 1);
}

/** Calculate ms-per-word from beat duration and word count.
 *  No clamping — let the beat duration fully control the pace. */
function beatInterval(beatDurationSec, wordCount) {
  if (!beatDurationSec || !wordCount) return null;
  // Spread words evenly across 90% of beat duration (leave 10% buffer at end)
  return (beatDurationSec * 1000 * 0.9) / wordCount;
}

/** Spring from a per-word staggered offset */
function wordSpring(frame, fps, wordIndex, staggerFrames = 8, cfg = {}) {
  return spring({
    frame: Math.max(frame - wordIndex * staggerFrames, 0),
    fps,
    config: { damping: 14, stiffness: 160, mass: 1, ...cfg },
  });
}

/* ─────────────────────────────────────────────────────────────
   1. WORD BLAZE
   Inactive = ghost, active = brand colour + wide glow
   Exactly mirrors the HTML demo
───────────────────────────────────────────────────────────── */
function WordBlaze({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 370, beatInterval(beatDuration, words.length));

  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      {words.map((w, i) => {
        const isActive = i === active;
        const isDone = i < active;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 84,
              letterSpacing: 2,
              lineHeight: 0.9,
              margin: "0 8px",
              color: isActive ? brandColor : isDone ? "rgba(255,255,255,1)" : "rgba(255,255,255,1)",
              textShadow: isActive ? `0 0 30px ${brandColor}, 0 0 60px ${brandColor}60` : "none",
              transform: isActive ? "scale(1.12)" : "scale(1)",
              transition: "color 0.08s, transform 0.08s, text-shadow 0.08s",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. KARAOKE FILL
   Full sentence visible; active word gets a clip-path colour fill
   sweeping left→right using a layered span technique
───────────────────────────────────────────────────────────── */
function KaraokeFill({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const resolvedIntervalMs = beatInterval(beatDuration, words.length) || 420;
  const active = activeIndex(frame, fps, words.length, 420, beatInterval(beatDuration, words.length));

  // How far through the active word's duration are we? (0→1)
  const intervalFrames = (resolvedIntervalMs / 1000) * fps;
  const wordStartFrame = active * intervalFrames;
  const fillProgress = Math.min((frame - wordStartFrame) / (intervalFrames * 0.7), 1);

  return (
    <div style={{ textAlign: "center", lineHeight: 1.2 }}>
      {words.map((w, i) => {
        const isActive = i === active;
        const isDone = i < active;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              position: "relative",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 70,
              fontWeight: 800,
              letterSpacing: -1,
              margin: "0 6px",
              color: isDone ? "rgba(255,255,255,.65)" : isActive ? "#fff" : "rgba(255,255,255,.2)",
            }}
          >
            {w}
            {/* Colour-fill layer sweeping L→R */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  color: brandColor,
                  overflow: "hidden",
                  width: `${fillProgress * 100}%`,
                  whiteSpace: "nowrap",
                }}
              >
                {w}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. STACK REVEAL
   Lines flip in from below using 3D rotateX perspective
───────────────────────────────────────────────────────────── */
function StackReveal({ text, frame, fps, brandColor, beatDuration }) {
  // Split into lines of ~2–3 words
  const words = splitWords(text);
  const chunkSize = Math.ceil(words.length / 3);
  const lines = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    lines.push(words.slice(i, i + chunkSize).join(" "));
  }

  // Which word to highlight (second word of line 0)
  const STAGGER = 14;

  return (
    <div style={{ textAlign: "center", perspective: 600, lineHeight: 1.15 }}>
      {lines.map((line, i) => {
        const p = wordSpring(frame, fps, i, STAGGER, { damping: 12, stiffness: 140 });
        const rotX = interpolate(p, [0, 1], [-70, 0]);
        const y = interpolate(p, [0, 1], [60, 0]);
        const parts = line.split(" ");

        return (
          <div
            key={i}
            style={{
              display: "block",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "block",
                fontFamily: "'Unbounded', sans-serif",
                fontSize: 60,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: -0.02 * 40,
                opacity: p,
                transform: `translateY(${y}px) rotateX(${rotX}deg)`,
                transformOrigin: "top center",
              }}
            >
              {parts.map((part, pi) => (
                <span key={pi} style={{ color: pi === 1 ? "#ffd60a" : "#fff", margin: "0 4px" }}>
                  {part}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   4. MARKER PEN
   Words appear one-by-one; active word gets a yellow background
   that sweeps in like a real marker stroke
───────────────────────────────────────────────────────────── */
function MarkerPen({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 390, beatInterval(beatDuration, words.length));

  const intervalFrames = ((beatInterval(beatDuration, words.length) || 390) / 1000) * fps;
  const wordStartFrame = active * intervalFrames;
  const sweepProgress = Math.min((frame - wordStartFrame) / (intervalFrames * 0.5), 1);

  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      {words.map((w, i) => {
        const isActive = i === active;
        const isVisible = i <= active;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              position: "relative",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 68,
              fontWeight: 900,
              letterSpacing: -0.5,
              margin: "0 4px",
              padding: "2px 8px",
              color: isActive ? "#1a1a1a" : isVisible ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.18)",
              zIndex: 1,
            }}
          >
            {/* Marker sweep background */}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  inset: "-4px -8px",
                  background: brandColor || "#ffd700",
                  borderRadius: "4px 10px 8px 6px / 8px 6px 10px 4px",
                  zIndex: -1,
                  transform: "rotate(-0.5deg)",
                  transformOrigin: "left center",
                  width: `${sweepProgress * 100}%`,
                  overflow: "hidden",
                }}
              />
            )}
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   5. GLITCH STAMP
   Active word crashes in from large+blur with chromatic split
   then snaps clean. Inactive words are ghost.
───────────────────────────────────────────────────────────── */
function GlitchStamp({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 400, beatInterval(beatDuration, words.length));

  const intervalFrames = ((beatInterval(beatDuration, words.length) || 400) / 1000) * fps;

  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      {words.map((w, i) => {
        const isActive = i === active;
        const isDone = i < active;

        // Per-word local frame since this word became active
        const wordLocalFrame = Math.max(frame - i * intervalFrames, 0);
        const glitchFrames = Math.round(fps * 0.35); // 350ms glitch window
        const settled = wordLocalFrame > glitchFrames;

        const entryP = spring({
          frame: Math.min(wordLocalFrame, glitchFrames),
          fps,
          config: { damping: 14, stiffness: 200 },
        });

        // Chromatic offset — decays over glitch window
        const glitchOffset =
          isActive && !settled
            ? interpolate(wordLocalFrame, [0, glitchFrames], [6, 0], { extrapolateRight: "clamp" })
            : 0;
        const chromaOpacity =
          isActive && !settled ? interpolate(wordLocalFrame, [0, glitchFrames * 0.6, glitchFrames], [0.8, 0.5, 0]) : 0;

        const scale = isActive ? interpolate(entryP, [0, 1], [1.5, 1]) : 1;
        const blur =
          isActive && !settled
            ? interpolate(wordLocalFrame, [0, glitchFrames], [8, 0], { extrapolateRight: "clamp" })
            : 0;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              position: "relative",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -1,
              margin: "0 6px",
              color: isActive ? "#fff" : isDone ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.15)",
              transform: `scale(${scale})`,
              filter: `blur(${blur}px)`,
            }}
          >
            {/* Red chroma layer */}
            {isActive && chromaOpacity > 0 && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  color: "#ff003c",
                  opacity: chromaOpacity,
                  transform: `translateX(-${glitchOffset}px)`,
                  pointerEvents: "none",
                }}
              >
                {w}
              </span>
            )}
            {/* Cyan chroma layer */}
            {isActive && chromaOpacity > 0 && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  color: "#00f7ff",
                  opacity: chromaOpacity,
                  transform: `translateX(${glitchOffset}px)`,
                  pointerEvents: "none",
                }}
              >
                {w}
              </span>
            )}
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   6. EDITORIAL SERIF
   Light bg, Playfair Display italic, active word lifts + italics
───────────────────────────────────────────────────────────── */
function EditorialSerif({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 450, beatInterval(beatDuration, words.length));

  return (
    <div
      style={{
        // ✅ Light background baked into the style itself
        background: "linear-gradient(160deg,#f5f3ee,#e8e4db)",
        padding: "20px 24px",
        borderRadius: 4,
        width: "100%",
      }}
    >
      <div
        style={{
          borderLeft: "4px solid #222",
          paddingLeft: 28,
          textAlign: "left",
          lineHeight: 1.2,
        }}
      >
        {words.map((w, i) => {
          const isActive = i === active;
          const isDone = i < active;

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: "'Playfair Display', serif",
                fontSize: 52,
                fontWeight: 700,
                margin: "0 6px",
                color: isActive ? "#14120f" : isDone ? "rgba(20,18,15,.6)" : "rgba(20,18,15,.25)",
                fontStyle: isActive ? "italic" : "normal",
                transform: isActive ? "translateY(-3px)" : "translateY(0)",
                transition: "all 0.12s ease",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   7. NEON TICKER
   Characters appear one-by-one with a blinking cursor, teal glow
───────────────────────────────────────────────────────────── */
function NeonTicker({ text, frame, fps, brandColor, beatDuration }) {
  // 1 char every ~1.5 frames at 30fps ≈ 38ms per char
  const charsPerFrame = fps / 20; // ~1.5 chars per frame
  const visibleChars = Math.floor(frame * charsPerFrame);
  const chars = text.split("").slice(0, visibleChars);

  // Blinking cursor — alternates every 9 frames
  const cursorVisible = Math.floor(frame / 9) % 2 === 0;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 66,
        fontWeight: 700,
        color: "#00e5c3",
        textAlign: "center",
        textShadow: "0 0 8px rgba(0,229,195,.5), 0 0 20px rgba(0,229,195,.25)",
        letterSpacing: "0.02em",
        lineHeight: 1.3,
      }}
    >
      {chars.join("")}
      <span
        style={{
          display: "inline-block",
          width: 3,
          height: "1.1em",
          background: "#00e5c3",
          boxShadow: "0 0 8px #00e5c3",
          verticalAlign: "middle",
          marginLeft: 3,
          opacity: cursorVisible ? 1 : 0,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   8. PILL DROP
   Each word is a spring-dropped pill; active pill fills purple
───────────────────────────────────────────────────────────── */
function PillDrop({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 500, beatInterval(beatDuration, words.length));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 10,
        lineHeight: 1,
      }}
    >
      {words.map((w, i) => {
        const p = wordSpring(frame, fps, i, 9, { damping: 10, stiffness: 160 });
        const y = interpolate(p, [0, 1], [-30, 0]);
        const isActive = i === active;
        const isDone = i < active;

        return (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 70,
              fontWeight: 800,
              padding: "8px 20px",
              borderRadius: 100,
              border: isActive
                ? `2px solid ${brandColor || "#7b61ff"}`
                : isDone
                  ? "2px solid rgba(255,255,255,.12)"
                  : "2px solid rgba(255,255,255,.08)",
              background: isActive ? brandColor || "#7b61ff" : "transparent",
              color: isActive ? "#fff" : isDone ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)",
              boxShadow: isActive ? `0 0 20px ${brandColor || "#7b61ff"}60` : "none",
              transform: `translateY(${y}px) scale(${isActive ? 1.05 : 1})`,
              opacity: p,
              transition: "background 0.12s, color 0.12s, border-color 0.12s, box-shadow 0.12s, transform 0.1s",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   9. BRUTAL SLAM
   Massive Barlow Condensed with stroke; active word slams
   in from scale 1.35 + blur, snaps to red
───────────────────────────────────────────────────────────── */
function BrutalSlam({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 350, beatInterval(beatDuration, words.length));

  const intervalFrames = ((beatInterval(beatDuration, words.length) || 350) / 1000) * fps;

  return (
    <div style={{ textAlign: "center", lineHeight: 1 }}>
      {words.map((w, i) => {
        const isActive = i === active;
        const isDone = i < active;

        const wordLocalFrame = Math.max(frame - i * intervalFrames, 0);
        const slamDuration = Math.round(fps * 0.18);

        const slamP = spring({
          frame: Math.min(wordLocalFrame, slamDuration * 2),
          fps,
          config: { damping: 8, stiffness: 300 },
        });

        const scale = isActive ? interpolate(slamP, [0, 1], [1.35, 1]) : 1;
        const blur = isActive ? interpolate(Math.min(wordLocalFrame, slamDuration), [0, slamDuration], [4, 0]) : 0;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1,
              margin: "0 4px",
              color: isActive ? brandColor || "#ff2d55" : isDone ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.12)",
              WebkitTextStroke: isActive ? "2px #000" : isDone ? "0px transparent" : "1.5px rgba(255,255,255,.15)",
              transform: `scale(${scale})`,
              filter: `blur(${blur}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   10. LUXURY GOLD
   Words wipe in left→right one at a time; active word
   gets a bright shimmer that animates continuously
───────────────────────────────────────────────────────────── */
function LuxuryGold({ text, frame, fps, brandColor, beatDuration }) {
  const words = splitWords(text);
  const active = activeIndex(frame, fps, words.length, 480, beatInterval(beatDuration, words.length));
  const intervalFrames = ((beatInterval(beatDuration, words.length) || 480) / 1000) * fps;

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px 30px",
        background: "rgba(255,255,255,.02)",
        border: "1px solid rgba(201,155,60,.15)",
        borderRadius: 6,
        lineHeight: 1.2,
      }}
    >
      {words.map((w, i) => {
        const isActive = i === active;
        const wordLocalFrame = Math.max(frame - i * intervalFrames, 0);
        const wipeDuration = Math.round(fps * 0.4);
        const wipeP = Math.min(wordLocalFrame / wipeDuration, 1);

        if (wipeP <= 0) {
          return (
            <span key={i} style={{ display: "inline-block", margin: "0 6px", opacity: 0 }}>
              {w}
            </span>
          );
        }

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 6px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: -1,
              // ✅ Use solid color instead of gradient clip — works in Remotion
              color: isActive ? "#ffd700" : "#c9a84c",
              textShadow: isActive
                ? "0 0 8px rgba(255,215,0,.5), 0 2px 12px rgba(201,155,60,.4)"
                : "0 1px 4px rgba(100,70,0,.4)",
              opacity: wipeP,
              clipPath: `inset(0 ${(1 - wipeP) * 100}% 0 0)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   REGISTRY — each entry wraps its component in a render fn
   so Caption.jsx can call style.render({ text, frame, fps, brandColor })
───────────────────────────────────────────────────────────── */
export const captionStyleRegistry = {
  wordBlaze: {
    label: "Word Blaze",
    render: (props) => <WordBlaze {...props} />,
  },

  karaokeFill: {
    label: "Karaoke Fill",
    render: (props) => <KaraokeFill {...props} />,
  },

  stackReveal: {
    label: "Stack Reveal",
    render: (props) => <StackReveal {...props} />,
  },

  markerPen: {
    label: "Marker Pen",
    render: (props) => <MarkerPen {...props} />,
  },

  glitchStamp: {
    label: "Glitch Stamp",
    render: (props) => <GlitchStamp {...props} />,
  },

  editorialSerif: {
    label: "Editorial Serif",
    render: (props) => <EditorialSerif {...props} />,
  },

  neonTicker: {
    label: "Neon Ticker",
    render: (props) => <NeonTicker {...props} />,
  },

  pillDrop: {
    label: "Pill Drop",
    render: (props) => <PillDrop {...props} />,
  },

  brutalSlam: {
    label: "Brutal Slam",
    render: (props) => <BrutalSlam {...props} />,
  },

  luxuryGold: {
    label: "Luxury Gold",
    render: (props) => <LuxuryGold {...props} />,
  },
};

export const captionStyleKeys = Object.keys(captionStyleRegistry);
