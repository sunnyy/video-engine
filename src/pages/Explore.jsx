import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../ui/AppLayout";

/**
 * Explore — home for the Image & Audio tools that don't fit the video chatbox hub.
 * Just links to the existing routes/pages (kept intact).
 */

const T = { bg: "#090b11", surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", faint: "#55667a" };

const SECTIONS = [
  {
    label: "Image",
    items: [
      { emoji: "🖼", label: "AI Images",      desc: "Product shots, ad creatives & social visuals", to: "/image-generation", accent: "#a78bfa" },
      { emoji: "🪄", label: "Product Poster", desc: "A luxury ad poster from a product photo",        to: "/product-poster",   accent: "#34d399" },
      { emoji: "🎨", label: "Banner Design",  desc: "Launch-ready banners for any platform",          to: "/banner-design",    accent: "#f5c518" },
      { emoji: "🖱", label: "Thumbnail",      desc: "High-impact, clickable thumbnails",              to: "/thumbnail",        accent: "#f97316" },
      { emoji: "👕", label: "Virtual Try-On", desc: "Show any outfit on any model",                   to: "/virtual-tryon",    accent: "#22d3ee" },
    ],
  },
  {
    label: "Audio",
    items: [
      { emoji: "🔊", label: "Voiceover / TTS", desc: "Pro-sounding voiceover in 30+ languages", to: "/voiceover",      accent: "#f472b6" },
      { emoji: "🎙", label: "Speech to Text",  desc: "Accurate transcripts from any audio/video", to: "/speech-to-text", accent: "#22d3ee" },
    ],
  },
];

function ToolCard({ item }) {
  const [hov, setHov] = useState(false);
  const glow = item.accent + "18";
  return (
    <Link
      to={item.to}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `linear-gradient(140deg, ${glow}, ${T.surface} 60%)` : T.surface,
        border: `1px solid ${hov ? item.accent + "55" : T.border}`, borderRadius: 14, padding: "16px 18px",
        cursor: "pointer", transition: "all 0.18s", transform: hov ? "translateY(-2px)" : "none",
        display: "flex", flexDirection: "column", gap: 10, textDecoration: "none",
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1 }}>{item.emoji}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: hov ? item.accent : T.text, fontFamily: "'Outfit',sans-serif", marginBottom: 4, transition: "color 0.18s" }}>{item.label}</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{item.desc}</div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: item.accent, opacity: hov ? 1 : 0.5, transition: "opacity 0.18s" }}>Open →</div>
    </Link>
  );
}

export default function Explore() {
  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ padding: "40px 40px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 6px" }}>Explore</h1>
          <p style={{ fontSize: 14, color: T.muted, margin: "0 0 28px" }}>Image & audio tools to go with your videos.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {SECTIONS.map(section => (
              <div key={section.label}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: T.faint, fontFamily: "'JetBrains Mono',monospace", marginBottom: 14 }}>
                  {section.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {section.items.map(item => <ToolCard key={item.to} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
