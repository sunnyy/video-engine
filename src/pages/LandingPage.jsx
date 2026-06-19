/**
 * LandingPage.jsx — Vidquence
 * "AI-Powered Creative Studio"
 * Redesigned to showcase all services, not just video generation.
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithGoogle, getSession } from "../services/auth/authService";
import { SERVER } from "../services/serverApi";

const FALLBACK_RATE = 92.6;
function toINR(usd, rate) {
  return Math.round(usd * rate);
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = "1";
            e.target.style.transform = "translateY(0) scale(1)";
          }
        }),
      { threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "22px 0", cursor: "pointer" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span
          style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text)", fontWeight: 500, lineHeight: 1.5 }}
        >
          {q}
        </span>
        <span
          style={{
            color: "#f5c518",
            fontSize: 22,
            flexShrink: 0,
            fontWeight: 300,
            lineHeight: 1,
            width: 24,
            textAlign: "center",
          }}
        >
          {open ? "−" : "+"}
        </span>
      </div>
      {open && (
        <div
          style={{ marginTop: 14, fontFamily: "var(--font-body)", fontSize: 15, color: "var(--muted)", lineHeight: 1.75 }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  :root {
    --bg: #0F0E1A; --bg2: #0f0f16; --card: #111118; --card2: #13131c;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.04);
    --yellow: #f5c518; --yellow-dim: rgba(245,197,24,0.10); --yellow-glow: rgba(245,197,24,0.06);
    --text: #f5f5fb; --muted: #c4c4d4; --dim: #9a9aae;
    --font-display: 'Bebas Neue', sans-serif;
    --font-body: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 16px; --container: 1380px;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  .container { max-width: var(--container); margin: 0 auto; padding: 0 40px; }
  @media (max-width: 768px) { .container { padding: 0 20px; } }

  /* NAV */
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; background: rgba(15,14,26,0.92); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border2); height: 60px; }
  .nav-inner { max-width: var(--container); margin: 0 auto; padding: 0 40px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
  @media (max-width: 768px) { .nav-inner { padding: 0 20px; } }
  .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .nav-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .nav-link { font-family: var(--font-body); font-size: 15px; color: var(--muted); text-decoration: none; padding: 7px 14px; border-radius: 6px; transition: color 0.2s; }
  .nav-link:hover { color: var(--text); }
  .btn-yellow { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: #0F0E1A; background: var(--yellow); border: none; border-radius: 7px; padding: 9px 18px; cursor: pointer; transition: opacity 0.2s; }
  .btn-yellow:hover { opacity: 0.85; }

  /* HERO */
  .hero { padding: 138px 0 64px; position: relative; overflow: hidden; }
  .hero-grid-bg { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%); }
  .hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; pointer-events: none; background: radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 65%); }
  .hero-inner { position: relative; z-index: 1; text-align: center; max-width: 860px; margin: 0 auto; }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.2); border-radius: 100px; padding: 6px 16px; margin-bottom: 36px; font-family: var(--font-mono); font-size: 12px; color: var(--yellow); letter-spacing: 2px; text-transform: uppercase; }
  .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .hero-h1 { font-family: var(--font-display); font-size: clamp(52px, 8vw, 110px); line-height: 0.9; letter-spacing: -1px; color: var(--text); margin-bottom: 28px; }
  .hero-h1 .yellow { color: var(--yellow); }
  .hero-h1 .outline { -webkit-text-stroke: 1.5px rgba(255,255,255,0.18); color: transparent; }
  .hero-sub { font-family: var(--font-body); font-size: 19px; color: var(--muted); line-height: 1.7; max-width: 620px; margin: 0 auto 48px; }
  .hero-actions { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }
  .hero-cta { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: #0F0E1A; background: var(--yellow); border: none; border-radius: 10px; padding: 16px 36px; cursor: pointer; transition: opacity 0.2s; }
  .hero-cta:hover { opacity: 0.85; }
  .hero-cta-ghost { font-family: var(--font-body); font-size: 15px; font-weight: 600; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 10px; padding: 15px 28px; cursor: pointer; transition: border-color 0.2s; }
  .hero-cta-ghost:hover { border-color: rgba(255,255,255,0.3); }
  .hero-proof { margin-top: 20px; font-family: var(--font-mono); font-size: 12px; color: var(--dim); letter-spacing: 1px; }
  @media (max-width: 700px) { .hero { padding: 118px 0 48px; } }

  /* TICKER */
  .ticker-section { padding: 46px 0 52px; border-top: 1px solid var(--border2); border-bottom: 1px solid var(--border2); overflow: hidden; background: radial-gradient(circle at 50% 0%, rgba(245,197,24,0.09), transparent 34%), linear-gradient(180deg, #050506 0%, #0c0c12 100%); position: relative; }
  .ticker-section::before,
  .ticker-section::after { content: ''; position: absolute; top: 0; bottom: 0; width: 120px; z-index: 2; pointer-events: none; }
  .ticker-section::before { left: 0; background: linear-gradient(90deg, #050506 0%, transparent 100%); }
  .ticker-section::after { right: 0; background: linear-gradient(270deg, #050506 0%, transparent 100%); }
  .ticker-head { text-align: center; margin-bottom: 24px; position: relative; z-index: 3; }
  .ticker-label { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.2); border-radius: 999px; padding: 7px 14px; margin-bottom: 14px; }
  .ticker-label::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--yellow); box-shadow: 0 0 18px rgba(245,197,24,0.6); }
  .ticker-title { font-family: var(--font-display); font-size: clamp(36px, 4vw, 64px); line-height: 0.95; color: var(--text); }
  .ticker-sub { margin-top: 8px; font-family: var(--font-body); font-size: 15px; color: var(--muted); }
  .ticker-lanes { display: flex; flex-direction: column; gap: 14px; transform: rotate(-1deg); }
  .ticker-track { display: flex; align-items: center; gap: 14px; width: max-content; animation: ticker 34s linear infinite; will-change: transform; }
  .ticker-track.reverse { animation-name: ticker-reverse; animation-duration: 40s; transform: translateX(-50%); }
  .ticker-lanes:hover .ticker-track { animation-play-state: paused; }
  .ticker-item { display: flex; align-items: center; gap: 12px; min-width: 190px; padding: 12px 16px 12px 12px; border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 16px; background: linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02)); box-shadow: 0 16px 42px rgba(0,0,0,0.32); backdrop-filter: blur(8px); white-space: nowrap; flex-shrink: 0; }
  .ticker-icon-wrap { width: 58px; height: 58px; border-radius: 13px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.34); border: 1px solid rgba(245,197,24,0.12); flex-shrink: 0; }
  .ticker-icon { width: 44px; height: 44px; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 8px 18px rgba(245,197,24,0.16));}
  .ticker-item span { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: white; letter-spacing: 0; line-height: 1.15;}
  @keyframes ticker { from { transform: translateX(0);} to { transform: translateX(-50%);} }
  @keyframes ticker-reverse { from { transform: translateX(-50%);} to { transform: translateX(0);} }
  @media (max-width: 600px) {
    .ticker-section { padding: 36px 0 42px; }
    .ticker-section::before,
    .ticker-section::after { width: 52px; }
    .ticker-lanes { gap: 10px; }
    .ticker-item { min-width: 160px; padding: 10px 12px 10px 10px; }
    .ticker-icon-wrap { width: 48px; height: 48px; }
    .ticker-icon { width: 36px; height: 36px; }
  }

  /* STATS */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius); overflow: hidden; }
  @media (max-width: 700px) { .stats-row { grid-template-columns: 1fr 1fr; } }
  .stat-cell { background: var(--card); padding: 40px 32px; text-align: center; }
  .stat-num { font-family: var(--font-display); font-size: 56px; color: var(--yellow); line-height: 1; letter-spacing: -2px; margin-bottom: 8px; }
  .stat-label { font-family: var(--font-body); font-size: 15px; color: var(--muted); }

  /* SECTION */
  .section { padding: 90px 0; }
  .section-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--yellow); margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
  .section-label::before { content: ''; width: 24px; height: 1px; background: var(--yellow); }
  .section-h { font-family: var(--font-display); font-size: clamp(46px, 5vw, 104px); line-height: 0.93; color: var(--text); letter-spacing: -0.5px; margin-bottom: 16px; }
  .section-h .yellow { color: var(--yellow); }
  .section-sub { font-family: var(--font-body); font-size: 17px; color: var(--muted); line-height: 1.7; max-width: 520px; }

  /* SERVICES */
  .services-grid { display: flex; flex-direction: column; gap: 70px; margin-top: 70px; }
  .service-section { display: flex; flex-direction: column; gap: 24px; }
  .service-header { max-width: 90%; }
  .service-heading-row { display: flex; align-items: center; gap: 18px; margin-bottom: 16px; }
  .service-heading-icon { width: 58px; height: 58px; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; display: flex; align-items: center; justify-content: center; background: var(--card); font-size: 28px; flex-shrink: 0; }
  .service-tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--yellow); margin-bottom: 16px; }
  .service-title { font-family: var(--font-display); font-size: clamp(24px, 3vw, 48px); font-weight: 400; color: var(--text); line-height: 0.95; }
  .service-desc { font-family: var(--font-body); font-size: 17px; color: var(--muted); line-height: 1.75; max-width: 100%; }
  .service-card { background: var(--card); border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; padding: 18px; transition: border-color 0.25s, transform 0.25s; cursor: default; }
  .service-card:hover { border-color: rgba(245,197,24,0.25); transform: translateY(-3px); }
  .service-samples-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  .sample-slot { aspect-ratio: 9/16; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.18); }
  .service-card img,
  .service-card video { width: 100%; height: 100%; object-fit: contain; display: block; }
  @media (max-width: 900px) {
    .services-grid { gap: 56px; }
    .service-samples-row { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
    .sample-slot { border-radius: 10px; }
  }
  @media (max-width: 600px) {
    .services-grid { gap: 44px; margin-top: 42px; }
    .service-card { padding: 12px; }
    .service-heading-row { gap: 12px; margin-bottom: 12px; }
    .service-heading-icon { width: 48px; height: 48px; border-radius: 12px; font-size: 24px; }
    .service-samples-row { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
    .sample-slot { border-radius: 8px; }
    .service-desc { font-size: 15px; }
  }

  /* SAMPLE PLACEHOLDER */
  .sample-placeholder { width: 100%; min-height: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: linear-gradient(135deg, rgba(19,19,31,0.72), rgba(14,14,24,0.94)); }
  .sample-icon { font-size: 46px; opacity: 0.38; }
  .sample-label { font-family: var(--font-mono); font-size: 11px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }
  @media (max-width: 900px) {
    .sample-icon { font-size: 32px; }
    .sample-label { font-size: 9px; letter-spacing: 0.5px; text-align: center; padding: 0 4px; }
  }
  @media (max-width: 600px) {
    .sample-placeholder { gap: 0; }
    .sample-icon { font-size: 18px; }
    .sample-label { display: none; }
  }

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
  .audience-desc { font-family: var(--font-body); font-size: 15px; color: var(--muted); line-height: 1.65; }
  .audience-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
  .audience-tag { font-family: var(--font-mono); font-size: 11px; color: var(--yellow); background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.15); border-radius: 100px; padding: 3px 10px; }

  /* COMPARE */
  .compare-layout { display: grid; grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr); gap: 56px; align-items: start; }
  .compare-intro { position: sticky; top: 92px; }
  .compare-intro .section-sub { max-width: 460px; }
  .compare-table { margin-top: 0; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .compare-row { display: grid; grid-template-columns: 1fr 120px 120px; border-bottom: 1px solid var(--border2); }
  .compare-row:last-child { border-bottom: none; }
  .compare-row.header { background: var(--card2); }
  .compare-cell { padding: 12px 20px; font-family: var(--font-body); font-size: 15px; color: var(--muted); display: flex; align-items: center; }
  .compare-cell.header { font-family: var(--font-mono); font-size: 12px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }
  .compare-cell.center { justify-content: center; text-align: center; }
  .compare-cell.vidquence { color: var(--yellow); font-weight: 700; }
  .check { color: #22c55e; font-size: 16px; }
  .cross { color: #444; font-size: 16px; }
  @media (max-width: 980px) {
    .compare-layout { grid-template-columns: 1fr; gap: 36px; }
    .compare-intro { position: static; }
    .compare-intro .section-sub { max-width: 620px; }
  }
  @media (max-width: 600px) {
    .compare-row { grid-template-columns: minmax(0, 1fr) 82px 92px; }
    .compare-cell { padding: 14px 12px; font-size: 14px; }
    .compare-cell.header { font-size: 11px; }
  }

  /* PRICING */
  .pricing-grid { display: grid; gap: 16px; margin-top: 50px; }
  .plan { background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(17,17,24,0.98)); border: 1px solid var(--border2); border-radius: var(--radius); padding: 28px; position: relative; overflow: hidden; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; }
  .plan::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 78% 12%, rgba(245,197,24,0.09), transparent 34%); opacity: 0; transition: opacity 0.25s; pointer-events: none; }
  .plan:hover { border-color: rgba(245,197,24,0.28); transform: translateY(-6px); box-shadow: 0 24px 80px rgba(0,0,0,0.38); }
  .plan:hover::before { opacity: 1; }
  .plan-hot { border-color: rgba(245,197,24,0.45) !important; box-shadow: 0 0 0 1px rgba(245,197,24,0.12) inset; }
  .plan-hot-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #0F0E1A; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 5px 18px; border-radius: 100px; white-space: nowrap; z-index: 2; }

  .plan-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; position: relative; z-index: 1; }
  .plan-name { font-family: var(--font-body); font-size: 14px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
  .plan-mini-chip { border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 5px 9px; font-family: var(--font-mono); font-size: 10px; color: var(--muted); white-space: nowrap; background: rgba(255,255,255,0.035); }
  .plan-price { font-family: var(--font-display); font-size: 64px; color: var(--text); line-height: 1; letter-spacing: -2px; }
  .plan-price span { font-size: 28px; color: var(--muted); vertical-align: top; margin-top: 12px; display: inline-block; }
  .plan-cycle { font-family: var(--font-body); font-size: 14px; color: var(--dim); margin-bottom: 4px; }
  .plan-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 18px 0; }
  .plan-stat { border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px; background: rgba(255,255,255,0.035); }
  .plan-stat strong { display: block; font-family: var(--font-body); font-size: 15px; color: var(--text); line-height: 1.1; }
  .plan-stat span { display: block; margin-top: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }
  .plan-meter { height: 9px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; margin: 8px 0 24px; }
  .plan-meter-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, rgba(245,197,24,0.58), var(--yellow)); transition: width 0.25s; }
  .plan-hr { border: none; border-top: 1px solid var(--border2); margin: 22px 0; }
  .plan-feats { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
  .plan-feats li { font-family: var(--font-body); font-size: 15px; color: var(--muted); display: flex; align-items: flex-start; gap: 10px; line-height: 1.4; }
  .plan-feats li::before { content: '✓'; color: var(--yellow); font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .plan-btn { width: 100%; padding: 15px; border-radius: 10px; border: none; cursor: pointer; font-family: var(--font-body); font-size: 15px; font-weight: 800; transition: transform 0.2s, opacity 0.2s, background 0.2s; position: relative; z-index: 1; }
  .plan:hover .plan-btn { transform: translateY(-1px); }
  .plan-btn-default { background: rgba(255,255,255,0.06); color: var(--text); border: 1px solid var(--border); }
  .plan-btn-default:hover { background: rgba(255,255,255,0.1); }
  .plan-btn-hot { background: var(--yellow); color: #0F0E1A; }
  .plan-btn-hot:hover { opacity: 0.85; }
  @media (max-width: 760px) {
    .pricing-grid { grid-template-columns: 1fr !important; }
    .plan { padding: 24px; }
  }

  /* FAQ */
  .faq-section { padding: 90px 0; background: var(--bg2); border-top: 1px solid var(--border2); }
  .faq-inner { max-width: 720px; margin: 0 auto; }

  /* SERVICES — show/hide by breakpoint */
  .services-desktop { display: block; }
  .services-mobile  { display: none; }
  @media (max-width: 768px) {
    .services-desktop { display: none; }
    .services-mobile  { display: block; }
  }

  /* MOBILE SERVICE CARDS */
  .m-svc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 28px; }
  .m-svc-card { position: relative; border-radius: 16px; padding: 20px 16px 16px; display: flex; flex-direction: column; justify-content: flex-end; min-height: 150px; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,0.07); background: #13131e; transition: border-color 0.2s, transform 0.2s; }
  .m-svc-card:active { transform: scale(0.97); }
  .m-svc-card-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%); pointer-events: none; }
  .m-svc-card-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #e8e8f0; text-transform: uppercase; line-height: 1.2; position: relative; z-index: 1; }
  .m-svc-card-desc { font-family: 'Outfit', sans-serif; font-size: 11px; color: rgba(232,232,240,0.75); margin-top: 4px; line-height: 1.35; position: relative; z-index: 1; }

  /* CTA */
  .cta-banner-section { padding: 40px 0 80px; }
  .cta-banner { background: linear-gradient(135deg, #14140e 0%, #1a1a10 100%); border: 1px solid rgba(245,197,24,0.2); border-radius: 20px; padding: 60px 64px; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; position: relative; overflow: hidden; }
  .cta-banner::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 70% 50%, rgba(245,197,24,0.06), transparent 60%); pointer-events: none; }
  .cta-banner-title { font-family: var(--font-display); font-size: clamp(36px, 5vw, 56px); color: var(--text); line-height: 0.95; position: relative; z-index: 1; }
  .cta-banner-sub { font-family: var(--font-body); font-size: 16px; color: var(--muted); margin-top: 12px; position: relative; z-index: 1; }
  .cta-banner-btn { position: relative; z-index: 1; font-family: var(--font-body); font-size: 15px; font-weight: 700; color: var(--yellow); background: #0F0E1A; border: none; border-radius: 12px; padding: 18px 40px; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: opacity 0.2s; }
  .cta-banner-btn:hover { opacity: 0.85; }

  /* FOOTER */
  .footer { border-top: 1px solid var(--border2); padding: 48px 0; }
  .footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
  .footer-links { display: flex; gap: 28px; flex-wrap: wrap; }
  .footer-link { font-family: var(--font-body); font-size: 14px; color: var(--dim); text-decoration: none; transition: color 0.2s; }
  .footer-link:hover { color: var(--muted); }
  .footer-copy { font-family: var(--font-mono); font-size: 12px; color: var(--dim); letter-spacing: 1px; }

  [data-reveal] { opacity: 0; transform: translateY(20px) scale(0.99); transition: opacity 0.65s ease, transform 0.65s ease; }
`;

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [plans, setPlans] = useState([]);
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [cycle, setCycle] = useState("monthly");

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => {});
    fetch(`${SERVER}/api/plans`)
      .then((r) => r.json())
      .then((d) => setPlans(Array.isArray(d) ? d.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)) : []))
      .catch(() => {});
    fetch(`${SERVER}/api/exchange-rate`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.rate) setRate(d.rate);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const offset = hash === "#pricing" ? 280 : 0;
    const scrollTo = (el) => {
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: "smooth" });
    };
    const el = document.querySelector(hash);
    if (el) {
      scrollTo(el);
    } else {
      const t = setTimeout(() => {
        const delayed = document.querySelector(hash);
        if (delayed) scrollTo(delayed);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  const handleCTA = async () => {
    if (session) {
      navigate("/dashboard");
      return;
    }
    try {
      await signInWithGoogle();
    } catch {
      navigate("/login");
    }
  };





  const faqs = [
    {
      q: "How is Vidquence different from other AI video tools?",
      a: "Most tools give you plain text over stock footage. Vidquence is a full AI production studio — every beat of your video gets its own layout, visual design, pacing, and narrative intent. Beyond auto-generated videos, you get a complete creative suite: Product Video Ads, Poster Studio, Thumbnail Generator, Banner Design, Voice Studio, Virtual Try-On, and more — all in one platform.",
    },
    {
      q: "What are credits and how are they used?",
      a: "Credits power every AI action on the platform — video generation, product ads, posters, thumbnails, voiceovers, and more. Each action has a listed credit cost. Check the Credits page for current costs on each service.",
    },
    {
      q: "What services are included?",
      a: "Vidquence includes: AI Video Generator (faceless and talking head modes), Product Video Ads (photo → full video ad), Poster Studio, Thumbnail Generator, Virtual Try-On, Banner Design, Voice Studio (TTS voiceovers), Speech to Text, and Caption Studio. All services in one dashboard.",
    },
    {
      q: "What niches and languages are supported?",
      a: "17 niches including entertainment, gaming, finance, spiritual, food, sports, tech, lifestyle, education, travel, health, skincare, comedy, motivational, news, music, and business. Videos support multilingual scripts and voiceovers including Hindi, English, Arabic, French, Spanish, Portuguese, Urdu, and Turkish.",
    },
    {
      q: "Can I use my own footage and images?",
      a: "Yes. Upload your own images, videos, or talking head footage directly in the editor. For talking head videos, upload your recorded clip and the AI builds the full video around it with captions, layouts, and music. The AI features are optional — the editor works with whatever assets you bring.",
    },
    {
      q: "Can I edit the video after it's generated?",
      a: "Fully. Every element of every beat is editable — change text, swap visuals, adjust timing, change transitions, add overlays, update captions, swap background music, and add sound effects. The AI produces a production-ready starting point. You have complete control from there.",
    },
    {
      q: "Does Product Video Ads work for any product?",
      a: "Yes — clothing, fashion, wearables (watches, earphones, shoes), beauty products, food, gadgets, and more. For clothing, the system uses AI model avatars to show the product being worn. For other products, it generates cinematic product photography shots. Upload one product photo and get a full video ad with multiple scenes, transitions, and background music.",
    },
    {
      q: "Is there a free trial?",
      a: "New accounts get 50 free credits — enough to try several services without a credit card. Product Video Ads requires an active plan. Paid plans start at ₹999/month with no long-term commitment.",
    },
    {
      q: "What are the plan limits?",
      a: "Starter includes 1,800 credits per month. Pro includes 3,500 credits. Agency includes 6,000 credits. All plans include every service on the platform. Check the pricing section for current plan rates.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. Cancel from your account settings at any time. You keep your remaining credits until the end of your billing period. No cancellation fees.",
    },
  ];


  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
          </a>
          <div className="nav-right">
            <a href="/about" className="nav-link">
              About Us
            </a>
            <a href="#services" className="nav-link">
              Services
            </a>
            <a href="#how" className="nav-link">
              How It Works
            </a>
            <a href="#pricing" className="nav-link">
              Pricing
            </a>
            <button className="btn-yellow" onClick={handleCTA}>
              {session ? "Go to Dashboard" : "Start Free"}
            </button>
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
              Creative Production Studio
            </div>
            <h1 className="hero-h1">
              One Platform.
              <br />
              All Your <span className="yellow">Creatives.</span>
            </h1>
            <p className="hero-sub">
              Generate video ads, social posts, product visuals, voiceovers, thumbnails, and more — without hiring a
              designer, editor, or content team.
            </p>
            <div className="hero-actions">
              <button className="hero-cta" onClick={handleCTA}>
                Start Creating Free →
              </button>
              <button
                className="hero-cta-ghost"
                onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              >
                See All Services
              </button>
            </div>
            <div className="hero-proof">✦ 50 free credits on signup · No credit card required</div>
          </div>
        </div>
      </section>


      {/* STATS */}
      <section className="section hidden" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="stats-row" data-reveal>
            <div className="stat-cell">
              <div className="stat-num">10+</div>
              <div className="stat-label">AI creative services</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num">17</div>
              <div className="stat-label">Supported content niches</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num">90+</div>
              <div className="stat-label">Unique visual layouts</div>
            </div>
            <div className="stat-cell">
              <div className="stat-num">&lt;5m</div>
              <div className="stat-label">From idea to finished asset</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section" id="services">
        <div className="container">
          <div className="section-label">The Full Suite</div>

          {/* ── Desktop bento grid ── */}
          <div className="services-desktop">
          {(() => {
            const CARDS = [
              { emoji: "🎬", name: "AI Video Generator",    desc: "Script to viral video in minutes",       route: "/new",            accent: "#7c5cfc", col: "span 3", image: "/assets/images/services/AIVideoGenerator.png"    },
              { emoji: "📦", name: "Product Video Ads",     desc: "One photo → cinematic ad",               route: "/product-video",    accent: "#f97316", col: "span 2", image: "/assets/images/services/ProductVideoAds.png"     },
              { emoji: "👗", name: "Virtual Try-On",        desc: "AI model wearing your product",          route: "/virtual-tryon",  accent: "#ec4899", col: "span 2", image: "/assets/images/services/VirtualTryOn.png"        },
              { emoji: "🎨", name: "Banner Design",         desc: "Social media banners in seconds",        route: "/banner-design",  accent: "#f5c518", col: "span 2", image: "/assets/images/services/BannerDesign.png"        },
              { emoji: "🖼️", name: "Thumbnail Generator",  desc: "Click-worthy thumbnails with AI",        route: "/thumbnail",      accent: "#ef4444", col: "span 2", image: "/assets/images/services/ThumbnailGenerator.png"  },
              { emoji: "🎨", name: "Poster Studio",         desc: "Luxury product posters in seconds",      route: "/product-poster", accent: "#d946ef", col: "span 2", image: "/assets/images/services/PosterStudio.png"        },
              { emoji: "💬", name: "Caption Studio",        desc: "Auto-captions with style",               route: "/video-captions", accent: "#22c55e", col: "span 2", image: "/assets/images/services/CaptionStudio.png"       },
              { emoji: "🎙️", name: "Voice Studio",         desc: "Natural AI voiceovers, multilingual",    route: "/voiceover",      accent: "#3b82f6", col: "span 3", image: "/assets/images/services/VoiceStudio.png"         },
              { emoji: "🔤", name: "Speech to Text",        desc: "Accurate transcription instantly",       route: "/speech-to-text", accent: "#8b5cf6", col: "span 3", image: "/assets/images/services/SpeechtoText.png"        },
            ];

            const cardStyle = (accent, col, image) => ({
              gridColumn: col,
              position: "relative",
              background: image ? `url(${image}) center/cover no-repeat` : "#13131e",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 18,
              padding: "28px 24px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: col === "span 3" ? 240 : 190,
              overflow: "hidden",
              transition: "border-color 0.2s, transform 0.2s",
              cursor: "pointer",
            });

            return (
              <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginTop: 40 }}>
                {/* Row 1 left — heading card */}
                <div style={{
                  gridColumn: "span 3",
                  background: "linear-gradient(135deg, #13131e 60%, rgba(245,197,24,0.07))",
                  border: "1px solid rgba(245,197,24,0.18)",
                  borderRadius: 18,
                  padding: "36px 32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  minHeight: 240,
                }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: "#f5c518", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 16 }}>The Full Suite</div>
                  <h2 style={{ margin: 0, fontSize: "clamp(44px, 5.6vw, 68px)", fontWeight: 800, color: "#e8e8f0", lineHeight: 1.15, letterSpacing: "-0.5px", textTransform: "uppercase", fontFamily: "'Bebas Neue', sans-serif" }}>
                    Stop Switching Tabs.<br /><span style={{ background: "linear-gradient(90deg, #f5c518, #ff7a00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Start Creating.</span>
                  </h2>
                  <p style={{ margin: "14px 0 0", fontSize: 18, color: "#e8e8f0", lineHeight: 1.6, maxWidth: 340 }}>
                    Every creative tool your brand needs — in one place.
                  </p>
                </div>

                {/* Service cards */}
                {CARDS.map((svc) => (
                  <div
                    key={svc.name}
                    data-service={svc.name}
                    style={cardStyle(svc.accent, svc.col, svc.image)}
                    onClick={() => navigate(svc.route)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = svc.accent + "55"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {/* Dark overlay for text readability over background image */}
                    {svc.image && (
                      <div style={{ position: "absolute", inset: "-1px", background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none" }} />
                    )}
                    {/* Accent glow */}
                    {!svc.image && (
                      <div style={{ position: "absolute", top: -60, right: -60, width: 160, height: 160, borderRadius: "50%", background: svc.accent, opacity: 0.07, pointerEvents: "none" }} />
                    )}

                    {/* Bottom — name + desc + button */}
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, position: "relative", zIndex: 1, marginTop: "auto" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0", lineHeight: 1.3, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase" }}>{svc.name}</div>
                          <span style={{ fontSize: 20 }}>{svc.emoji}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#e8e8f0", marginTop: 4, lineHeight: 1.4 }}>{svc.desc}</div>
                      </div>
                      <button
                        style={{
                          flexShrink: 0,
                          background: svc.accent + "22",
                          border: `1px solid ${svc.accent}55`,
                          color: svc.accent,
                          borderRadius: 20,
                          padding: "5px 13px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = svc.accent + "44"}
                        onMouseLeave={e => e.currentTarget.style.background = svc.accent + "22"}
                      >
                        Open →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          </div>{/* end services-desktop */}

          {/* ── Mobile service list ── */}
          <div className="services-mobile">
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ margin: 0, fontSize: 38, fontWeight: 800, color: "#e8e8f0", lineHeight: 1.1, textTransform: "uppercase", fontFamily: "'Bebas Neue', sans-serif" }}>
                Stop Switching Tabs.<br /><span style={{ background: "linear-gradient(90deg, #f5c518, #ff7a00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Start Creating.</span>
              </h2>
              <p style={{ margin: "10px 0 0", fontSize: 15, color: "#e8e8f0", lineHeight: 1.5 }}>Every creative tool your brand needs — in one place.</p>
            </div>
            <div className="m-svc-grid">
              {[
                { emoji: "🎬", name: "AI Video Generator",   desc: "Script to viral video",          route: "/new",            accent: "#7c5cfc", image: "/assets/images/services/AIVideoGenerator.png"   },
                { emoji: "📦", name: "Product Video Ads",    desc: "One photo → cinematic ad",       route: "/product-video",    accent: "#f97316", image: "/assets/images/services/ProductVideoAds.png"    },
                { emoji: "👗", name: "Virtual Try-On",       desc: "AI model, your product",         route: "/virtual-tryon",  accent: "#ec4899", image: "/assets/images/services/VirtualTryOn.png"       },
                { emoji: "🎨", name: "Banner Design",        desc: "Social banners in seconds",      route: "/banner-design",  accent: "#f5c518", image: "/assets/images/services/BannerDesign.png"       },
                { emoji: "🖼️", name: "Thumbnails",          desc: "Click-worthy AI thumbnails",     route: "/thumbnail",      accent: "#ef4444", image: "/assets/images/services/ThumbnailGenerator.png" },
                { emoji: "🎨", name: "Poster Studio",        desc: "Luxury product posters",         route: "/product-poster", accent: "#d946ef", image: "/assets/images/services/PosterStudio.png"       },
                { emoji: "💬", name: "Caption Studio",       desc: "Auto-captions with style",       route: "/video-captions", accent: "#22c55e", image: "/assets/images/services/CaptionStudio.png"      },
                { emoji: "🎙️", name: "Voice Studio",        desc: "AI voiceovers, multilingual",    route: "/voiceover",      accent: "#3b82f6", image: "/assets/images/services/VoiceStudio.png"        },
                { emoji: "🔤", name: "Speech to Text",       desc: "Accurate transcription",         route: "/speech-to-text", accent: "#8b5cf6", image: "/assets/images/services/SpeechtoText.png"       },
              ].map(svc => (
                <div key={svc.name} className="m-svc-card"
                  style={{ background: svc.image ? `url(${svc.image}) center/cover no-repeat` : "#13131e", borderColor: svc.accent + "33" }}
                  onClick={() => navigate(svc.route)}
                >
                  {svc.image && <div className="m-svc-card-overlay" />}
                  <div className="m-svc-card-name" style={{ color: "#e8e8f0" }}>{svc.name}</div>
                  <div className="m-svc-card-desc">{svc.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-label">Built For</div>
          <h2 className="section-h">
            Made for brands
            <br />
            <span className="yellow">that move fast.</span>
          </h2>
          <p className="section-sub">
            Whether you're a solo founder or a full marketing team — Vidquence replaces your entire content production
            stack.
          </p>

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
                <div className="audience-tags">
                  {a.tags.map((t, j) => (
                    <span key={j} className="audience-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        className="section"
        style={{
          background: "var(--bg2)",
          borderTop: "1px solid var(--border2)",
          borderBottom: "1px solid var(--border2)",
        }}
        id="how"
      >
        <div className="container">
          <div className="section-label">How It Works</div>
          <h2 className="section-h">
            Three steps.
            <br />
            <span className="yellow">One output.</span>
          </h2>
          <p className="section-sub">No learning curve. No complex settings. Just describe what you need and get it.</p>

          <div className="process" data-reveal>
            {[
              {
                n: "01",
                title: "Describe or Upload",
                desc: "Type a topic, paste a URL, or upload your product photo, logo, or video. That's all the input you need.",
              },
              {
                n: "02",
                title: "AI Does the Work",
                desc: "Our AI writes the strategy, generates visuals, records voiceovers, applies layouts, adds music — all automatically.",
              },
              {
                n: "03",
                title: "Download & Publish",
                desc: "Export your finished asset in seconds. Edit anything you want in our full editor before exporting.",
              },
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
          <div className="compare-layout">
            <div className="compare-intro">
              <div className="section-label">Why Vidquence</div>
              <h2 className="section-h">
                One tool.
                <br />
                <span className="yellow">Not 10.</span>
              </h2>
              <p className="section-sub">
                Most teams spend $200+/mo on separate tools for video, design, voice, and captions. Vidquence replaces
                all of them.
              </p>
            </div>

            <div className="compare-table" data-reveal>
              <div className="compare-row header">
                <div className="compare-cell header">Feature</div>
                <div className="compare-cell header center">Others</div>
                <div className="compare-cell header center" style={{ color: "var(--yellow)" }}>
                  Vidquence
                </div>
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
                <div className="compare-cell" style={{ color: "var(--muted)", fontSize: 15 }}>
                  {feat}
                </div>
                <div className="compare-cell center">
                  {others === false ? (
                    <span className="cross">✕</span>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--dim)" }}>{others}</span>
                  )}
                </div>
                <div className="compare-cell center vidquence">
                  {ours ? <span className="check">✓</span> : <span className="cross">✕</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </section>

      {/* PRICING */}
      <section
        className="section"
        id="pricing"
        style={{ background: "var(--bg2)", borderTop: "1px solid var(--border2)" }}
      >
        <div className="container">
          <div className="section-label">Pricing</div>
          <h2 className="section-h">
            Simple pricing.
            <br />
            <span className="yellow">No surprises.</span>
          </h2>
          <p className="section-sub">One plan unlocks every service. Cancel anytime.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 32, flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--card)",
                border: "1px solid var(--border2)",
                borderRadius: 10,
                padding: 4,
                gap: 4,
              }}
            >
              {["monthly", "annual"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  style={{
                    padding: "7px 20px",
                    borderRadius: 7,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-body)",
                    background: cycle === c ? "var(--yellow)" : "transparent",
                    color: cycle === c ? "#0F0E1A" : "var(--muted)",
                    transition: "all 0.15s",
                  }}
                >
                  {c === "monthly" ? "Monthly" : "Annual"}
                  {c === "annual" && (
                    <span
                      style={{ fontSize: 11, marginLeft: 5, color: cycle === "annual" ? "#0F0E1A" : "var(--yellow)" }}
                    >
                      Save more
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)" }}>
              Live rate: 1 USD = ₹{rate.toFixed(2)}
            </div>
          </div>

          <div
            className="pricing-grid"
            data-reveal
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
          >
            {plans.length === 0
              ? [0, 1, 2].map((i) => <div key={i} className="plan" style={{ opacity: 0.3, minHeight: 320 }} />)
              : plans.map((plan, planIndex) => {
                  const monthly = plan.price_monthly;
                  const discount = plan.discount_percent || 0;
                  const annualTotal = Math.round(monthly * 12 * (1 - discount / 100));
                  const annualPerMo = Math.round(annualTotal / 12);
                  const usd = cycle === "annual" ? annualPerMo : monthly;
                  const hasDiscount = cycle === "annual" && discount > 0;
                  const inr = toINR(usd, rate);
                  const meterWidth = `${Math.min(100, 42 + planIndex * 24)}%`;
                  const PLAN_FEATURES = {
                    starter: [
                      "1,800 Credits/month",
                      "Product Ad Studio",
                      "TTS Voiceover",
                      "AI Image Generator",
                      "Product Poster",
                      "Video Captions",
                      "AI Video Generator",
                      "Typography Videos",
                    ],
                    pro: [
                      "3,500 Credits/month",
                      "Product Ad Studio",
                      "TTS Voiceover",
                      "AI Image Generator",
                      "Product Poster",
                      "Video Captions",
                      "AI Video Generator",
                      "Typography Videos",
                      "Explainer Videos",
                      "Banner & Thumbnail Generator",
                      "Virtual Try-On",
                      "Speech to Text",
                    ],
                    agency: [
                      "6,000 Credits/month",
                      "Product Ad Studio",
                      "TTS Voiceover",
                      "AI Image Generator",
                      "Product Poster",
                      "Video Captions",
                      "AI Video Generator",
                      "Typography Videos",
                      "Explainer Videos",
                      "Banner & Thumbnail Generator",
                      "Virtual Try-On",
                      "Speech to Text",
                      "Product Video Ads",
                      "Social Media Post Generator",
                      "Best credit value per dollar",
                    ],
                  };
                  const feats = PLAN_FEATURES[plan.slug] || [];
                  return (
                    <div key={plan.id} className={`plan${plan.is_popular ? " plan-hot" : ""}`}>
                      {plan.is_popular && <div className="plan-hot-badge">Most Popular</div>}
                      <div className="plan-head">
                        <div className="plan-name">{plan.name}</div>
                        <div className="plan-mini-chip">{cycle === "annual" ? "Annual" : "Monthly"}</div>
                      </div>
                      {cycle === "annual" ? (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <div className="plan-price">
                              <span>$</span>
                              {annualTotal}
                            </div>
                            {hasDiscount && (
                              <div
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 18,
                                  color: "var(--dim)",
                                  textDecoration: "line-through",
                                }}
                              >
                                ${monthly * 12}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <div className="plan-cycle" style={{ marginBottom: 0 }}>
                              per year
                            </div>
                            {hasDiscount && (
                              <div
                                style={{
                                  display: "inline-block",
                                  background: "rgba(245,197,24,0.15)",
                                  color: "var(--yellow)",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: "0.05em",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                }}
                              >
                                {discount}% OFF
                              </div>
                            )}
                          </div>
                          <div
                            style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)", marginTop: 4 }}
                          >
                            ≈ ₹{toINR(annualTotal, rate)}/yr · ${annualPerMo}/mo
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 16 }}>
                          <div className="plan-price">
                            <span>$</span>
                            {monthly}
                          </div>
                          <div className="plan-cycle" style={{ marginBottom: 2 }}>
                            per month
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)" }}>
                            ≈ ₹{inr}/mo
                          </div>
                        </div>
                      )}
                      <div className="plan-meter" aria-hidden="true">
                        <div className="plan-meter-fill" style={{ width: meterWidth }} />
                      </div>
                      <div className="plan-hr" />
                      <ul className="plan-feats">
                        {feats.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                      <button
                        className={`plan-btn ${plan.is_popular ? "plan-btn-hot" : "plan-btn-default"}`}
                        onClick={() => navigate(`/checkout?plan=${plan.slug}&cycle=${cycle}`)}
                      >
                        Get Started
                      </button>
                    </div>
                  );
                })}
          </div>

          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--dim)",
              letterSpacing: 1,
            }}
          >
            50 free credits on signup · No credit card required · Cancel anytime
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-inner">
            <div className="section-label">Questions</div>
            <h2 className="section-h" style={{ marginBottom: 48 }}>
              Things people
              <br />
              <span className="yellow">actually ask.</span>
            </h2>
            <div data-reveal>
              {faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <div className="cta-banner-section">
        <div className="container">
          <div className="cta-banner" data-reveal>
            <div>
              <div className="cta-banner-title">
                Stop hiring.
                <br />
                Start creating.
              </div>
              <div className="cta-banner-sub">50 free credits. No card required. Every service unlocked.</div>
            </div>
            <button className="cta-banner-btn" onClick={handleCTA}>
              Get Started Free →
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <a href="/" className="nav-logo">
              <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
            </a>
            <div className="footer-links">
              <a href="/about" className="footer-link">
                About
              </a>
              <a href="/terms" className="footer-link">
                Terms
              </a>
              <a href="/privacy" className="footer-link">
                Privacy
              </a>
              <a href="/refunds" className="footer-link">
                Refunds
              </a>
            </div>
            <a href="mailto:hello@vidquence.com" className="footer-link">
              hello@vidquence.com
            </a>
            <div className="footer-copy">© 2026 VIDQUENCE</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
