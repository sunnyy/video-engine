/**
 * LandingPage.jsx — Vidquence
 * "AI-Powered Creative Studio"
 * Redesigned to showcase all services, not just video generation.
 */

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { getSession } from "../services/auth/authService";
import { SERVER } from "../services/serverApi";
import { videoServices } from "../config/serviceCatalog";
import { SERVICE_COST_LABEL, TOOLS_COST_LABEL } from "../config/serviceCostLabels";
import { Sparkles, Clapperboard, ShoppingBag, MessageCircle, Type, Captions, Palette, Mic, Clock, Smartphone, ArrowUp, ChevronDown, Play, Users, Rocket, ShieldCheck, Package, BookOpen, Mail, Globe, Zap, DollarSign, Pencil } from "lucide-react";

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
  .hero-sub { font-family: var(--font-body); font-size: 18px; color: var(--muted); line-height: 1.65; max-width: 750px; margin: 0 auto 30px; }
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
  .section { padding: 90px 0; position: relative; }
  .section:nth-of-type(odd)  { background: radial-gradient(ellipse 85% 75% at 88% 0%, rgba(245,197,24,0.10), transparent 62%); }
  .section:nth-of-type(even) { background: radial-gradient(ellipse 85% 75% at 12% 0%, rgba(124,92,252,0.14), transparent 62%); }
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
  .m-svc-card { position: relative; border-radius: 16px; padding: 20px 16px 16px; display: flex; flex-direction: column; justify-content: flex-end; min-height: 150px; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,0.07); background: #010002; transition: border-color 0.2s, transform 0.2s; }
  .m-svc-card:active { transform: scale(0.97); }
  .m-svc-card-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%); pointer-events: none; }
  .m-svc-card-name { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 700; color: #e8e8f0; text-transform: uppercase; line-height: 1.2; position: relative; z-index: 1; }
  .m-svc-card-desc { font-family: 'Outfit', sans-serif; font-size: 11px; color: rgba(232,232,240,0.75); margin-top: 4px; line-height: 1.35; position: relative; z-index: 1; }

  /* CTA */
  .cta-banner-section { padding: 40px 0 80px; }
  .cta-banner { background: linear-gradient(135deg, rgba(124,92,252,0.14) 0%, #0e0e17 42%, #0b0b12 100%); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 60px 64px; display: flex; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap; position: relative; overflow: hidden; }
  .cta-banner::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 82% 40%, rgba(124,92,252,0.10), transparent 58%); pointer-events: none; }
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
  .hero-platforms-row span { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-body); font-size: 15px; font-weight: 700; color: var(--muted); opacity: 0.85; transition: opacity 0.2s; }
  .hero-platforms-row span:hover { opacity: 1; }
  .hero-platforms-row span svg { width: 16px; height: 16px; flex-shrink: 0; }

  /* SAMPLES GALLERY (live, masonry) */
  .samples-masonry { column-count: 5; column-gap: 16px; margin-top: 44px; }
  @media (max-width: 1100px) { .samples-masonry { column-count: 3; } }
  @media (max-width: 760px)  { .samples-masonry { column-count: 2; column-gap: 12px; } }
  .sample-card { break-inside: avoid; -webkit-column-break-inside: avoid; margin-bottom: 16px; position: relative; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); background: var(--card); }
  .sample-card img, .sample-card video { width: 100%; display: block; background: #060a14; }
  .sample-card:hover { border-color: rgba(245,197,24,0.32); }
  .sample-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0.9; transition: opacity 0.2s; }
  .sample-card:hover .sample-play { opacity: 1; }
  .sample-play span { width: 52px; height: 52px; border-radius: 50%; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; padding-left: 3px; }

  /* SAMPLE LIGHTBOX */
  @keyframes sampleLbIn { from { opacity: 0; } to { opacity: 1; } }
  .sample-lb { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 32px; background: rgba(5,5,10,0.88); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: sampleLbIn 0.18s ease; }
  .sample-lb-inner { display: flex; }
  .sample-lb-inner video, .sample-lb-inner img { max-width: 92vw; max-height: 86vh; width: auto; height: auto; border-radius: 14px; box-shadow: 0 30px 90px rgba(0,0,0,0.6); background: #000; display: block; }
  .sample-lb-close { position: fixed; top: 22px; right: 26px; width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 22px; line-height: 1; cursor: pointer; z-index: 1; transition: background 0.2s; }
  .sample-lb-close:hover { background: rgba(255,255,255,0.2); }
  .sample-badge { position: absolute; left: 12px; top: 12px; padding: 4px 9px; border-radius: 7px; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 10px; font-weight: 700; color: var(--text); letter-spacing: 0.5px; }

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

// Brand glyphs (monochrome, currentColor) for the "auto-publish to" platform row.
const BRAND_PATHS = {
  youtube:   "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  tiktok:    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  x:         "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin:  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z",
};
// Each platform in its own brand colour. TikTok/X are white (their official on-dark mark).
const BRAND_COLORS = {
  youtube: "#FF0000", instagram: "#E4405F", tiktok: "#FFFFFF", x: "#FFFFFF", linkedin: "#0A66C2",
};
function BrandIcon({ id }) {
  return <svg viewBox="0 0 24 24" fill={BRAND_COLORS[id] || "currentColor"} aria-hidden="true"><path d={BRAND_PATHS[id]} /></svg>;
}

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

function SampleCard({ sample, onOpen }) {
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
    <div className="sample-card" onClick={() => onOpen(sample)} style={{ cursor: "pointer" }}>
      {isVid
        ? <video ref={vidRef} src={sample.src} poster={sample.poster || undefined} muted loop playsInline preload="metadata" />
        : <img src={sample.src} alt={label} loading="lazy" />}
      <div className="sample-badge">{label}</div>
      {isVid && (
        <div className="sample-play">
          <span><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>
        </div>
      )}
    </div>
  );
}

