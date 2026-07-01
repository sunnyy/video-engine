import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { usePlanStore } from "../store/usePlanStore";

/**
 * Explore — the AI Studio home. Hero + search, a Featured row, then every video / image /
 * audio tool as a rich card. Just links to the existing routes (pages kept intact).
 */

const T = {
  bg: "#090b11", surface: "#0e1018", surface2: "#13151f",
  border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a", accent: "#7c5cfc",
};

const SECTIONS = [
  {
    label: "Video Tools", key: "Video",
    items: [
      { emoji: "🎬", label: "Prompt to Video",      desc: "Any idea or topic → a fully designed, narrated video", to: "/ai-video",          accent: "#7c5cfc" },
      { emoji: "🚀", label: "SaaS / Promo Video",   desc: "Turn your product or website into a polished promo",   to: "/promo-video",       accent: "#f97316" },
      { emoji: "🔗", label: "Social Post to Video", desc: "Repurpose a post or link into a ready-to-publish reel", to: "/social-video",      accent: "#22d3ee" },
      { emoji: "📦", label: "Product Video",        desc: "One product photo → a cinematic promo ad",            to: "/product-video",     accent: "#f97316" },
      { emoji: "🔤", label: "Typography Video",     desc: "Bold kinetic-text videos, great on mute",             to: "/typography-video",  accent: "#a855f7" },
      { emoji: "🎙", label: "Talking Head",         desc: "Your clip → auto captions, cuts & B-roll",            to: "/talking-head",      accent: "#34d399" },
      { emoji: "✂️", label: "Video Clipping",       desc: "Long video → AI-picked captioned vertical clips",      to: "/video-clipping",    accent: "#f5c518", proPlus: true },
      { emoji: "📱", label: "App Promo Video",      desc: "App Store / Play link → a promo from its screenshots", to: "/app-video",         accent: "#38bdf8" },
      { emoji: "💬", label: "Auto Captions",        desc: "Add animated, word-synced captions to any video",      to: "/video-captions",    accent: "#f5c518" },
    ],
  },
  {
    label: "Image Tools", key: "Image",
    items: [
      { emoji: "🖼", label: "AI Images",      desc: "Product shots, ad creatives & social visuals", to: "/image-generation", accent: "#a78bfa" },
      { emoji: "🪄", label: "Product Poster", desc: "A luxury ad poster from a product photo",        to: "/product-poster",   accent: "#34d399" },
      { emoji: "🎨", label: "Banner Design",  desc: "Launch-ready banners for any platform",          to: "/banner-design",    accent: "#f5c518" },
      { emoji: "🖱", label: "Thumbnail",      desc: "High-impact, clickable thumbnails",              to: "/thumbnail",        accent: "#f97316" },
      { emoji: "👕", label: "Virtual Try-On", desc: "Show any outfit on any model",                   to: "/virtual-tryon",    accent: "#22d3ee" },
    ],
  },
  {
    label: "Audio Tools", key: "Audio",
    items: [
      { emoji: "🔊", label: "Voiceover / TTS", desc: "Pro-sounding voiceover in 30+ languages",   to: "/voiceover",      accent: "#f472b6" },
      { emoji: "🎙", label: "Speech to Text",  desc: "Accurate transcripts from any audio/video", to: "/speech-to-text", accent: "#22d3ee" },
    ],
  },
];

const FEATURED = [
  { emoji: "🎬", label: "Prompt to Video",    tag: "Most Popular", tagColor: "#a78bfa", desc: "Turn any idea into a fully designed, narrated video", to: "/ai-video",     cta: "Generate Video", accent: "#a78bfa", grad: "linear-gradient(135deg, rgba(124,92,252,0.30), rgba(20,16,42,0.35))" },
  { emoji: "🚀", label: "SaaS / Promo Video", tag: "Popular",      tagColor: "#fb923c", desc: "Turn your product or website into a polished promo",   to: "/promo-video",  cta: "Create Promo",   accent: "#fb923c", grad: "linear-gradient(135deg, rgba(249,115,22,0.24), rgba(32,18,10,0.35))" },
  { emoji: "🎙", label: "Talking Head",       tag: "Creator fave", tagColor: "#34d399", desc: "Your clip → auto captions, cuts & B-roll",            to: "/talking-head", cta: "Create Video",   accent: "#34d399", grad: "linear-gradient(135deg, rgba(52,211,153,0.22), rgba(8,28,20,0.35))" },
];

function IconTile({ emoji, accent, size = 40 }) {
  return (
    <span style={{
      width: size, height: size, flexShrink: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, background: `${accent}1c`, border: `1px solid ${accent}33`,
    }}>{emoji}</span>
  );
}

