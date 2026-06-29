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
        <div style={{ maxWidth: 1380, margin: "0 auto", padding: "0 40px", height: NAV_H, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 38, width: "auto" }} />
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {LINKS.map(([label, href]) => (
              <a key={href} href={href} style={linkStyle(href)}
                onMouseEnter={(e) => { if (active !== href) e.currentTarget.style.color = "#f5f5fb"; }}
                onMouseLeave={(e) => { if (active !== href) e.currentTarget.style.color = "#c4c4d4"; }}>
                {label}
              </a>
            ))}
            <button onClick={() => navigate("/login")}
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: "#0F0E1A", background: "#f5c518", border: "none", borderRadius: 7, padding: "9px 18px", cursor: "pointer", marginLeft: 4 }}>
              Get Started
            </button>
          </div>
        </div>
      </nav>
      <div style={{ height: NAV_H }} aria-hidden="true" />
    </>
  );
}
