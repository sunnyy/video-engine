/**
 * LandingPage.jsx — Vidquence
 * "AI-Powered Creative Studio"
 * Redesigned to showcase all services, not just video generation.
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithGoogle, getSession } from "../services/auth/authService";
import { SERVER } from "../services/serverApi";
import { videoServices } from "../config/serviceCatalog";
import { Sparkles, Clapperboard, ShoppingBag, MessageCircle, Type, Captions, Palette, Mic, Clock, Smartphone, ArrowUp, ChevronDown } from "lucide-react";

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

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  :root {
    --bg: #0F0E1A; --bg2: #0f0f16; --card: #111118; --card2: #13131c;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.04);
    --yellow: #f5c518; --yellow-dim: rgba(245,197,24,0.10); --yellow-glow: rgba(245,197,24,0.06);
    --text: #f5f5fb; --muted: #c4c4d4; --dim: #9a9aae;
    --font-display: 'Inter', sans-serif;
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
  .hero { padding: 116px 0 28px; position: relative; overflow: hidden; }
  .hero-grid-bg { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(var(--border2) 1px, transparent 1px), linear-gradient(90deg, var(--border2) 1px, transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%); }
  .hero-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; pointer-events: none; background: radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 65%); }
  .hero-inner { position: relative; z-index: 1; text-align: center; max-width: 860px; margin: 0 auto; }
  .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--yellow-dim); border: 1px solid rgba(245,197,24,0.2); border-radius: 100px; padding: 6px 16px; margin-bottom: 36px; font-family: var(--font-mono); font-size: 12px; color: var(--yellow); letter-spacing: 2px; text-transform: uppercase; }
  .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .hero-h1 { font-family: 'Inter', sans-serif; font-weight: 700; font-size: clamp(40px, 5.2vw, 74px); line-height: 1.08; letter-spacing: -0.02em; color: var(--text); margin-bottom: 20px; }
  .hero-h1 .yellow { color: var(--yellow); }
  .hero-h1 .outline { -webkit-text-stroke: 1.5px rgba(255,255,255,0.18); color: transparent; }
  .hero-sub { font-family: var(--font-body); font-size: 18px; color: var(--muted); line-height: 1.65; max-width: 600px; margin: 0 auto 30px; }
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
  .stats-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent); margin-bottom: 46px; }
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border-radius: var(--radius); overflow: hidden; }
  @media (max-width: 700px) { .stats-row { grid-template-columns: 1fr 1fr; } }
  .stat-cell { background: var(--card); padding: 40px 32px; text-align: center; transition: background 0.2s; }
  .stat-cell:hover { background: var(--card2); }
  .stat-num { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 54px; color: var(--yellow); line-height: 1; letter-spacing: -2px; margin-bottom: 8px; }
  .stat-label { font-family: var(--font-body); font-size: 15px; color: var(--muted); }

  /* SECTION */
  .section { padding: 90px 0; }
  .section-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--yellow); margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 12px; }
  .section-label::before, .section-label::after { content: ''; width: 24px; height: 1px; background: var(--yellow); }
  .section-h { font-family: 'Inter', sans-serif; font-weight: 800; font-size: clamp(32px, 4vw, 56px); line-height: 1.08; color: var(--text); letter-spacing: -0.02em; margin-bottom: 16px; text-align: center; }
  .section-h .yellow { color: var(--yellow); }
  .section-sub { font-family: var(--font-body); font-size: 17px; color: var(--muted); line-height: 1.7; max-width: 600px; text-align: center; margin-left: auto; margin-right: auto; text-wrap: balance; }

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
  .plan { background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(17,17,24,0.98)); border: 1px solid var(--border2); border-radius: var(--radius); padding: 28px; position: relative; transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s; }
  .plan::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(circle at 78% 12%, rgba(245,197,24,0.09), transparent 34%); opacity: 0; transition: opacity 0.25s; pointer-events: none; }
  .plan:hover { border-color: rgba(245,197,24,0.28); transform: translateY(-6px); box-shadow: 0 24px 80px rgba(0,0,0,0.38); }
  .plan:hover::before { opacity: 1; }
  .plan-hot { border-color: rgba(245,197,24,0.45) !important; box-shadow: 0 0 0 1px rgba(245,197,24,0.12) inset; }
  .plan-hot-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #0F0E1A; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 5px 18px; border-radius: 100px; white-space: nowrap; z-index: 2; }

  .plan-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; position: relative; z-index: 1; }
  .plan-name { font-family: var(--font-body); font-size: 14px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
  .plan-mini-chip { border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 5px 9px; font-family: var(--font-mono); font-size: 10px; color: var(--muted); white-space: nowrap; background: rgba(255,255,255,0.035); }
  .plan-price { font-family: var(--font-display); font-weight: 800; font-size: 44px; color: var(--text); line-height: 1; letter-spacing: -2px; }
  .plan-price span { font-size: 28px; color: var(--muted); vertical-align: top; margin-top: 12px; display: inline-block; }
  .plan-cycle { font-family: var(--font-body); font-size: 14px; color: var(--dim); margin-bottom: 4px; }
  .plan-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 18px 0; }
  .plan-stat { border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px; background: rgba(255,255,255,0.035); }
  .plan-stat strong { display: block; font-family: var(--font-body); font-size: 15px; color: var(--text); line-height: 1.1; }
  .plan-stat span { display: block; margin-top: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--dim); letter-spacing: 1px; text-transform: uppercase; }
  .plan-meter { height: 9px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; margin: 4px 0 18px; }
  .plan-meter-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, rgba(245,197,24,0.58), var(--yellow)); transition: width 0.25s; }
  .plan-hr { border: none; border-top: 1px solid var(--border2); margin: 22px 0; }
  .plan-price-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  .plan-credits-badge { text-align: right; flex-shrink: 0; padding-bottom: 6px; }
  .plan-credits-badge .num { font-family: 'Inter', sans-serif; font-weight: 800; font-size: 22px; line-height: 1; color: var(--yellow); display: flex; align-items: center; gap: 5px; justify-content: flex-end; white-space: nowrap; }
  .plan-credits-badge .lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--dim); margin-top: 5px; }
  .plan-feats-note { font-family: var(--font-body); font-size: 12px; color: var(--dim); margin-bottom: 18px; line-height: 1.45; }
  .plan-feats { display: flex; flex-direction: column; gap: 18px; margin-bottom: 28px; }
  .plan-feat-cat { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--dim); padding-bottom: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--border2); }
  .plan-feats ul { list-style: none; display: flex; flex-direction: column; gap: 11px; padding: 0; margin: 0; }
  .plan-feats li { font-family: var(--font-body); font-size: 14px; color: var(--muted); display: flex; align-items: flex-start; gap: 11px; line-height: 1.4; }
  .plan-feats li .mark { flex-shrink: 0; width: 5px; height: 5px; border-radius: 50%; background: var(--yellow); margin-top: 7px; }
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
  .cta-banner-title { font-family: 'Inter', sans-serif; font-weight: 700; font-size: clamp(32px, 4vw, 50px); color: var(--text); line-height: 1.08; letter-spacing: -0.02em; position: relative; z-index: 1; }
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

  /* HERO rating / trust badge */
  .hero-rating { display: inline-flex; align-items: center; gap: 12px; padding: 8px 16px; border-radius: 100px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); margin-bottom: 30px; font-family: var(--font-body); font-size: 13px; color: var(--muted); }
  .hero-rating strong { color: var(--text); font-weight: 800; }
  .hero-stars { color: var(--yellow); letter-spacing: 2px; font-size: 13px; }
  .hero-rating .div { width: 1px; height: 14px; background: rgba(255,255,255,0.14); }
  @media (max-width: 480px) { .hero-rating { gap: 8px; padding: 7px 12px; font-size: 12px; } }

  /* HERO CHATBOX — Topview-style create surface */
  .hero-chat { max-width: 900px; margin: 32px auto 0; }
  .hero-tabs::-webkit-scrollbar { display: none; }
  .hero-tabs { scrollbar-width: none; }
  .hero-examples { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 16px; }
  .hero-example { font-family: var(--font-body); font-size: 13px; color: var(--muted); background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 10px; padding: 7px 13px; cursor: pointer; transition: all 0.15s; }
  .hero-example:hover { color: var(--text); border-color: rgba(255,255,255,0.22); }

  /* HERO platforms */
  .hero-platforms { margin-top: 34px; text-align: center; }
  .hero-platforms-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); margin-bottom: 14px; }
  .hero-platforms-row { display: flex; align-items: center; justify-content: center; gap: 28px; flex-wrap: wrap; }
  .hero-platforms-row span { font-family: var(--font-body); font-size: 15px; font-weight: 700; color: var(--muted); opacity: 0.85; transition: opacity 0.2s; }
  .hero-platforms-row span:hover { opacity: 1; }

  /* SAMPLES GALLERY (live, masonry) */
  .samples-masonry { column-count: 5; column-gap: 16px; margin-top: 44px; }
  @media (max-width: 1100px) { .samples-masonry { column-count: 3; } }
  @media (max-width: 760px)  { .samples-masonry { column-count: 2; column-gap: 12px; } }
  .sample-card { break-inside: avoid; -webkit-column-break-inside: avoid; margin-bottom: 16px; position: relative; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); background: var(--card); }
  .sample-card img, .sample-card video { width: 100%; display: block; background: #060a14; }
  .sample-badge { position: absolute; left: 12px; top: 12px; padding: 4px 9px; border-radius: 7px; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--text); letter-spacing: 0.5px; }

  /* FULL SUITE — asymmetric bento */
  .bento { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 192px; grid-auto-flow: dense; gap: 14px; margin-top: 44px; }
  .bento-tile { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); background: #13131e; cursor: pointer; box-shadow: 0 14px 44px rgba(0,0,0,0.34); transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
  .bento-tile:hover { transform: translateY(-4px); border-color: rgba(245,197,24,0.32); box-shadow: 0 24px 64px rgba(0,0,0,0.5); }
  .bento-tile.lg   { grid-column: span 2; grid-row: span 2; }
  .bento-tile.wide { grid-column: span 2; }
  .bento-tile.tall { grid-row: span 2; }
  .bento-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
  .bento-tile:hover .bento-media { transform: scale(1.07); }
  .bento-scrim { position: absolute; inset: 0; background: linear-gradient(to top, rgba(8,8,12,0.92) 0%, rgba(8,8,12,0.25) 52%, rgba(8,8,12,0.04) 100%); }
  .bento-body { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 18px 16px; z-index: 1; }
  .bento-name { font-family: var(--font-body); font-size: 18px; font-weight: 800; color: #fff; line-height: 1.2; letter-spacing: -0.01em; }
  .bento-tile.lg .bento-name { font-size: 27px; }
  .bento-desc { font-family: var(--font-body); font-size: 13px; color: rgba(255,255,255,0.78); margin-top: 4px; }
  .bento-open { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #14140a; font-weight: 800; font-size: 15px; opacity: 0; transform: translateY(-4px); transition: opacity 0.2s, transform 0.2s; z-index: 1; }
  .bento-tile:hover .bento-open { opacity: 1; transform: translateY(0); }
  @media (max-width: 900px) {
    .bento { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 160px; }
    .bento-tile.lg { grid-column: span 2; grid-row: span 2; }
    .bento-tile.wide { grid-column: span 2; grid-row: span 1; }
    .bento-tile.tall { grid-column: span 1; grid-row: span 2; }
  }
  @media (max-width: 540px) {
    .bento { grid-auto-rows: 132px; gap: 10px; }
    .bento-tile.lg .bento-name { font-size: 21px; }
    .bento-name { font-size: 16px; }
  }
`;

/* ── Hero chatbox — a decorative replica of the in-app create surface. Morphs per video
   service; any submit funnels to signup (no real generation on the public page). ── */
const HC = { surface: "#0e1018", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8" };

const HERO_SERVICES = [
  { id: "ai-video",   label: "Prompt to Video",  Icon: Sparkles,      accent: "#f59e0b", placeholder: "Describe your video idea — any topic, any take…" },
  { id: "saas",       label: "SaaS Video",       Icon: Clapperboard,  accent: "#f5c518", placeholder: "Your SaaS website URL — e.g. https://yourapp.com" },
  { id: "product",    label: "Product Video",    Icon: ShoppingBag,   accent: "#f97316", placeholder: "Upload a product photo or paste a store URL…" },
  { id: "social",     label: "Social to Video",  Icon: MessageCircle, accent: "#22d3ee", placeholder: "Paste an X, Instagram, or LinkedIn post URL…" },
  { id: "typography", label: "Typography Video", Icon: Type,          accent: "#7c5cfc", placeholder: "A topic, or paste your full script…" },
  { id: "captions",   label: "Auto Captions",    Icon: Captions,      accent: "#34d399", placeholder: "Upload a video to add animated captions…" },
];

// Ghost control chip with a caret — mirrors the Topview-style chatbox controls.
function HeroChip({ icon, value }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 11px", borderRadius: 10,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", fontFamily: "var(--font-body)",
    }}>
      <span style={{ display: "flex", alignItems: "center", color: HC.muted }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: HC.text }}>{value}</span>
      <ChevronDown size={13} color={HC.muted} style={{ opacity: 0.6, marginLeft: -1 }} />
    </span>
  );
}

function HeroChatbox({ onSubmit }) {
  const [sel, setSel]   = useState(0);
  const [text, setText] = useState("");
  const svc = HERO_SERVICES[sel];
  const filled = !!text.trim();
  return (
    <div className="hero-chat">
      <div style={{ background: "#16141f", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "14px 18px 16px", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", textAlign: "left" }}>
        {/* Service tabs */}
        <div className="hero-tabs" style={{ display: "flex", gap: 22, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", overflowX: "auto", whiteSpace: "nowrap" }}>
          {HERO_SERVICES.map((s, i) => {
            const active = i === sel;
            return (
              <button key={s.id} onClick={() => setSel(i)} style={{
                background: "none", border: "none", borderBottom: `2px solid ${active ? s.accent : "transparent"}`,
                marginBottom: -1, paddingBottom: 12, cursor: "pointer", fontFamily: "var(--font-body)",
                fontSize: 14, fontWeight: 700, color: active ? "#fff" : "#8a8a99", whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 7, transition: "color 0.15s", flexShrink: 0,
              }}>
                <s.Icon size={15} color={active ? s.accent : "#8a8a99"} />{s.label}
              </button>
            );
          })}
        </div>

        {/* Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder={svc.placeholder}
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", resize: "none", border: "none", outline: "none", background: "transparent", color: HC.text, fontSize: 16.5, fontFamily: "var(--font-body)", lineHeight: 1.55, minHeight: 80, marginTop: 16 }}
        />

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HeroChip icon={<Palette size={15} />} value="Auto" />
            <HeroChip icon={<Mic size={15} />}     value="English" />
            <HeroChip icon={<Clock size={15} />}   value="30s" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <HeroChip icon={<Smartphone size={15} />} value="9:16" />
            <button onClick={onSubmit} title="Start free" aria-label="Start free" style={{
              width: 38, height: 38, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.18s",
              border: `1px solid ${filled ? "transparent" : "rgba(255,255,255,0.12)"}`,
              background: filled ? svc.accent : "rgba(255,255,255,0.05)",
              color: filled ? "#14140a" : "#8a8a99",
            }}>
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Live samples gallery — pulls the same admin-curated outputs the Dashboard shows. ── */
const SAMPLE_SERVICE_LABELS = {
  ai_videos: "Prompt to Video", saas_video: "SaaS Video", product_video: "Product Video",
  social_video: "Social to Video", typography_video: "Typography Video", captions: "Auto Captions",
  thumbnails: "Thumbnail", posters: "Poster", social_posts: "Banner / Post",
  product_ads: "Product Ad", virtual_tryon: "Virtual Try-On",
};

function SampleCard({ sample }) {
  const vidRef = useRef(null);
  const isVid  = sample.type === "video";
  const label  = SAMPLE_SERVICE_LABELS[sample.service_key] || sample.service_key;
  useEffect(() => {
    if (!isVid) return;
    const el = vidRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [isVid]);
  return (
    <div className="sample-card">
      {isVid
        ? <video ref={vidRef} src={sample.src} poster={sample.poster || undefined} muted loop playsInline preload="metadata" />
        : <img src={sample.src} alt={label} loading="lazy" />}
      <div className="sample-badge">{label}</div>
    </div>
  );
}

function SamplesGallery() {
  const [samples, setSamples] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(`${SERVER}/api/admin/samples/public?limit=60`)
      .then((r) => r.json())
      .then((d) => { if (alive) setSamples((d.samples || []).filter((s) => s.src)); })
      .catch(() => { if (alive) setSamples([]); });
    return () => { alive = false; };
  }, []);
  if (!samples || !samples.length) return null; // nothing curated yet → hide entirely
  return (
    <section className="section" id="samples" style={{ paddingTop: 40 }}>
      <div className="container">
        <div className="section-label">Made with Vidquence</div>
        <h2 className="section-h">See what people<br /><span className="yellow">are making.</span></h2>
        <p className="section-sub">Real outputs from every service — generated in minutes, then editable down to the last frame.</p>
        <div className="samples-masonry">
          {samples.map((s) => <SampleCard key={s.id} sample={s} />)}
        </div>
      </div>
    </section>
  );
}

/* ── The Full Suite — asymmetric bento, real sample media, hover-play. ── */
const SUITE_TILES = [
  { name: "Prompt to Video",  desc: "Any idea → a finished video",  route: "/dashboard",        key: "ai_videos",        accent: "#f59e0b", size: "lg" },
  { name: "Product Video",    desc: "A photo → a cinematic ad",     route: "/product-video",    key: "product_video",    accent: "#f97316", size: "wide" },
  { name: "Virtual Try-On",   desc: "Your product, on a model",     route: "/virtual-tryon",    key: "virtual_tryon",    accent: "#ec4899", size: "tall" },
  { name: "SaaS Video",       desc: "Your website → a promo",       route: "/promo-video",      key: "saas_video",       accent: "#f5c518", size: "sm" },
  { name: "Social to Video",  desc: "A post → a short",             route: "/social-video",     key: "social_video",     accent: "#22d3ee", size: "sm" },
  { name: "Typography Video", desc: "Kinetic text videos",          route: "/typography-video", key: "typography_video", accent: "#7c5cfc", size: "sm" },
  { name: "Auto Captions",    desc: "Styled animated captions",     route: "/video-captions",   key: "captions",         accent: "#34d399", size: "sm" },
  { name: "Poster Studio",    desc: "Luxury product posters",       route: "/product-poster",   key: "posters",          accent: "#d946ef", size: "sm" },
  { name: "Thumbnails",       desc: "Click-worthy thumbnails",      route: "/thumbnail",        key: "thumbnails",       accent: "#ef4444", size: "sm" },
  { name: "Banner Design",    desc: "On-brand social banners",      route: "/banner-design",    key: "social_posts",     accent: "#3b82f6", size: "sm" },
];

function SuiteTile({ tile, sample, onClick }) {
  const vidRef = useRef(null);
  const isVid = sample?.type === "video";
  const onEnter = () => { if (isVid) vidRef.current?.play().catch(() => {}); };
  const onLeave = () => { if (isVid && vidRef.current) { vidRef.current.pause(); vidRef.current.currentTime = 0; } };
  return (
    <div className={`bento-tile ${tile.size}`} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {sample ? (
        isVid
          ? <video ref={vidRef} className="bento-media" src={sample.src} poster={sample.poster || undefined} muted loop playsInline preload="metadata" />
          : <img className="bento-media" src={sample.src} alt={tile.name} loading="lazy" />
      ) : (
        <div className="bento-media" style={{ background: `radial-gradient(circle at 72% 18%, ${tile.accent}38, transparent 60%), #13131e` }} />
      )}
      <div className="bento-scrim" />
      <div className="bento-body">
        <div className="bento-name">{tile.name}</div>
        <div className="bento-desc">{tile.desc}</div>
      </div>
      <div className="bento-open" style={{ background: tile.accent }}>↗</div>
    </div>
  );
}

