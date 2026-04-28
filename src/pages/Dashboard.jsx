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

const SERVICES = [
  {
    emoji: "🎬",
    title: "AI Video",
    desc: "Script to short film — beats, visuals, voiceover, music. All in one shot.",
    cta: "Start Creating",
    href: "/new",
    accent: "#f5c518",
    glow: "rgba(245,197,24,0.15)",
    border: "rgba(245,197,24,0.22)",
    tag: "Most Popular",
  },
  {
    emoji: "🛍️",
    title: "Ad Studio",
    desc: "Drop a product photo. Get a full short-form video ad — strategy included.",
    cta: "Make an Ad",
    href: "/product-ad-studio",
    accent: "#f97316",
    glow: "rgba(249,115,22,0.15)",
    border: "rgba(249,115,22,0.22)",
    tag: "Hot 🔥",
  },
  {
    emoji: "🖼️",
    title: "Images",
    desc: "Gorgeous AI-generated images. Thumbnails, scene shots, social posts — done in seconds.",
    cta: "Generate Image",
    href: "/image-generation",
    accent: "#a78bfa",
    glow: "rgba(124,92,252,0.15)",
    border: "rgba(124,92,252,0.22)",
    tag: null,
  },
  {
    emoji: "🎙️",
    title: "Speech to Text",
    desc: "Upload audio or video and get a clean, accurate transcript back instantly.",
    cta: "Transcribe Now",
    href: "/transcription",
    accent: "#22d3ee",
    glow: "rgba(6,182,212,0.15)",
    border: "rgba(6,182,212,0.22)",
    tag: null,
  },
  {
    emoji: "🔊",
    title: "Voiceover",
    desc: "Natural AI voices in multiple languages. Professional narration in one click.",
    cta: "Generate Voice",
    href: "/tts-studio",
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.15)",
    border: "rgba(244,114,182,0.22)",
    tag: null,
  },
  {
    emoji: "🪄",
    title: "Poster",
    desc: "Turn any product photo into a luxury ad poster with AI styling and copy.",
    cta: "Design Poster",
    href: "/poster-studio",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.15)",
    border: "rgba(52,211,153,0.22)",
    tag: "New ✨",
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

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate(service.href)}
      className="relative rounded-[20px] border p-6 flex flex-col gap-5 cursor-pointer transition-all duration-200 overflow-hidden"
      style={{
        background:  hov ? `linear-gradient(135deg, ${service.glow}, #111118)` : "#111118",
        borderColor: hov ? service.border : "rgba(255,255,255,0.07)",
        transform:   hov ? "translateY(-3px)" : "none",
        boxShadow:   hov ? `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${service.border}` : "none",
      }}
    >
      {/* glow blob */}
      {hov && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 20% 20%, ${service.glow} 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="flex items-start justify-between relative z-10">
        <span style={{ fontSize: 36, lineHeight: 1 }}>{service.emoji}</span>
        {service.tag && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: `${service.glow}`, color: service.accent, border: `1px solid ${service.border}` }}
          >
            {service.tag}
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="text-[18px] font-bold mb-2" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
          {service.title}
        </div>
        <div className="text-[13px] leading-relaxed" style={{ color: "#7070a0" }}>
          {service.desc}
        </div>
      </div>

      <div
        className="self-start text-[13px] font-bold px-4 py-2 rounded-[10px] transition-all relative z-10"
        style={{
          background: hov ? service.accent : "rgba(255,255,255,0.06)",
          color:      hov ? "#0b0b10"      : service.accent,
        }}
      >
        {service.cta} →
      </div>
    </div>
  );
}

function MiniVideoCard({ project }) {
  const beats     = project.safe_project_json?.beats || [];
  const meta      = project.safe_project_json?.meta  || {};
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
      className="flex items-center gap-3 rounded-[12px] border px-3 py-3 transition-all"
      style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)", textDecoration: "none" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.35)"; e.currentTarget.style.background = "#14141e"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "#111118"; }}
    >
      <div
        className="shrink-0 rounded-[8px] overflow-hidden"
        style={{ width: 48, height: 48, background: "#1a1a28", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {thumb
          ? <img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 20 }}>🎬</span>
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold truncate" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
          {project.name || "Untitled"}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
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

    supabase.auth.getUser().then(({ data: { user } }) => {
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

      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: 960, padding: "44px 40px 80px", margin: "0 auto" }}>

          {/* ── Greeting ── */}
          <div className="mb-8">
            <h1 className="text-[30px] font-bold leading-tight" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
              {userName ? `Hey, ${userName}! 👋` : "Welcome back! 👋"}
            </h1>
            <p className="text-[15px] mt-2" style={{ color: "#7070a0" }}>
              What are we creating today?
            </p>
          </div>

          {/* ── Credits strip ── */}
          <div
            className="flex items-center justify-between rounded-[14px] border px-5 py-4 mb-10"
            style={{
              background:  balance !== null && balance < 10 ? "rgba(249,115,22,0.06)" : "rgba(124,92,252,0.06)",
              borderColor: balance !== null && balance < 10 ? "rgba(249,115,22,0.25)" : "rgba(124,92,252,0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 22 }}>⚡</span>
              <div>
                <div className="text-[12px] uppercase tracking-wider" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>Credits</div>
                <div className="text-[24px] font-bold leading-none mt-1" style={{ color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa", fontFamily: "'Syne',sans-serif" }}>
                  {balance ?? "—"}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/credits")}
              className="text-[13px] font-bold px-4 py-2 rounded-[10px] border-0 cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: balance !== null && balance < 10 ? "rgba(249,115,22,0.15)" : "rgba(124,92,252,0.15)", color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa" }}
            >
              {balance !== null && balance < 10 ? "Top Up →" : "View Details →"}
            </button>
          </div>

          {/* ── Services ── */}
          <div className="mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[2px] mb-5" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
              Studio Tools
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {SERVICES.map(s => <ServiceCard key={s.title} service={s} />)}
            </div>
          </div>

          {/* ── Recent Videos ── */}
          {!isNew && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                  Recent Videos
                </div>
                <button
                  onClick={() => navigate("/videos")}
                  className="text-[13px] border-0 cursor-pointer bg-transparent transition-opacity hover:opacity-70"
                  style={{ color: "#7c5cfc" }}
                >
                  View All →
                </button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-4" style={{ color: "#55556a" }}>
                  <div className="w-4 h-4 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[13px]">Loading…</span>
                </div>
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
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
