import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AppLayout from "../../ui/AppLayout";
import { usePlanStore } from "../../store/usePlanStore";

/**
 * AutomationLayout — shared chrome for the Automation hub: the page title + tab bar, then an
 * <Outlet> that renders the active tab's OWN page (kept as separate route components so no single
 * file balloons):
 *   /automation             → Campaigns   (Automation.jsx)
 *   /automation/channels    → Channels    (AutomationChannels.jsx — the Social Accounts panel)
 *   /automation/brand-kit   → Brand Kit   (AutomationBrandKit.jsx)
 * The layout is open to all plans (Channels power the editor's Publish button too); the Campaigns
 * and Brand Kit tab pages gate themselves to Pro/Max.
 */

const T = { bg: "#090b11", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", accent: "#7c5cfc" };

const TABS = [
  { to: "/automation", label: "Campaigns", end: true },
  { to: "/automation/channels", label: "Channels" },
  { to: "/automation/brand-kit", label: "Brand Kit" },
];

export default function AutomationLayout() {
  const { fetchPlan } = usePlanStore();
  useEffect(() => { fetchPlan(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 40px 80px" }}>
          {/* Hero */}
          <div style={{ position: "relative", display: "flex", gap: 24, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 22 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: "1 1 420px", minWidth: 0 }}>
              <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: "rgba(124,92,252,0.16)", border: "1px solid rgba(124,92,252,0.35)" }}>⚡</span>
              <div>
                <h1 style={{ fontSize: 34, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0, lineHeight: 1.05 }}>Automation</h1>
                <p style={{ fontSize: 14.5, color: T.muted, margin: "8px 0 0", lineHeight: 1.5 }}>Create, manage and automate content across channels.</p>
              </div>
            </div>
            <div className="autom-hero-art" style={{ display: "none", flex: "0 0 320px", height: 140, position: "relative", borderRadius: 18, overflow: "hidden", border: `1px solid ${T.border}`, background: "#0e1018" }}>
              <img src="/assets/images/automation_hero.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <style>{`@media (min-width: 900px){ .autom-hero-art{ display:block !important; } }`}</style>
          </div>

          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
            {TABS.map(t => (
              <NavLink key={t.to} to={t.to} end={t.end}
                style={({ isActive }) => ({
                  background: "none", border: "none", borderBottom: `2px solid ${isActive ? T.accent : "transparent"}`,
                  color: isActive ? T.text : T.muted, fontWeight: 700, fontSize: 13.5, padding: "10px 14px",
                  cursor: "pointer", fontFamily: "inherit", textDecoration: "none",
                })}>
                {t.label}
              </NavLink>
            ))}
          </div>

          <Outlet />
        </div>
      </div>
    </AppLayout>
  );
}
