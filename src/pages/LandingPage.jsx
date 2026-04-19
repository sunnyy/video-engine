/**
 * LandingPage.jsx — src/pages/LandingPage.jsx
 * Vidquence — Dark + Yellow. Bento grid. Container-based. No internals exposed.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle, getSession } from "../services/auth/authService";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = "1";
          e.target.style.transform = "translateY(0) scale(1)";
        }
      }),
      { threshold: 0.08 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "22px 0", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "#c8c8d8", fontWeight: 500, lineHeight: 1.5 }}>{q}</span>
        <span style={{ color: "#f5c518", fontSize: 22, flexShrink: 0, fontWeight: 300, lineHeight: 1, width: 24, textAlign: "center" }}>{open ? "−" : "+"}</span>
      </div>
      {open && <div style={{ marginTop: 14, fontFamily: "var(--font-body)", fontSize: 16, color: "#8888a8", lineHeight: 1.75 }}>{a}</div>}
    </div>
  );
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  :root {
    --bg: #0b0b10; --bg2: #0f0f16; --card: #111118; --card2: #13131c;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.04);
    --yellow: #f5c518; --yellow-dim: rgba(245,197,24,0.12); --yellow-glow: rgba(245,197,24,0.06);
    --text: #e8e8f0; --muted: #8888a8; --dim: #606078;
    --font-display: 'Bebas Neue', sans-serif;
    --font-body: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 16px; --container: 1160px;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  body::after { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); opacity: 0.02; pointer-events: none; z-index: 9999; }
  .container { max-width: var(--container); margin: 0 auto; padding: 0 40px; }
  @media (max-width: 768px) { .container { padding: 0 20px; } }

  /* NAV */
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: rgba(11,11,16,0.9); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border2); height: 60px; }
  .nav-inner { max-width: var(--container); margin: 0 auto; padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
  @media (max-width: 768px) { .nav-inner { padding: 0 20px; } }
  .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .nav-logo-box { width: 30px; height: 20px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 13px; color: #0b0b10; border-radius: 3px; letter-spacing: 0.5px; }
  .nav-logo-text { font-family: var(--font-display); font-size: 19px; letter-spacing: 2px; color: var(--text); }
  .nav-right { display: flex; align-items: center; gap: 8px; }
  .nav-link { font-family: var(--font-body); font-size: 13px; color: var(--muted); text-decoration: none; padding: 7px 14px; border-radius: 6px; transition: color 0.2s; }
  .nav-link:hover { color: var(--text); }
  .btn-ghost { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 7px; padding: 8px 16px; cursor: pointer; transition: border-color 0.2s; }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.25); }
  .btn-yellow { font-family: var(--font-body); font-size: 13px; font-weight: 700; color: #0b0b10; background: var(--yellow); border: none; border-radius: 7px; padding: 9px 18px; cursor: pointer; transition: opacity 0.2s; }
  .btn-yellow:hover { opacity: 0.85; }

  /* HERO */
  .hero { padding: 140px 0 90px; position: relative; overflow: hidden; }
  .hero-grid-bg { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%); }
  .hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; pointer-events: none; background: radial-gradient(circle, rgba(245,197,24,0.07) 0%, transparent 65%); }
  .hero-inner { position: relative; z-index: 1; text-align: center; max-width: 840px; margin: 0 auto; }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.2); border-radius: 100px; padding: 6px 16px; margin-bottom: 36px; font-family: var(--font-mono); font-size: 11px; color: var(--yellow); letter-spacing: 2px; text-transform: uppercase; }
  .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .hero-h1 { font-family: var(--font-display); font-size: clamp(60px, 9vw, 116px); line-height: 0.89; letter-spacing: -1px; color: var(--text); margin-bottom: 28px; }
  .hero-h1 .yellow { color: var(--yellow); }
  .hero-h1 .outline { -webkit-text-stroke: 1.5px rgba(255,255,255,0.18); color: transparent; }
  .hero-sub { font-family: var(--font-body); font-size: 20px; color: var(--muted); line-height: 1.65; max-width: 500px; margin: 0 auto 48px; }
  .hero-actions { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
  .hero-cta { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: #0b0b10; background: var(--yellow); border: none; border-radius: 10px; padding: 16px 36px; cursor: pointer; transition: opacity 0.2s; }
  .hero-cta:hover { opacity: 0.85; }
  .hero-cta-ghost { font-family: var(--font-body); font-size: 15px; font-weight: 600; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 10px; padding: 15px 28px; cursor: pointer; transition: border-color 0.2s; }
  .hero-cta-ghost:hover { border-color: rgba(255,255,255,0.3); }
  .hero-proof { margin-top: 20px; font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 1px; }

  /* TICKER */
  .ticker-section { padding: 36px 0; border-top: 1px solid var(--border2); border-bottom: 1px solid var(--border2); overflow: hidden; background: var(--bg2); }
  .ticker-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); text-align: center; margin-bottom: 18px; }
  .ticker-track { display: flex; animation: ticker 28s linear infinite; width: max-content; }
  .ticker-track:hover { animation-play-state: paused; }
  .ticker-item { display: flex; align-items: center; gap: 24px; padding: 0 28px; font-family: var(--font-mono); font-size: 12px; color: var(--dim); white-space: nowrap; letter-spacing: 1px; text-transform: uppercase; }
  .ticker-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--yellow); opacity: 0.4; flex-shrink: 0; }
  @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }

  /* STATS */
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius); overflow: hidden; }
  @media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } }
  .stat-cell { background: var(--card); padding: 44px 40px; text-align: center; }
  .stat-num { font-family: var(--font-display); font-size: 60px; color: var(--yellow); line-height: 1; letter-spacing: -2px; margin-bottom: 8px; }
  .stat-label { font-family: var(--font-body); font-size: 15px; color: var(--muted); }

  /* SECTION */
  .section { padding: 90px 0; }
  .section-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--yellow); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .section-label::before { content: ''; width: 24px; height: 1px; background: var(--yellow); }
  .section-h { font-family: var(--font-display); font-size: clamp(38px, 5vw, 68px); line-height: 0.93; color: var(--text); letter-spacing: -0.5px; margin-bottom: 16px; }
  .section-h .yellow { color: var(--yellow); }
  .section-sub { font-family: var(--font-body); font-size: 18px; color: var(--muted); line-height: 1.65; max-width: 480px; }

  /* BENTO */
  .bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; margin-top: 60px; }
  @media (max-width: 900px) { .bento { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .bento { grid-template-columns: 1fr; } }
  .bento-card { background: var(--card); border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; position: relative; transition: border-color 0.25s, transform 0.25s; }
  .bento-card:hover { border-color: rgba(245,197,24,0.2); transform: translateY(-2px); }
  .bc-1 { grid-column: span 5; } .bc-2 { grid-column: span 4; } .bc-3 { grid-column: span 3; }
  .bc-4 { grid-column: span 7; } .bc-5 { grid-column: span 5; }
  @media (max-width: 900px) { .bc-1,.bc-2,.bc-3,.bc-4,.bc-5 { grid-column: span 1; } }
  .bcard-accent-bar { height: 2px; background: transparent; transition: background 0.3s; }
  .bento-card:hover .bcard-accent-bar { background: var(--yellow); }
  .bcard-body { padding: 24px 28px; }
  .bcard-tag { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); margin-bottom: 10px; }
  .bcard-title { font-family: var(--font-body); font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 8px; line-height: 1.3; }
  .bcard-desc { font-family: var(--font-body); font-size: 15px; color: var(--muted); line-height: 1.65; }
  .pill { font-family: var(--font-body); font-size: 12px; color: var(--muted); background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 100px; padding: 5px 14px; display: inline-block; margin: 4px; }
  .pill.active { color: #0b0b10; background: var(--yellow); border-color: var(--yellow); font-weight: 700; }

  /* PROCESS */
  .process { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius); overflow: hidden; margin-top: 60px; }
  @media (max-width: 700px) { .process { grid-template-columns: 1fr; } }
  .process-step { background: var(--card); padding: 44px 36px; position: relative; transition: background 0.2s; }
  .process-step:hover { background: var(--card2); }
  .process-step::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: transparent; transition: background 0.2s; }
  .process-step:hover::after { background: var(--yellow); }
  .process-num { font-family: var(--font-display); font-size: 80px; color: rgba(245,197,24,0.08); line-height: 1; margin-bottom: 20px; letter-spacing: -3px; }
  .process-title { font-family: var(--font-body); font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
  .process-desc { font-family: var(--font-body); font-size: 16px; color: var(--muted); line-height: 1.7; }

  /* SHOWCASE */
  .showcase-section { padding: 90px 0; background: var(--bg2); border-top: 1px solid var(--border2); border-bottom: 1px solid var(--border2); }
  .showcase-frame { margin-top: 50px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; box-shadow: 0 40px 120px rgba(0,0,0,0.5); }
  .showcase-bar { height: 40px; background: #0e0e18; display: flex; align-items: center; padding: 0 16px; gap: 8px; border-bottom: 1px solid var(--border2); }
  .showcase-dot { width: 10px; height: 10px; border-radius: 50%; }
  .showcase-title { font-family: var(--font-mono); font-size: 11px; color: var(--dim); margin: 0 auto; letter-spacing: 1px; }
  .showcase-body { padding: 28px; display: grid; grid-template-columns: 240px 1fr; gap: 20px; min-height: 400px; }
  @media (max-width: 700px) { .showcase-body { grid-template-columns: 1fr; } }
  .showcase-sidebar { display: flex; flex-direction: column; gap: 8px; }
  .showcase-sb-item { background: var(--bg2); border: 1px solid var(--border2); border-radius: 10px; padding: 13px 16px; display: flex; align-items: center; gap: 12px; cursor: default; }
  .showcase-sb-item.active { border-color: rgba(245,197,24,0.3); background: var(--yellow-dim); }
  .showcase-sb-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dim); flex-shrink: 0; }
  .showcase-sb-item.active .showcase-sb-dot { background: var(--yellow); }
  .showcase-sb-label { font-family: var(--font-body); font-size: 13px; color: var(--muted); }
  .showcase-sb-item.active .showcase-sb-label { color: var(--text); }
  .showcase-main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .showcase-beat { background: var(--bg2); border: 1px solid var(--border2); border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
  .showcase-beat-header { padding: 10px 12px; border-bottom: 1px solid var(--border2); }
  .showcase-beat-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--dim); }
  .showcase-beat-img { flex: 1; min-height: 120px; position: relative; overflow: hidden; }
  .showcase-beat-overlay { position: absolute; inset: 0; }
  .showcase-beat-footer { padding: 12px; }
  .showcase-beat-title { font-family: var(--font-display); font-size: 18px; color: var(--text); line-height: 1; margin-bottom: 4px; }
  .showcase-beat-sub { font-family: var(--font-body); font-size: 10px; color: var(--dim); }
  .showcase-beat-cta { display: inline-block; margin-top: 8px; background: var(--yellow); color: #0b0b10; font-family: var(--font-body); font-size: 10px; font-weight: 700; border-radius: 4px; padding: 4px 10px; }

  /* VIDEO */
  .video-frame { border-radius: 16px; overflow: hidden; border: 1px solid var(--border); aspect-ratio: 16/9; background: var(--card); margin-top: 48px; }
  .video-frame iframe { width: 100%; height: 100%; display: block; border: none; }

  /* NICHES */
  .niche-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 40px; }
  .niche-pill { font-family: var(--font-body); font-size: 13px; color: var(--muted); background: var(--card); border: 1px solid var(--border2); border-radius: 100px; padding: 9px 20px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; cursor: default; }
  .niche-pill:hover { color: var(--text); border-color: rgba(245,197,24,0.25); background: var(--yellow-glow); }

  /* PRICING */
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 60px; }
  @media (max-width: 800px) { .pricing-grid { grid-template-columns: 1fr; max-width: 380px; } }
  .plan { background: var(--card); border: 1px solid var(--border2); border-radius: 20px; padding: 36px 32px; position: relative; transition: border-color 0.2s; }
  .plan:hover { border-color: var(--border); }
  .plan-hot { border-color: rgba(245,197,24,0.35) !important; }
  .plan-hot-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #0b0b10; font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 16px; border-radius: 100px; white-space: nowrap; }
  .plan-name { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 24px; }
  .plan-price { font-family: var(--font-display); font-size: 72px; color: var(--text); line-height: 1; letter-spacing: -3px; margin-bottom: 4px; }
  .plan-price span { font-size: 28px; color: var(--muted); vertical-align: top; margin-top: 14px; display: inline-block; }
  .plan-cycle { font-family: var(--font-body); font-size: 13px; color: var(--dim); margin-bottom: 6px; }
  .plan-credits { font-family: var(--font-mono); font-size: 12px; color: var(--yellow); margin-bottom: 2px; }
  .plan-hint { font-family: var(--font-body); font-size: 12px; color: var(--dim); margin-bottom: 28px; }
  .plan-hr { height: 1px; background: var(--border2); margin-bottom: 24px; }
  .plan-feats { list-style: none; margin-bottom: 32px; }
  .plan-feats li { font-family: var(--font-body); font-size: 15px; color: var(--muted); padding: 7px 0; display: flex; align-items: flex-start; gap: 10px; line-height: 1.4; }
  .plan-feats li::before { content: '✓'; color: var(--yellow); font-size: 11px; flex-shrink: 0; margin-top: 1px; }
  .plan-btn { width: 100%; font-family: var(--font-body); font-size: 14px; font-weight: 700; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s; }
  .plan-btn-hot { background: var(--yellow); color: #0b0b10; border: none; }
  .plan-btn-hot:hover { opacity: 0.85; }
  .plan-btn-default { background: transparent; color: var(--text); border: 1px solid var(--border); }
  .plan-btn-default:hover { background: rgba(255,255,255,0.04); }

  /* FAQ */
  .faq-section { padding: 90px 0; }
  .faq-inner { max-width: 720px; margin: 0 auto; }

  /* CTA BANNER */
  .cta-banner-section { padding: 0 0 90px; }
  .cta-banner { background: var(--yellow); border-radius: 24px; padding: 72px 64px; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; position: relative; overflow: hidden; }
  @media (max-width: 768px) { .cta-banner { padding: 48px 36px; flex-direction: column; text-align: center; } }
  .cta-banner::before { content: ''; position: absolute; right: -60px; top: -60px; width: 300px; height: 300px; border-radius: 50%; background: rgba(0,0,0,0.06); }
  .cta-banner-title { font-family: var(--font-display); font-size: clamp(36px, 4.5vw, 64px); color: #0b0b10; line-height: 0.93; letter-spacing: -1px; margin-bottom: 14px; position: relative; z-index: 1; }
  .cta-banner-sub { font-family: var(--font-body); font-size: 16px; color: rgba(11,11,16,0.55); position: relative; z-index: 1; }
  .cta-banner-btn { position: relative; z-index: 1; font-family: var(--font-body); font-size: 15px; font-weight: 700; color: var(--yellow); background: #0b0b10; border: none; border-radius: 12px; padding: 18px 40px; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: opacity 0.2s; }
  .cta-banner-btn:hover { opacity: 0.85; }

  /* FOOTER */
  .footer { border-top: 1px solid var(--border2); padding: 48px 0; }
  .footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
  .footer-links { display: flex; gap: 28px; }
  .footer-link { font-family: var(--font-body); font-size: 13px; color: var(--dim); text-decoration: none; transition: color 0.2s; }
  .footer-link:hover { color: var(--muted); }
  .footer-copy { font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 1px; }

  [data-reveal] { opacity: 0; transform: translateY(20px) scale(0.99); transition: opacity 0.65s ease, transform 0.65s ease; }
`;

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    getSession().then(setSession).catch(() => {});
  }, []);

  const handleCTA = async () => {
    if (session) { navigate("/dashboard"); return; }
    try { await signInWithGoogle(); }
    catch { navigate("/login"); }
  };

  const niches = [
    { emoji: "🎬", label: "Entertainment" }, { emoji: "🎮", label: "Gaming" },
    { emoji: "💹", label: "Finance" }, { emoji: "🕉️", label: "Spiritual" },
    { emoji: "🍜", label: "Food" }, { emoji: "⚡", label: "Sports" },
    { emoji: "🤖", label: "Tech" }, { emoji: "✨", label: "Lifestyle" },
    { emoji: "📚", label: "Education" }, { emoji: "🌍", label: "Travel" },
    { emoji: "💪", label: "Health" }, { emoji: "😂", label: "Comedy" },
    { emoji: "📊", label: "Business" }, { emoji: "🔥", label: "Motivational" },
    { emoji: "📰", label: "News" }, { emoji: "🎵", label: "Music" },
    { emoji: "✦", label: "Skincare" },
  ];

  const tickerItems = ["AI Video Studio", "17 Niches", "Voice Generation", "Smart Visuals", "Auto Scripting", "Full Edit Control", "Export Ready", "Background Music"];

  const faqs = [
    { q: "How is Vidquence different from other AI video tools?", a: "Most tools give you plain text-over-broll with auto captions. Vidquence is a full production studio — every moment of your video is individually crafted with its own visual design, pacing, and narrative intent. The output looks like a human editor made deliberate decisions." },
    { q: "What are credits and how are they used?", a: "Credits power the AI features. A typical 30-second video uses 17–20 credits — covering script generation, visual production, voice synthesis, and image generation. Basic videos using your own assets cost far fewer credits." },
    { q: "Can I use my own footage and images?", a: "Yes. Upload your own images, videos, or talking head footage. The AI features are optional — the production engine works with whatever you bring." },
    { q: "What niches are supported?", a: "17 niches including entertainment, gaming, finance, spiritual, food, sports, tech, lifestyle, education, travel, health, skincare, comedy, motivational, news, music, and business. Each gets its own visual identity." },
    { q: "Can I edit the video after it's generated?", a: "Fully. Every element of every moment is editable. Change text, swap visuals, adjust timing, add effects. The AI produces a starting point — you have complete control from there." },
    { q: "Is there a free trial?", a: "Yes. New accounts get free credits to generate your first video at no cost. No credit card required to start." },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <div className="nav-logo-box">VE</div>
            <span className="nav-logo-text">Vidquence</span>
          </a>
          <div className="nav-right">
            <a href="/about" className="nav-link">About</a>
            <a href="#how" className="nav-link">How It Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <button className="btn-yellow" onClick={handleCTA}>{session ? "Go to Dashboard" : "Sign In with Google"}</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid-bg" />
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-inner">
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              AI Video Production Studio
            </div>
            <h1 className="hero-h1">
              Your Idea.<br />
              <span className="yellow">Produced.</span><br />
              <span className="outline">Instantly.</span>
            </h1>
            <p className="hero-sub">Type a topic. Walk away with a fully produced video — visuals, voice, music, and motion. Ready to publish.</p>
            <div className="hero-actions">
              <button className="hero-cta" onClick={handleCTA}>Create Your First Video →</button>
              <button className="hero-cta-ghost" onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}>See It In Action</button>
            </div>
            <div className="hero-proof">Free to start · No credit card required</div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-section">
        <div className="ticker-label">What's inside</div>
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} className="ticker-item">{item}<div className="ticker-dot" /></div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="stats-row" data-reveal>
            <div className="stat-cell"><div className="stat-num">17</div><div className="stat-label">Supported content niches</div></div>
            <div className="stat-cell"><div className="stat-num">90+</div><div className="stat-label">Unique visual layouts</div></div>
            <div className="stat-cell"><div className="stat-num">&lt;2m</div><div className="stat-label">Average production time</div></div>
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section className="section">
        <div className="container">
          <div className="section-label">The Studio</div>
          <h2 className="section-h">Everything you need.<br /><span className="yellow">Nothing you don't.</span></h2>
          <p className="section-sub">One prompt. One click. A complete video — scripted, visualized, voiced, and scored.</p>

          <div className="bento" data-reveal>
            {/* Card 1 — Script */}
            <div className="bento-card bc-1">
              <div className="bcard-accent-bar" />
              <div style={{ padding: "28px 28px 12px", background: "linear-gradient(135deg, #13131f 0%, #0f0f18 100%)", minHeight: 190, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 16, right: 16, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,197,24,0.1), transparent)", pointerEvents: "none" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--yellow)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Script · Auto</div>
                {["Hook that stops the scroll.", "Build tension beat by beat.", "The reveal they didn't see coming.", "A CTA they actually want to click."].map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: i === 0 ? "var(--yellow)" : "var(--dim)", marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: i === 0 ? "var(--text)" : "var(--muted)", lineHeight: 1.5 }}>{line}</span>
                  </div>
                ))}
              </div>
              <div className="bcard-body">
                <div className="bcard-tag">Smart Scripting</div>
                <div className="bcard-title">Written to perform, not just inform.</div>
                <div className="bcard-desc">Every video is structured for retention — built to keep viewers watching from the first second to the last.</div>
              </div>
            </div>

            {/* Card 2 — Visuals */}
            <div className="bento-card bc-2">
              <div className="bcard-accent-bar" />
              <div style={{ padding: "24px 24px 12px", background: "#0e0e18", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minHeight: 190 }}>
                {[["rgba(245,197,24,0.08)", "HOOK"], ["rgba(56,189,248,0.07)", "PROOF"], ["rgba(239,68,68,0.07)", "REVEAL"], ["rgba(34,197,94,0.07)", "CTA"]].map(([bg, label], i) => (
                  <div key={i} style={{ background: "#111120", borderRadius: 8, border: "1px solid var(--border2)", aspectRatio: "16/10", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${bg}, transparent)` }} />
                    <div style={{ position: "absolute", bottom: 6, left: 6, fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--dim)", letterSpacing: 1 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="bcard-body">
                <div className="bcard-tag">Visual Production</div>
                <div className="bcard-title">Every moment, its own visual identity.</div>
                <div className="bcard-desc">No two seconds look the same. Each part of your video is designed independently.</div>
              </div>
            </div>

            {/* Card 3 — Voice */}
            <div className="bento-card bc-3">
              <div className="bcard-accent-bar" />
              <div style={{ padding: "24px", background: "#0e0e18", minHeight: 190, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--yellow-dim)", border: "1px solid rgba(245,197,24,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎙</div>
                  <div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", fontWeight: 600 }}>AI Voice</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>Natural · Human</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} style={{ width: 3, borderRadius: 2, background: i % 4 === 0 ? "var(--yellow)" : "var(--dim)", height: `${10 + Math.sin(i * 0.8) * 14 + 14}px`, opacity: i % 4 === 0 ? 1 : 0.35, flexShrink: 0 }} />
                  ))}
                </div>
              </div>
              <div className="bcard-body">
                <div className="bcard-tag">Voice Generation</div>
                <div className="bcard-title">Sounds like a real creator.</div>
                <div className="bcard-desc">Natural narration that matches your content's energy and pacing.</div>
              </div>
            </div>

            {/* Card 4 — Niches */}
            <div className="bento-card bc-4">
              <div className="bcard-accent-bar" />
              <div style={{ padding: "24px 24px 12px", background: "#0e0e18", minHeight: 170 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--yellow)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Your niche. Your look.</div>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {["Gaming", "Finance", "Health", "Food", "Tech", "Lifestyle", "Education", "Comedy", "+ 9 more"].map((n, i) => (
                    <span key={n} className={`pill${i < 3 ? " active" : ""}`}>{n}</span>
                  ))}
                </div>
              </div>
              <div className="bcard-body">
                <div className="bcard-tag">Niche Awareness</div>
                <div className="bcard-title">Finance doesn't look like gaming. It never should.</div>
                <div className="bcard-desc">Visual tone, energy, and style automatically adapt to your content niche — across 17 categories.</div>
              </div>
            </div>

            {/* Card 5 — Music */}
            <div className="bento-card bc-5">
              <div className="bcard-accent-bar" />
              <div style={{ padding: "24px", background: "#0e0e18", minHeight: 170, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontSize: 40, opacity: 0.6 }}>🎵</div>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text)", fontWeight: 700, marginBottom: 6 }}>Background Music</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>Auto-matched to your video's energy</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["Hype", "Calm", "Dark", "Uplifting"].map(mood => (
                      <div key={mood} style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--dim)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", borderRadius: 4, padding: "3px 8px", letterSpacing: 1 }}>{mood}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bcard-body">
                <div className="bcard-tag">Audio Layer</div>
                <div className="bcard-title">The right track. Automatically.</div>
                <div className="bcard-desc">Music selected and mixed to match the emotional arc of your video. No DJ required.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border2)", borderBottom: "1px solid var(--border2)" }}>
        <div className="container">
          <div className="section-label">How It Works</div>
          <h2 className="section-h">Three steps.<br /><span className="yellow">One video.</span></h2>
          <div className="process" data-reveal>
            {[
              { num: "01", title: "Enter Your Topic", desc: "A question, a headline, a product name — anything. The studio takes it from there." },
              { num: "02", title: "We Build It", desc: "Script, visuals, voice, music, motion — everything is produced automatically. Takes less than 2 minutes." },
              { num: "03", title: "Tweak & Export", desc: "Every element is editable. Change what you want, leave what you don't. Export when it's yours." },
            ].map(step => (
              <div key={step.num} className="process-step">
                <div className="process-num">{step.num}</div>
                <div className="process-title">{step.title}</div>
                <div className="process-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="showcase-section" id="demo">
        <div className="container">
          <div className="section-label">The Studio</div>
          <h2 className="section-h">Built for control.<br /><span className="yellow">Designed for speed.</span></h2>
          <p className="section-sub">No locked outputs. No black boxes. Every element of every moment is yours to edit.</p>
          <div className="showcase-frame" data-reveal>
            <div className="showcase-bar">
              <div className="showcase-dot" style={{ background: "#ff5f57" }} />
              <div className="showcase-dot" style={{ background: "#febc2e" }} />
              <div className="showcase-dot" style={{ background: "#28c840" }} />
              <div className="showcase-title">Vidquence Studio</div>
            </div>
            <div className="showcase-body">
              <div className="showcase-sidebar">
                {["Script", "Visuals", "Voice", "Music", "Export"].map((item, i) => (
                  <div key={item} className={`showcase-sb-item${i === 1 ? " active" : ""}`}>
                    <div className="showcase-sb-dot" />
                    <span className="showcase-sb-label">{item}</span>
                    {i === 1 && <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--yellow)" }}>EDITING</span>}
                  </div>
                ))}
              </div>
              <div className="showcase-main">
                {[
                  { label: "HOOK", title: "STOP HERE", sub: "This changes everything.", cta: false, bg: "rgba(245,197,24,0.06)" },
                  { label: "PROOF", title: "PROVEN", sub: "The numbers don't lie.", cta: false, bg: "rgba(56,189,248,0.05)" },
                  { label: "CLOSE", title: "YOUR MOVE", sub: "You already know what to do.", cta: true, bg: "rgba(239,68,68,0.05)" },
                ].map((beat) => (
                  <div key={beat.label} className="showcase-beat">
                    <div className="showcase-beat-header"><div className="showcase-beat-label">{beat.label}</div></div>
                    <div className="showcase-beat-img" style={{ background: `linear-gradient(135deg, #111120, #0a0a14)` }}>
                      <div className="showcase-beat-overlay" style={{ background: `radial-gradient(ellipse at 50% 100%, ${beat.bg}, transparent)` }} />
                    </div>
                    <div className="showcase-beat-footer">
                      <div className="showcase-beat-title">{beat.title}</div>
                      <div className="showcase-beat-sub">{beat.sub}</div>
                      {beat.cta && <div className="showcase-beat-cta">START NOW</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO VIDEO */}
      <section className="section">
        <div className="container">
          <div className="section-label">Watch It Work</div>
          <h2 className="section-h">See the studio<br /><span className="yellow">in action.</span></h2>
          <div className="video-frame" data-reveal>
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Vidquence Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>
      </section>

      {/* NICHES */}
      <section className="section" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border2)", borderBottom: "1px solid var(--border2)" }}>
        <div className="container">
          <div className="section-label">Niche Coverage</div>
          <h2 className="section-h">Every niche.<br /><span className="yellow">Its own identity.</span></h2>
          <p className="section-sub" style={{ marginBottom: 0 }}>17 content categories. Each one gets a distinct visual language, tone, and energy — automatically.</p>
          <div className="niche-grid" data-reveal>
            {niches.map(n => <div key={n.label} className="niche-pill"><span>{n.emoji}</span><span>{n.label}</span></div>)}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing">
        <div className="container">
          <div className="section-label">Pricing</div>
          <h2 className="section-h">Simple pricing.<br /><span className="yellow">No surprises.</span></h2>
          <div className="pricing-grid" data-reveal>
            {[
              { name: "Starter", price: 29, credits: 300, videos: 15, hot: false, features: ["300 credits/month", "Full video production", "Voice narration", "Background music", "Standard export", "Email support"] },
              { name: "Creator", price: 49, credits: 600, videos: 30, hot: true, features: ["600 credits/month", "Everything in Starter", "AI image generation", "Talking head mode", "HD export", "Priority support"] },
              { name: "Pro", price: 79, credits: 1200, videos: 60, hot: false, features: ["1200 credits/month", "Everything in Creator", "Bulk generation", "Custom brand identity", "Advanced analytics", "Dedicated support"] },
            ].map(plan => (
              <div key={plan.name} className={`plan${plan.hot ? " plan-hot" : ""}`}>
                {plan.hot && <div className="plan-hot-badge">Most Popular</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price"><span>$</span>{plan.price}</div>
                <div className="plan-cycle">per month</div>
                <div className="plan-credits">{plan.credits} credits/month</div>
                <div className="plan-hint">~{plan.videos} videos (30-sec each)</div>
                <div className="plan-hr" />
                <ul className="plan-feats">{plan.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
                <button className={`plan-btn ${plan.hot ? "plan-btn-hot" : "plan-btn-default"}`} onClick={handleCTA}>Get Started</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-inner">
            <div className="section-label">Questions</div>
            <h2 className="section-h" style={{ marginBottom: 48 }}>Things people<br /><span className="yellow">actually ask.</span></h2>
            <div data-reveal>
              {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <div className="cta-banner-section">
        <div className="container">
          <div className="cta-banner" data-reveal>
            <div>
              <div className="cta-banner-title">Stop planning.<br />Start publishing.</div>
              <div className="cta-banner-sub">Your first video is free. No card required.</div>
            </div>
            <button className="cta-banner-btn" onClick={handleCTA}>Create Your First Video →</button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <a href="/" className="nav-logo"><div className="nav-logo-box">VE</div><span className="nav-logo-text">Vidquence</span></a>
            <div className="footer-links">
              <a href="/about" className="footer-link">About</a>
              <a href="/terms" className="footer-link">Terms</a>
              <a href="/privacy" className="footer-link">Privacy</a>
              <a href="/refunds" className="footer-link">Refunds</a>
            </div>
            <a href="mailto:hello@vidquence.com" className="footer-link">hello@vidquence.com</a>
            <div className="footer-copy">© 2026 VIDQUENCE</div>
          </div>
        </div>
      </footer>
    </div>
  );
}