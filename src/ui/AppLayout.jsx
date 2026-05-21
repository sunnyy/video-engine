import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";
import { supabase } from "../lib/supabase";

/* ── Icons ── */
const Icons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
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
  aiVideo: (
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
function IconBtn({ icon, label, to, href, onClick, active }) {
  const [hov, setHov] = useState(false);
  const style = {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "9px 4px", borderRadius: 10, cursor: "pointer", gap: 5, width: "100%",
    background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
    color: active ? "#a78bfa" : hov ? "#d0d0e8" : "#6e6e88",
    transition: "all 0.15s", textDecoration: "none", border: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const inner = (
    <>
      <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.01em", textAlign: "center", width: "100%" }}>{label}</span>
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
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "9px 4px", borderRadius: 10, cursor: "pointer", gap: 5, width: "100%",
          background: active || open ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
          color: active || open ? "#a78bfa" : hov ? "#d0d0e8" : "#6e6e88",
          transition: "all 0.15s", fontFamily: "inherit", boxSizing: "border-box",
        }}
      >
        <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.01em", textAlign: "center", width: "100%" }}>{label}</span>
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
  const path = location.pathname;
  const [isAdmin, setIsAdmin] = useState(false);

const inVideos  = path === "/videos" || path === "/new" || path === "/videos/typography" || path === "/videos/explainer" || path === "/video-captions" || path === "/videos/custom" || path === "/product-video";
  const inImages  = ["/image-generation", "/product-poster", "/banner-design", "/virtual-tryon"].includes(path) || path.startsWith("/thumbnail");
  const inAudio   = path === "/voiceover" || path === "/speech-to-text";
  const inAccount = ["/credits", "/settings", "/feedback"].includes(path);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(session?.user?.app_metadata?.role === "admin");
    });
  }, []);

  return (
    <>
      <MobileBanner />
      <style>{`@keyframes flyoutIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div className="flex h-screen overflow-hidden text-[#e8e8f0]" style={{ background: "#0b0b10" }}>

        {/* ── Narrow sidebar ── */}
        <aside
          className="flex flex-col shrink-0 border-r"
          style={{ width: 84, borderColor: "rgba(255,255,255,0.06)", background: "#13131e" }}
        >
          {/* Logo */}
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}>
            <img src="/assets/images/favicon.png" alt="Vidquence" style={{ height: 56, width: "auto" }} />
          </Link>

          {/* Top nav */}
          <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
            <IconBtn icon={Icons.home} label="Home" to="/dashboard" active={path === "/dashboard"} />

            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />

            <FlyoutGroup icon={Icons.folder} label="Videos" active={inVideos}>
              {isAdmin && <NavItem icon={Icons.aiVideo}    label="Product Video (AI)" sub="AI-generated product ads" to="/product-video"      active={path === "/product-video"} />}
              <NavItem icon={Icons.ad}         label="Product Video"    sub="Ads for your products"    to="/product-video"      active={path === "/product-video"} />
              <NavItem icon={Icons.captions}   label="Video Captions"   sub="Auto-caption your videos" to="/video-captions"     active={path === "/video-captions"} />
              <NavItem icon={Icons.explainer}  label="Explainer Video"  sub="Talking head + visuals"   to="/videos/explainer"   active={path === "/videos/explainer"} />
              {isAdmin && <NavItem icon={Icons.typography} label="Typography Video" sub="Kinetic text videos"       to="/videos/typography"  active={path === "/videos/typography"} />}
              <NavItem icon={Icons.aiVideo}    label="AI Videos"        sub="Generated with AI"        to="/videos"             active={path === "/videos" || path === "/new"} />
              <NavItem icon={Icons.custom}     label="Custom Videos"    sub="Built from scratch"       to="/videos/custom"      active={path === "/videos/custom"} />
            </FlyoutGroup>

            <FlyoutGroup icon={Icons.gallery} label="Images" active={inImages}>
              <NavItem icon={Icons.gallery}   label="Images"         sub="AI image generation"   to="/image-generation" active={path === "/image-generation"} />
              <NavItem icon={Icons.poster}    label="Product Poster" sub="Studio-quality posters" to="/product-poster"   active={path === "/product-poster"} />
              <NavItem icon={Icons.instagram} label="Banner Design"  sub="Social media banners"  to="/banner-design"    active={path === "/banner-design"} />
              <NavItem icon={Icons.thumbnail} label="Thumbnail"      sub="YouTube thumbnails"    to="/thumbnail"        active={path.startsWith("/thumbnail")} />
              <NavItem icon={Icons.outfit}    label="Virtual Try-On" sub="Try clothes with AI"   to="/virtual-tryon"    active={path === "/virtual-tryon"} />
            </FlyoutGroup>

            <FlyoutGroup icon={Icons.mic} label="Audio" active={inAudio}>
              <NavItem icon={Icons.voice} label="Voiceover / TTS" sub="Text to speech voices"    to="/voiceover"      active={path === "/voiceover"} />
              <NavItem icon={Icons.mic}   label="Speech to Text"  sub="Transcribe audio to text" to="/speech-to-text" active={path === "/speech-to-text"} />
            </FlyoutGroup>
          </nav>

          {/* Bottom: credits + account + signout */}
          <div style={{ padding: "6px 6px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Credits */}
            <button
              onClick={() => navigate("/credits")}
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, width: "100%" }}
            >
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "8px 4px", borderRadius: 10,
                background: balance !== null && balance < 10 ? "rgba(249,115,22,0.1)" : "rgba(124,92,252,0.1)",
              }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>⚡</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa", fontFamily: "'JetBrains Mono',monospace" }}>
                  {balance ?? "—"}
                </span>
              </div>
            </button>

            <FlyoutGroup icon={Icons.settings} label="Account" active={inAccount}>
              <NavItem icon={Icons.star}     label="Upgrade"  href="/#pricing" active={false} />
              <NavItem icon={Icons.credits}  label="Credits"  to="/credits"    active={path === "/credits"} />
              <NavItem icon={Icons.settings} label="Settings" to="/settings"   active={path === "/settings"} />
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
          {children}
        </div>

      </div>
    </>
  );
}
