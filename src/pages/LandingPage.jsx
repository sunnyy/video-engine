/**
 * LandingPage.jsx
 * src/pages/LandingPage.jsx
 *
 * Dark cinematic premium landing page.
 * Add to App.jsx route: <Route path="/" element={<LandingPage />} />
 * Google Fonts needed (already in index.html):
 *   Bebas Neue, Outfit, Cormorant Garamond, Barlow Condensed
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── Scroll reveal hook ─────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ── Noise texture SVG (inline) ─────────────────────────── */
const NoiseBg = () => (
  <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
    <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

/* ── Floating orbs background ───────────────────────────── */
const Orbs = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    <div className="orb orb1" />
    <div className="orb orb2" />
    <div className="orb orb3" />
  </div>
);

/* ── Beat card mock ─────────────────────────────────────── */
const BeatCard = ({ bg, accent, label, sub, delay = 0 }) => (
  <div className="beat-card reveal" style={{ "--delay": `${delay}ms`, "--accent": accent, background: bg }}>
    <div className="beat-card-img" />
    <div className="beat-card-body">
      <div className="beat-card-label">{label}</div>
      <div className="beat-card-sub">{sub}</div>
    </div>
    <div className="beat-card-bar" style={{ background: accent }} />
  </div>
);

/* ── Niche pill ─────────────────────────────────────────── */
const NichePill = ({ label, emoji }) => (
  <div className="niche-pill">
    <span>{emoji}</span>
    <span>{label}</span>
  </div>
);

/* ── Feature card ───────────────────────────────────────── */
const FeatureCard = ({ title, desc, icon, accent, delay = 0 }) => (
  <div className="feature-card reveal" style={{ "--delay": `${delay}ms`, "--accent": accent }}>
    <div className="feature-icon">{icon}</div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-desc">{desc}</p>
  </div>
);

/* ── Plan card ──────────────────────────────────────────── */
const PlanCard = ({ name, price, credits, videos, features, accent, highlight }) => {
  const navigate = useNavigate();
  return (
    <div className={`plan-card reveal ${highlight ? "plan-highlight" : ""}`} style={{ "--accent": accent }}>
      {highlight && <div className="plan-badge">Most Popular</div>}
      <div className="plan-name">{name}</div>
      <div className="plan-price">
        <span className="plan-dollar">$</span>
        <span className="plan-amount">{price}</span>
        <span className="plan-per">/mo</span>
      </div>
      <div className="plan-credits">{credits} credits/month</div>
      <div className="plan-hint">~{videos} full AI videos (30-sec)</div>
      <ul className="plan-features">
        {features.map((f, i) => <li key={i}><span className="plan-check">✓</span>{f}</li>)}
      </ul>
      <button className="plan-btn" onClick={() => navigate("/login")} style={{ background: highlight ? accent : "transparent", borderColor: accent, color: highlight ? "#fff" : accent }}>
        Get Started
      </button>
    </div>
  );
};

/* ── FAQ item ───────────────────────────────────────────── */
const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{q}</span>
        <span className="faq-arrow">{open ? "−" : "+"}</span>
      </div>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
};

