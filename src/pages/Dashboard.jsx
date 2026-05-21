import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreditsStore } from "../store/useCreditsStore";
import { useProjectsStore } from "../store/useProjectsStore";
import { supabase } from "../lib/supabase";
import { getProfile } from "../services/profile/profileService";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";
import Onboarding from "./Onboarding";
import FeedbackModal from "../ui/components/FeedbackModal";

const SECTIONS = [
  {
    id: "video",
    label: "Video",
    accent: "#f5c518",
    services: [
      { emoji: "🛍️", title: "Product Video",       desc: "Drop a product photo. Ship a scroll-stopping video ad in minutes.", href: "/product-video",      accent: "#f97316", tag: "Hot 🔥" },
      { emoji: "💬", title: "Video Captions",     desc: "Boost watch time & reach with auto-styled captions on any video.", href: "/video-captions",     accent: "#34d399" },
    ],
  },
  {
    id: "image",
    label: "Image",
    accent: "#a78bfa",
    services: [
      { emoji: "🖼️", title: "AI Images",        desc: "Create product shots, ad creatives & social visuals in seconds.", href: "/image-generation", accent: "#a78bfa" },
      { emoji: "🪄", title: "Product Poster",   desc: "Get a luxury ad poster from a product photo — ready to publish.",  href: "/product-poster",   accent: "#34d399", tag: "New ✨" },
      { emoji: "🎨", title: "Banner Design",    desc: "Launch-ready social banners for any platform, any niche.",          href: "/banner-design",    accent: "#f5c518" },
      { emoji: "🖱️", title: "Thumbnails",       desc: "More clicks, more views — high-impact thumbnails in seconds.",      href: "/thumbnail",        accent: "#f97316" },
      { emoji: "👕", title: "Virtual Try-On",   desc: "Show any outfit on any model — no photoshoot needed.",              href: "/virtual-tryon",    accent: "#22d3ee" },
    ],
  },
  {
    id: "audio",
    label: "Audio",
    accent: "#f472b6",
    services: [
      { emoji: "🔊", title: "Voiceover / TTS",  desc: "Add a pro-sounding voice to any script — 30+ languages.",    href: "/voiceover",        accent: "#f472b6" },
      { emoji: "🎙️", title: "Speech to Text",   desc: "Get a clean, accurate transcript from any audio or video.",   href: "/speech-to-text",   accent: "#22d3ee" },
    ],
  },
];

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString();
}

