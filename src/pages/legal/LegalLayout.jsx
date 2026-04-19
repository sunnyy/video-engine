/**
 * LegalLayout.jsx
 * Shared wrapper for all legal pages — dark theme, centered, readable.
 */
import { useNavigate } from "react-router-dom";

export default function LegalLayout({ title, lastUpdated, children }) {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#06060e", color: "#e8e8f0", minHeight: "100vh", fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px",
        background: "rgba(6,6,14,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: "#f5c518", fontSize: 20, fontWeight: 800, letterSpacing: 3, cursor: "pointer", fontFamily: "inherit" }}>
          Vidquence
        </button>
        <button onClick={() => navigate(-1)}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", fontSize: 13, padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
          ← Back
        </button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px 120px" }}>
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
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["Refund Policy", "/refunds"]].map(([label, href]) => (
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
