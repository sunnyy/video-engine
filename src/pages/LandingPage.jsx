/**
 * LandingPage.jsx — Vidquence
 * "AI-Powered Creative Studio"
 * Redesigned to showcase all services, not just video generation.
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithGoogle, getSession } from "../services/auth/authService";
import { SERVER } from "../services/serverApi";

const FALLBACK_RATE = 92.60;
function toINR(usd, rate) { return Math.round(usd * rate); }

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
      { threshold: 0.06 }
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
      {open && <div style={{ marginTop: 14, fontFamily: "var(--font-body)", fontSize: 15, color: "#8888a8", lineHeight: 1.75 }}>{a}</div>}
    </div>
  );
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  :root {
    --bg: #0b0b10; --bg2: #0f0f16; --card: #111118; --card2: #13131c;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.04);
    --yellow: #f5c518; --yellow-dim: rgba(245,197,24,0.10); --yellow-glow: rgba(245,197,24,0.06);
    --text: #e8e8f0; --muted: #8888a8; --dim: #606078;
    --font-display: 'Bebas Neue', sans-serif;
    --font-body: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 16px; --container: 1160px;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  .container { max-width: var(--container); margin: 0 auto; padding: 0 40px; }
  @media (max-width: 768px) { .container { padding: 0 20px; } }

  /* NAV */
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: rgba(11,11,16,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border2); height: 60px; }
  .nav-inner { max-width: var(--container); margin: 0 auto; padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
  @media (max-width: 768px) { .nav-inner { padding: 0 20px; } }
  .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .nav-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav-link { font-family: var(--font-body); font-size: 15px; color: var(--muted); text-decoration: none; padding: 7px 14px; border-radius: 6px; transition: color 0.2s; }
  .nav-link:hover { color: var(--text); }
  .btn-yellow { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: #0b0b10; background: var(--yellow); border: none; border-radius: 7px; padding: 9px 18px; cursor: pointer; transition: opacity 0.2s; }
  .btn-yellow:hover { opacity: 0.85; }

  /* HERO */
  .hero { padding: 150px 0 100px; position: relative; overflow: hidden; }
  .hero-grid-bg { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%); }
  .hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; pointer-events: none; background: radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 65%); }
  .hero-inner { position: relative; z-index: 1; text-align: center; max-width: 860px; margin: 0 auto; }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.2); border-radius: 100px; padding: 6px 16px; margin-bottom: 36px; font-family: var(--font-mono); font-size: 11px; color: var(--yellow); letter-spacing: 2px; text-transform: uppercase; }
  .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .hero-h1 { font-family: var(--font-display); font-size: clamp(52px, 8vw, 110px); line-height: 0.9; letter-spacing: -1px; color: var(--text); margin-bottom: 28px; }
  .hero-h1 .yellow { color: var(--yellow); }
  .hero-h1 .outline { -webkit-text-stroke: 1.5px rgba(255,255,255,0.18); color: transparent; }
  .hero-sub { font-family: var(--font-body); font-size: 19px; color: var(--muted); line-height: 1.7; max-width: 560px; margin: 0 auto 48px; }
  .hero-actions { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
  .hero-cta { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: #0b0b10; background: var(--yellow); border: none; border-radius: 10px; padding: 16px 36px; cursor: pointer; transition: opacity 0.2s; }
  .hero-cta:hover { opacity: 0.85; }
  .hero-cta-ghost { font-family: var(--font-body); font-size: 15px; font-weight: 600; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 10px; padding: 15px 28px; cursor: pointer; transition: border-color 0.2s; }
  .hero-cta-ghost:hover { border-color: rgba(255,255,255,0.3); }
  .hero-proof { margin-top: 20px; font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 1px; }

  /* TICKER */
  .ticker-section { padding: 32px 0; border-top: 1px solid var(--border2); border-bottom: 1px solid var(--border2); overflow: hidden; background: var(--bg2); }
  .ticker-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); text-align: center; margin-bottom: 16px; }
  .ticker-track { display: flex; animation: ticker 32s linear infinite; width: max-content; }
  .ticker-track:hover { animation-play-state: paused; }
  .ticker-item { display: flex; align-items: center; gap: 24px; padding: 0 28px; font-family: var(--font-mono); font-size: 12px; color: var(--dim); white-space: nowrap; letter-spacing: 1px; text-transform: uppercase; }
  .ticker-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--yellow); opacity: 0.4; flex-shrink: 0; }
  @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }

  /* STATS */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius); overflow: hidden; }
  @media (max-width: 700px) { .stats-row { grid-template-columns: 1fr 1fr; } }
  .stat-cell { background: var(--card); padding: 40px 32px; text-align: center; }
  .stat-num { font-family: var(--font-display); font-size: 56px; color: var(--yellow); line-height: 1; letter-spacing: -2px; margin-bottom: 8px; }
  .stat-label { font-family: var(--font-body); font-size: 14px; color: var(--muted); }

  /* SECTION */
  .section { padding: 90px 0; }
  .section-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--yellow); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .section-label::before { content: ''; width: 24px; height: 1px; background: var(--yellow); }
  .section-h { font-family: var(--font-display); font-size: clamp(36px, 5vw, 64px); line-height: 0.93; color: var(--text); letter-spacing: -0.5px; margin-bottom: 16px; }
  .section-h .yellow { color: var(--yellow); }
  .section-sub { font-family: var(--font-body); font-size: 17px; color: var(--muted); line-height: 1.7; max-width: 520px; }

  /* SERVICES GRID */
  .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 60px; }
  @media (max-width: 900px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .services-grid { grid-template-columns: 1fr; } }
  .service-card { background: var(--card); border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; transition: border-color 0.25s, transform 0.25s; cursor: default; }
  .service-card:hover { border-color: rgba(245,197,24,0.25); transform: translateY(-3px); }
  .service-card-preview { height: 180px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
  .service-card-body { padding: 20px 24px 24px; }
  .service-tag { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); margin-bottom: 8px; }
  .service-title { font-family: var(--font-body); font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 8px; line-height: 1.3; }
  .service-desc { font-family: var(--font-body); font-size: 13px; color: var(--muted); line-height: 1.65; }
  .service-card-wide { grid-column: span 2; }
  @media (max-width: 600px) { .service-card-wide { grid-column: span 1; } }

  /* SAMPLE PLACEHOLDER */
  .sample-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #13131f, #0e0e18); }
  .sample-icon { font-size: 32px; opacity: 0.5; }
  .sample-label { font-family: var(--font-mono); font-size: 10px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }

  /* HOW IT WORKS */
  .process { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius); overflow: hidden; margin-top: 60px; }
  @media (max-width: 700px) { .process { grid-template-columns: 1fr; } }
  .process-step { background: var(--card); padding: 44px 36px; position: relative; transition: background 0.2s; }
  .process-step:hover { background: var(--card2); }
  .process-step::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: transparent; transition: background 0.2s; }
  .process-step:hover::after { background: var(--yellow); }
  .process-num { font-family: var(--font-display); font-size: 72px; color: rgba(245,197,24,0.08); line-height: 1; margin-bottom: 20px; letter-spacing: -3px; }
  .process-title { font-family: var(--font-body); font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 10px; }
  .process-desc { font-family: var(--font-body); font-size: 15px; color: var(--muted); line-height: 1.7; }

  /* WHO IS IT FOR */
  .audience-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 50px; }
  @media (max-width: 600px) { .audience-grid { grid-template-columns: 1fr; } }
  .audience-card { background: var(--card); border: 1px solid var(--border2); border-radius: 14px; padding: 28px 28px 24px; transition: border-color 0.2s; }
  .audience-card:hover { border-color: rgba(245,197,24,0.2); }
  .audience-icon { font-size: 28px; margin-bottom: 14px; }
  .audience-title { font-family: var(--font-body); font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .audience-desc { font-family: var(--font-body); font-size: 14px; color: var(--muted); line-height: 1.65; }
  .audience-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
  .audience-tag { font-family: var(--font-mono); font-size: 10px; color: var(--yellow); background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.15); border-radius: 100px; padding: 3px 10px; }

  /* COMPARE */
  .compare-table { margin-top: 50px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .compare-row { display: grid; grid-template-columns: 1fr 120px 120px; border-bottom: 1px solid var(--border2); }
  .compare-row:last-child { border-bottom: none; }
  .compare-row.header { background: var(--card2); }
  .compare-cell { padding: 16px 20px; font-family: var(--font-body); font-size: 14px; color: var(--muted); display: flex; align-items: center; }
  .compare-cell.header { font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }
  .compare-cell.center { justify-content: center; text-align: center; }
  .compare-cell.vidquence { color: var(--yellow); font-weight: 700; }
  .check { color: #22c55e; font-size: 16px; }
  .cross { color: #444; font-size: 16px; }

  /* PRICING */
  .pricing-grid { display: grid; gap: 16px; margin-top: 50px; }
  .plan { background: var(--card); border: 1px solid var(--border2); border-radius: var(--radius); padding: 36px 32px; position: relative; transition: border-color 0.2s, transform 0.2s; }
  .plan:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
  .plan-hot { border-color: rgba(245,197,24,0.35) !important; }
  .plan-hot-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #0b0b10; font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 16px; border-radius: 100px; white-space: nowrap; }
  .plan-name { font-family: var(--font-body); font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
  .plan-price { font-family: var(--font-display); font-size: 64px; color: var(--text); line-height: 1; letter-spacing: -2px; }
  .plan-price span { font-size: 28px; color: var(--muted); vertical-align: top; margin-top: 12px; display: inline-block; }
  .plan-cycle { font-family: var(--font-body); font-size: 13px; color: var(--dim); margin-bottom: 4px; }
  .plan-hr { border: none; border-top: 1px solid var(--border2); margin: 24px 0; }
  .plan-feats { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
  .plan-feats li { font-family: var(--font-body); font-size: 14px; color: var(--muted); display: flex; align-items: flex-start; gap: 10px; line-height: 1.4; }
  .plan-feats li::before { content: '✓'; color: var(--yellow); font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .plan-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; cursor: pointer; font-family: var(--font-body); font-size: 14px; font-weight: 700; transition: opacity 0.2s; }
  .plan-btn-default { background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid var(--border); }
  .plan-btn-default:hover { background: rgba(255,255,255,0.1); }
  .plan-btn-hot { background: var(--yellow); color: #0b0b10; }
  .plan-btn-hot:hover { opacity: 0.85; }

  /* FAQ */
  .faq-section { padding: 90px 0; background: var(--bg2); border-top: 1px solid var(--border2); }
  .faq-inner { max-width: 720px; margin: 0 auto; }

  /* CTA */
  .cta-banner-section { padding: 40px 0 80px; }
  .cta-banner { background: linear-gradient(135deg, #14140e 0%, #1a1a10 100%); border: 1px solid rgba(245,197,24,0.2); border-radius: 20px; padding: 60px 64px; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; position: relative; overflow: hidden; }
  .cta-banner::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 70% 50%, rgba(245,197,24,0.06), transparent 60%); pointer-events: none; }
  .cta-banner-title { font-family: var(--font-display); font-size: clamp(36px, 5vw, 56px); color: var(--text); line-height: 0.95; position: relative; z-index: 1; }
  .cta-banner-sub { font-family: var(--font-body); font-size: 16px; color: var(--muted); margin-top: 12px; position: relative; z-index: 1; }
  .cta-banner-btn { position: relative; z-index: 1; font-family: var(--font-body); font-size: 15px; font-weight: 700; color: var(--yellow); background: #0b0b10; border: none; border-radius: 12px; padding: 18px 40px; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: opacity 0.2s; }
  .cta-banner-btn:hover { opacity: 0.85; }

  /* FOOTER */
  .footer { border-top: 1px solid var(--border2); padding: 48px 0; }
  .footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
  .footer-links { display: flex; gap: 28px; flex-wrap: wrap; }
  .footer-link { font-family: var(--font-body); font-size: 13px; color: var(--dim); text-decoration: none; transition: color 0.2s; }
  .footer-link:hover { color: var(--muted); }
  .footer-copy { font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 1px; }

  [data-reveal] { opacity: 0; transform: translateY(20px) scale(0.99); transition: opacity 0.65s ease, transform 0.65s ease; }
`;

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [plans,   setPlans]   = useState([]);
  const [rate,    setRate]    = useState(FALLBACK_RATE);
  const [cycle,   setCycle]   = useState("monthly");

  useEffect(() => {
    getSession().then(setSession).catch(() => {});
    fetch(`${SERVER}/api/plans`)
      .then(r => r.json())
      .then(d => setPlans(Array.isArray(d) ? d.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)) : []))
      .catch(() => {});
    fetch(`${SERVER}/api/exchange-rate`)
      .then(r => r.json())
      .then(d => { if (d?.rate) setRate(d.rate); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) { el.scrollIntoView({ behavior: "smooth" }); }
    else {
      const t = setTimeout(() => { document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }); }, 300);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  const handleCTA = async () => {
    if (session) { navigate("/dashboard"); return; }
    try { await signInWithGoogle(); }
    catch { navigate("/login"); }
  };

  const tickerItems = [
    "AI Video Generator", "Product Video Ads", "Virtual Try-On",
    "Social Media Posts", "Thumbnail Generator", "Poster Studio",
    "Outfit Studio", "Voice Studio", "Caption Studio", "Speech to Text",
  ];

  const faqs = [
    { q: "How is Vidquence different from other AI video tools?", a: "Most tools give you plain text over stock footage. Vidquence is a full AI production studio — every beat of your video gets its own layout, visual design, pacing, and narrative intent. Beyond auto-generated videos, you get a complete creative suite: Product Ad Studio for AI video ads from a single product photo, Poster Studio, Thumbnail Generator, Voice Studio, and Transcription — all in one platform." },
    { q: "What are credits and how are they used?", a: "Credits power every AI action on the platform. A complete auto-generated short-form video costs around 39 credits (script, images, voiceover, and export). A full Product Ad campaign with 5 cinematic scenes and video clips costs around 303 credits. Simpler actions like generating a poster or thumbnail cost 10 credits each. Your plan renews credits monthly — unused credits carry over." },
    { q: "What services are included?", a: "Vidquence includes: AI Video Generator (faceless and talking head modes), Product Ad Studio (photo → full video ad), Poster Studio, Thumbnail Generator, Outfit Studio (virtual try-on), Social Post Generator, Voice Studio (TTS voiceovers), Speech to Text, and Caption Studio. All services in one dashboard." },
    { q: "What niches and languages are supported?", a: "17 niches including entertainment, gaming, finance, spiritual, food, sports, tech, lifestyle, education, travel, health, skincare, comedy, motivational, news, music, and business. Videos support multilingual scripts and voiceovers including Hindi, English, Arabic, French, Spanish, Portuguese, Urdu, and Turkish." },
    { q: "Can I use my own footage and images?", a: "Yes. Upload your own images, videos, or talking head footage directly in the editor. For talking head videos, upload your recorded clip and the AI builds the full video around it with captions, layouts, and music. The AI features are optional — the editor works with whatever assets you bring." },
    { q: "Can I edit the video after it's generated?", a: "Fully. Every element of every beat is editable — change text, swap visuals, adjust timing, change transitions, add overlays, update captions, swap background music, and add sound effects. The AI produces a production-ready starting point. You have complete control from there." },
    { q: "Does Product Ad Studio work for any product?", a: "Yes — clothing, fashion, wearables (watches, earphones, shoes), beauty products, food, gadgets, and more. For clothing, the system uses AI model avatars to show the product being worn. For other products, it generates cinematic product photography shots. Upload one product photo and get a full video ad with multiple scenes, transitions, and background music." },
    { q: "Is there a free trial?", a: "New accounts get 200 free credits — enough to generate several videos, posters, and thumbnails without a credit card. Product Ad Studio requires an active plan. Paid plans start at $15/month with no long-term commitment." },
    { q: "What are the plan limits?", a: "Starter ($15/mo) includes 1,800 credits — roughly 46 full videos or 5 Product Ad campaigns per month. Pro ($29/mo) includes 3,500 credits. Agency ($50/mo) includes 6,000 credits. All plans include every service on the platform." },
    { q: "Can I cancel anytime?", a: "Yes. Cancel from your account settings at any time. You keep your remaining credits until the end of your billing period. No cancellation fees." },
  ];

  const services = [
    {
      tag: "Video",
      title: "AI Video Generator",
      desc: "Type a topic. Get a fully produced short-form video — scripted, visualized, voiced, and scored. 17 niches, 90+ layouts.",
      icon: "🎬",
      bg: "linear-gradient(135deg, rgba(245,197,24,0.08), rgba(245,197,24,0.02))",
      wide: false,
    },
    {
      tag: "Advertising",
      title: "Product Video Ads",
      desc: "Upload one product photo. Get a cinematic 5-scene video ad with AI model, transitions, and background music.",
      icon: "🛍️",
      bg: "linear-gradient(135deg, rgba(124,92,252,0.1), rgba(124,92,252,0.02))",
      wide: false,
    },
    {
      tag: "Try-On",
      title: "Virtual Try-On",
      desc: "Upload a garment and a model photo. AI dresses the model in your outfit instantly. Perfect for fashion brands.",
      icon: "👗",
      bg: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(236,72,153,0.02))",
      wide: false,
    },
    {
      tag: "Social Media",
      title: "Social Post Generator",
      desc: "Generate ready-to-post graphics for Instagram, Facebook, and LinkedIn. Upload your brand logo and pick your colors.",
      icon: "📱",
      bg: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(56,189,248,0.02))",
      wide: false,
    },
    {
      tag: "Thumbnails",
      title: "Thumbnail Generator",
      desc: "AI-generated clickbait-style thumbnails for YouTube and Reels. GPT-4o crafts the perfect visual strategy first.",
      icon: "🖼",
      bg: "linear-gradient(135deg, rgba(251,146,60,0.08), rgba(251,146,60,0.02))",
      wide: false,
    },
    {
      tag: "Branding",
      title: "Poster Studio",
      desc: "Turn any product photo into a premium commercial poster ad. Luxury brand quality in seconds.",
      icon: "🎨",
      bg: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))",
      wide: false,
    },
    {
      tag: "Audio",
      title: "Voice Studio",
      desc: "9 natural AI voices. Generate voiceovers for any content in seconds. Multilingual support.",
      icon: "🎙",
      bg: "linear-gradient(135deg, rgba(245,197,24,0.06), rgba(245,197,24,0.01))",
      wide: false,
    },
    {
      tag: "Captions",
      title: "Caption Studio",
      desc: "Upload your talking head video. Transcribe, style, and export with viral caption overlays in 10 styles.",
      icon: "💬",
      bg: "linear-gradient(135deg, rgba(124,92,252,0.07), rgba(124,92,252,0.01))",
      wide: false,
    },
    {
      tag: "Transcription",
      title: "Speech to Text",
      desc: "Upload any audio or video. Get an accurate transcript with timestamps. Export as SRT or plain text.",
      icon: "📝",
      bg: "linear-gradient(135deg, rgba(56,189,248,0.06), rgba(56,189,248,0.01))",
      wide: false,
    },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 52, width: "auto" }} />
          </a>
          <div className="nav-right">
            <a href="/about" className="nav-link">About Us</a>
            <a href="#services" className="nav-link">Services</a>
            <a href="#how" className="nav-link">How It Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <button className="btn-yellow" onClick={handleCTA}>{session ? "Go to Dashboard" : "Start Free"}</button>
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
              AI-Powered Creative Production Studio
              </div>
            <h1 className="hero-h1">
              One Platform.<br />All Your <span className="yellow">Creatives.</span>
            </h1>
            <p className="hero-sub">
              Generate video ads, social posts, product visuals, voiceovers, thumbnails, and more — without hiring a designer, editor, or content team.
            </p>
            <div className="hero-actions">
              <button className="hero-cta" onClick={handleCTA}>Start Creating Free →</button>
              <button className="hero-cta-ghost" onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>See All Services</button>
            </div>
            <div className="hero-proof">200 free credits · No credit card required</div>
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
            <div className="stat-cell"><div className="stat-num">10+</div><div className="stat-label">AI creative services</div></div>
            <div className="stat-cell"><div className="stat-num">17</div><div className="stat-label">Supported content niches</div></div>
            <div className="stat-cell"><div className="stat-num">90+</div><div className="stat-label">Unique visual layouts</div></div>
            <div className="stat-cell"><div className="stat-num">&lt;5m</div><div className="stat-label">From idea to finished asset</div></div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section" id="services">
        <div className="container">
          <div className="section-label">The Full Suite</div>
          <h2 className="section-h">Everything a brand needs.<br /><span className="yellow">In one place.</span></h2>
          <p className="section-sub">Stop juggling 6 different tools. One subscription. Every creative asset your business needs.</p>

          <div className="services-grid" data-reveal>
            {services.map((svc, i) => (
              <div key={i} className={`service-card${svc.wide ? " service-card-wide" : ""}`}>
                <div className="service-card-preview" style={{ background: svc.bg }}>
                  {/* Sample placeholder — replace with actual sample images/videos */}
                  <div className="sample-placeholder">
                    <div className="sample-icon">{svc.icon}</div>
                    <div className="sample-label">Sample coming soon</div>
                  </div>
                </div>
                <div className="service-card-body">
                  <div className="service-tag">{svc.tag}</div>
                  <div className="service-title">{svc.title}</div>
                  <div className="service-desc">{svc.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-label">Built For</div>
          <h2 className="section-h">Made for brands<br /><span className="yellow">that move fast.</span></h2>
          <p className="section-sub">Whether you're a solo founder or a full marketing team — Vidquence replaces your entire content production stack.</p>

          <div className="audience-grid" data-reveal>
            {[
              {
                icon: "🛒",
                title: "E-commerce Brands",
                desc: "Create product video ads, virtual try-on images, and social media posts for every product in your catalog — without a photoshoot.",
                tags: ["Product Ads", "Virtual Try-On", "Social Posts", "Posters"],
              },
              {
                icon: "📱",
                title: "Content Creators",
                desc: "Generate faceless or talking head videos in any niche. Add captions, voiceovers, and thumbnails — all without editing software.",
                tags: ["AI Videos", "Captions", "Thumbnails", "Voiceover"],
              },
              {
                icon: "🏢",
                title: "Marketing Agencies",
                desc: "Produce marketing creatives at scale for your clients. Video ads, social graphics, and more — delivered in minutes, not days.",
                tags: ["Product Ads", "Social Posts", "Posters", "Thumbnails"],
              },
              {
                icon: "🚀",
                title: "Solo Founders & Startups",
                desc: "Ship marketing content without a team. Replace your designer, video editor, and voice artist with one platform.",
                tags: ["All Services", "Low Cost", "Fast Output"],
              },
            ].map((a, i) => (
              <div key={i} className="audience-card">
                <div className="audience-icon">{a.icon}</div>
                <div className="audience-title">{a.title}</div>
                <div className="audience-desc">{a.desc}</div>
                <div className="audience-tags">{a.tags.map((t, j) => <span key={j} className="audience-tag">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border2)", borderBottom: "1px solid var(--border2)" }} id="how">
        <div className="container">
          <div className="section-label">How It Works</div>
          <h2 className="section-h">Three steps.<br /><span className="yellow">One output.</span></h2>
          <p className="section-sub">No learning curve. No complex settings. Just describe what you need and get it.</p>

          <div className="process" data-reveal>
            {[
              { n: "01", title: "Describe or Upload", desc: "Type a topic, paste a URL, or upload your product photo, logo, or video. That's all the input you need." },
              { n: "02", title: "AI Does the Work", desc: "Our AI writes the strategy, generates visuals, records voiceovers, applies layouts, adds music — all automatically." },
              { n: "03", title: "Download & Publish", desc: "Export your finished asset in seconds. Edit anything you want in our full editor before exporting." },
            ].map((s, i) => (
              <div key={i} className="process-step">
                <div className="process-num">{s.n}</div>
                <div className="process-title">{s.title}</div>
                <div className="process-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VS COMPETITORS */}
      <section className="section">
        <div className="container">
          <div className="section-label">Why Vidquence</div>
          <h2 className="section-h">One tool.<br /><span className="yellow">Not six.</span></h2>
          <p className="section-sub">Most teams spend $200+/mo on separate tools for video, design, voice, and captions. Vidquence replaces all of them.</p>

          <div className="compare-table" data-reveal>
            <div className="compare-row header">
              <div className="compare-cell header">Feature</div>
              <div className="compare-cell header center">Others</div>
              <div className="compare-cell header center" style={{ color: "var(--yellow)" }}>Vidquence</div>
            </div>
            {[
              ["AI Video Generation", false, true],
              ["Product Video Ads", false, true],
              ["Virtual Try-On for Clothing", false, true],
              ["Social Media Post Generator", false, true],
              ["Thumbnail Generator", false, true],
              ["Poster & Banner Studio", false, true],
              ["Voice Studio & TTS", "separate tool", true],
              ["Caption Studio", "separate tool", true],
              ["Speech to Text / Transcription", "separate tool", true],
              ["Full Video Editor", false, true],
              ["All in one dashboard", false, true],
            ].map(([feat, others, ours], i) => (
              <div key={i} className="compare-row">
                <div className="compare-cell" style={{ color: "var(--muted)", fontSize: 14 }}>{feat}</div>
                <div className="compare-cell center">
                  {others === false ? <span className="cross">✕</span> : <span style={{ fontSize: 12, color: "var(--dim)" }}>{others}</span>}
                </div>
                <div className="compare-cell center vidquence">
                  {ours ? <span className="check">✓</span> : <span className="cross">✕</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section" id="pricing" style={{ background: "var(--bg2)", borderTop: "1px solid var(--border2)" }}>
        <div className="container">
          <div className="section-label">Pricing</div>
          <h2 className="section-h">Simple pricing.<br /><span className="yellow">No surprises.</span></h2>
          <p className="section-sub">One plan unlocks every service. Cancel anytime.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 10, padding: 4, gap: 4 }}>
              {["monthly", "annual"].map(c => (
                <button key={c} onClick={() => setCycle(c)} style={{
                  padding: "7px 20px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, fontFamily: "var(--font-body)",
                  background: cycle === c ? "var(--yellow)" : "transparent",
                  color: cycle === c ? "#0b0b10" : "var(--muted)",
                  transition: "all 0.15s",
                }}>
                  {c === "monthly" ? "Monthly" : "Annual"}
                  {c === "annual" && <span style={{ fontSize: 10, marginLeft: 5, color: cycle === "annual" ? "#0b0b10" : "var(--yellow)" }}>Save more</span>}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              Live rate: 1 USD = ₹{rate.toFixed(2)}
            </div>
          </div>

          <div className="pricing-grid" data-reveal style={{ gridTemplateColumns: `repeat(${Math.min(plans.length || 3, 3)}, 1fr)` }}>
            {plans.length === 0
              ? [0,1,2].map(i => <div key={i} className="plan" style={{ opacity: 0.3, minHeight: 320 }} />)
              : plans.map(plan => {
                  const monthly      = plan.price_monthly;
                  const discount     = plan.discount_percent || 0;
                  const annualTotal  = Math.round(monthly * 12 * (1 - discount / 100));
                  const annualPerMo  = Math.round(annualTotal / 12);
                  const usd          = cycle === "annual" ? annualPerMo : monthly;
                  const hasDiscount  = cycle === "annual" && discount > 0;
                  const inr          = toINR(usd, rate);
                  const feats        = Array.isArray(plan.features) ? plan.features : [];
                  return (
                    <div key={plan.id} className={`plan${plan.is_popular ? " plan-hot" : ""}`}>
                      {plan.is_popular && <div className="plan-hot-badge">Most Popular</div>}
                      <div className="plan-name">{plan.name}</div>
                      {cycle === "annual" ? (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <div className="plan-price"><span>$</span>{annualTotal}</div>
                            {hasDiscount && <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--dim)", textDecoration: "line-through" }}>${monthly * 12}</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <div className="plan-cycle" style={{ marginBottom: 0 }}>per year</div>
                            {hasDiscount && <div style={{ display: "inline-block", background: "rgba(245,197,24,0.15)", color: "var(--yellow)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", padding: "2px 8px", borderRadius: 4 }}>{discount}% OFF</div>}
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)", marginTop: 4 }}>≈ ₹{toINR(annualTotal, rate)}/yr · ${annualPerMo}/mo</div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 16 }}>
                          <div className="plan-price"><span>$</span>{monthly}</div>
                          <div className="plan-cycle" style={{ marginBottom: 2 }}>per month</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>≈ ₹{inr}/mo</div>
                        </div>
                      )}
                      <div className="plan-hr" />
                      <ul className="plan-feats">{feats.map((f, i) => <li key={i}>{f}</li>)}</ul>
                      <button
                        className={`plan-btn ${plan.is_popular ? "plan-btn-hot" : "plan-btn-default"}`}
                        onClick={() => navigate(`/checkout?plan=${plan.slug}&cycle=${cycle}`)}
                      >Get Started</button>
                    </div>
                  );
                })
            }
          </div>

          <div style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)", letterSpacing: 1 }}>
            200 free credits on signup · No credit card required · Cancel anytime
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
              <div className="cta-banner-title">Stop hiring.<br />Start creating.</div>
              <div className="cta-banner-sub">200 free credits. No card required. Every service unlocked.</div>
            </div>
            <button className="cta-banner-btn" onClick={handleCTA}>Get Started Free →</button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <a href="/" className="nav-logo"><img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 52, width: "auto" }} /></a>
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