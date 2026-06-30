/**
 * CaptionStylePreview — thumbnails of each caption style so pickers can show the
 * actual look, not just a name.
 *   • CAPTION_PREVIEWS / CaptionStylePreview — static, pure-CSS (no hooks), safe anywhere.
 *   • AnimatedCaptionPreview — drives the real captionStyleRegistry renderers with a
 *     requestAnimationFrame clock so the word-by-word effect actually plays, scaled to fit.
 */
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { captionStyleLabels, captionStyleAccents } from "../../core/registries/captionTimelineRegistry.jsx";
import { captionStyleRegistry } from "../../core/registries/captionStyleRegistry.jsx";

/* ── Static caption-style thumbnails (no Remotion hooks, pure CSS) ── */
export const CAPTION_PREVIEWS = {
  wordBlaze: () => (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 1, textAlign: "center", lineHeight: 1.1 }}>
      <span style={{ color: "rgba(255,255,255,0.9)", margin: "0 3px" }}>YOUR</span>
      <span style={{ color: "#f5c518", margin: "0 3px", textShadow: "0 0 10px #f5c51880" }}>BRAND</span>
      <span style={{ color: "rgba(255,255,255,0.9)", margin: "0 3px" }}>STORY</span>
    </div>
  ),
  karaokeFill: () => (
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, textAlign: "center", lineHeight: 1.2 }}>
      <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 2px" }}>Bold</span>
      <span style={{ position: "relative", display: "inline-block", color: "#fff", margin: "0 2px" }}>
        Move
        <span style={{ position: "absolute", inset: 0, color: "#f5c518", overflow: "hidden", width: "60%", whiteSpace: "nowrap" }}>Move</span>
      </span>
      <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 2px" }}>Today</span>
    </div>
  ),
  editorial: () => (
    <div style={{ fontFamily: "'Playfair Display',serif", textAlign: "center", lineHeight: 1.0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>they don't</div>
      <div style={{ fontSize: 23, fontWeight: 700, fontStyle: "italic", color: "#e8c66a" }}>actually</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#fff" }}>leave</div>
    </div>
  ),
  stackReveal: () => (
    <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 900, textAlign: "center", lineHeight: 1.2 }}>
      <div><span style={{ color: "#fff" }}>STACK</span> <span style={{ color: "#ffd60a" }}>REVEAL</span></div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>STYLE</div>
    </div>
  ),
  markerPen: () => (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 900, textAlign: "center", lineHeight: 1.1 }}>
      <span style={{ color: "rgba(255,255,255,0.6)", margin: "0 2px" }}>BE</span>
      <span style={{ position: "relative", display: "inline-block", color: "#1a1a1a", margin: "0 2px", padding: "0 5px", zIndex: 1 }}>
        <span style={{ position: "absolute", inset: "-2px -5px", background: "#f5c518", borderRadius: "3px 7px 6px 4px", zIndex: -1, transform: "rotate(-0.5deg)" }} />
        SEEN
      </span>
      <span style={{ color: "rgba(255,255,255,0.6)", margin: "0 2px" }}>NOW</span>
    </div>
  ),
  glitchStamp: () => (
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>
      <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 3px" }}>GLITCH</span>
      <span style={{ position: "relative", display: "inline-block", color: "#fff", margin: "0 3px" }}>
        <span style={{ position: "absolute", inset: 0, color: "#ff003c", opacity: 0.7, transform: "translateX(-2px)" }}>STAMP</span>
        <span style={{ position: "absolute", inset: 0, color: "#00f7ff", opacity: 0.7, transform: "translateX(2px)" }}>STAMP</span>
        STAMP
      </span>
      <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 3px" }}>ON</span>
    </div>
  ),
  editorialSerif: () => (
    <div style={{ background: "linear-gradient(160deg,#f5f3ee,#e8e4db)", borderRadius: 3, padding: "6px 8px", textAlign: "left" }}>
      <div style={{ borderLeft: "3px solid #222", paddingLeft: 7 }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: "rgba(20,18,15,0.35)", marginRight: 4 }}>Your</span>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: "#14120f", fontStyle: "italic", marginRight: 4 }}>brand</span>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: "rgba(20,18,15,0.35)" }}>voice</span>
      </div>
    </div>
  ),
  neonTicker: () => (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: "#00e5c3", textAlign: "center", textShadow: "0 0 8px rgba(0,229,195,0.6)", letterSpacing: "0.04em" }}>
      TYPING_
      <span style={{ display: "inline-block", width: 2, height: "1em", background: "#00e5c3", boxShadow: "0 0 6px #00e5c3", verticalAlign: "middle", marginLeft: 2 }} />
    </div>
  ),
  pillDrop: () => (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
      {["PILL", "DROP", "NOW"].map((w, i) => (
        <span key={w} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 100, border: `1.5px solid ${i === 1 ? "#7c5cfc" : "rgba(255,255,255,0.15)"}`, background: i === 1 ? "#7c5cfc" : "transparent", color: i === 1 ? "#fff" : "rgba(255,255,255,0.4)", boxShadow: i === 1 ? "0 0 10px #7c5cfc60" : "none" }}>
          {w}
        </span>
      ))}
    </div>
  ),
  brutalSlam: () => (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: -1, textAlign: "center", lineHeight: 1 }}>
      <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>SLAM</span>
      <span style={{ color: "#ff2d55", margin: "0 2px", WebkitTextStroke: "1px #000" }}>IT</span>
      <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>NOW</span>
    </div>
  ),
  luxuryGold: () => (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,155,60,0.2)", borderRadius: 4, padding: "5px 8px", textAlign: "center" }}>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: "#ffd700", textShadow: "0 0 8px rgba(255,215,0,0.4)", letterSpacing: -0.5 }}>LUXURY</span>
      {" "}
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: "#c9a84c", letterSpacing: -0.5 }}>GOLD</span>
    </div>
  ),
};

