/**
 * StylePreview — a tiny iconographic "vibe" frame for each visual style, so the
 * Style picker shows the LOOK (layout, type, motif) rather than two colour dots.
 *
 * These are representative mocks, not the literal output palette (actual colours
 * come from the topic + the enforced Theme). Sizing uses container-query units
 * (cqw) against a 260px design width, so every motif scales crisply at any card
 * width while keeping the proportions from the source design.
 */

const BASE = 260;
// u(px) → a cqw string (1cqw = 1% of the card's width). Aspect-ratio is locked,
// so width-relative units scale both dimensions uniformly.
const u = (n) => `${+((n / BASE) * 100).toFixed(2)}cqw`;

const abs = { position: "absolute" };

function Auto() {
  const quad = { ...abs, width: "50%", height: "50%" };
  return (
    <>
      <div style={{ ...quad, left: 0, top: 0, background: "#ece1cf" }} />
      <div style={{ ...quad, right: 0, top: 0, background: "#fff200" }} />
      <div style={{ ...quad, left: 0, bottom: 0, background: "#050505" }} />
      <div style={{ ...quad, right: 0, bottom: 0, background: "#2563eb" }} />
      <div style={{
        ...abs, width: u(70), height: u(70), borderRadius: "50%", background: "#fff",
        left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#7c3aed", fontSize: u(34), fontWeight: 700,
        boxShadow: "0 4px 12px rgba(0,0,0,.18)",
      }}>✦</div>
    </>
  );
}

function Editorial() {
  return (
    <>
      <div style={{ position: "absolute", inset: u(12), border: "1px solid rgba(0,0,0,.15)" }} />
      <div style={{ ...abs, top: u(25), left: u(20), fontFamily: "Georgia, serif", fontWeight: 700,
        fontSize: u(40), lineHeight: 0.9, color: "#2f2418" }}>EDI<br />TORIAL</div>
      <div style={{ ...abs, width: u(140), height: u(2), background: "#8f7a62", left: u(20), top: u(120) }} />
      <div style={{ ...abs, right: u(20), bottom: u(20), padding: `${u(8)} ${u(12)}`,
        border: `${u(2)} solid #c46c21`, color: "#c46c21", fontSize: u(11), transform: "rotate(-8deg)",
        fontWeight: 600, letterSpacing: "0.05em" }}>ARCHIVE</div>
      <div style={{ ...abs, right: u(18), top: u(18), color: "#8f7a62", fontSize: u(12) }}>02</div>
    </>
  );
}

function Minimal() {
  return (
    <>
      <div style={{ ...abs, width: u(34), height: u(34), border: `${u(2)} solid #111`, top: u(40), right: u(40) }} />
      <div style={{ ...abs, width: u(140), height: u(2), background: "#111", left: "50%", top: u(95), transform: "translateX(-50%)" }} />
      <div style={{ ...abs, width: u(6), height: u(6), borderRadius: "50%", background: "#111", bottom: u(30), left: "50%", transform: "translateX(-50%)" }} />
    </>
  );
}

function BoldPop() {
  return (
    <>
      <div style={{
        ...abs, width: u(180), height: u(180), background: "#ff4da6", right: u(-50), top: u(-40),
        clipPath: "polygon(50% 0%,60% 30%,100% 25%,70% 50%,100% 75%,60% 70%,50% 100%,40% 70%,0% 75%,30% 50%,0% 25%,40% 30%)",
      }} />
      <div style={{
        ...abs, left: u(20), top: u(25), width: u(90), height: u(70),
        backgroundImage: "radial-gradient(#000 1.8px, transparent 1.8px)", backgroundSize: `${u(12)} ${u(12)}`,
      }} />
      <div style={{ ...abs, left: u(20), bottom: u(20), fontSize: u(46), fontWeight: 900, lineHeight: 1 }}>⚡</div>
    </>
  );
}

