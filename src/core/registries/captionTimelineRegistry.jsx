/**
 * captionTimelineRegistry.jsx
 * Pure-React caption renderers for the timeline editor.
 * Components take { text, localTime, duration, brandColor } — no Remotion.
 * localTime = seconds elapsed since this caption chunk started (0 → duration).
 */

/* ── Helpers ───────────────────────────────────────────────── */
function splitWords(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
}

function easeOutElastic(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t1 = Math.min(Math.max(t, 0), 1);
  return 1 + c3 * Math.pow(t1 - 1, 3) + c1 * Math.pow(t1 - 1, 2);
}

function wordEntryProgress(localTime, wordIndex, staggerSec, entryDurSec, easeFn = easeOutCubic) {
  const start = wordIndex * staggerSec;
  return easeFn((localTime - start) / entryDurSec);
}

function activeWordIndex(localTime, duration, wordCount) {
  const secPerWord = duration / wordCount;
  return Math.min(Math.floor(localTime / secPerWord), wordCount - 1);
}

function wordFillProgress(localTime, duration, wordCount, wordIdx) {
  const secPerWord = duration / wordCount;
  const wordStart = wordIdx * secPerWord;
  return Math.min((localTime - wordStart) / (secPerWord * 0.7), 1);
}

/* ── 1. Word Blaze ─────────────────────────────────────────── */
export function WordBlaze({ text, localTime, duration, brandColor = "#f5c518" }) {
  const words = splitWords(text);
  const active = activeWordIndex(localTime, duration, words.length);

  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      {words.map((w, i) => {
        const isActive = i === active;
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
              color: isActive ? brandColor : "currentColor",
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

/* ── 2. Karaoke Fill ───────────────────────────────────────── */
export function KaraokeFill({ text, localTime, duration, brandColor = "#f5c518" }) {
  const words = splitWords(text);
  const active = activeWordIndex(localTime, duration, words.length);
  const fillPct = wordFillProgress(localTime, duration, words.length, active) * 100;

  return (
    <div style={{ textAlign: "center", lineHeight: 1.2 }}>
      {words.map((w, i) => {
        const isActive = i === active;
        const isDone   = i < active;
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
              color: "currentColor",
              opacity: isDone ? 0.65 : isActive ? 1 : 0.2,
            }}
          >
            {w}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  color: brandColor,
                  overflow: "hidden",
                  width: `${fillPct}%`,
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

/* ── 3. Stack Reveal ───────────────────────────────────────── */
export function StackReveal({ text, localTime, duration, brandColor = "#ffd60a" }) {
  const words     = splitWords(text);
  const chunkSize = Math.ceil(words.length / Math.min(words.length, 3));
  const lines     = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    lines.push(words.slice(i, i + chunkSize));
  }
  const staggerSec = (duration * 0.6) / lines.length;
  const entryDur   = duration * 0.35;

  return (
    <div style={{ textAlign: "center", perspective: 600, lineHeight: 1.15 }}>
      {lines.map((lineParts, i) => {
        const p    = wordEntryProgress(localTime, i, staggerSec, entryDur, easeOutCubic);
        const rotX = (1 - p) * -70;
        const y    = (1 - p) * 60;
        return (
          <div key={i} style={{ display: "block", overflow: "hidden" }}>
            <div
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontSize: 60,
                fontWeight: 900,
                opacity: p,
                transform: `translateY(${y}px) rotateX(${rotX}deg)`,
                transformOrigin: "top center",
              }}
            >
              {lineParts.map((part, pi) => (
                <span key={pi} style={{ color: pi === 1 ? brandColor : "currentColor", margin: "0 4px" }}>
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

/* ── 4. Marker Pen ─────────────────────────────────────────── */
export function MarkerPen({ text, localTime, duration, brandColor = "#ffd700" }) {
  const words    = splitWords(text);
  const active   = activeWordIndex(localTime, duration, words.length);
  const sweepPct = wordFillProgress(localTime, duration, words.length, active) * 100;

  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      {words.map((w, i) => {
        const isActive  = i === active;
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
              color: isActive ? "#1a1a1a" : "currentColor",
              opacity: isActive ? 1 : isVisible ? 0.7 : 0.18,
              zIndex: 1,
            }}
          >
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  inset: "-4px -8px",
                  background: brandColor,
                  borderRadius: "4px 10px 8px 6px / 8px 6px 10px 4px",
                  zIndex: -1,
                  transform: "rotate(-0.5deg)",
                  transformOrigin: "left center",
                  width: `${sweepPct}%`,
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

/* ── 5. Glitch Stamp ───────────────────────────────────────── */
export function GlitchStamp({ text, localTime, duration }) {
  const words      = splitWords(text);
  const active     = activeWordIndex(localTime, duration, words.length);
  const secPerWord = duration / words.length;

  return (
    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
      {words.map((w, i) => {
        const isActive       = i === active;
        const isDone         = i < active;
        const wordLocalTime  = Math.max(localTime - i * secPerWord, 0);
        const glitchDur      = 0.3;
        const settled        = wordLocalTime > glitchDur;
        const entryT         = easeOutBack(Math.min(wordLocalTime / 0.15, 1));
        const scale          = isActive ? 1 + (1 - entryT) * 0.5 : 1;
        const blur           = isActive && !settled ? Math.max(0, (1 - wordLocalTime / glitchDur) * 8) : 0;
        const glitchOffset   = isActive && !settled ? Math.max(0, (1 - wordLocalTime / glitchDur) * 6) : 0;
        const chromaOpacity  = isActive && !settled
          ? Math.max(0, (1 - wordLocalTime / (glitchDur * 0.6)) * 0.8)
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
              color: "currentColor",
              opacity: isActive ? 1 : isDone ? 0.5 : 0.15,
              transform: `scale(${scale})`,
              filter: blur > 0 ? `blur(${blur}px)` : "none",
            }}
          >
            {isActive && chromaOpacity > 0 && (
              <span style={{ position: "absolute", inset: 0, color: "#ff003c", opacity: chromaOpacity, transform: `translateX(-${glitchOffset}px)`, pointerEvents: "none" }}>
                {w}
              </span>
            )}
            {isActive && chromaOpacity > 0 && (
              <span style={{ position: "absolute", inset: 0, color: "#00f7ff", opacity: chromaOpacity, transform: `translateX(${glitchOffset}px)`, pointerEvents: "none" }}>
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

/* ── 6. Editorial Serif ────────────────────────────────────── */
export function EditorialSerif({ text, localTime, duration }) {
  const words  = splitWords(text);
  const active = activeWordIndex(localTime, duration, words.length);

  return (
    <div style={{ background: "linear-gradient(160deg,#f5f3ee,#e8e4db)", padding: "20px 24px", borderRadius: 4, width: "100%" }}>
      <div style={{ borderLeft: "4px solid #222", paddingLeft: 28, textAlign: "left", lineHeight: 1.2 }}>
        {words.map((w, i) => {
          const isActive = i === active;
          const isDone   = i < active;
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

/* ── 7. Neon Ticker ────────────────────────────────────────── */
export function NeonTicker({ text, localTime }) {
  const charsPerSec  = 45;
  const visibleCount = Math.min(Math.floor(localTime * charsPerSec), text.length);
  const visible      = text.slice(0, visibleCount);
  const cursorOn     = Math.floor(localTime * 3) % 2 === 0;

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 66,
        fontWeight: 700,
        color: "currentColor",
        textAlign: "center",
        textShadow: "0 0 8px rgba(0,229,195,.5), 0 0 20px rgba(0,229,195,.25)",
        letterSpacing: "0.02em",
        lineHeight: 1.3,
      }}
    >
      {visible}
      <span
        style={{
          display: "inline-block",
          width: 3,
          height: "1.1em",
          background: "#00e5c3",
          boxShadow: "0 0 8px #00e5c3",
          verticalAlign: "middle",
          marginLeft: 3,
          opacity: cursorOn ? 1 : 0,
        }}
      />
    </div>
  );
}

/* ── 8. Pill Drop ──────────────────────────────────────────── */
export function PillDrop({ text, localTime, duration, brandColor = "#7c5cfc" }) {
  const words      = splitWords(text);
  const active     = activeWordIndex(localTime, duration, words.length);
  const staggerSec = (duration * 0.5) / words.length;
  const entryDur   = duration * 0.3;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, lineHeight: 1 }}>
      {words.map((w, i) => {
        const p      = wordEntryProgress(localTime, i, staggerSec, entryDur, easeOutElastic);
        const y      = (1 - Math.min(Math.max(p, 0), 1)) * -30;
        const isActive = i === active;
        const isDone   = i < active;

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
                ? `2px solid ${brandColor}`
                : isDone
                  ? "2px solid rgba(255,255,255,.12)"
                  : "2px solid rgba(255,255,255,.08)",
              background: isActive ? brandColor : "transparent",
              color: isActive ? "#fff" : isDone ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)", // pill bg handles active color; inactive uses white ghost
              boxShadow: isActive ? `0 0 20px ${brandColor}60` : "none",
              transform: `translateY(${y}px) scale(${isActive ? 1.05 : 1})`,
              opacity: Math.min(Math.max(p, 0), 1),
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

/* ── 9. Brutal Slam ────────────────────────────────────────── */
export function BrutalSlam({ text, localTime, duration, brandColor = "#ff2d55" }) {
  const words      = splitWords(text);
  const active     = activeWordIndex(localTime, duration, words.length);
  const secPerWord = duration / words.length;

  return (
    <div style={{ textAlign: "center", lineHeight: 1 }}>
      {words.map((w, i) => {
        const isActive      = i === active;
        const isDone        = i < active;
        const wordLocalTime = Math.max(localTime - i * secPerWord, 0);
        const slamDur       = 0.18;
        const p             = easeOutBack(Math.min(wordLocalTime / slamDur, 1));
        const scale         = isActive ? 1 + (1 - p) * 0.35 : 1;
        const blur          = isActive ? Math.max(0, (1 - wordLocalTime / slamDur) * 4) : 0;

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
              color: isActive ? brandColor : "currentColor",
              opacity: isActive ? 1 : isDone ? 0.6 : 0.12,
              WebkitTextStroke: isActive ? "2px #000" : isDone ? "0px transparent" : "1.5px rgba(255,255,255,.15)",
              transform: `scale(${scale})`,
              filter: blur > 0 ? `blur(${blur}px)` : "none",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ── 10. Luxury Gold ───────────────────────────────────────── */
export function LuxuryGold({ text, localTime, duration }) {
  const words      = splitWords(text);
  const active     = activeWordIndex(localTime, duration, words.length);
  const secPerWord = duration / words.length;
  const wipeDur    = secPerWord * 0.6;

  return (
    <div style={{ textAlign: "center", padding: "20px 30px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(201,155,60,.15)", borderRadius: 6, lineHeight: 1.2 }}>
      {words.map((w, i) => {
        const isActive      = i === active;
        const wordLocalTime = Math.max(localTime - i * secPerWord, 0);
        const wipeP         = Math.min(wordLocalTime / wipeDur, 1);

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
              color: isActive ? "#ffd700" : "#c9a84c",
              textShadow: isActive
                ? "0 0 8px rgba(255,215,0,.5), 0 2px 12px rgba(201,155,60,.4)"
                : "0 1px 4px rgba(100,70,0,.4)",
              opacity: wipeP,
              clipPath: wipeP < 1 ? `inset(0 ${(1 - wipeP) * 100}% 0 0)` : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

export const captionTimelineRegistry = {
  wordBlaze:      WordBlaze,
  karaokeFill:    KaraokeFill,
  stackReveal:    StackReveal,
  markerPen:      MarkerPen,
  glitchStamp:    GlitchStamp,
  editorialSerif: EditorialSerif,
  neonTicker:     NeonTicker,
  pillDrop:       PillDrop,
  brutalSlam:     BrutalSlam,
  luxuryGold:     LuxuryGold,
};

export const captionStyleLabels = {
  wordBlaze:      "Word Blaze",
  karaokeFill:    "Karaoke",
  stackReveal:    "Stack Reveal",
  markerPen:      "Marker Pen",
  glitchStamp:    "Glitch Stamp",
  editorialSerif: "Editorial",
  neonTicker:     "Neon Ticker",
  pillDrop:       "Pill Drop",
  brutalSlam:     "Brutal Slam",
  luxuryGold:     "Luxury Gold",
};

// Accent color per style — used for swatch in the style picker UI
export const captionStyleAccents = {
  wordBlaze:      "#f5c518",
  karaokeFill:    "#f5c518",
  stackReveal:    "#ffd60a",
  markerPen:      "#ffd700",
  glitchStamp:    "#00f7ff",
  editorialSerif: "#14120f",
  neonTicker:     "#00e5c3",
  pillDrop:       "#7c5cfc",
  brutalSlam:     "#ff2d55",
  luxuryGold:     "#ffd700",
};

export const captionStylePresets = {
  wordBlaze: {
    style:      { fontFamily: "'Bebas Neue',sans-serif",       fontSize: 84, fontWeight: "400", color: "#ffffff", textAlign: "center", letterSpacing: 1,      textShadow: "0 0 20px rgba(245,197,24,0.5)" },
    transition: { in: { type: "zoom",       duration: 0.12, intensity: 0.7 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  karaokeFill: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 70, fontWeight: "800", color: "#ffffff", textAlign: "center" },
    transition: { in: { type: "slide-up",   duration: 0.12, intensity: 0.6 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  stackReveal: {
    style:      { fontFamily: "'Unbounded',sans-serif",        fontSize: 58, fontWeight: "900", color: "#ffffff", textAlign: "center" },
    transition: { in: { type: "fade",       duration: 0.15, intensity: 1   }, out: { type: "fade",    duration: 0.1,  intensity: 1   } },
  },
  markerPen: {
    style:      { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 72, fontWeight: "900", color: "#ffffff", textAlign: "center", textShadow: "0 2px 0 rgba(0,0,0,0.5)" },
    transition: { in: { type: "slide-right",duration: 0.12, intensity: 0.5 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  glitchStamp: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 68, fontWeight: "800", color: "#ffffff", textAlign: "center", textShadow: "-2px 0 #ff003c, 2px 0 #00f7ff" },
    transition: { in: { type: "zoom",       duration: 0.08, intensity: 0.9 }, out: { type: "dissolve",duration: 0.1,  intensity: 0.8 } },
  },
  editorialSerif: {
    style:      { fontFamily: "'Playfair Display',serif",      fontSize: 52, fontWeight: "700", color: "#14120f", textAlign: "left",   letterSpacing: 0 },
    transition: { in: { type: "fade",       duration: 0.2,  intensity: 1   }, out: { type: "fade",    duration: 0.15, intensity: 1   } },
  },
  neonTicker: {
    style:      { fontFamily: "'JetBrains Mono',monospace",    fontSize: 62, fontWeight: "700", color: "#00e5c3", textAlign: "center", letterSpacing: "0.04em", textShadow: "0 0 12px rgba(0,229,195,0.7)" },
    transition: { in: { type: "slide-up",   duration: 0.1,  intensity: 0.5 }, out: { type: "dissolve",duration: 0.12, intensity: 0.7 } },
  },
  pillDrop: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 66, fontWeight: "800", color: "#ffffff", textAlign: "center", textShadow: "0 0 20px rgba(124,92,252,0.6)" },
    transition: { in: { type: "slide-down", duration: 0.12, intensity: 0.6 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  brutalSlam: {
    style:      { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 92, fontWeight: "900", color: "#ff2d55", textAlign: "center", letterSpacing: -1,     textShadow: "2px 2px 0 #000, -1px -1px 0 #000" },
    transition: { in: { type: "zoom",       duration: 0.07, intensity: 0.95}, out: { type: "fade",    duration: 0.06, intensity: 1   } },
  },
  luxuryGold: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 56, fontWeight: "800", color: "#ffd700", textAlign: "center", letterSpacing: -0.5,   textShadow: "0 0 16px rgba(255,215,0,0.5)" },
    transition: { in: { type: "dissolve",   duration: 0.2,  intensity: 0.8 }, out: { type: "dissolve",duration: 0.15, intensity: 0.8 } },
  },
};