/** A single caption-style thumbnail rendered on a dark "video" stage. */
export function CaptionStylePreview({ styleKey, height = 64 }) {
  const Fn = CAPTION_PREVIEWS[styleKey];
  return (
    <div style={{ height, background: "#0a0a10", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", overflow: "hidden" }}>
      {Fn ? <Fn /> : <span style={{ color: "#6b6b82", fontSize: 12 }}>{captionStyleLabels[styleKey] || styleKey}</span>}
    </div>
  );
}

/* ── Animated preview: plays the real renderer on a looping rAF clock ── */
const FPS = 30;
const BEAT = 2.2;                              // seconds the words spread across
const LOOP_FRAMES = Math.round(FPS * 2.9);     // loop length (beat + brief hold)
const DESIGN_W = 940;                          // wide stage so the sample fits on one line; we scale down to fit
const SAMPLE = "Your story rocks";

export function AnimatedCaptionPreview({ styleKey, height = 80 }) {
  const entry = captionStyleRegistry[styleKey];
  const boxRef = useRef(null);
  const rafRef = useRef();
  const [frame, setFrame] = useState(0);
  const [scale, setScale] = useState(0.42);

  useLayoutEffect(() => {
    const measure = () => {
      const w = boxRef.current?.clientWidth;
      if (w) setScale(w / DESIGN_W);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    let start = null;
    const tick = (t) => {
      if (start == null) start = t;
      setFrame(Math.floor(((t - start) / 1000) * FPS) % LOOP_FRAMES);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [styleKey]);

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%", height, background: "#0a0a10", borderRadius: 8, overflow: "hidden" }}>
      {/* Absolutely positioned so the un-scaled 600px width never forces the grid track wide */}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: DESIGN_W, transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: "center center", display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}>
        {entry
          ? entry.render({ text: SAMPLE, frame, fps: FPS, brandColor: captionStyleAccents[styleKey] || "#f5c518", beatDuration: BEAT })
          : null}
      </div>
    </div>
  );
}

export default CaptionStylePreview;