function Cinematic() {
  return (
    <>
      <div style={{ ...abs, left: 0, top: 0, width: "100%", height: u(18), background: "#000" }} />
      <div style={{ ...abs, left: 0, bottom: 0, width: "100%", height: u(18), background: "#000" }} />
      <div style={{ ...abs, width: u(2), height: "100%", left: "50%", transform: "translateX(-50%)",
        background: "linear-gradient(transparent, rgba(255,220,120,.85), transparent)" }} />
      <div style={{ ...abs, width: u(70), height: u(70), borderRadius: "50%", background: "rgba(255,220,120,.16)",
        left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
    </>
  );
}

function Corporate() {
  const bar = (h) => <span style={{ width: u(14), height: u(h), background: "#2563eb", borderRadius: u(3) }} />;
  return (
    <>
      <div style={{ ...abs, width: u(180), height: u(180), borderRadius: "50%", background: "#2563eb", opacity: 0.15, right: u(-80), top: u(-80) }} />
      <div style={{ ...abs, bottom: u(25), left: u(25), display: "flex", gap: u(8), alignItems: "flex-end" }}>
        {bar(25)}{bar(50)}{bar(35)}{bar(70)}
      </div>
      <div style={{ ...abs, width: u(60), height: u(60), borderRadius: "50%", right: u(25), bottom: u(25),
        background: "conic-gradient(#2563eb 0 70%, #dbeafe 70% 100%)" }} />
    </>
  );
}

function Meme() {
  return (
    <>
      <div style={{
        ...abs, inset: 0, opacity: 0.7,
        backgroundImage: "radial-gradient(#00d4ff 4px, transparent 4px), radial-gradient(#ff0080 4px, transparent 4px)",
        backgroundPosition: `${u(20)} ${u(20)}, ${u(70)} ${u(90)}`,
        backgroundSize: `${u(80)} ${u(80)}, ${u(100)} ${u(100)}`,
      }} />
      <div style={{ ...abs, left: u(15), top: u(15), fontWeight: 900, fontSize: u(22), transform: "rotate(-8deg)" }}>BRO?!</div>
      <div style={{ ...abs, right: u(30), top: u(25), fontSize: u(34) }}>↗</div>
      <div style={{ ...abs, left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: u(54) }}>😂</div>
      <div style={{ ...abs, right: u(18), bottom: u(18), fontWeight: 900, fontSize: u(22), transform: "rotate(8deg)" }}>💯🔥</div>
    </>
  );
}

function Sketch() {
  const ink = "#1f2937";
  return (
    <>
      {/* highlighter swipe (behind the headline) */}
      <div style={{ ...abs, left: u(20), top: u(46), width: u(86), height: u(13), background: "rgba(250,204,21,.85)", transform: "rotate(-2deg)", borderRadius: u(2) }} />
      {/* marker headline bars */}
      <div style={{ ...abs, left: u(22), top: u(26), width: u(120), height: u(10), borderRadius: u(5), background: ink }} />
      <div style={{ ...abs, left: u(22), top: u(46), width: u(80), height: u(10), borderRadius: u(5), background: ink }} />
      {/* hand-drawn circle */}
      <div style={{ ...abs, right: u(26), top: u(28), width: u(56), height: u(56), borderRadius: "50%", border: `${u(3)} solid #2563eb`, transform: "rotate(-12deg)" }} />
      {/* doodle arrow */}
      <div style={{ ...abs, right: u(18), bottom: u(28), fontSize: u(40), color: "#ef4444", fontWeight: 700, transform: "rotate(8deg)" }}>↘</div>
      {/* body scribble lines */}
      <div style={{ ...abs, left: u(22), bottom: u(34), width: u(96), height: u(6), borderRadius: u(3), background: "#9ca3af" }} />
      <div style={{ ...abs, left: u(22), bottom: u(22), width: u(70), height: u(6), borderRadius: u(3), background: "#9ca3af" }} />
    </>
  );
}

function Gradient() {
  return (
    <>
      {/* soft glow blob */}
      <div style={{ ...abs, width: u(120), height: u(120), borderRadius: "50%", left: u(-20), bottom: u(-34), background: "rgba(255,255,255,.28)", filter: "blur(10px)" }} />
      {/* frosted glass card */}
      <div style={{
        ...abs, left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: u(150), height: u(92), borderRadius: u(16),
        background: "rgba(255,255,255,.18)", border: `${u(1.5)} solid rgba(255,255,255,.55)`, backdropFilter: "blur(4px)",
        boxShadow: "0 8px 24px rgba(0,0,0,.20)", display: "flex", flexDirection: "column", justifyContent: "center", gap: u(9), padding: `0 ${u(16)}`,
      }}>
        <div style={{ height: u(12), width: "70%", borderRadius: u(6), background: "rgba(255,255,255,.9)" }} />
        <div style={{ height: u(8), width: "45%", borderRadius: u(4), background: "rgba(255,255,255,.6)" }} />
      </div>
    </>
  );
}

// Canonical id → renderer + the card background.
const PREVIEWS = {
  auto:            { render: Auto,      bg: "#fff" },
  editorial_retro: { render: Editorial, bg: "#ece1cf" },
  minimal:         { render: Minimal,   bg: "#fff" },
  bold_pop:        { render: BoldPop,   bg: "#fff200" },
  dark_cinematic:  { render: Cinematic, bg: "radial-gradient(circle at center, rgba(255,220,120,.25), transparent 40%), #040404" },
  corporate_clean: { render: Corporate, bg: "#fff" },
  sketch_notes:    { render: Sketch,    bg: "#fdfcf7" },
  gradient_glow:   { render: Gradient,  bg: "linear-gradient(135deg, #7c3aed, #22d3ee 55%, #ec4899)" },
  meme_chaos:      { render: Meme,      bg: "#f8f8f8" },
};

// Alternate style vocabularies (e.g. the universal set) map onto the closest motif.
const ALIASES = {
  cinematic: "dark_cinematic",
  bold: "bold_pop",
  editorial: "editorial_retro",
  vibrant: "bold_pop",
  corporate: "corporate_clean",
  meme: "meme_chaos",
};

// Readable text colour for the colour-dot fallback.
function readableOn(hex) {
  const c = (hex || "#000000").replace("#", "");
  if (c.length < 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0b0b12" : "#ffffff";
}

export default function StylePreview({ id, colors }) {
  const key = PREVIEWS[id] ? id : ALIASES[id];
  const entry = key && PREVIEWS[key];

  const cardStyle = {
    position: "relative", width: "100%", aspectRatio: "5 / 4", flexShrink: 0, borderRadius: 10,
    overflow: "hidden", marginBottom: 8, containerType: "size",
    boxShadow: "0 6px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.06)",
  };

  if (entry) {
    const Render = entry.render;
    return <div style={{ ...cardStyle, background: entry.bg }}><Render /></div>;
  }

  // Fallback for unknown ids: a simple field + accent-bar frame from the swatch colours.
  const field = colors?.[0] ?? "#1a1a22";
  const accent = colors?.[1] ?? field;
  return (
    <div style={{ ...cardStyle, background: field, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 10px", gap: 5 }}>
      <div style={{ fontSize: u(44), fontWeight: 900, lineHeight: 1, color: readableOn(field), fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.02em" }}>Aa</div>
      <div style={{ height: u(10), width: "42%", borderRadius: u(4), background: accent }} />
    </div>
  );
}
