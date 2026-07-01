import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";
import { useNotificationsStore } from "../store/useNotificationsStore";
import { usePlanStore } from "../store/usePlanStore";
import { supabase } from "../lib/supabase";
import SystemStatusBanner from "./SystemStatusBanner";
import UpgradeModal from "./UpgradeModal";

/* ── Icons ── */
const Icons = {
  admin: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  create: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/>
      <path d="M18.5 15l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z"/>
    </svg>
  ),
  brand: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/>
      <circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/>
      <path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-1.4-1.1-2-1.1-3 0-.8.7-1.5 1.6-1.5H17a5 5 0 0 0 5-5c0-4.4-4.5-8-10-8z"/>
    </svg>
  ),
  autopilot: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M2 14h2M20 14h2M9 13v2M15 13v2" />
    </svg>
  ),
  connections: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  folder: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
    </svg>
  ),
  gallery: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/>
      <rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/>
    </svg>
  ),
  mic: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0014 0"/>
      <line x1="12" y1="21" x2="12" y2="17"/><line x1="9" y1="21" x2="15" y2="21"/>
    </svg>
  ),
  credits: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  star: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  gift: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  message: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  ad: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
    </svg>
  ),
  voice: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  outfit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
    </svg>
  ),
  poster: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="2"/>
      <line x1="7" y1="7" x2="17" y2="7"/>
      <line x1="7" y1="11" x2="17" y2="11"/>
      <line x1="7" y1="15" x2="13" y2="15"/>
    </svg>
  ),
  thumbnail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <circle cx="8.5" cy="11" r="1.5"/>
      <polyline points="14 9 22 9"/>
      <polyline points="14 13 22 13"/>
      <polyline points="14 17 18 17"/>
    </svg>
  ),
  captions: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <line x1="6" y1="10" x2="18" y2="10"/>
      <line x1="6" y1="14" x2="14" y2="14"/>
    </svg>
  ),
  promptVideo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
      <path d="M9.5 8.5l5 3.5-5 3.5V8.5z"/>
    </svg>
  ),
  explainer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4M12 8h.01"/>
    </svg>
  ),
  typography: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3"/>
      <path d="M9 20h6"/>
      <path d="M12 4v16"/>
    </svg>
  ),
  promo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  ),
  social: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  textReel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 10h16M4 14h10"/>
    </svg>
  ),
  custom: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  signout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  support: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
};

/* ── NavItem: used inside flyout panels ── */
function NavItem({ icon, label, sub, to, href, active, soon }) {
  const [hov, setHov] = useState(false);
  const sharedStyle = {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
    borderRadius: 8, textDecoration: "none", border: "none", transition: "all 0.15s",
    cursor: soon ? "default" : "pointer", fontFamily: "inherit", fontSize: "20px",
    background: active ? "rgba(124,92,252,0.15)" : hov && !soon ? "rgba(255,255,255,0.05)" : "transparent",
    color: active ? "#a78bfa" : soon ? "#44444f" : hov ? "#d8d8ea" : "#9494a8",
    width: "100%", boxSizing: "border-box",
  };
  const inner = (
    <>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 15, fontWeight: 500, fontFamily: "'Outfit',sans-serif", lineHeight: 1.2 }}>{label}</span>
        {sub && <span style={{ fontSize: 12, fontFamily: "'Outfit',sans-serif", lineHeight: 1.2, color: active ? "rgba(167,139,250,0.8)" : "#666680" }}>{sub}</span>}
      </span>
      {soon && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.05)", color: "#55556a" }}>SOON</span>}
    </>
  );
  const events = { onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false), style: sharedStyle };
  if (soon)  return <div {...events}>{inner}</div>;
  if (href)  return <a href={href} {...events}>{inner}</a>;
  return <Link to={to} {...events}>{inner}</Link>;
}

