/**
 * MarketingNav — the shared public-site header (homepage look) for non-home marketing pages
 * (About, Terms, Privacy, Refunds, FAQ…) so the header is identical everywhere. Self-contained
 * (inline styles, no dependency on the landing page's scoped CSS) and renders a spacer so fixed
 * positioning never overlaps page content.
 *
 * `active` — the href of the current page (e.g. "/about") to highlight it.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../services/auth/authService";

const NAV_H = 60;
const LINKS = [
  ["About Us", "/about"],
  ["Services", "/#services"],
  ["How It Works", "/#how"],
  ["Pricing", "/#pricing"],
];

export default function MarketingNav({ active }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { getSession().then(setSession).catch(() => {}); }, []);

  const linkStyle = (href) => ({
    fontFamily: "'Outfit', sans-serif", fontSize: 15, textDecoration: "none",
    padding: "7px 14px", borderRadius: 6, transition: "color 0.2s",
    color: active === href ? "#f5c518" : "#c4c4d4",
  });

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: NAV_H,
        background: "rgba(15,14,26,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div className="page-pad" style={{ maxWidth: 1380, margin: "0 auto", padding: "0 40px", height: NAV_H, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="mnav-links" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {LINKS.map(([label, href]) => (
                <a key={href} href={href} style={linkStyle(href)}
                  onMouseEnter={(e) => { if (active !== href) e.currentTarget.style.color = "#f5f5fb"; }}
                  onMouseLeave={(e) => { if (active !== href) e.currentTarget.style.color = "#c4c4d4"; }}>
                  {label}
                </a>
              ))}
            </div>
            <button onClick={() => navigate("/login")}
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: "#0F0E1A", background: "#f5c518", border: "none", borderRadius: 7, padding: "9px 18px", cursor: "pointer", marginLeft: 4, whiteSpace: "nowrap" }}>
              Get Started
            </button>
            <button className="mnav-burger" aria-label="Menu" onClick={() => setOpen(o => !o)}
              style={{ display: "none", alignItems: "center", justifyContent: "center", width: 40, height: 38, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#e8e8f0", cursor: "pointer" }}>
              {open
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>}
            </button>
          </div>
        </div>

        {open && (
          <div className="mnav-drawer" style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 20px 16px", background: "rgba(15,14,26,0.98)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {LINKS.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                style={{ ...linkStyle(href), fontSize: 16, padding: "12px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {label}
              </a>
            ))}
          </div>
        )}

        <style>{`
          @media (max-width: 700px){ .mnav-links{ display: none !important; } .mnav-burger{ display: inline-flex !important; } }
          @media (min-width: 701px){ .mnav-drawer{ display: none !important; } }
        `}</style>
      </nav>
      <div style={{ height: NAV_H }} aria-hidden="true" />
    </>
  );
}