function FullSuiteBento({ onTileClick }) {
  const [byKey, setByKey] = useState({});
  useEffect(() => {
    let alive = true;
    fetch(`${SERVER}/api/admin/samples/public?limit=150`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const m = {};
        for (const s of (d.samples || [])) { if (s.src && !m[s.service_key]) m[s.service_key] = s; }
        setByKey(m);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return (
    <div className="bento">
      {SUITE_TILES.map((t) => <SuiteTile key={t.name} tile={t} sample={byKey[t.key]} onClick={() => onTileClick(t.route)} />)}
    </div>
  );
}

// Counts up to `to` once scrolled into view (eased). Renders prefix + number + suffix.
function CountUp({ to, prefix = "", suffix = "", duration = 1400 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const fired = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !fired.current) {
        fired.current = true;
        const start = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - start) / duration);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

const HERO_STATS = [
  { to: 20,   suffix: "K+", label: "Videos created" },
  { to: 7500, suffix: "+",  label: "Creators & brands" },
  { to: 30,   suffix: "+",  label: "Languages supported" },
  { to: 1, suffix: "m+", label: "Idea to finished video" },
];

// Checkmark feature row + the "Everything in X, plus:" group label for the pricing cards.
function Check({ children, accent }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.45 }}>
      <span style={{ color: accent || "var(--yellow)", fontWeight: 800, flexShrink: 0, marginTop: 1, fontSize: 12 }}>✓</span>
      <span>{children}</span>
    </div>
  );
}
function PlusLabel({ children }) {
  return <div style={{ fontSize: 12.5, fontWeight: 700, color: "#e8e8f0", margin: "6px 0 2px" }}>{children}</div>;
}
// A "not included" row (crossed out) — e.g. paid-only features shown on the Free card.
function Cross({ children }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "var(--dim)", lineHeight: 1.45, opacity: 0.75 }}>
      <span style={{ color: "#6b6b80", fontWeight: 800, flexShrink: 0, marginTop: 1, fontSize: 12 }}>✕</span>
      <span style={{ textDecoration: "line-through" }}>{children}</span>
    </div>
  );
}
// The full service list shown on every pricing card (from the catalog, so it never drifts).
function VideoServicesList() {
  return (
    <>
      <PlusLabel>All video services</PlusLabel>
      {videoServices().map((s) => (
        <Check key={s.key}>{s.beta ? `${s.name} (Beta)` : s.name}</Check>
      ))}
      <Check>10+ AI image &amp; audio tools</Check>
    </>
  );
}

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [plans, setPlans] = useState([]);
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [cycle, setCycle] = useState("annual");

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

  // Service cards: signed-in users go straight to the tool; logged-out visitors are
  // funneled to signup (protected routes would just bounce them to /login anyway).
  const handleCardClick = (route) => {
    if (session) navigate(route);
    else handleCTA();
  };

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
            <a href="#samples" className="nav-link">
              Samples
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
            <div className="hero-rating">
              <span className="hero-stars">★★★★★</span>
              <strong>4.8</strong>
              <span className="div" />
              <span>Trusted by <strong>1,500+</strong> creators</span>
            </div>
            <h1 className="hero-h1">
              The only video tool
              <br />
              you'll ever <span className="yellow">need.</span>
            </h1>
            <p className="hero-sub">
              Create more videos, save hours of work, and scale your content with one AI-powered platform built for every workflow.
            </p>
            <HeroChatbox onSubmit={handleCTA} />
            <div className="hero-platforms">
              <div className="hero-platforms-label">Create &amp; auto-publish to</div>
              <div className="hero-platforms-row">
                <span>YouTube</span>
                <span>Instagram</span>
                <span>TikTok</span>
                <span>X</span>
                <span>LinkedIn</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* STATS */}
      <section style={{ padding: "28px 0 0" }}>
        <div className="container">
          <div className="stats-divider" />
          <div className="stats-row" data-reveal>
            {HERO_STATS.map((s, i) => (
              <div key={i} className="stat-cell">
                <div className="stat-num"><CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} /></div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAMPLES — live, admin-curated outputs */}
      <SamplesGallery />

      {/* SERVICES */}
      <section className="section" id="services">
        <div className="container">
          <div className="section-label">The Full Suite</div>
          <h2 className="section-h">
            Stop switching tabs.
            <br />
            <span className="yellow">Start creating.</span>
          </h2>
          <p className="section-sub">
            Every creative tool your brand needs — video, image, and audio — in one place.
          </p>
          <FullSuiteBento onTileClick={handleCardClick} />
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
      <section className="section" style={{ display: "none" }}>
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
              ["AI Video (prompt → video)", false, true],
              ["Promo Video (incl. URL mode)", false, true],
              ["Social-to-Video", false, true],
              ["Typography Video", false, true],
              ["Talking Head Video", false, true],
              ["Product Video & Ads", false, true],
              ["AI Image Generation", false, true],
              ["Virtual Try-On for Clothing", false, true],
              ["Social / Banner Design", false, true],
              ["Thumbnail Generator", false, true],
              ["Poster Studio", false, true],
              ["Voice Studio & TTS", "separate tool", true],
              ["Auto Captions", "separate tool", true],
              ["Speech to Text / Transcription", "separate tool", true],
              ["Full Timeline Editor", false, true],
              ["Automation & Auto-publish", false, true],
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
          <p className="section-sub">Start free. Every plan unlocks every service. Upgrade or cancel anytime.</p>
          

          <div style={{ display: "flex", justifyContent: "center", marginTop: 34 }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--card)",
                border: "1px solid var(--border2)",
                borderRadius: 12,
                padding: 5,
                gap: 4,
              }}
            >
              {["monthly", "annual"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  style={{
                    padding: "10px 30px",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
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
          </div>

          

          <div
            className="pricing-grid"
            data-reveal
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
          >
            {/* Free */}
            <div className="plan">
              <div className="plan-head">
                <div className="plan-name">Free</div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "6px 0 0", minHeight: 36, lineHeight: 1.5 }}>For getting started.</p>
              <div className="plan-price-row">
                <div>
                  <div className="plan-price"><span>$</span>0</div>
                  <div className="plan-cycle" style={{ marginBottom: 2 }}>free forever</div>
                </div>
              </div>
              <button className="plan-btn plan-btn-default" style={{ marginTop: 16 }} onClick={handleCTA}>
                Start free
              </button>
              <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", marginTop: 7 }}>No credit card required</div>
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Check>⚡ 150 credits to start</Check>
                <Check>Watermarked exports</Check>
                <VideoServicesList />
                <Cross>Automation &amp; auto-publish to social</Cross>
                <Cross>Credit top-ups anytime</Cross>
              </div>
            </div>

            {/* Pro — the single paid plan */}
            <div className="plan plan-hot">
              <div className="plan-hot-badge">Most Popular</div>
              <div className="plan-head">
                <div className="plan-name">Pro</div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "6px 0 0", minHeight: 36, lineHeight: 1.5 }}>For creators, marketers &amp; teams.</p>
              <div className="plan-price-row">
                {cycle === "annual" ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--dim)", textDecoration: "line-through" }}>$49</div>
                      <div className="plan-price" ><span>$</span>41</div>
                      <span style={{ fontSize: 14, color: "var(--dim)" }}>/mo</span>
                    </div>
                    <div className="plan-cycle" style={{ marginBottom: 2, marginTop: 4 }}>$490 billed annually · 17% off</div>
                  </div>
                ) : (
                  <div>
                    <div className="plan-price"><span>$</span>49<span style={{ fontSize: 14, color: "var(--dim)" }}> /mo</span></div>
                    <div className="plan-cycle" style={{ marginBottom: 2 }}>billed monthly</div>
                  </div>
                )}
              </div>
              <button className="plan-btn plan-btn-hot" style={{ marginTop: 16 }} onClick={() => navigate(`/checkout?plan=pro&cycle=${cycle}`)}>
                Get Started
              </button>
              <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", marginTop: 7 }}>150 free credits first · cancel anytime</div>
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Check>⚡ 1,500 credits / month</Check>
                <Check>≈ 100 short or 25 long videos / month</Check>
                <VideoServicesList />
                <PlusLabel>Everything in Free, plus:</PlusLabel>
                <Check>Automation &amp; auto-publish to social</Check>
                <Check>Credit top-ups anytime</Check>
              </div>
            </div>

            {/* Agency — high-volume teams */}
            <div className="plan">
              <div className="plan-head">
                <div className="plan-name">Agency</div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "6px 0 0", minHeight: 36, lineHeight: 1.5 }}>For agencies &amp; high-volume teams.</p>
              <div className="plan-price-row">
                {cycle === "annual" ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--dim)", textDecoration: "line-through" }}>$99</div>
                      <div className="plan-price" ><span>$</span>83</div>
                      <span style={{ fontSize: 14, color: "var(--dim)" }}>/mo</span>
                    </div>
                    <div className="plan-cycle" style={{ marginBottom: 2, marginTop: 4 }}>$990 billed annually · 17% off</div>
                  </div>
                ) : (
                  <div>
                    <div className="plan-price"><span>$</span>99<span style={{ fontSize: 14, color: "var(--dim)" }}> /mo</span></div>
                    <div className="plan-cycle" style={{ marginBottom: 2 }}>billed monthly</div>
                  </div>
                )}
              </div>
              <button className="plan-btn plan-btn-default" style={{ marginTop: 16 }} onClick={() => navigate(`/checkout?plan=agency&cycle=${cycle}`)}>
                Get Started
              </button>
              <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", marginTop: 7 }}>cancel anytime</div>
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Check>⚡ 4,000 credits / month</Check>
                <Check>≈ 260 short or 65 long videos / month</Check>
                <VideoServicesList />
                <PlusLabel>Everything in Pro, plus:</PlusLabel>
                <Check>More credits for high-volume output</Check>
                <Check>Best value — lower cost per credit</Check>
              </div>
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
              <div className="cta-banner-sub">150 free credits. No card required. Every service unlocked.</div>
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
              <a href="/faq" className="footer-link">
                FAQ
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
