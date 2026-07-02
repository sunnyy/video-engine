/**
 * LegalLayout.jsx
 * Shared wrapper for all legal pages — dark theme, centered, readable.
 */
import { useNavigate } from "react-router-dom";
import MarketingNav from "../../ui/MarketingNav";

export default function LegalLayout({ title, lastUpdated, children }) {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#06060e", color: "#e8e8f0", minHeight: "100vh", fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      {/* Nav — shared marketing header */}
      <MarketingNav />

      {/* Content */}
      <div className="page-pad" style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px 120px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#f5c518", marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 12, color: "#fff" }}>{title}</h1>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Last updated: {lastUpdated}</div>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 48 }}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "32px 40px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>© 2026 Vidquence. All rights reserved.</div>
        <div style={{ display: "flex", gap: 24 }}>
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["Refund Policy", "/refunds"], ["Cookies", "/cookies"]].map(([label, href]) => (
            <button key={href} onClick={() => navigate(href)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.35)"}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
