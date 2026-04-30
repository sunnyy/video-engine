/**
 * AppLayout.jsx
 * Shared sidebar + page shell for all authenticated app pages.
 * Usage: wrap page content with <AppLayout>{children}</AppLayout>
 */
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";

/* ── Icons ── */
const Icons = {
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  ),
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
    </svg>
  ),
  gallery: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/>
      <rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/>
    </svg>
  ),
  mic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0014 0"/>
      <line x1="12" y1="21" x2="12" y2="17"/><line x1="9" y1="21" x2="15" y2="21"/>
    </svg>
  ),
  box: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  credits: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  message: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
};

function NavItem({ icon, label, to, href, active, soon }) {
  const [hov, setHov] = useState(false);

  const sharedStyle = {
    display:        "flex",
    alignItems:     "center",
    gap:            10,
    padding:        "7px 12px",
    borderRadius:   8,
    textDecoration: "none",
    border:         "none",
    transition:     "all 0.15s",
    cursor:         soon ? "default" : "pointer",
    background:     active ? "rgba(124,92,252,0.15)" : hov && !soon ? "rgba(255,255,255,0.04)" : "transparent",
    color:          active ? "#a78bfa" : soon ? "#44444f" : hov ? "#d8d8ea" : "#9494a8",
    width:          "100%",
    boxSizing:      "border-box",
    fontFamily:     "inherit",
  };

  const inner = (
    <>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: 500, flex: 1, fontFamily: "'Outfit',sans-serif" }}>{label}</span>
      {soon && (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", padding: "2px 5px", borderRadius: 3, background: "rgba(255,255,255,0.05)", color: "#55556a" }}>
          SOON
        </span>
      )}
    </>
  );

  const events = {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: sharedStyle,
  };

  if (soon)  return <div {...events}>{inner}</div>;
  if (href)  return <a href={href} {...events}>{inner}</a>;
  return <Link to={to} {...events}>{inner}</Link>;
}

function NavSection({ title, children }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1 text-[11px] font-bold tracking-[0.12em] uppercase"
        style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
        {title}
      </div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { balance, fetchCredits } = useCreditsStore();

  useEffect(() => { fetchCredits(); }, []);

  return (
    <div className="flex min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col shrink-0 border-r"
        style={{ width: 220, borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}
      >
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="mb-3">
            <button
              onClick={() => navigate("/credits")}
              className="w-full border-0 cursor-pointer mb-2"
              style={{ background: "transparent", padding: 0 }}
            >
              <div style={{
                background: balance !== null && balance < 10
                  ? "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.06))"
                  : "linear-gradient(135deg, rgba(124,92,252,0.15), rgba(124,92,252,0.07))",
                border: `1px solid ${balance !== null && balance < 10 ? "rgba(249,115,22,0.25)" : "rgba(124,92,252,0.25)"}`,
                borderRadius: 10,
                padding: "10px 12px",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#55556a", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5 }}>
                  Credits
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>⚡</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-0.02em" }}>
                    {balance ?? "—"}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: balance !== null && balance < 10 ? "rgba(249,115,22,0.7)" : "rgba(124,92,252,0.6)", fontWeight: 600 }}>
                  {balance !== null && balance < 10 ? "Low — top up →" : "Top up →"}
                </div>
              </div>
            </button>
            <NavItem icon={Icons.home} label="Dashboard" to="/dashboard" active={location.pathname === "/dashboard"} />
          </div>

          <NavSection title="Create Videos">
            <NavItem icon={Icons.folder}   label="AI Videos"        to="/videos"         active={location.pathname === "/videos"} />
            <NavItem icon={Icons.ad}       label="Product Video Ad" to="/product-ads"    active={location.pathname.startsWith("/product-ads")} />
            <NavItem icon={Icons.captions} label="Video Captions"   to="/video-captions" active={location.pathname === "/video-captions"} />
          </NavSection>

          <NavSection title="Create Images">
            <NavItem icon={Icons.gallery}    label="AI Images"      to="/image-generation" active={location.pathname === "/image-generation"} />
            <NavItem icon={Icons.poster}     label="Product Poster" to="/product-poster"   active={location.pathname === "/product-poster"} />
            <NavItem icon={Icons.instagram}  label="Banner Design"  to="/banner-design"    active={location.pathname === "/banner-design"} />
            <NavItem icon={Icons.thumbnail}  label="Thumbnail"      to="/thumbnail"        active={location.pathname.startsWith("/thumbnail")} />
            <NavItem icon={Icons.outfit}     label="Virtual Try-On" to="/virtual-tryon"    active={location.pathname === "/virtual-tryon"} />
          </NavSection>

          <NavSection title="Audio Tools">
            <NavItem icon={Icons.voice} label="Voiceover / TTS"  to="/voiceover"      active={location.pathname === "/voiceover"} />
            <NavItem icon={Icons.mic}   label="Speech to Text"   to="/speech-to-text" active={location.pathname === "/speech-to-text"} />
          </NavSection>

          <NavSection title="Account">
            <NavItem icon={Icons.star}     label="Upgrade"  href="/#pricing" active={false} />
            <NavItem icon={Icons.credits}  label="Credits"  to="/credits"   active={location.pathname === "/credits"} />
            <NavItem icon={Icons.settings} label="Settings" to="/settings"  active={location.pathname === "/settings"} />
            <NavItem icon={Icons.message}  label="Feedback" to="/feedback"  active={location.pathname === "/feedback"} />
          </NavSection>
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={async () => { await signOut(); window.location.href = "/"; }}
            className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[15px] border-0 cursor-pointer transition-all text-left"
            style={{ background: "transparent", color: "#f87171", fontFamily: "'Outfit',sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span>↩</span> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

    </div>
  );
}
