import { useNavigate } from "react-router-dom";

/* ── Content sections ── */
function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[2px] mb-4" style={{ color: "#f5c518", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </div>
  );
}

const VALUES = [
  { title: "Quality First",    body: "We'd rather do fewer things exceptionally well than many things poorly." },
  { title: "Creator Respect",  body: "Your content, your brand, your control. We build tools, not dependencies." },
  { title: "Honest AI",        body: "AI handles the heavy lifting. You make the final call. Always." },
  { title: "Keep Shipping",    body: "We build in public, improve constantly, and listen to our users." },
];

const WHAT_WE_DO = [
  {
    emoji: "🎬",
    title: "Production, Automated",
    body: "From script to export, every element of your video is produced intelligently — visuals, voice, music, and motion.",
  },
  {
    emoji: "🌍",
    title: "Built for Every Niche",
    body: "17 content categories, each with its own visual identity, tone, and energy. Finance doesn't look like gaming. It never should.",
  },
  {
    emoji: "✏️",
    title: "Always Editable",
    body: "No locked outputs. Every element of every moment is yours to change — text, visuals, timing, everything.",
  },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* Top nav */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0d0d14",
        padding: "0 40px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/about" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#f5c518", textDecoration: "none", padding: "7px 14px", borderRadius: 6 }}>About</a>
          <a href="/#how" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#8888a8", textDecoration: "none", padding: "7px 14px", borderRadius: 6 }}>How It Works</a>
          <a href="/#pricing" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#8888a8", textDecoration: "none", padding: "7px 14px", borderRadius: 6 }}>Pricing</a>
          <button onClick={() => navigate("/dashboard")}
            style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
              background: "#f5c518", color: "#0b0b10", padding: "7px 16px",
              borderRadius: 7, border: "none", cursor: "pointer", marginLeft: 8,
            }}>
            Open App →
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 40px 100px" }}>

        {/* Hero */}
        <section style={{ marginBottom: 96 }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(52px, 8vw, 88px)",
            lineHeight: 1.0,
            letterSpacing: "-0.5px",
            color: "#e8e8f0",
            marginBottom: 24,
          }}>
            Built for Creators.<br />
            Powered by <span style={{ color: "#f5c518" }}>AI.</span>
          </h1>
          <p style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 20,
            color: "#8888a8",
            maxWidth: 560,
            lineHeight: 1.6,
            margin: 0,
          }}>
            Vidquence is an AI creative platform for creators and businesses — videos, ads, posters, voiceovers, and more from one place.
          </p>
        </section>

        {/* Mission */}
        <section style={{ marginBottom: 96 }}>
          <SectionLabel>Our Mission</SectionLabel>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 800,
            color: "#e8e8f0",
            marginBottom: 20,
            letterSpacing: "-0.3px",
          }}>
            Great video shouldn't require a production team.
          </h2>
          <p style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17,
            color: "#8888a8",
            lineHeight: 1.75,
            maxWidth: 680,
            margin: 0,
          }}>
            We believe professional-quality video content should be accessible to everyone — from solo creators growing an audience to businesses scaling their brand. Vidquence was built to close that gap.
          </p>
        </section>

        {/* What We Do */}
        <section style={{ marginBottom: 96 }}>
          <SectionLabel>The Studio</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {WHAT_WE_DO.map(item => (
              <div key={item.title} style={{
                background: "#111118",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "28px 24px",
              }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{item.emoji}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: "#e8e8f0", marginBottom: 10 }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "#8888a8", lineHeight: 1.65 }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section style={{ marginBottom: 96 }}>
          <SectionLabel>Values</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {VALUES.map(v => (
              <div key={v.title} style={{
                background: "#111118",
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: "3px solid #f5c518",
                borderRadius: 12,
                padding: "24px 24px",
              }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 8 }}>
                  {v.title}
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "#8888a8", lineHeight: 1.65 }}>
                  {v.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, color: "#8888a8", marginBottom: 20 }}>
            Have a question or feedback?
          </div>
          <a href="mailto:hello@vidquence.com" style={{
            display: "inline-block",
            background: "#f5c518",
            color: "#0b0b10",
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            padding: "12px 28px",
            borderRadius: 8,
            textDecoration: "none",
          }}>
            hello@vidquence.com
          </a>
        </section>

      </div>
    </div>
  );
}