// Click-to-open lightbox — plays the sample full-size WITH sound (controls on).
function SampleLightbox({ sample, onClose }) {
  useEffect(() => {
    if (!sample) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sample, onClose]);
  if (!sample) return null;
  const isVid = sample.type === "video";
  return createPortal(
    <div className="sample-lb" onClick={onClose}>
      <button className="sample-lb-close" onClick={onClose} aria-label="Close">×</button>
      <div className="sample-lb-inner" onClick={(e) => e.stopPropagation()}>
        {isVid
          ? <video src={sample.src} poster={sample.poster || undefined} controls autoPlay playsInline />
          : <img src={sample.src} alt="" />}
      </div>
    </div>,
    document.body,
  );
}

function SamplesGallery() {
  const [samples, setSamples] = useState(null);
  const [active, setActive] = useState(null);
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
    <section className="section" id="samples">
      <div className="container">
        <div className="section-label">Made with Vidquence</div>
        <h2 className="section-h">See what people<br /><span className="yellow">are making.</span></h2>
        <p className="section-sub">Real outputs from every service — tap any one to play it with sound.</p>
        <div className="samples-masonry">
          {samples.map((s) => <SampleCard key={s.id} sample={s} onOpen={setActive} />)}
        </div>
      </div>
      <SampleLightbox sample={active} onClose={() => setActive(null)} />
    </section>
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

const HERO_FEATURES = [
  { Icon: Zap,        title: "10X Faster",           sub: "Create content in minutes",    color: "#38bdf8" },
  { Icon: Pencil,     title: "Fully Editable",       sub: "Edit anything",                color: "#f472b6" },
  { Icon: DollarSign, title: "Cost Effective",       sub: "Save time and budget",         color: "#22d3ee" },
  { Icon: Users,      title: "Loved by 10K+ Brands", sub: "From startups to enterprises", color: "#a855f7" },
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
// A feature row with the service name on the left and its credit cost on the right.
function ServiceCostRow({ name, cost }) {
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.45 }}>
      <span style={{ color: "var(--yellow)", fontWeight: 800, flexShrink: 0, fontSize: 12 }}>✓</span>
      <span>{name}{cost ? <span style={{ color: "var(--dim)" }}> ({cost})</span> : null}</span>
    </div>
  );
}
// The full service list shown on every pricing card (from the catalog, so it never drifts), with
// each service's credit cost on the right so users see exactly how far their credits go.
function VideoServicesList({ exclude = [] }) {
  return (
    <>
      <PlusLabel>All video services</PlusLabel>
      {videoServices().filter((s) => !exclude.includes(s.key)).map((s) => (
        <ServiceCostRow key={s.key} name={s.name} cost={SERVICE_COST_LABEL[s.key]} />
      ))}
      <ServiceCostRow name="10+ AI image & audio tools" cost={TOOLS_COST_LABEL} />
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

  const handleCTA = () => {
    // Auth lives on app.vidquence.com; the marketing host can't see that session (per-origin),
    // so always route to /login and let app. resolve login state (logged-in → dashboard).
    navigate("/login");
  };

  // Plan "Get Started": signed-in users go straight to checkout; logged-out visitors sign in
  // first, then resume to that exact checkout (so the click never just bounces back to home).
  const goToPlan = (slug) => {
    const dest = `/checkout?plan=${slug}&cycle=${cycle}`;
    navigate(`/login?next=${encodeURIComponent(dest)}`); // login on app., then resume to checkout
  };

  // Service cards: signed-in users go straight to the tool; logged-out visitors are
  // funneled to signup (protected routes would just bounce them to /login anyway).
  const handleCardClick = (route) => {
    navigate(`/login?next=${encodeURIComponent(route)}`); // login on app., then go to the tool
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
              {session ? "Go to Dashboard" : "Get Started"}
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
              Turn any post, product, or idea
              into a <span className="yellow">video.</span>
            </h1>
            <p className="hero-sub">
              Generate editable export-ready videos in minutes, save hours of work, and scale your content with one AI-powered platform built for every workflow.
            </p>
            <HeroChatbox onSubmit={handleCTA} />
            <div className="hero-platforms">
              <div className="hero-platforms-label">Create &amp; auto-publish to</div>
              <div className="hero-platforms-row">
                <span><BrandIcon id="youtube" />YouTube</span>
                <span><BrandIcon id="instagram" />Instagram</span>
                <span><BrandIcon id="tiktok" />TikTok</span>
                <span><BrandIcon id="x" />X</span>
                <span><BrandIcon id="linkedin" />LinkedIn</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* STATS */}
      <section style={{ padding: "28px 0 68px" }}>
        <div className="container">
          <style>{`
            .hero-feat-row { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border2); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,0.02); }
            @media (max-width: 760px) { .hero-feat-row { grid-template-columns: 1fr 1fr; } }
            @media (max-width: 460px) { .hero-feat-row { grid-template-columns: 1fr; } }
          `}</style>
          <div className="hero-feat-row" data-reveal>
            {HERO_FEATURES.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 22px", borderLeft: i ? "1px solid var(--border2)" : "none" }}>
                <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: `${it.color}1a`, border: `1px solid ${it.color}33`, color: it.color }}><it.Icon size={20} strokeWidth={2} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif" }}>{it.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 2 }}>{it.sub}</div>
                </div>
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
            Stop switching tabs.<br /><span className="yellow">Start creating.</span>
          </h2>
          <p className="section-sub">Every kind of video your brand needs — in one place.</p>

          {/* ── Desktop bento grid ── */}
          <div className="services-desktop">
          {(() => {
            // Bento mosaic — mixed sizes, portrait-heavy. AI Video is the big feature (2×2); four
            // tall portrait tiles; two wide landscape tiles. Image/audio tools sit below as squares.
            // Images intentionally null for now → clean dark placeholders. Drop a file into each
            // path below (and set image:) when the new artwork is ready.
            const VIDEO = [
              { feature: true, icon: "film", name: "Prompt to Video", desc: "Any idea → a fully designed, narrated video", route: "/ai-video", accent: "#7c5cfc", image: "/assets/images/services/prompt_video.png", cs: 2, rs: 2 },
              { icon: "link",    name: "Social Post to Video", desc: "Paste a post → a reel",               route: "/social-video",     accent: "#22d3ee", image: "/assets/images/services/social_video.png", cs: 1, rs: 2 },
              { icon: "box",     name: "Product Video Ads",    desc: "One photo → a cinematic ad",          route: "/product-video",    accent: "#f97316", image: "/assets/images/services/product_video.png", cs: 1, rs: 2 },
              { icon: "rocket",  name: "SaaS / Promo Video",   desc: "Product or site → a promo",           route: "/promo-video",      accent: "#6366f1", image: "/assets/images/services/saas_video.png", cs: 1, rs: 2 },
              { icon: "type",    name: "Typography Video",     desc: "Bold, kinetic text",                  route: "/typography-video", accent: "#a855f7", image: "/assets/images/services/typography_video.png", cs: 1, rs: 2 },
              { icon: "mic",     name: "Talking Head",         desc: "Captions, B-roll & cuts",             route: "/talking-head",     accent: "#34d399", image: "/assets/images/services/talking_head.png", cs: 1, rs: 2 },
              { icon: "captions", name: "Auto Captions",       desc: "Animated captions",                   route: "/video-captions",   accent: "#f5c518", image: "/assets/images/services/auto_captions.png", cs: 1, rs: 2 },
            ];
            const EXTRAS = [
              { name: "Thumbnails",     route: "/thumbnail",      accent: "#ef4444", image: "/assets/images/services/thumbnail_generator.png" },
              { name: "Banner Design",  route: "/banner-design",  accent: "#f5c518", image: "/assets/images/services/banner_design.png" },
              { name: "Poster Studio",  route: "/product-poster", accent: "#d946ef", image: "/assets/images/services/product_poster.png" },
              { name: "Virtual Try-On", route: "/virtual-tryon",  accent: "#ec4899", image: "/assets/images/services/virtual_tryon.png" },
              { name: "Voice Studio",   route: "/voiceover",      accent: "#3b82f6", image: "/assets/images/services/ai_voicover.png" },
              { name: "Speech to Text", route: "/speech-to-text", accent: "#8b5cf6", image: "/assets/images/services/speed_to_text.png" },
            ];

            const tile = (image, extra = {}) => ({
              position: "relative",
              background: image ? `#010002 url(${image}) center/contain no-repeat` : "#010002",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              overflow: "hidden",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              transition: "border-color 0.2s, transform 0.2s",
              ...extra,
            });
            const hov = (accent) => ({
              onMouseEnter: (e) => { e.currentTarget.style.borderColor = accent + "66"; e.currentTarget.style.transform = "translateY(-2px)"; },
              onMouseLeave: (e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; },
            });
            const ov = () => <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)", pointerEvents: "none" }} />;

            // Clean line-style icons (lucide-ish) instead of emoji.
            const ICON_PATHS = {
              film:    <><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" /><path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" /><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>,
              link:    <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
              box:     <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></>,
              rocket:  <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
              type:    <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></>,
              mic:     <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></>,
              captions:<><rect width="18" height="14" x="3" y="5" rx="2" ry="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" /></>,
            };
            const Icon = (name, size) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.92 }}>
                {ICON_PATHS[name]}
              </svg>
            );

            return (
              <div data-reveal style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Bento mosaic — 4 cols, mixed portrait (tall) + landscape (wide) + 1 feature */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: 240, gridAutoFlow: "row dense", gap: 14 }}>
                  {VIDEO.map((svc) => (
                    <div key={svc.name} data-service={svc.name} onClick={() => handleCardClick(svc.route)} {...hov(svc.accent)}
                      style={tile(svc.image, { gridColumn: `span ${svc.cs}`, gridRow: `span ${svc.rs}`, padding: svc.feature ? "28px 30px" : "16px 16px" })}>
                      {ov()}
                      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: svc.feature ? 24 : 14, fontWeight: 800, color: "#fff", lineHeight: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>{svc.name}</div>
                            {Icon(svc.icon, svc.feature ? 24 : 18)}
                          </div>
                          <div style={{ fontSize: svc.feature ? 14 : 11.5, color: "#d2d2e2", marginTop: 5, lineHeight: 1.35 }}>{svc.desc}</div>
                        </div>
                        {svc.feature && (
                          <span style={{ flexShrink: 0, background: svc.accent + "22", border: `1px solid ${svc.accent}66`, color: svc.accent, borderRadius: 20, padding: "6px 15px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>Open →</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Image & audio tools — small squares, single row ("also included") */}
                <div style={{ marginTop: 8, fontSize: 11, letterSpacing: 2, color: "var(--dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  Plus image &amp; audio tools
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
                  {EXTRAS.map((svc) => (
                    <div key={svc.name} data-service={svc.name} onClick={() => handleCardClick(svc.route)} {...hov(svc.accent)} style={tile(svc.image, { aspectRatio: "1 / 1", padding: "12px 12px" })}>
                      {ov()}
                      <div style={{ position: "relative", zIndex: 1, fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif" }}>{svc.name}</div>
                    </div>
                  ))}
                </div>
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
              <p style={{ margin: "10px 0 0", fontSize: 15, color: "#e8e8f0", lineHeight: 1.5 }}>Every kind of video your brand needs — in one place.</p>
            </div>
            <div className="m-svc-grid">
              {[
                { emoji: "🎬", name: "Prompt to Video",      desc: "Any idea → a designed video",    route: "/ai-video",         accent: "#7c5cfc", image: "/assets/images/services/prompt_video.png" },
                { emoji: "🔗", name: "Social Post to Video", desc: "Paste a post → a reel",          route: "/social-video",     accent: "#22d3ee", image: "/assets/images/services/social_video.png" },
                { emoji: "📦", name: "Product Video Ads",    desc: "One photo → a cinematic ad",     route: "/product-video",    accent: "#f97316", image: "/assets/images/services/product_video.png" },
                { emoji: "🚀", name: "SaaS / Promo Video",   desc: "Product or site → a promo",      route: "/promo-video",      accent: "#6366f1", image: "/assets/images/services/saas_video.png" },
                { emoji: "🔤", name: "Typography Video",     desc: "Bold, kinetic text videos",      route: "/typography-video", accent: "#a855f7", image: "/assets/images/services/typography_video.png" },
                { emoji: "🎤", name: "Talking Head",         desc: "Your clip → captions & B-roll",  route: "/talking-head",     accent: "#34d399", image: "/assets/images/services/talking_head.png" },
                { emoji: "💬", name: "Auto Captions",        desc: "Animated captions on any video", route: "/video-captions",   accent: "#f5c518", image: "/assets/images/services/auto_captions.png" },
              ].map(svc => (
                <div key={svc.name} className="m-svc-card"
                  style={{ background: svc.image ? `#010002 url(${svc.image}) center/contain no-repeat` : "#010002", borderColor: svc.accent + "33" }}
                  onClick={() => handleCardClick(svc.route)}
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
      <section className="section">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#c4b5fd", background: "rgba(124,92,252,0.12)", border: "1px solid rgba(124,92,252,0.32)", borderRadius: 100, padding: "6px 16px" }}>✦ Built for brands that win ✦</span>
          </div>
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
              { icon: "🛒", title: "E-commerce Brands",       desc: "Create product video ads, virtual try-on images, and social media posts for every product in your catalog — without a photoshoot.", tags: ["Product Ads", "Virtual Try-On", "Social Posts", "Posters"], accent: "#a855f7", grad: "linear-gradient(135deg,#7c5cfc,#a855f7)" },
              { icon: "📱", title: "Content Creators",        desc: "Generate faceless or talking head videos in any niche. Add captions, voiceovers, and thumbnails — all without editing software.", tags: ["Prompt to Video", "Captions", "Thumbnails", "Voiceover"], accent: "#f59e0b", grad: "linear-gradient(135deg,#f59e0b,#f97316)" },
              { icon: "🏢", title: "Marketing Agencies",      desc: "Produce marketing creatives at scale for your clients. Video ads, social graphics, and more — delivered in minutes, not days.", tags: ["Product Ads", "Social Posts", "Posters", "Thumbnails"], accent: "#38bdf8", grad: "linear-gradient(135deg,#3b82f6,#38bdf8)" },
              { icon: "🚀", title: "Solo Founders & Startups", desc: "Ship marketing content without a team. Replace your designer, video editor, and voice artist with one platform.", tags: ["All Services", "Low Cost", "Fast Output"], accent: "#22c55e", grad: "linear-gradient(135deg,#16a34a,#22c55e)" },
            ].map((a, i) => (
              <div key={i} className="audience-card" style={{ position: "relative", overflow: "hidden", border: `1px solid ${a.accent}33`, background: `linear-gradient(135deg, ${a.accent}24, transparent 62%), var(--card)`, boxShadow: `0 10px 40px ${a.accent}12` }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: a.grad, boxShadow: `0 8px 22px ${a.accent}55`, marginBottom: 16 }}>{a.icon}</div>
                <div className="audience-title">{a.title}</div>
                <div className="audience-desc">{a.desc}</div>
                <div className="audience-tags">
                  {a.tags.map((t, j) => (
                    <span key={j} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: a.accent, background: `${a.accent}18`, border: `1px solid ${a.accent}33`, borderRadius: 100, padding: "3px 10px" }}>{t}</span>
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

          <style>{`
            .process-row { display: flex; align-items: stretch; gap: 14px; margin-top: 56px; }
            .process-row .p-card { flex: 1; min-width: 0; }
            .process-arrow { color: var(--muted); font-size: 22px; }
            @media (max-width: 700px) { .process-row { flex-direction: column; } .process-arrow { display: none; } }
          `}</style>
          <div className="process-row" data-reveal>
            {[
              { n: "01", img: "/assets/images/describe_upload.png",  title: "Describe or Upload", desc: "Type a topic, paste a URL, or upload your product photo, logo, or video. That's all the input you need.", chips: ["Text", "URL", "Upload", "Video"], accent: "#f5c518" },
              { n: "02", img: "/assets/images/ai_work.png",          title: "AI Does the Work", desc: "Our AI writes the strategy, generates visuals, records voiceovers, applies layouts, adds music — all automatically.", chips: ["Strategy", "Visuals", "Voiceover", "Music"], accent: "#f97316" },
              { n: "03", img: "/assets/images/start_publishing.png", title: "Download & Publish", desc: "Export your finished asset in seconds. Edit anything you want in our full editor before exporting.", chips: ["Export", "Edit", "Publish"], accent: "#f5c518" },
            ].map((s, i) => (
              <div key={i} className="p-card" style={{ position: "relative", background: "var(--card)", border: "1px solid var(--border2)", borderRadius: 16, display: "flex", flexDirection: "column" }}>
                {i > 0 && <span className="process-arrow" style={{ position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)" }}>→</span>}
                <div style={{ position: "relative", height: 240, borderRadius: "16px 16px 0 0", overflow: "hidden", borderBottom: "1px solid var(--border2)", background: "var(--card2)" }}>
                  <img src={s.img} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", top: 16, left: 16, width: 46, height: 46, borderRadius: "50%", border: `2px solid ${s.accent}`, color: s.accent, background: "rgba(0,0,0,0.4)", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.n}</span>
                </div>
                <div style={{ padding: "22px 26px 24px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div className="process-title">{s.title}</div>
                  <div className="process-desc" style={{ flex: 1 }}>{s.desc}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 18 }}>
                    {s.chips.map((c, j) => (
                      <span key={j} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", borderRadius: 100, padding: "4px 11px" }}>{c}</span>
                    ))}
                  </div>
                </div>
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
              ["Prompt to Video", false, true],
              ["SaaS/Promo Video (incl. URL mode)", false, true],
              ["Social Post to Video", false, true],
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
          <p className="section-sub">Every plan unlocks every service. Upgrade or cancel anytime.</p>
          

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

          

          <p style={{ textAlign: "center", margin: "18px auto 0", maxWidth: 580, fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>
            {cycle === "annual"
              ? <>★ <strong style={{ color: "var(--text)" }}>Best value — save 17%</strong> — that's 2 months free.</>
              : <>Tip: switch to <button onClick={() => setCycle("annual")} style={{ background: "none", border: "none", padding: 0, color: "var(--yellow)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>Annual</button> and save 17% — that's 2 months free.</>}
          </p>

          <div
            className="pricing-grid"
            data-reveal
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
          >
            {/* Starter — entry paid plan */}
            <div className="plan">
              <div className="plan-head">
                <div className="plan-name">Starter</div>
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "6px 0 0", minHeight: 36, lineHeight: 1.5 }}>For trying it out &amp; light use.</p>
              <div className="plan-price-row">
                {cycle === "annual" ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--dim)", textDecoration: "line-through" }}>$29</div>
                      <div className="plan-price" ><span>$</span>24</div>
                      <span style={{ fontSize: 14, color: "var(--dim)" }}>/mo</span>
                    </div>
                    <div className="plan-cycle" style={{ marginBottom: 2, marginTop: 4 }}>$290 billed annually · 17% off</div>
                  </div>
                ) : (
                  <div>
                    <div className="plan-price"><span>$</span>29<span style={{ fontSize: 14, color: "var(--dim)" }}> /mo</span></div>
                    <div className="plan-cycle" style={{ marginBottom: 2 }}>billed monthly</div>
                  </div>
                )}
              </div>
              <button className="plan-btn plan-btn-default" style={{ marginTop: 16 }} onClick={() => goToPlan("starter")}>
                Get Started
              </button>
              <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", marginTop: 7 }}>cancel anytime</div>
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Check>⚡ 600 credits / month</Check>
                <VideoServicesList exclude={["video_clipping"]} />
                <Check>Credit top-ups anytime</Check>
                <Cross>Video clipping (long video → shorts)</Cross>
                <Cross>Automation &amp; auto-publish to social</Cross>
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
              <button className="plan-btn plan-btn-hot" style={{ marginTop: 16 }} onClick={() => goToPlan("pro")}>
                Get Started
              </button>
              <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", marginTop: 7 }}>cancel anytime</div>
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Check>⚡ 1,500 credits / month</Check>
                <VideoServicesList />
                <PlusLabel>Everything in Starter, plus:</PlusLabel>
                <Check>Video clipping (long video → shorts)</Check>
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
              <button className="plan-btn plan-btn-default" style={{ marginTop: 16 }} onClick={() => goToPlan("agency")}>
                Get Started
              </button>
              <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", marginTop: 7 }}>cancel anytime</div>
              <div style={{ borderTop: "1px solid var(--border2)", marginTop: 18, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Check>⚡ 4,000 credits / month</Check>
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
          <div className="cta-banner" data-reveal style={{ alignItems: "center", gap: 48 }}>
            {/* Left */}
            <div style={{ position: "relative", zIndex: 1, flex: "1 1 460px", minWidth: 0 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,197,24,0.10)", border: "1px solid rgba(245,197,24,0.3)", borderRadius: 100, padding: "6px 14px", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#f5c518" }}>
                <Sparkles size={13} /> All features. One platform.
              </span>
              <div className="cta-banner-title" style={{ marginTop: 20 }}>
                Stop hiring.
                <br />
                <span className="yellow">Start creating.</span>
              </div>
              <div className="cta-banner-sub">Every service unlocked. Plans from <span className="yellow" style={{ fontWeight: 700 }}>$29/mo</span>. Cancel anytime.</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 38, marginTop: 32 }}>
                {[
                  { Icon: Play,        t: "All Tools",      s: "Unlimited access"    },
                  { Icon: Users,       t: "No Hiring",      s: "Save time & money"   },
                  { Icon: Rocket,      t: "10X Faster",     s: "Produce in minutes"  },
                  { Icon: ShieldCheck, t: "Cancel Anytime", s: "No commitments"      },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ width: 62, height: 62, borderRadius: 16, border: "1px solid rgba(245,197,24,0.30)", background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))", color: "#f5c518", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}><f.Icon size={26} strokeWidth={2} /></span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif" }}>{f.t}</div>
                      <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 2 }}>{f.s}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                <div style={{ display: "flex" }}>
                  {["#7c5cfc", "#f97316", "#22c55e", "#38bdf8"].map((c, i) => (
                    <span key={i} style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, #14140e)`, border: "2px solid #14140e", marginLeft: i ? -10 : 0 }} />
                  ))}
                </div>
                <span style={{ color: "#f5c518", letterSpacing: 2, fontSize: 14 }}>★★★★★</span>
                <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Loved by 10K+ creators &amp; brands</span>
              </div>
            </div>

            {/* Right */}
            <div style={{ position: "relative", zIndex: 1, flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", background: "#0c0c13" }}>
                <img src="/assets/images/download_publish.png" alt="All features, one platform" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
              <button className="cta-banner-btn" onClick={handleCTA} style={{ background: "linear-gradient(135deg,#f5c518,#f97316)", color: "#0b0b12", padding: "16px 40px", borderRadius: 14, fontSize: 16, width: "100%" }}>
                Get Started →
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, color: "var(--dim)" }}>
                <ShieldCheck size={14} /> Secure payments. 30-day money back guarantee.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer" style={{ background: "linear-gradient(180deg, transparent, rgba(124,92,252,0.05))" }}>
        <style>{`
          .footer-grid { display: grid; grid-template-columns: 1.7fr 1fr 1fr 1fr 1.9fr; gap: 32px; }
          @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; } }
          @media (max-width: 560px) { .footer-grid { grid-template-columns: 1fr; } }
          .footer-col-link { font-family: var(--font-body); font-size: 14px; color: var(--dim); text-decoration: none; transition: color 0.2s; }
          .footer-col-link:hover { color: var(--muted); }
          .footer-social { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 15px; background: rgba(255,255,255,0.04); border: 1px solid var(--border2); text-decoration: none; transition: all 0.2s; }
          .footer-social:hover { background: rgba(124,92,252,0.15); border-color: rgba(124,92,252,0.4); }
          .footer-social svg { width: 17px; height: 17px; }
        `}</style>
        <div className="container">
          <div className="footer-grid">
            {/* Brand */}
            <div>
              <a href="/" className="nav-logo"><img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 40, width: "auto" }} /></a>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "16px 0 20px", maxWidth: 250 }}>
                The all-in-one AI content engine for brands, creators, and agencies. Describe it. We create it.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {["youtube", "instagram", "tiktok", "x", "linkedin"].map((id) => (
                  <a key={id} href="#" title={id} className="footer-social"><BrandIcon id={id} /></a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {[
              { Icon: Package,     title: "Product",   links: [["Features", "#services"], ["How it Works", "#how"], ["Pricing", "#pricing"]] },
              { Icon: BookOpen,    title: "Resources", links: [["Help Center", "/help"], ["FAQ", "/faq"]] },
              { Icon: Users,       title: "Company",   links: [["About", "/about"], ["Contact", "mailto:hello@vidquence.com"]] },
            ].map((col) => (
              <div key={col.title}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <col.Icon size={15} style={{ color: "#a78bfa" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif" }}>{col.title}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {col.links.map(([label, href]) => <a key={label} href={href} className="footer-col-link">{label}</a>)}
                </div>
              </div>
            ))}

            {/* Stay in the loop */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Mail size={15} style={{ color: "#a78bfa" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif" }}>Stay in the loop</span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 14px", maxWidth: 260 }}>Get product updates, tips, and creator resources.</p>
              <form onSubmit={(e) => { e.preventDefault(); const v = e.currentTarget.email.value.trim(); if (v) window.location.href = `mailto:hello@vidquence.com?subject=Newsletter%20signup&body=${encodeURIComponent("Please add me: " + v)}`; }}
                style={{ display: "flex", gap: 8, maxWidth: 300 }}>
                <input name="email" type="email" required placeholder="Enter your email"
                  style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <button type="submit" title="Subscribe" style={{ flexShrink: 0, width: 42, borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #7c5cfc, #a855f7)", color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
              </form>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12.5, color: "var(--dim)" }}>
                <ShieldCheck size={13} style={{ color: "#a78bfa" }} /> No spam. Unsubscribe anytime.
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid var(--border2)", marginTop: 40, paddingTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border2)", borderRadius: 10, padding: "7px 12px" }}>
              <Globe size={14} style={{ color: "var(--muted)" }} />
              <select style={{ background: "transparent", border: "none", color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 13, outline: "none", cursor: "pointer" }}>
                <option>English</option>
              </select>
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--dim)" }}>Made with <span style={{ color: "#a855f7" }}>💜</span> for creators worldwide.</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--dim)", display: "flex", alignItems: "center", gap: 7 }}>
              <ShieldCheck size={13} style={{ color: "#a78bfa" }} /> Secure · Encrypted · Trusted
            </div>
            <div className="footer-copy">© 2026 VIDQUENCE</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