/* ── IconBtn: narrow column icon + label ── */
function IconBtn({ icon, label, to, href, onClick, active, locked }) {
  const [hov, setHov] = useState(false);
  const style = {
    display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
    padding: "10px 12px", borderRadius: 10, cursor: "pointer", gap: 12, width: "100%",
    background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
    color: active ? "#a78bfa" : hov ? "#d0d0e8" : "#8b8ba0",
    transition: "all 0.15s", textDecoration: "none", border: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const inner = (
    <>
      <span style={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15.5, fontWeight: 500, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.01em", textAlign: "left" }}>{label}</span>
      {locked && (
        <svg aria-label="Pro & Max" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      )}
    </>
  );
  const events = { onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false), style };
  if (onClick) return <button onClick={onClick} {...events}>{inner}</button>;
  if (href)    return <a href={href} {...events}>{inner}</a>;
  return <Link to={to} {...events}>{inner}</Link>;
}

/* ── FlyoutGroup: icon trigger + portal flyout panel ── */
function FlyoutGroup({ icon, label, active, children }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov]   = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const triggerRef      = useRef(null);
  const timer           = useRef(null);

  const enter = () => {
    clearTimeout(timer.current);
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const estimatedH = 240;
      const top = window.innerHeight - r.top >= estimatedH
        ? r.top
        : Math.max(8, r.bottom - estimatedH);
      setPos({ top, left: r.right + 6 });
    }
    setOpen(true);
  };
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div ref={triggerRef} onMouseEnter={enter} onMouseLeave={leave} style={{ width: "100%" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
          padding: "10px 12px", borderRadius: 10, cursor: "pointer", gap: 12, width: "100%",
          background: active || open ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
          color: active || open ? "#a78bfa" : hov ? "#d0d0e8" : "#8b8ba0",
          transition: "all 0.15s", fontFamily: "inherit", boxSizing: "border-box",
        }}
      >
        <span style={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <span style={{ fontSize: 15.5, fontWeight: 500, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.01em", textAlign: "left" }}>{label}</span>
      </div>

      {open && createPortal(
        <div
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={leave}
          style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 9999,
            background: "#111118", border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 14, padding: "6px", minWidth: 230,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            animation: "flyoutIn 0.14s ease",
          }}
        >
          <div style={{ padding: "5px 10px 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
            {label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {children}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── NotificationsBell: sidebar icon + unread badge + click-to-open panel ── */
function relTime(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60)     return "just now";
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const SEV_COLOR = { info: "#7c5cfc", success: "#34d399", warning: "#f59e0b", error: "#ef4444" };

function NotificationsBell() {
  const navigate = useNavigate();
  const { items, fetch, subscribe, unsubscribe, markOneRead, markEveryRead } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  const [hov, setHov]   = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const triggerRef      = useRef(null);
  const unread = items.filter(n => !n.read_at).length;

  useEffect(() => { fetch(); subscribe(); return () => unsubscribe(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: Math.max(8, Math.min(r.top, window.innerHeight - 460)), left: r.right + 6 });
    }
    setOpen(o => !o);
  };

  const onRowClick = (n) => {
    if (!n.read_at) markOneRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={triggerRef} style={{ width: "100%", position: "relative" }}>
      <button
        onClick={toggle}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start",
          padding: "10px 12px", borderRadius: 10, cursor: "pointer", gap: 12, width: "100%",
          background: open ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
          color: open ? "#a78bfa" : hov ? "#d0d0e8" : "#8b8ba0",
          transition: "all 0.15s", border: "none", fontFamily: "inherit", boxSizing: "border-box", position: "relative",
        }}
      >
        <span style={{ width: 20, height: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {Icons.bell}
          {unread > 0 && (
            <span style={{ position: "absolute", top: -5, right: -7, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, fontFamily: "'JetBrains Mono',monospace" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        <span style={{ fontSize: 15.5, fontWeight: 500, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.01em", textAlign: "left" }}>Alerts</span>
      </button>

      {open && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
          <div style={{
            position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, width: 340, maxHeight: 460,
            display: "flex", flexDirection: "column", fontFamily: "'Outfit',sans-serif",
            background: "#111118", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)", animation: "flyoutIn 0.14s ease", overflow: "hidden",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Notifications</span>
              {unread > 0 && (
                <button onClick={markEveryRead} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#7c5cfc", fontFamily: "inherit" }}>Mark all read</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {items.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center", color: "#55556a", fontSize: 13 }}>You're all caught up.</div>
              ) : items.map(n => (
                <button key={n.id} onClick={() => onRowClick(n)} style={{
                  display: "flex", gap: 10, width: "100%", textAlign: "left", padding: "11px 14px",
                  background: n.read_at ? "transparent" : "rgba(124,92,252,0.07)",
                  border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", fontFamily: "inherit",
                }}>
                  <span style={{ flexShrink: 0, fontSize: 16, lineHeight: 1.3 }}>{n.icon || "🔔"}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#e8e8f0", lineHeight: 1.3 }}>{n.title}</span>
                    {n.body && <span style={{ display: "block", fontSize: 11.5, color: "#9494a8", marginTop: 2, lineHeight: 1.35 }}>{n.body}</span>}
                    <span style={{ display: "block", fontSize: 10.5, color: "#55556a", marginTop: 4 }}>{relTime(n.created_at)}</span>
                  </span>
                  {!n.read_at && (
                    <span role="button" title="Mark as read"
                      onClick={(e) => { e.stopPropagation(); markOneRead(n.id); }}
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, marginTop: 1, cursor: "pointer", borderRadius: "50%" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: SEV_COLOR[n.severity] || "#7c5cfc" }} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button onClick={() => { setOpen(false); navigate("/notifications"); }} style={{ padding: "11px 14px", background: "transparent", border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#7c5cfc", fontFamily: "inherit" }}>
              View all
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function MobileBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.innerWidth >= 768) return false;
    return sessionStorage.getItem("mobile_banner_dismissed") !== "1";
  });

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2 md:hidden"
      style={{ background: "#1a1a2e", borderBottom: "1px solid rgba(124,92,252,0.3)" }}
    >
      <span className="text-[13px] text-[#b0b0c8]">
        Vidquence works best on desktop. Some features may not work on mobile.
      </span>
      <button
        onClick={() => { sessionStorage.setItem("mobile_banner_dismissed", "1"); setVisible(false); }}
        className="shrink-0 text-[#77777f] hover:text-[#e8e8f0] transition-colors bg-transparent border-0 cursor-pointer text-[18px] leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function AppLayout({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { balance } = useCreditsStore();
  const { isProPlus, fetchPlan } = usePlanStore();
  const path = location.pathname;
  const [isAdmin, setIsAdmin] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

// Video service nav is hidden — those live in the Dashboard chatbox now. Image/Audio
  // tools live under Explore; user projects under Projects. (Routes/pages kept intact.)
  const inImages  = ["/image-generation", "/product-poster", "/banner-design", "/virtual-tryon"].includes(path) || path.startsWith("/thumbnail");
  const inAudio   = path === "/voiceover" || path === "/speech-to-text";
  const inAccount = ["/credits", "/settings", "/feedback", "/brand-kit", "/support", "/invite"].includes(path);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(session?.user?.app_metadata?.role === "admin");
    });
    fetchPlan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <MobileBanner />
      <style>{`@keyframes flyoutIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div className="flex h-screen overflow-hidden text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

        {/* ── Narrow sidebar ── */}
        <aside
          className="flex flex-col shrink-0 border-r"
          style={{ width: 172, borderColor: "rgba(255,255,255,0.06)", background: "#13131e" }}
        >
          {/* Logo */}
          <Link to="/" title="Home" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}>
            <img src="/assets/images/logo-v.png" alt="Vidquence" style={{ height: 100, width: "auto" }} />
          </Link>

          {/* Top nav */}
          <nav style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
            <IconBtn icon={Icons.create} label="Create" to="/dashboard" active={path === "/dashboard"} />
            <IconBtn icon={Icons.folder}  label="Projects" to="/projects" active={path === "/projects"} />
            <IconBtn icon={Icons.gallery} label="Explore"  to="/explore"  active={path === "/explore" || inImages || inAudio} />
            <IconBtn icon={Icons.autopilot} label="Automation" to="/automation" active={path === "/automation" || path.startsWith("/automation/")} locked={!isProPlus} />
            <NotificationsBell />
          </nav>

          {/* Bottom: credits + account + signout */}
          <div style={{ padding: "10px 12px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 3 }}>
            {isAdmin && (
              <IconBtn icon={Icons.admin} label="Admin" to="/admin" active={path === "/admin" || path.startsWith("/admin/")} />
            )}

            {/* Credits */}
            <button
              onClick={() => navigate("/credits")}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, width: "100%" }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: balance !== null && balance < 10
                  ? "linear-gradient(135deg, rgba(249,115,22,0.28), rgba(249,115,22,0.06))"
                  : "linear-gradient(135deg, rgba(124,92,252,0.30), rgba(124,92,252,0.06))",
                border: `1px solid ${balance !== null && balance < 10 ? "rgba(249,115,22,0.32)" : "rgba(124,92,252,0.32)"}`,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⚡</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.1 }}>
                    {balance ?? "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "#9a9ab0", fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>Credits</span>
                </div>
              </div>
            </button>

            {/* Show to anyone not on a paid plan (no free plan exists); admins always see it so they
                can preview the modal. Opens the in-app upgrade modal, not the marketing /#pricing page. */}
            {(!isProPlus || isAdmin) && (
              <button onClick={() => setUpgradeOpen(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "linear-gradient(135deg, #f5c518, #f97316)", color: "#0b0b12", fontWeight: 700, fontSize: 13.5, fontFamily: "'Outfit',sans-serif", border: "none", cursor: "pointer", width: "100%" }}>
                <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.star}</span> Upgrade
              </button>
            )}

            <FlyoutGroup icon={Icons.settings} label="Account" active={inAccount}>
              <NavItem icon={Icons.gift}     label="Invite & Earn" to="/invite" active={path === "/invite"} />
              <NavItem icon={Icons.settings} label="Settings" to="/settings"   active={path === "/settings"} />
              <NavItem icon={Icons.support}  label="Help & Support" to="/support" active={path === "/support"} />
              <NavItem icon={Icons.message}  label="Feedback" to="/feedback"   active={path === "/feedback"} />
            </FlyoutGroup>

            <IconBtn
              icon={Icons.signout}
              label="Logout"
              onClick={async () => { await signOut(); window.location.href = "/"; }}
              active={false}
            />
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <SystemStatusBanner />
          {children}
        </div>

      </div>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
