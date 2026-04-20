/**
 * Dashboard.jsx — Home hub after login.
 * Shows service cards, recent videos, and credit status.
 * For new users with no projects: acts as an onboarding / product tour.
 */
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

/* ── Service cards ── */
const SERVICES = [
  {
    emoji: "🎬",
    title: "AI Video",
    desc: "Turn a script or idea into a fully produced short video — beats, visuals, voice, and music.",
    cta: "Generate Video",
    href: "/new",
    accent: "#f5c518",
    bg: "rgba(245,197,24,0.06)",
    border: "rgba(245,197,24,0.18)",
  },
  {
    emoji: "🖼️",
    title: "AI Images",
    desc: "Generate stunning images for your videos, thumbnails, or social posts with a single prompt.",
    cta: "Generate Image",
    href: "/image-generation",
    accent: "#a78bfa",
    bg: "rgba(124,92,252,0.06)",
    border: "rgba(124,92,252,0.18)",
  },
  {
    emoji: "🎙️",
    title: "Transcription",
    desc: "Upload any audio or video and get an accurate, clean transcript back in seconds.",
    cta: "Transcribe",
    href: "/transcription",
    accent: "#22d3ee",
    bg: "rgba(6,182,212,0.06)",
    border: "rgba(6,182,212,0.18)",
  },
  {
    emoji: "🗂️",
    title: "Asset Library",
    desc: "Browse and manage all your uploaded images, videos, and audio in one organised place.",
    cta: "Open Library",
    href: "/assets",
    accent: "#4ade80",
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.18)",
  },
];

/* ── Time label ── */
function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString();
}

/* ── ServiceCard ── */
function ServiceCard({ service }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate(service.href)}
      className="rounded-[16px] border p-6 flex flex-col gap-4 cursor-pointer transition-all duration-200"
      style={{
        background:   hov ? service.bg : "#111118",
        borderColor:  hov ? service.border : "rgba(255,255,255,0.07)",
        transform:    hov ? "translateY(-2px)" : "none",
        boxShadow:    hov ? `0 8px 32px rgba(0,0,0,0.3)` : "none",
      }}
    >
      <div style={{ fontSize: 32 }}>{service.emoji}</div>
      <div>
        <div className="text-[17px] font-bold mb-1" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
          {service.title}
        </div>
        <div className="text-[13px] leading-relaxed" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
          {service.desc}
        </div>
      </div>
      <div
        className="self-start text-[13px] font-bold px-4 py-2 rounded-[8px] transition-all"
        style={{
          background:  hov ? service.accent : "rgba(255,255,255,0.06)",
          color:       hov ? "#0b0b10" : service.accent,
          fontFamily:  "'Outfit',sans-serif",
        }}
      >
        {service.cta} →
      </div>
    </div>
  );
}

/* ── MiniVideoCard ── */
function MiniVideoCard({ project }) {
  const beats     = project.safe_project_json?.beats || [];
  const meta      = project.safe_project_json?.meta || {};
  const firstBeat = beats[0];

  let thumb = meta.thumbnail || null;
  if (!thumb && firstBeat) {
    for (const zone of Object.values(firstBeat.zones || {})) {
      if (zone.content?.asset?.src) { thumb = zone.content.asset.src; break; }
    }
  }
  if (!thumb && firstBeat?.layoutBackground?.type === "image") {
    thumb = firstBeat.layoutBackground.value;
  }

  return (
    <a
      href={`/editor/${project.id}`}
      className="flex items-center gap-3 rounded-[10px] border px-3 py-3 transition-all"
      style={{ background: "#111118", borderColor: "rgba(255,255,255,0.07)", textDecoration: "none" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,92,252,0.35)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
    >
      <div
        className="shrink-0 rounded-[6px] overflow-hidden"
        style={{ width: 52, height: 52, background: "#1a1a28", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {thumb ? (
          <img src={thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: 22 }}>🎬</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold truncate" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
          {project.name || "Untitled"}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
          {timeLabel(project.updated_at)} · {beats.length} beats
        </div>
      </div>
      <div style={{ color: "#55556a", fontSize: 14 }}>›</div>
    </a>
  );
}

/* ── Dashboard ── */
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
        <div style={{ maxWidth: 900, padding: "40px 40px 80px", margin: "0 auto" }}>

          {/* ── Greeting ── */}
          <div className="mb-8">
            <h1 className="text-[26px] font-bold" style={{ color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
              {userName ? `Hey, ${userName} 👋` : "Welcome back 👋"}
            </h1>
            <p className="text-[15px] mt-1" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>
              {isNew
                ? "Here's what you can build with Vidquence — pick a service to get started."
                : "Here's a quick look at your workspace."}
            </p>
          </div>

          {/* ── Credits strip ── */}
          <div
            className="flex items-center justify-between rounded-[12px] border px-5 py-4 mb-8"
            style={{
              background:   balance !== null && balance < 10 ? "rgba(249,115,22,0.06)" : "rgba(124,92,252,0.06)",
              borderColor:  balance !== null && balance < 10 ? "rgba(249,115,22,0.25)" : "rgba(124,92,252,0.2)",
            }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20 }}>⚡</span>
              <div>
                <div className="text-[13px]" style={{ color: "#8888a8", fontFamily: "'Outfit',sans-serif" }}>Credits Available</div>
                <div className="text-[22px] font-bold" style={{ color: balance !== null && balance < 10 ? "#f97316" : "#a78bfa", fontFamily: "'Syne',sans-serif" }}>
                  {balance ?? "—"}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/credits")}
              className="text-[13px] font-bold px-4 py-2 rounded-[8px] border-0 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}
            >
              {balance !== null && balance < 10 ? "Top Up →" : "View Details →"}
            </button>
          </div>

          {/* ── Services ── */}
          <div className="mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[2px] mb-4" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
              Services
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {SERVICES.map(s => <ServiceCard key={s.title} service={s} />)}
            </div>
          </div>

          {/* ── Recent Videos (only if user has projects) ── */}
          {!isNew && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold uppercase tracking-[2px]" style={{ color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
                  Recent Videos
                </div>
                <button
                  onClick={() => navigate("/videos")}
                  className="text-[13px] border-0 cursor-pointer bg-transparent"
                  style={{ color: "#7c5cfc", fontFamily: "'Outfit',sans-serif" }}
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
                <div className="flex flex-col gap-2">
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