/* ── Main page ──────────────────────────────────────────── */
export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const niches = [
    { label: "Entertainment", emoji: "🎬" },
    { label: "Gaming", emoji: "🎮" },
    { label: "Finance", emoji: "💹" },
    { label: "Spiritual", emoji: "🕉️" },
    { label: "Food", emoji: "🍜" },
    { label: "Sports", emoji: "⚡" },
    { label: "Tech", emoji: "🤖" },
    { label: "Lifestyle", emoji: "✨" },
    { label: "Education", emoji: "📚" },
    { label: "Travel", emoji: "🌍" },
    { label: "Health", emoji: "💪" },
    { label: "Comedy", emoji: "😂" },
  ];

  const features = [
    {
      icon: "◈",
      title: "Beat-Based Production",
      desc: "Every second of your video is a deliberate design decision. Our beat system gives each moment its own layout, pacing, and visual identity.",
      accent: "#7c5cfc",
    },
    {
      icon: "◉",
      title: "Niche DNA System",
      desc: "Finance videos look like finance. Gaming looks like gaming. Colors, typography, and energy are automatically matched to your niche.",
      accent: "#00f2ea",
      delay: 100,
    },
    {
      icon: "◍",
      title: "90+ Curated Layouts",
      desc: "Hand-crafted layouts across 10 intent pools — hook, reveal, proof, contrast, stat, testimonial, and more. Not templates. Production blueprints.",
      accent: "#f59e0b",
      delay: 200,
    },
    {
      icon: "▣",
      title: "Talking Head Mode",
      desc: "Upload your footage. The engine decides when to show your face and when to cut to content — beat by beat, automatically.",
      accent: "#ec4899",
      delay: 300,
    },
    {
      icon: "◈",
      title: "AI Image Generation",
      desc: "Context-aware images, not random stock photos. The AI understands what each beat needs and generates accordingly.",
      accent: "#22c55e",
      delay: 400,
    },
    {
      icon: "◉",
      title: "Full Edit Control",
      desc: "Every zone is editable. Move, resize, restyle. Add your own assets. The AI gives you a starting point — you make it yours.",
      accent: "#7c5cfc",
      delay: 500,
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: 29,
      credits: 300,
      videos: 15,
      accent: "#7c5cfc",
      features: [
        "300 credits/month",
        "AI script + beat generation",
        "90+ production layouts",
        "Niche DNA system",
        "Basic export",
        "Email support",
      ],
    },
    {
      name: "Creator",
      price: 49,
      credits: 600,
      videos: 30,
      accent: "#00f2ea",
      highlight: true,
      features: [
        "600 credits/month",
        "Everything in Starter",
        "AI image generation",
        "TTS voice generation",
        "Talking head mode",
        "Priority support",
      ],
    },
    {
      name: "Pro",
      price: 79,
      credits: 1200,
      videos: 60,
      accent: "#f59e0b",
      features: [
        "1200 credits/month",
        "Everything in Creator",
        "Bulk generation",
        "Advanced analytics",
        "Custom brand DNA",
        "Dedicated support",
      ],
    },
  ];

  const faqs = [
    { q: "How is this different from tools like Opus Clip or Pictory?", a: "Those tools either clip existing videos or create basic text-on-video slideshows. We build each second of your video as a produced beat — with its own layout, typography, color story, and visual identity based on your niche. The output looks like a human editor made deliberate design decisions, not an AI generator." },
    { q: "What are credits and how are they used?", a: "Credits are consumed when you use AI features. Base video generation costs 8 credits, AI image generation costs 2 per image, TTS voice costs 5 credits, and export costs 2 credits. A typical full AI 30-second video uses 17-20 credits. Basic videos using your own assets cost far fewer credits." },
    { q: "Can I use my own footage and images?", a: "Yes. You can upload your own images, videos, and talking head footage. The AI generation features are optional — you can use the full production system with your own assets at a much lower credit cost." },
    { q: "What is Talking Head mode?", a: "Upload a recording of yourself talking. The engine intelligently decides which beats should show your face and which should show content visuals — creating a natural talking head video with dynamic cutaways, automatically." },
    { q: "What niches are supported?", a: "Entertainment, gaming, finance, spiritual, food, sports, tech, lifestyle, education, travel, health, skincare, comedy, motivational, news, music, and business. Each niche has its own curated color palette, typography system, and layout preferences." },
    { q: "Can I edit the generated video?", a: "Yes — fully. Every zone in every beat is editable. Move zones, change text, swap images, adjust typography, change colors, add effects. The AI gives you a production-ready starting point that you can refine to perfection." },
  ];

  return (
    <div style={{ background: "#06060e", color: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #06060e;
          --bg2: #0a0a16;
          --purple: #7c5cfc;
          --cyan: #00f2ea;
          --gold: #f59e0b;
          --pink: #ec4899;
          --text: #ffffff;
          --muted: rgba(255,255,255,0.5);
          --border: rgba(255,255,255,0.08);
          --card: rgba(255,255,255,0.03);
          --font-display: 'Bebas Neue', sans-serif;
          --font-body: 'Outfit', sans-serif;
          --font-serif: 'Cormorant Garamond', serif;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          overflow-x: hidden;
        }

        /* ── Orbs ── */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.12;
        }
        .orb1 { width: 800px; height: 800px; background: var(--purple); top: -200px; left: -200px; animation: drift1 20s ease-in-out infinite; }
        .orb2 { width: 600px; height: 600px; background: var(--cyan); top: 40%; right: -150px; animation: drift2 25s ease-in-out infinite; }
        .orb3 { width: 500px; height: 500px; background: var(--pink); bottom: 10%; left: 20%; animation: drift3 18s ease-in-out infinite; }

        @keyframes drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(60px,40px)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,60px)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-50px)} }

        /* ── Reveal animation ── */
        .reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease calc(var(--delay, 0ms)), transform 0.7s ease calc(var(--delay, 0ms)); }
        .reveal.revealed { opacity: 1; transform: none; }

        /* ── Nav ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 60px;
          background: rgba(6,6,14,0.7);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo {
          font-family: var(--font-display);
          font-size: 28px;
          letter-spacing: 3px;
          background: linear-gradient(135deg, #fff 0%, var(--purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-links { display: flex; gap: 36px; }
        .nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; letter-spacing: 0.05em; transition: color 0.2s; }
        .nav-links a:hover { color: #fff; }
        .nav-cta {
          background: var(--purple);
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: opacity 0.2s, transform 0.2s;
        }
        .nav-cta:hover { opacity: 0.85; transform: translateY(-1px); }

        /* ── Hero ── */
        .hero {
          position: relative; z-index: 1;
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 140px 60px 100px;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(124,92,252,0.12);
          border: 1px solid rgba(124,92,252,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 12px;
          letter-spacing: 0.15em;
          color: var(--purple);
          text-transform: uppercase;
          margin-bottom: 32px;
        }
        .hero-eyebrow::before { content: "◈"; }
        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(72px, 10vw, 140px);
          line-height: 0.92;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .hero-title-line2 {
          font-family: var(--font-serif);
          font-style: italic;
          font-size: clamp(60px, 8vw, 110px);
          line-height: 1.0;
          background: linear-gradient(135deg, var(--cyan) 0%, var(--purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: block;
          margin-bottom: 32px;
        }
        .hero-sub {
          font-size: clamp(16px, 2vw, 20px);
          color: var(--muted);
          max-width: 560px;
          line-height: 1.6;
          margin-bottom: 48px;
        }
        .hero-actions { display: flex; gap: 16px; align-items: center; justify-content: center; flex-wrap: wrap; }
        .btn-primary {
          background: var(--purple);
          color: #fff;
          border: none;
          padding: 16px 36px;
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%);
          opacity: 0; transition: opacity 0.2s;
        }
        .btn-primary:hover::after { opacity: 1; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(124,92,252,0.4); }
        .btn-secondary {
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 16px 36px;
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.3); color: #fff; }

        .hero-scroll { margin-top: 48px; color: var(--muted); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .hero-scroll-line { width: 1px; height: 48px; background: linear-gradient(to bottom, var(--purple), transparent); animation: scrollPulse 2s ease-in-out infinite; }
        @keyframes scrollPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }

        /* ── Beat preview strip ── */
        .beat-preview {
          position: relative; z-index: 1;
          padding: 0 0 100px;
          overflow: hidden;
        }
        .beat-strip {
          display: flex; gap: 16px;
          animation: scrollLeft 30s linear infinite;
          width: max-content;
        }
        .beat-strip-wrap { display: flex; gap: 16px; }
        @keyframes scrollLeft { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .beat-card {
          width: 200px; height: 340px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          border: 1px solid var(--border);
          display: flex; flex-direction: column;
        }
        .beat-card-img { flex: 1; background: rgba(255,255,255,0.05); }
        .beat-card-body { padding: 12px; }
        .beat-card-label { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .beat-card-sub { font-size: 11px; color: var(--muted); }
        .beat-card-bar { height: 2px; width: 100%; }

        /* ── Section shared ── */
        section { position: relative; z-index: 1; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 60px; }
        .section-eyebrow {
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--purple); margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-eyebrow::before { content: ""; display: block; width: 24px; height: 1px; background: var(--purple); }
        .section-title {
          font-family: var(--font-display);
          font-size: clamp(48px, 6vw, 80px);
          line-height: 0.95;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }
        .section-sub { font-size: 18px; color: var(--muted); max-width: 520px; line-height: 1.6; }

        /* ── Niche bar ── */
        .niche-section { padding: 60px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); overflow: hidden; }
        .niche-track { display: flex; gap: 12px; animation: scrollLeft 20s linear infinite; width: max-content; }
        .niche-pill {
          display: flex; align-items: center; gap: 8px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 100px;
          padding: 8px 20px;
          font-size: 14px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* ── Problem/Solution ── */
        .problem-section { padding: 120px 0; }
        .problem-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .problem-label {
          font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
          padding: 4px 12px; border-radius: 4px; display: inline-block; margin-bottom: 20px;
        }
        .label-bad { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
        .label-good { background: rgba(124,92,252,0.15); color: var(--purple); border: 1px solid rgba(124,92,252,0.3); }
        .problem-title { font-family: var(--font-display); font-size: 52px; line-height: 0.95; letter-spacing: 1px; margin-bottom: 16px; }
        .problem-desc { color: var(--muted); font-size: 16px; line-height: 1.7; }
        .problem-divider { width: 1px; background: var(--border); height: 100%; }

        /* ── How it works ── */
        .how-section { padding: 120px 0; }
        .how-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-top: 80px; }
        .how-step {
          background: var(--card);
          border: 1px solid var(--border);
          padding: 48px 40px;
          position: relative;
        }
        .how-step:first-child { border-radius: 16px 0 0 16px; }
        .how-step:last-child { border-radius: 0 16px 16px 0; }
        .how-num {
          font-family: var(--font-display);
          font-size: 80px;
          line-height: 1;
          color: rgba(255,255,255,0.06);
          position: absolute;
          top: 24px; right: 24px;
        }
        .how-icon { font-size: 32px; margin-bottom: 24px; }
        .how-title { font-family: var(--font-display); font-size: 32px; letter-spacing: 1px; margin-bottom: 12px; }
        .how-desc { color: var(--muted); font-size: 15px; line-height: 1.6; }
        .how-connector {
          position: absolute; top: 50%; right: -20px;
          width: 40px; height: 1px;
          background: linear-gradient(to right, var(--border), var(--purple));
          z-index: 2;
        }

        /* ── Features ── */
        .features-section { padding: 120px 0; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-top: 80px; }
        .feature-card {
          background: var(--card);
          border: 1px solid var(--border);
          padding: 40px;
          transition: border-color 0.3s, background 0.3s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: var(--accent, var(--purple));
          opacity: 0; transition: opacity 0.3s;
        }
        .feature-card:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon { font-size: 28px; margin-bottom: 20px; color: var(--accent, var(--purple)); }
        .feature-title { font-family: var(--font-display); font-size: 28px; letter-spacing: 1px; margin-bottom: 12px; }
        .feature-desc { color: var(--muted); font-size: 15px; line-height: 1.6; }

        /* ── Stats bar ── */
        .stats-section {
          padding: 80px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; }
        .stat-item { text-align: center; padding: 40px 20px; }
        .stat-num { font-family: var(--font-display); font-size: 64px; letter-spacing: 2px; line-height: 1; margin-bottom: 8px; background: linear-gradient(135deg, #fff 0%, var(--muted) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-label { font-size: 14px; color: var(--muted); letter-spacing: 0.1em; }

        /* ── Pricing ── */
        .pricing-section { padding: 120px 0; }
        .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-top: 80px; align-items: start; }
        .plan-card {
          background: var(--card);
          border: 1px solid var(--border);
          padding: 48px 40px;
          position: relative;
          transition: border-color 0.3s;
        }
        .plan-card:first-child { border-radius: 16px 0 0 16px; }
        .plan-card:last-child { border-radius: 0 16px 16px 0; }
        .plan-highlight {
          background: rgba(124,92,252,0.08);
          border-color: rgba(124,92,252,0.4);
          transform: scaleY(1.02);
          z-index: 1;
        }
        .plan-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--purple);
          color: #fff;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 16px;
          border-radius: 100px;
          white-space: nowrap;
        }
        .plan-name { font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); margin-bottom: 20px; }
        .plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
        .plan-dollar { font-size: 24px; color: var(--muted); }
        .plan-amount { font-family: var(--font-display); font-size: 72px; line-height: 1; letter-spacing: -1px; }
        .plan-per { color: var(--muted); font-size: 16px; }
        .plan-credits { font-size: 14px; color: var(--accent, var(--purple)); margin-bottom: 4px; font-weight: 600; }
        .plan-hint { font-size: 12px; color: var(--muted); margin-bottom: 32px; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 36px; }
        .plan-features li { display: flex; align-items: center; gap: 10px; font-size: 15px; color: rgba(255,255,255,0.8); }
        .plan-check { color: var(--accent, var(--purple)); font-weight: 700; }
        .plan-btn {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: all 0.2s;
          border-width: 1px;
          border-style: solid;
        }
        .plan-btn:hover { opacity: 0.85; transform: translateY(-1px); }

        /* ── FAQ ── */
        .faq-section { padding: 120px 0; }
        .faq-list { margin-top: 80px; display: flex; flex-direction: column; gap: 2px; }
        .faq-item {
          background: var(--card);
          border: 1px solid var(--border);
          padding: 28px 36px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .faq-item:first-child { border-radius: 12px 12px 0 0; }
        .faq-item:last-child { border-radius: 0 0 12px 12px; }
        .faq-item:hover { background: rgba(255,255,255,0.04); }
        .faq-q { display: flex; justify-content: space-between; align-items: center; gap: 24px; font-size: 17px; font-weight: 500; }
        .faq-arrow { color: var(--purple); font-size: 24px; flex-shrink: 0; }
        .faq-a { margin-top: 16px; color: var(--muted); font-size: 15px; line-height: 1.7; }

        /* ── Final CTA ── */
        .cta-section {
          padding: 160px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-section::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 50%, rgba(124,92,252,0.15) 0%, transparent 70%);
        }
        .cta-title { font-family: var(--font-display); font-size: clamp(56px, 8vw, 100px); line-height: 0.92; letter-spacing: 2px; margin-bottom: 24px; position: relative; }
        .cta-sub { font-size: 18px; color: var(--muted); max-width: 480px; margin: 0 auto 48px; line-height: 1.6; position: relative; }

        /* ── Footer ── */
        .footer {
          padding: 60px;
          border-top: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 24px;
        }
        .footer-logo { font-family: var(--font-display); font-size: 22px; letter-spacing: 3px; color: var(--muted); }
        .footer-links { display: flex; gap: 32px; }
        .footer-links a { color: var(--muted); text-decoration: none; font-size: 14px; transition: color 0.2s; }
        .footer-links a:hover { color: #fff; }
        .footer-copy { color: rgba(255,255,255,0.25); font-size: 13px; }

/* ── Responsive ── */
        @media (max-width: 900px) {
          .nav { padding: 16px 24px; }
          .nav-links { display: none; }
          .container { padding: 0 24px; }
          .hero { padding: 120px 24px 80px; }
          .problem-grid { grid-template-columns: 1fr; }
          .how-steps { grid-template-columns: 1fr; }
          .how-step { border-radius: 0 !important; }
          .features-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .plans-grid { grid-template-columns: 1fr; }
          .plan-card { border-radius: 12px !important; transform: none !important; }
          .footer { flex-direction: column; text-align: center; padding: 40px 24px; }
          .cta-section { padding: 100px 24px; }
        }
      `}</style>

      <NoiseBg />
      <Orbs />

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-logo">VIDORA</div>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '0.05em', transition: 'all 0.2s' }} onClick={() => navigate("/login")}>Login</button>
        <button className="nav-cta" onClick={() => navigate("/login")}>Get Early Access</button>
      </nav>

        {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-eyebrow">AI Video Production Studio</div>
        <h1 className="hero-title">
          STOP GENERATING.<br />
          <span className="hero-title-line2">Start Producing.</span>
        </h1>
        <p className="hero-sub">
          The first AI engine that builds every second of your video as a deliberate design decision — not a slideshow, not a clip. A produced video.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate("/login")}>Get Early Access — Free</button>
          <button className="btn-secondary" onClick={() => document.getElementById("how").scrollIntoView({ behavior: "smooth" })}>See How It Works</button>
        </div>
        <div className="hero-scroll">
          <div className="hero-scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── Beat strip ── */}
      <div className="beat-preview">
        <div className="beat-strip">
          <div className="beat-strip-wrap">
            {[
              { bg: "linear-gradient(160deg,#0f0500,#1a0800)", accent: "#ff4500", label: "Hook Beat", sub: "entertainment" },
              { bg: "linear-gradient(160deg,#050510,#0a0a20)", accent: "#7c5cfc", label: "Stat Reveal", sub: "finance" },
              { bg: "linear-gradient(160deg,#00050a,#001a2e)", accent: "#00f2ea", label: "Tech Hook", sub: "tech" },
              { bg: "linear-gradient(160deg,#1a0a00,#2a1200)", accent: "#f59e0b", label: "Proof Beat", sub: "motivational" },
              { bg: "linear-gradient(160deg,#0a0014,#14002a)", accent: "#ec4899", label: "Testimonial", sub: "lifestyle" },
              { bg: "linear-gradient(160deg,#001a00,#002800)", accent: "#22c55e", label: "Visual Rest", sub: "health" },
              { bg: "linear-gradient(160deg,#1a0010,#2a0020)", accent: "#f43f5e", label: "Escalate", sub: "gaming" },
              { bg: "linear-gradient(160deg,#0a0800,#1a1400)", accent: "#fbbf24", label: "Contrast", sub: "spiritual" },
            ].map((c, i) => <BeatCard key={i} {...c} />)}
          </div>
          <div className="beat-strip-wrap" aria-hidden>
            {[
              { bg: "linear-gradient(160deg,#0f0500,#1a0800)", accent: "#ff4500", label: "Hook Beat", sub: "entertainment" },
              { bg: "linear-gradient(160deg,#050510,#0a0a20)", accent: "#7c5cfc", label: "Stat Reveal", sub: "finance" },
              { bg: "linear-gradient(160deg,#00050a,#001a2e)", accent: "#00f2ea", label: "Tech Hook", sub: "tech" },
              { bg: "linear-gradient(160deg,#1a0a00,#2a1200)", accent: "#f59e0b", label: "Proof Beat", sub: "motivational" },
              { bg: "linear-gradient(160deg,#0a0014,#14002a)", accent: "#ec4899", label: "Testimonial", sub: "lifestyle" },
              { bg: "linear-gradient(160deg,#001a00,#002800)", accent: "#22c55e", label: "Visual Rest", sub: "health" },
              { bg: "linear-gradient(160deg,#1a0010,#2a0020)", accent: "#f43f5e", label: "Escalate", sub: "gaming" },
              { bg: "linear-gradient(160deg,#0a0800,#1a1400)", accent: "#fbbf24", label: "Contrast", sub: "spiritual" },
            ].map((c, i) => <BeatCard key={i + 8} {...c} />)}
          </div>
        </div>
      </div>

      {/* ── Niche bar ── */}
      <div className="niche-section">
        <div className="niche-track">
          {[...niches, ...niches].map((n, i) => <NichePill key={i} {...n} />)}
        </div>
      </div>

      {/* ── Problem / Solution ── */}
      <section className="problem-section">
        <div className="container">
          <div className="problem-grid">
            <div className="reveal">
              <div className="problem-label label-bad">Every other tool</div>
              <h2 className="problem-title">Text on video.<br />AI slop.</h2>
              <p className="problem-desc">Generic slideshows. Random stock footage. The same 5 templates dressed up differently. Your audience has seen it. They scroll past it.</p>
            </div>
            <div className="reveal" style={{ "--delay": "150ms" }}>
              <div className="problem-label label-good">Vidora</div>
              <h2 className="problem-title">Produced.<br />Intentional.</h2>
              <p className="problem-desc">Every beat has a layout picked for its intent. Every color chosen for your niche. Every font matched to your energy. The output looks like a designer worked on it. Because a system did.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="how-section" id="how">
        <div className="container">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-title reveal">THREE STEPS.<br />ONE VIDEO.</h2>
          <div className="how-steps">
            {[
              { num: "01", icon: "✦", title: "Enter Your Topic", desc: "Type what your video is about. The AI figures out your niche, tone, energy level, and the emotional arc your video needs." },
              { num: "02", icon: "◈", title: "AI Builds It", desc: "Script, beats, layouts, zone content, colors, typography, audio cues — all generated and assembled into a production-ready video." },
              { num: "03", icon: "▣", title: "Edit & Export", desc: "Every zone is editable. Swap images, refine text, adjust layouts. When it's right, export in full quality." },
            ].map((s, i) => (
              <div key={i} className="how-step reveal" style={{ "--delay": `${i * 150}ms` }}>
                <div className="how-num">{s.num}</div>
                <div className="how-icon">{s.icon}</div>
                <div className="how-title">{s.title}</div>
                <p className="how-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {[
              { num: "90+", label: "Production Layouts" },
              { num: "17", label: "Supported Niches" },
              { num: "14", label: "Typography Systems" },
              { num: "10", label: "Intent Pools" },
            ].map((s, i) => (
              <div key={i} className="stat-item reveal" style={{ "--delay": `${i * 100}ms` }}>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-eyebrow">What's inside</div>
          <h2 className="section-title reveal">BUILT DIFFERENT.<br />AT EVERY LEVEL.</h2>
          <div className="features-grid">
            {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 80} />)}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-section" id="pricing">
        <div className="container">
          <div className="section-eyebrow">Pricing</div>
          <h2 className="section-title reveal">SIMPLE.<br />TRANSPARENT.</h2>
          <p className="section-sub reveal" style={{ "--delay": "100ms" }}>Credits scale with features used. A basic video costs far less than a full AI production.</p>
          <div className="plans-grid">
            {plans.map((p, i) => <PlanCard key={i} {...p} />)}
          </div>
          <p style={{ textAlign: "center", marginTop: 32, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
            All plans include 50 free credits on signup. No credit card required to start.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <div className="container">
          <div className="section-eyebrow">FAQ</div>
          <h2 className="section-title reveal">QUESTIONS<br />ANSWERED.</h2>
          <div className="faq-list">
            {faqs.map((f, i) => <FAQItem key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="cta-section">
        <h2 className="cta-title reveal">YOUR AUDIENCE<br />IS SCROLLING.</h2>
        <p className="cta-sub reveal" style={{ "--delay": "100ms" }}>Stop posting AI slop. Start posting produced content. Get early access today.</p>
        <button className="btn-primary reveal" style={{ "--delay": "200ms", fontSize: 18, padding: "18px 48px" }} onClick={() => navigate("/login")}>
          Get Early Access — Free
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-logo">VIDORA</div>
        <div className="footer-links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refunds">Refund Policy</a>
          <a href="#">Contact</a>
        </div>
        <div className="footer-copy">© 2025 PX Galaxy Studio. All rights reserved.</div>
      </footer>
    </div>
  );
}