function ServiceCard({ service }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const glow   = service.accent + "18";
  const border = service.accent + "38";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate(service.href)}
      style={{
        background:   hov ? `linear-gradient(140deg, ${glow}, #111118 60%)` : "#111118",
        border:       `1px solid ${hov ? border : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14,
        padding:      "16px 18px",
        cursor:       "pointer",
        transition:   "all 0.18s",
        transform:    hov ? "translateY(-2px)" : "none",
        boxShadow:    hov ? `0 8px 28px rgba(0,0,0,0.35)` : "none",
        display:      "flex",
        flexDirection: "column",
        gap:          10,
        position:     "relative",
        overflow:     "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>{service.emoji}</span>
        {service.tag && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: glow, color: service.accent, border: `1px solid ${border}` }}>
            {service.tag}
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: hov ? service.accent : "#e8e8f0", fontFamily: "'Outfit',sans-serif", marginBottom: 4, transition: "color 0.18s" }}>
          {service.title}
        </div>
        <div style={{ fontSize: 12, color: "#7070a0", lineHeight: 1.5 }}>
          {service.desc}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: service.accent, opacity: hov ? 1 : 0.5, transition: "opacity 0.18s" }}>
        Open →
      </div>
    </div>
  );
}

function MiniVideoCard({ project }) {
  const beats = project.safe_project_json?.beats || [];
  const meta  = project.safe_project_json?.meta  || {};
  let thumb = meta.thumbnail || null;
  if (!thumb && beats[0]) {
    for (const zone of Object.values(beats[0].zones || {})) {
      if (zone.content?.asset?.src) { thumb = zone.content.asset.src; break; }
    }
  }
  if (!thumb && beats[0]?.layoutBackground?.type === "image") {
    thumb = beats[0].layoutBackground.value;
  }

  return (
    <a
      href={`/editor/${project.id}`}
      style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", padding: "10px 12px", background: "#111118", textDecoration: "none", transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.35)"; e.currentTarget.style.background = "#14141e"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "#111118"; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1a1a28", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {thumb
          ? <img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 18 }}>🎬</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.name || "Untitled"}
        </div>
        <div style={{ fontSize: 11, color: "#55556a", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
          {timeLabel(project.updated_at)} · {beats.length} beat{beats.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div style={{ color: "#55556a", fontSize: 14 }}>›</div>
    </a>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { balance } = useCreditsStore();
  const { projects, loading, fetchProjects } = useProjectsStore();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [userId,         setUserId]         = useState(null);
  const [userName,       setUserName]       = useState("");

  useEffect(() => {
    fetchProjects();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name?.split(" ")[0] || user.user_metadata?.name?.split(" ")[0] || "");
      const lsKey = `onboarding_done_${user.id}`;
      if (localStorage.getItem(lsKey)) return;
      getProfile(user.id).then(profile => {
        if (profile === null) return;
        if (profile?.onboarding_completed) {
          localStorage.setItem(lsKey, "1");
        } else {
          setShowOnboarding(true);
        }
      }).catch(() => {});
    });

    if (!localStorage.getItem("feedback_prompted")) {
      serverFetch("/api/feedback/mine").then(r => r.json()).then(({ count }) => {
        if (count === 0) {
          setTimeout(() => {
            localStorage.setItem("feedback_prompted", "true");
            setShowFeedback(true);
          }, 3000);
        } else {
          localStorage.setItem("feedback_prompted", "true");
        }
      }).catch(() => {});
    }
  }, []);

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 4);

  const isNew = !loading && projects.length === 0;

  return (
    <AppLayout>
      {showOnboarding && userId && (
        <Onboarding userId={userId} onComplete={() => {
          localStorage.setItem(`onboarding_done_${userId}`, "1");
          setShowOnboarding(false);
        }} />
      )}
      {showFeedback && (
        <FeedbackModal context="post_visit" onClose={() => setShowFeedback(false)} />
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: 1040, padding: "44px 40px 80px", margin: "0 auto" }}>

          {/* ── Greeting ── */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", margin: 0 }}>
              {userName ? `Hey, ${userName}! 👋` : "Welcome back! 👋"}
            </h1>
            <p style={{ fontSize: 14, marginTop: 6, color: "#7070a0" }}>
              What are we creating today?
            </p>
          </div>

          {/* ── Credits strip ── */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderRadius: 14, border: "1px solid", padding: "14px 20px", marginBottom: 40,
              background:  balance !== null && balance < 10 ? "rgba(249,115,22,0.06)" : "rgba(124,92,252,0.06)",
              borderColor: balance !== null && balance < 10 ? "rgba(249,115,22,0.25)" : "rgba(124,92,252,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>Credits</div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginTop: 2, color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa", fontFamily: "'Outfit',sans-serif" }}>
                  {balance ?? "—"}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/credits")}
              style={{ fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: balance !== null && balance < 10 ? "rgba(249,115,22,0.15)" : "rgba(124,92,252,0.15)", color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa" }}
            >
              {balance !== null && balance < 10 ? "Top Up →" : "View Details →"}
            </button>
          </div>

          {/* ── Service Sections ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {SECTIONS.map(section => (
              <div key={section.id}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: section.accent, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: section.accent, fontFamily: "'JetBrains Mono',monospace" }}>
                    {section.label}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                </div>

                {/* Cards grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
                  {section.services.map(s => (
                    <ServiceCard key={s.href} service={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Recent Videos ── */}
          {!isNew && (
            <div style={{ marginTop: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: "#55556a", flexShrink: 0 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                    Recent Videos
                  </div>
                </div>
                <button
                  onClick={() => navigate("/videos")}
                  style={{ fontSize: 13, border: "none", cursor: "pointer", background: "transparent", color: "#7c5cfc" }}
                >
                  View All →
                </button>
              </div>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0", color: "#55556a" }}>
                  <div className="w-4 h-4 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
                  <span style={{ fontSize: 13 }}>Loading…</span>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {recentProjects.map(p => <MiniVideoCard key={p.id} project={p} />)}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
