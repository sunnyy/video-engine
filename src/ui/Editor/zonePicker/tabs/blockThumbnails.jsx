/**
 * blockThumbnails.jsx
 * Static CSS-only mini-previews for blocks and overlay elements.
 * No Remotion hooks — safe to render anywhere.
 */

/* ─── Shared styles ─── */
const BASE = {
  width: "100%", height: "100%",
  background: "#08080f",
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  overflow: "hidden", padding: 10,
  boxSizing: "border-box",
  fontFamily: "'JetBrains Mono', monospace",
};

/* ═══════════════════════════════════════════
   CONTENT BLOCKS
═══════════════════════════════════════════ */

export function StatExplosionThumb() {
  return (
    <div style={BASE}>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Revenue</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: "#f0e040", lineHeight: 1, letterSpacing: "-1px" }}>$2.4B</div>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Q4 2024</div>
      <div style={{ marginTop: 6, fontSize: 7, color: "#f0e040", border: "1px solid rgba(240,224,64,0.5)", padding: "2px 7px", borderRadius: 3, letterSpacing: "0.08em" }}>↑ 38% YoY</div>
    </div>
  );
}

export function ListCountdownThumb() {
  const items = [
    { label: "Save 10h/week", w: "88%" },
    { label: "3× better results", w: "70%" },
    { label: "Zero learning curve", w: "55%" },
  ];
  return (
    <div style={{ ...BASE, alignItems: "stretch", gap: 6 }}>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Top Reasons</div>
      {items.map((r, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 7, color: "#ddd" }}>{i + 1}. {r.label}</div>
          <div style={{ height: 3, background: "#1e1e2e", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: r.w, background: "#f0e040", borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuoteHighlightThumb() {
  return (
    <div style={{ ...BASE, gap: 4 }}>
      <div style={{ fontSize: 22, color: "#6c47ff", lineHeight: 0.7, alignSelf: "flex-start" }}>"</div>
      <div style={{ fontSize: 8, color: "#e8e8f0", textAlign: "center", lineHeight: 1.4, fontFamily: "'Outfit', sans-serif" }}>
        The best time to start<br />was yesterday.
      </div>
      <div style={{ width: 28, height: 2, background: "#6c47ff", borderRadius: 1, marginTop: 2 }} />
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)" }}>— Unknown</div>
    </div>
  );
}

export function BeforeAfterThumb() {
  return (
    <div style={{ ...BASE, flexDirection: "row", gap: 6 }}>
      {[
        { label: "Before", value: "2h",   desc: "Manual", color: "#ff4d6d", bg: "rgba(255,77,109,0.1)" },
        { label: "After",  value: "0m",   desc: "Automated", color: "#00e5c3", bg: "rgba(0,229,195,0.1)" },
      ].map(s => (
        <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 5, padding: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 6, color: s.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 6, color: "rgba(255,255,255,0.4)" }}>{s.desc}</div>
        </div>
      ))}
    </div>
  );
}

export function ProcessStepsThumb() {
  const steps = ["Define goal", "Build system", "Scale up"];
  return (
    <div style={{ ...BASE, alignItems: "stretch", gap: 5 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#6c47ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#fff", fontWeight: 900, shrink: 0 }}>
            {i + 1}
          </div>
          <div style={{ fontSize: 7, color: "#e8e8f0" }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

export function ProblemSolutionThumb() {
  return (
    <div style={{ ...BASE, gap: 4 }}>
      {[
        { label: "Problem", text: "No traction daily", color: "#ff4d6d", bg: "rgba(255,77,109,0.1)", icon: "✗" },
        { label: "Solution", text: "One strategic post", color: "#00e5c3", bg: "rgba(0,229,195,0.1)", icon: "✓" },
      ].map(s => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, background: s.bg, borderRadius: 5, padding: "5px 8px", width: "100%" }}>
          <div style={{ fontSize: 10, color: s.color }}>{s.icon}</div>
          <div>
            <div style={{ fontSize: 6, color: s.color, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
            <div style={{ fontSize: 7, color: "#e8e8f0" }}>{s.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HookImpactThumb() {
  return (
    <div style={{ ...BASE, background: "#050509", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(255,77,109,0.15) 0%, transparent 70%)" }} />
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Stop scrolling</div>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.5px", textTransform: "uppercase", fontFamily: "'Syne', sans-serif" }}>
        THIS CHANGES<br />EVERYTHING
      </div>
      <div style={{ marginTop: 6, fontSize: 7, color: "#ff4d6d", border: "1px solid rgba(255,77,109,0.4)", padding: "2px 8px", borderRadius: 3 }}>Watch Now →</div>
    </div>
  );
}

export function SlideshowThumb() {
  const cards = [
    { top: 14, left: 8,  rotate: -6, color: "#1a1a2e" },
    { top: 8,  left: 20, rotate: 2,  color: "#16213e" },
    { top: 4,  left: 32, rotate: -2, color: "#0f3460" },
  ];
  return (
    <div style={{ ...BASE, position: "relative" }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 60, height: 40,
          background: c.color,
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.1)",
          top: c.top, left: c.left + 40,
          transform: `rotate(${c.rotate}deg)`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }} />
      ))}
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", marginTop: 44, letterSpacing: "0.08em" }}>Auto-cycling slides</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   OVERLAY ELEMENTS
═══════════════════════════════════════════ */

export function HeadlineTextThumb() {
  return (
    <div style={{ ...BASE }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", textTransform: "uppercase", textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif" }}>
        THIS IS A<br />HEADLINE
      </div>
    </div>
  );
}

export function BadgeThumb() {
  return (
    <div style={{ ...BASE, gap: 6 }}>
      <div style={{ display: "flex", gap: 5 }}>
        {[
          { text: "LIVE",    color: "#ff4d6d" },
          { text: "HOT 🔥",  color: "#f97316" },
        ].map(b => (
          <div key={b.text} style={{ background: b.color, borderRadius: 100, padding: "4px 10px", fontSize: 7, color: "#fff", fontWeight: 800, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCalloutThumb() {
  return (
    <div style={{ ...BASE }}>
      <div style={{ background: "rgba(0,0,0,0.6)", borderLeft: "3px solid #f0e040", padding: "6px 10px", borderRadius: "0 6px 6px 0" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#f0e040", lineHeight: 1 }}>↑ 94%</div>
        <div style={{ fontSize: 6, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>Engagement</div>
      </div>
    </div>
  );
}

export function HighlightBoxThumb() {
  return (
    <div style={{ ...BASE }}>
      <div style={{ background: "rgba(245,243,238,0.92)", borderRadius: 6, padding: "8px 12px", maxWidth: "90%" }}>
        <div style={{ fontSize: 8, color: "#111", textAlign: "center", fontWeight: 700, fontFamily: "'Outfit', sans-serif", lineHeight: 1.4 }}>
          Key insight highlight text
        </div>
      </div>
    </div>
  );
}

export function LiveDotThumb() {
  return (
    <div style={{ ...BASE }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff4d6d", boxShadow: "0 0 0 4px rgba(255,77,109,0.25)" }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: "#ff4d6d", letterSpacing: "0.12em" }}>LIVE</div>
      </div>
    </div>
  );
}

export function EmojiFloatThumb() {
  return (
    <div style={{ ...BASE }}>
      <div style={{ display: "flex", gap: 8, fontSize: 22 }}>❤️🔥😍</div>
    </div>
  );
}

export function ArrowPointerThumb() {
  return (
    <div style={{ ...BASE, gap: 4 }}>
      <svg width={32} height={32} viewBox="0 0 48 48">
        <path d="M8 24 L32 24 M24 12 L36 24 L24 36" stroke="#f0e040" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)" }}>Arrow pointer</div>
    </div>
  );
}

/* ─── Lookup map ─── */
export const BLOCK_THUMBNAILS = {
  StatExplosion:   StatExplosionThumb,
  ListCountdown:   ListCountdownThumb,
  QuoteHighlight:  QuoteHighlightThumb,
  BeforeAfter:     BeforeAfterThumb,
  ProcessSteps:    ProcessStepsThumb,
  ProblemSolution: ProblemSolutionThumb,
  HookImpact:      HookImpactThumb,
  Slideshow:       SlideshowThumb,
};

export const OVERLAY_THUMBNAILS = {
  HeadlineText:  HeadlineTextThumb,
  Badge:         BadgeThumb,
  StatCallout:   StatCalloutThumb,
  HighlightBox:  HighlightBoxThumb,
  LiveDot:       LiveDotThumb,
  EmojiFloat:    EmojiFloatThumb,
  ArrowPointer:  ArrowPointerThumb,
};