function ToolCard({ item }) {
  const [hov, setHov] = useState(false);
  const isProPlus = usePlanStore((s) => s.isProPlus);
  const locked = item.proPlus && !isProPlus;
  return (
    <Link
      to={item.to}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
        background: hov ? T.surface2 : T.surface, border: `1px solid ${hov ? item.accent + "55" : T.border}`,
        borderRadius: 14, textDecoration: "none", transition: "all 0.16s", transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 24px rgba(0,0,0,0.35)` : "none",
      }}
    >
      <IconTile emoji={item.emoji} accent={item.accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, fontFamily: "'Outfit',sans-serif", marginBottom: 3, display: "flex", alignItems: "center", gap: 7 }}>
          {item.label}
          {locked && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "#a78bfa", background: "rgba(124,92,252,0.16)", border: "1px solid rgba(124,92,252,0.4)", borderRadius: 5, padding: "1px 5px" }}>🔒 PRO</span>}
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.45 }}>{item.desc}</div>
      </div>
      <span style={{ color: item.accent, fontSize: 16, opacity: hov ? 1 : 0.45, transition: "all 0.16s", transform: hov ? "translateX(2px)" : "none", marginTop: 8 }}>→</span>
    </Link>
  );
}

function FeatureCard({ f }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={f.to}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: 190, padding: "18px 20px", borderRadius: 18, textDecoration: "none",
        background: f.grad, backgroundColor: T.surface, border: `1px solid ${hov ? f.accent + "66" : T.border}`,
        transition: "all 0.18s", transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 16px 40px rgba(0,0,0,0.4)` : "none",
      }}
    >
      <span style={{ position: "absolute", top: -40, right: -30, width: 150, height: 150, borderRadius: "50%", background: `${f.accent}22`, filter: "blur(30px)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: f.tagColor, background: `${f.tagColor}1c`, border: `1px solid ${f.tagColor}44`, borderRadius: 20, padding: "3px 10px" }}>{f.tag}</span>
        <div style={{ fontSize: 25, marginTop: 14 }}>{f.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'Outfit',sans-serif", marginTop: 6 }}>{f.label}</div>
        <div style={{ fontSize: 13, color: "rgba(232,234,240,0.72)", marginTop: 6, lineHeight: 1.45, maxWidth: 260 }}>{f.desc}</div>
      </div>
      <span style={{ position: "relative", marginTop: 16, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: f.accent, color: "#0b0b12", fontWeight: 800, fontSize: 13, padding: "9px 16px", borderRadius: 10, fontFamily: "'Outfit',sans-serif" }}>
        {f.cta} <span style={{ transform: hov ? "translateX(3px)" : "none", transition: "transform 0.16s" }}>→</span>
      </span>
    </Link>
  );
}

function SectionGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {items.map(it => <ToolCard key={it.to} item={it} />)}
    </div>
  );
}

function Heading({ children }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
      {children}
    </div>
  );
}

export default function Explore() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? SECTIONS.flatMap(s => s.items).filter(it => `${it.label} ${it.desc}`.toLowerCase().includes(q))
    : null;

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 40px 90px" }}>

          {/* Hero */}
          <div style={{ position: "relative", display: "flex", gap: 24, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 40 }}>
            <div style={{ flex: "1 1 460px", minWidth: 0 }}>
              <h1 style={{ fontSize: 40, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, lineHeight: 1.1 }}>
                Explore <span style={{ background: "linear-gradient(90deg,#a78bfa,#7c5cfc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>More</span>
              </h1>
              <p style={{ fontSize: 15, color: T.muted, margin: "12px 0 22px", lineHeight: 1.5, maxWidth: 460 }}>
                All the video, image &amp; audio tools you need to create amazing content, faster.
              </p>
              <div style={{ position: "relative", maxWidth: 520 }}>
                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: T.faint, fontSize: 16 }}>⌕</span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="What do you want to create today?"
                  style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px 14px 42px", borderRadius: 12, background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                />
              </div>
            </div>

            {/* Decorative panel (swap for real art later) */}
            <div style={{ flex: "0 0 320px", height: 210, position: "relative", borderRadius: 20, overflow: "hidden", border: `1px solid ${T.border}`, background: "radial-gradient(120% 120% at 80% 10%, rgba(124,92,252,0.35), rgba(14,16,24,0.6))", display: "none" }} className="explore-hero-art">
              <span style={{ position: "absolute", top: 26, left: 30, fontSize: 30, opacity: 0.9 }}>🎬</span>
              <span style={{ position: "absolute", top: 90, right: 40, fontSize: 26, opacity: 0.85 }}>Aa</span>
              <span style={{ position: "absolute", bottom: 30, left: 60, fontSize: 24, opacity: 0.8 }}>🎵</span>
              <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 64, height: 64, borderRadius: "50%", background: "rgba(124,92,252,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 8px 30px rgba(124,92,252,0.5)" }}>▶</span>
            </div>
            <style>{`@media (min-width: 900px){ .explore-hero-art{ display:block !important; } }`}</style>
          </div>

          {results ? (
            <div>
              <Heading>Results <span style={{ color: T.faint, fontWeight: 600 }}>· {results.length}</span></Heading>
              {results.length ? <SectionGrid items={results} /> : <div style={{ color: T.faint, fontSize: 14, padding: "24px 0" }}>No tools match “{query}”.</div>}
            </div>
          ) : (
            <>
              {/* Featured */}
              <div style={{ marginBottom: 36 }}>
                <Heading>Featured Tools ✨</Heading>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  {FEATURED.map(f => <FeatureCard key={f.to} f={f} />)}
                </div>
              </div>

              {/* Sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
                {SECTIONS.map(s => (
                  <div key={s.label}>
                    <Heading>{s.label}</Heading>
                    <SectionGrid items={s.items} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
