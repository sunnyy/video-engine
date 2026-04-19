import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { signOut } from "../services/auth/authService";
import { useCreditsStore } from "../store/useCreditsStore";

/* ── Sidebar icons ── */
const Icons = {
  folder:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  gallery:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="13" y="2" width="9" height="9" rx="1.5"/><rect x="2" y="13" width="9" height="9" rx="1.5"/><rect x="13" y="13" width="9" height="9" rx="1.5"/></svg>,
  box:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  credits:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

function NavItem({ icon, label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-[10px] px-3 py-[7px] rounded-[8px] text-left border-0 transition-all cursor-pointer"
      style={{
        background: active ? "rgba(124,92,252,0.15)" : hov ? "rgba(255,255,255,0.04)" : "transparent",
        color:      active ? "#a78bfa" : hov ? "#d8d8ea" : "#9494a8",
      }}>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span className="text-[15px] font-medium flex-1" style={{ fontFamily: "'Syne',sans-serif" }}>{label}</span>
    </button>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1 text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>{title}</div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

/* ── Content sections ── */
function SectionLabel({ children }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[2px] mb-4" style={{ color: "#f5c518", fontFamily: "'JetBrains Mono',monospace" }}>
      {children}
    </div>
  );
}

function AboutContent() {
  const VALUES = [
    { title: "Quality First",    body: "We'd rather do fewer things exceptionally well than many things poorly." },
    { title: "Creator Respect",  body: "Your content, your brand, your control. We build tools, not dependencies." },
    { title: "Honest AI",        body: "AI handles the heavy lifting. You make the final call. Always." },
    { title: "Keep Shipping",    body: "We build in public, improve constantly, and listen to our users." },
  ];

  const WHAT_WE_DO = [
    {
      emoji: "🎬",
      title: "Production, Automated",
      body: "From script to export, every element of your video is produced intelligently — visuals, voice, music, and motion.",
    },
    {
      emoji: "🌍",
      title: "Built for Every Niche",
      body: "17 content categories, each with its own visual identity, tone, and energy. Finance doesn't look like gaming. It never should.",
    },
    {
      emoji: "✏️",
      title: "Always Editable",
      body: "No locked outputs. Every element of every moment is yours to change — text, visuals, timing, everything.",
    },
  ];

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 40px 100px" }}>

      {/* ── Hero ── */}
      <section style={{ marginBottom: 96 }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(52px, 8vw, 88px)",
          lineHeight: 1.0,
          letterSpacing: "-0.5px",
          color: "#e8e8f0",
          marginBottom: 24,
        }}>
          Built for Creators.<br />
          Powered by <span style={{ color: "#f5c518" }}>AI.</span>
        </h1>
        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 20,
          color: "#8888a8",
          maxWidth: 560,
          lineHeight: 1.6,
          margin: 0,
        }}>
          Vidquence is an AI video production studio for the next generation of creators and businesses.
        </p>
      </section>

      {/* ── Mission ── */}
      <section style={{ marginBottom: 96 }}>
        <SectionLabel>Our Mission</SectionLabel>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "clamp(26px, 4vw, 38px)",
          fontWeight: 800,
          color: "#e8e8f0",
          marginBottom: 20,
          letterSpacing: "-0.3px",
        }}>
          Great video shouldn't require a production team.
        </h2>
        <p style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17,
          color: "#8888a8",
          lineHeight: 1.75,
          maxWidth: 680,
          margin: 0,
        }}>
          We believe professional-quality video content should be accessible to everyone — from solo creators growing an audience to businesses scaling their brand. Vidquence was built to close that gap.
        </p>
      </section>

      {/* ── What We Do ── */}
      <section style={{ marginBottom: 96 }}>
        <SectionLabel>The Studio</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {WHAT_WE_DO.map(item => (
            <div key={item.title} style={{
              background: "#111118",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              padding: "28px 24px",
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{item.emoji}</div>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 17,
                fontWeight: 700,
                color: "#e8e8f0",
                marginBottom: 10,
              }}>
                {item.title}
              </div>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#8888a8",
                lineHeight: 1.65,
              }}>
                {item.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values ── */}
      <section style={{ marginBottom: 96 }}>
        <SectionLabel>Values</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{
              background: "#111118",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: "3px solid #f5c518",
              borderRadius: 12,
              padding: "24px 24px",
            }}>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#e8e8f0",
                marginBottom: 8,
              }}>
                {v.title}
              </div>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#8888a8",
                lineHeight: 1.65,
              }}>
                {v.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
      <section style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 16,
          color: "#8888a8",
          marginBottom: 20,
        }}>
          Have a question or feedback?
        </div>
        <a href="mailto:hello@vidquence.com" style={{
          display: "inline-block",
          background: "#f5c518",
          color: "#0b0b10",
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          padding: "12px 28px",
          borderRadius: 8,
          textDecoration: "none",
        }}>
          hello@vidquence.com
        </a>
      </section>

    </div>
  );
}

/* ── Main export ── */
export default function About() {
  const navigate = useNavigate();
  const location = useLocation();
  const { balance, fetchCredits } = useCreditsStore();

  const [authed, setAuthed] = useState(null); // null = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      if (session) fetchCredits();
    });
  }, []);

  // While checking auth, render nothing (avoids layout flash)
  if (authed === null) return null;

  /* ── Logged-in layout: full sidebar ── */
  if (authed) {
    return (
      <div className="flex min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>
        <aside className="flex flex-col shrink-0 border-r" style={{ width: 220, borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
          <div className="px-4 py-5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
          </div>
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="flex flex-col gap-[2px] mb-5">
              <NavItem icon={Icons.folder}  label="Videos"  active={false} onClick={() => navigate("/dashboard")} />
              <NavItem icon={Icons.gallery} label="Images"  active={false} onClick={() => navigate("/image-generation")} />
              <NavItem icon={Icons.box}     label="Assets"  active={false} onClick={() => navigate("/assets")} />
              <NavItem icon={Icons.credits} label="Credits" active={false} onClick={() => navigate("/credits")} />
            </div>
            <NavSection title="Account">
              <NavItem icon={Icons.settings} label="Settings" active={false} onClick={() => navigate("/settings")} />
            </NavSection>
          </nav>
          <div className="px-3 py-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between px-3 py-[7px] rounded-[8px] text-[14px] font-mono"
              style={{ background: "rgba(255,255,255,0.04)", color: balance !== null && balance < 10 ? "#f97316" : "#7c5cfc" }}>
              <span>⚡ Credits</span>
              <span className="font-bold">{balance ?? "—"}</span>
            </div>
            <button onClick={async () => { await signOut(); navigate("/login"); }}
              className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[8px] text-[15px] border-0 cursor-pointer transition-all text-left"
              style={{ background: "transparent", color: "#f87171" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span>↩</span> Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto">
          <AboutContent />
        </div>
      </div>
    );
  }

  /* ── Logged-out layout: simple top nav ── */
  return (
    <div className="min-h-screen text-[#e8e8f0]" style={{ background: "#0b0b10" }}>
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0d0d14",
        padding: "0 40px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/assets/images/logo.png" alt="Vidquence" style={{ height: 62, width: "auto" }} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/#pricing" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#8888a8", textDecoration: "none" }}>Pricing</a>
          <a href="/login" style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            background: "#f5c518", color: "#0b0b10", padding: "7px 16px", borderRadius: 7, textDecoration: "none",
          }}>Sign In</a>
        </div>
      </nav>
      <AboutContent />
    </div>
  );
}
