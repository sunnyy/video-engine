import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { serverFetch } from "../services/serverApi";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import AppLayout from "../ui/AppLayout";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#0a0a10",
  surface: "#111118",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#f5c518",
  text:    "#e8e8f0",
  muted:   "#9494a8",
  success: "#22c55e",
  danger:  "#f87171",
};

const C = {
  inp:  { padding: "9px 12px", background: "#35354a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#b0b0cc", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" },
  btnG: { padding: "9px 18px", background: "rgba(255,255,255,0.07)", color: "#c0c0d8", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

// ── Constants ─────────────────────────────────────────────────────────────────
const FORMAT_OPTIONS = [
  { value: "9:16", label: "Vertical",   hint: "TikTok · Reels",   shape: { w: 7,  h: 13 } },
  { value: "16:9", label: "Horizontal", hint: "YouTube · LinkedIn", shape: { w: 15, h: 9  } },
  { value: "1:1",  label: "Square",     hint: "Instagram · Feed",  shape: { w: 11, h: 11 } },
];

const LANGUAGES = [
  { id: "en",       label: "English"              },
  { id: "hinglish", label: "Hinglish (Hindi + EN)" },
  { id: "es",       label: "Spanish"              },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual",       label: "Casual"       },
  { id: "energetic",    label: "Energetic"    },
  { id: "minimal",      label: "Minimal"      },
];


const STATUS_META = {
  draft:            { label: "Draft",        color: "#9090c0", bg: "rgba(144,144,192,0.12)" },
  script_generated: { label: "Plan Ready",   color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  waiting_assets:   { label: "Needs Assets", color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  assets_ready:     { label: "Assets Ready", color: "#a78bfa", bg: "rgba(124,92,252,0.12)"  },
  ready_for_render: { label: "Queued",       color: "#f5c518", bg: "rgba(245,197,24,0.12)"  },
  rendering:        { label: "Rendering…",   color: "#f5c518", bg: "rgba(245,197,24,0.12)"  },
  rendered:         { label: "Complete",     color: "#4ade80", bg: "rgba(34,197,94,0.12)"   },
  failed:           { label: "Failed",       color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const RENDER_MESSAGES = [
  "Building your video…",
  "Writing your script…",
  "Adding visuals…",
  "Putting it all together…",
  "Almost ready…",
  "Adding the finishing touches…",
  "Your video is nearly done…",
  "Hang tight, almost there…",
];

const WIZARD_STEPS = ["Video Type", "Product", "Settings", "Style"];

const VISUAL_STYLES = [
  { id: "radiant",       label: "Radiant",       desc: "Glows & depth",
    bg: "#06040e", glow: "radial-gradient(circle at 50% 35%, rgba(99,102,241,0.85) 0%, transparent 65%)", accent: "#6366f1", light: false },
  { id: "minimal",       label: "Minimal",       desc: "Clean & flat",
    bg: "#f2f2f6", glow: null, accent: "#111111", light: true },
  { id: "professional",  label: "Professional",  desc: "Structured, dark",
    bg: "#0c1118", glow: "linear-gradient(180deg, rgba(56,189,248,0.2) 0%, transparent 60%)", accent: "#38bdf8", light: false },
  { id: "high-contrast", label: "High Contrast", desc: "Bold & sharp",
    bg: "#000000", glow: null, accent: "#f5c518", light: false },
];

const ACCENT_SWATCHES = [
  { hex: "#f5c518", label: "Vidquence"     },
  { hex: "#6366f1", label: "Electric Blue" },
  { hex: "#8b5cf6", label: "Violet"        },
  { hex: "#10b981", label: "Emerald"       },
  { hex: "#f59e0b", label: "Amber"         },
  { hex: "#f43f5e", label: "Rose"          },
  { hex: "#f97316", label: "Coral"         },
  { hex: "#06b6d4", label: "Cyan"          },
];

const PROMO_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel",  gender: "female", desc: "Calm & professional"  },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella",   gender: "female", desc: "Warm & expressive"    },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda", gender: "female", desc: "Friendly & natural"   },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel",  gender: "male",   desc: "Deep & authoritative" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam",    gender: "male",   desc: "Bold & commanding"    },
];

// Voices tuned for Hinglish — all use eleven_multilingual_v2
const HINGLISH_VOICES = [
  { id: "9BWtsMINqrJLrRacOk9x", label: "Aria",    gender: "female", desc: "Natural Hinglish" },
  { id: "XB0fDUnXU5powFXDhCwa", label: "Sarah",   gender: "female", desc: "Warm & relatable"       },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie", gender: "male",   desc: "Energetic, casual"      },
];

// Voices tuned for Spanish — all use eleven_multilingual_v2
const SPANISH_VOICES = [
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte", gender: "female", desc: "Natural, warm Latina"     },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily",      gender: "female", desc: "Energetic, young"          },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel",    gender: "male",   desc: "Confident, professional"   },
];

const GENDER_COLORS = {
  female: { bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)", color: "#f472b6" },
  male:   { bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",  color: "#60a5fa" },
};

const SCENE_COUNT_OPTIONS = [
  { value: 1, label: "1 Scene",  description: "Quick test",                dots: 1 },
  { value: 3, label: "3 Scenes", description: "Quick and punchy",          dots: 3 },
  { value: 5, label: "5 Scenes", description: "Standard promo",            dots: 5 },
];

const PROMO_CREDITS  = { 1: 50, 3: 120, 5: 200 };
const TH_CREDITS     = 180;
const PROMO_GEN_TIME = { 1: "~30 sec", 3: "~1 min", 5: "~2 min" };

const THEME_OPTIONS = [
  { value: "dark",   label: "Dark",   description: "Deep dark backgrounds" },
  { value: "medium", label: "Medium", description: "Balanced mid-tone"     },
  { value: "light",  label: "Light",  description: "Clean light backgrounds"},
];

const TYPOGRAPHY_STYLES = [
  { id: "modern",    label: "Modern",    fonts: "Inter, DM Sans",          ff: "'Inter',sans-serif",            fw: 600, ls: "-0.02em", tt: "none"      },
  { id: "bold",      label: "Bold",      fonts: "Bebas Neue",               ff: "'Bebas Neue',sans-serif",       fw: 400, ls: "0.05em",  tt: "uppercase" },
  { id: "editorial", label: "Editorial", fonts: "Playfair Display, Lora",   ff: "'Playfair Display',serif",      fw: 700, ls: "0em",     tt: "none"      },
  { id: "minimal",   label: "Minimal",   fonts: "Josefin Sans",             ff: "'Josefin Sans',sans-serif",     fw: 600, ls: "0.14em",  tt: "uppercase" },
  { id: "energetic", label: "Energetic", fonts: "Barlow Condensed, Oswald", ff: "'Barlow Condensed',sans-serif", fw: 700, ls: "0.02em",  tt: "uppercase" },
];

// ── Upload helper (client-side Supabase, promo-specific paths) ────────────────
async function uploadPromoFile(file, folder) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const ext  = file.name.split(".").pop();
  const name = `${crypto.randomUUID()}.${ext}`;
  const key  = `${user.id}/promo-${folder}/${name}`;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${supabase.storageUrl}/object/user-assets/${key}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error("Upload failed"));
    xhr.onerror = reject;
    xhr.send(file);
  });
  return `${supabase.storageUrl}/object/public/user-assets/${key}`;
}

// ── Video thumbnail — seeks to first frame so the browser paints it ───────────
function VideoThumb({ src, style }) {
  const ref = useRef();
  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={() => { if (ref.current) ref.current.currentTime = 0.1; }}
      style={style}
    />
  );
}

// ── Small reusables ───────────────────────────────────────────────────────────
function Spinner({ size = 16, color = T.accent }) {
  return (
    <span style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "pv-spin 0.7s linear infinite",
      display: "inline-block",
    }} />
  );
}

function YesNo({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["yes", "no"].map(opt => {
        const active = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)}
            style={{
              padding: "8px 20px", borderRadius: 8, cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              background: active ? "rgba(245,197,24,0.08)" : "rgba(255,255,255,0.04)",
              border: active ? "1.5px solid rgba(245,197,24,0.35)" : "1.5px solid rgba(255,255,255,0.1)",
              color: active ? T.accent : T.muted,
            }}>
            {opt === "yes" ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

function FileUploadRow({ label, accept, url, uploading, onFile, onClear, inputRef, loadingLabel = "Uploading…", doneLabel = "File ready" }) {
  return (
    <div>
      {url ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8 }}>
          <span style={{ fontSize: 14 }}>✓</span>
          <span style={{ flex: 1, fontSize: 12, color: T.success, fontWeight: 600 }}>{doneLabel}</span>
          <button onClick={onClear} style={{ ...C.btnG, fontSize: 11, padding: "3px 10px", color: T.danger, borderColor: "rgba(248,113,113,0.2)" }}>Remove</button>
        </div>
      ) : (
        <button disabled={uploading} onClick={() => inputRef.current?.click()}
          style={{ ...C.btnG, display: "flex", alignItems: "center", gap: 8, opacity: uploading ? 0.6 : 1, cursor: uploading ? "not-allowed" : "pointer" }}>
          {uploading ? <Spinner size={12} /> : "↑"}
          {uploading ? loadingLabel : label}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── My Projects tab ───────────────────────────────────────────────────────────
const PAGE_SIZE = 14;

function ProjectsTab({ onCreateNew }) {
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);

  useEffect(() => {
    setLoading(true);
    serverFetch(`/api/promo-video/list?page=${page}&limit=${PAGE_SIZE}`)
      .then(r => r.json())
      .then(d => {
        setProjects(d.projects || []);
        setTotalPages(Math.max(1, Math.ceil((d.total ?? 0) / PAGE_SIZE)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  async function handleDelete(id) {
    try {
      await serverFetch(`/api/promo-video/${id}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch {}
  }

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner size={28} />
    </div>
  );

  if (projects.length === 0 && page === 1) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 48 }}>🎬</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No promo videos yet</div>
      <div style={{ fontSize: 14, color: T.muted }}>Create your first one to get started</div>
      <button onClick={onCreateNew} style={{ ...C.btnY, marginTop: 8 }}>Create First Video →</button>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...C.btnG, padding: "7px 14px", fontSize: 13, opacity: page === 1 ? 0.35 : 1 }}>
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{
                width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: n === page ? 800 : 500,
                background: n === page ? T.accent : "rgba(255,255,255,0.06)",
                color:      n === page ? "#000"   : T.muted,
              }}>
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...C.btnG, padding: "7px 14px", fontSize: 13, opacity: page === totalPages ? 0.35 : 1 }}>
            →
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onDelete }) {
  const navigate               = useNavigate();
  const [hov,  setHov]         = useState(false);
  const [conf, setConf]        = useState(false);
  const isComplete             = p.status === "rendered";
  const sm                     = STATUS_META[p.status] || STATUS_META.draft;
  const initial                = (p.product_name || "V")[0].toUpperCase();
  // First scene image asset for non-rendered preview
  const previewImage = !isComplete
    ? (p.scenes?.find(s => s.asset_url && !/\.(mp4|webm|mov)(\?|$)/i.test(s.asset_url))?.asset_url ?? null)
    : null;

  function handleClick() {
    if (isComplete && p.editor_project_id) navigate(`/video-editor/${p.editor_project_id}`, { state: { from: "/promo-video" } });
    else navigate(`/promo-video/${p.id}`);
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (conf) { onDelete(p.id); }
    else { setConf(true); setTimeout(() => setConf(false), 2500); }
  }

  function timeLabel(str) {
    const diff = Math.floor((Date.now() - new Date(str)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7)  return `${diff} days ago`;
    return new Date(str).toLocaleDateString();
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConf(false); }}
      style={{
        background: T.surface, borderRadius: 14, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hov ? "rgba(245,197,24,0.25)" : T.border}`,
        transition: "all 0.2s", transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}>

      {/* Thumbnail */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "9/16", overflow: "hidden", background: "#0b0b14" }}>
        {isComplete && p.video_url ? (
          <VideoThumb src={p.video_url} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : previewImage ? (
          <img src={previewImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #13131f 0%, #1a1a2e 60%, #0d1224 100%)",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color: "rgba(245,197,24,0.6)",
              fontFamily: "'Outfit',sans-serif",
            }}>
              {initial}
            </div>
          </div>
        )}

        {/* Play icon overlay on rendered */}
        {isComplete && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: hov ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.25)", transition: "background 0.2s",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: "rgba(245,197,24,0.92)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, color: "#000", paddingLeft: 2,
              transform: hov ? "scale(1.12)" : "scale(1)", transition: "transform 0.15s",
            }}>▶</div>
          </div>
        )}

        {/* Status badge — only non-complete */}
        {!isComplete && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 5,
            background: sm.bg, color: sm.color, backdropFilter: "blur(4px)",
          }}>{sm.label}</div>
        )}

        {/* Delete button — top-left, hover only */}
        <button onClick={handleDelete} title={conf ? "Click again to confirm" : "Delete"}
          style={{
            position: "absolute", top: 8, left: 8,
            width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer",
            background: conf ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.55)",
            color: conf ? "#fff" : "#999", fontSize: 13, fontWeight: 700,
            opacity: hov ? 1 : 0, transition: "opacity 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}>
          {conf ? "!" : "✕"}
        </button>
      </div>

      {/* Info */}
      <div style={{ padding: "11px 13px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
          {p.product_name}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
          {p.video_type === "talking_head" ? "Talking Head" : "Faceless"}
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "#55556a" }}>
          {p.duration_seconds && <span style={{ color: "#7070a0", fontWeight: 600 }}>{p.duration_seconds}s</span>}
          {p.total_scenes ? <span style={{ marginLeft: 4 }}>· {p.total_scenes} scenes</span> : null}
          <span style={{ marginLeft: "auto" }}>{p.created_at ? timeLabel(p.created_at) : ""}</span>
        </div>
      </div>
    </div>
  );
}

// ── Create wizard ─────────────────────────────────────────────────────────────
function CreateWizard({ prefill, initialState, onViewProjects }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 — Product Info
  const [productName, setProductName] = useState(prefill?.product_name ?? "Vidquence");
  const [productUrl,  setProductUrl]  = useState(prefill?.product_url ?? "https://vidquence.com/");
  const [productDesc, setProductDesc] = useState(prefill?.product_description ?? "Vidquence is a full-stack AI-powered short-form video creation platform built for content creators, marketers, and agencies. At its core is an automated video generation engine that takes a topic or script, runs it through a multi-stage AI pipeline — script generation, beat classification, layout selection, asset sourcing, DNA-based styling — and produces a complete 9:16 video ready for TikTok, Instagram Reels, and YouTube Shorts.");
  const [formatRatio, setFormatRatio] = useState("9:16");
  const [language,    setLanguage]    = useState(prefill?.language ?? "en");
  const [tone,        setTone]        = useState(prefill?.tone ?? "professional");
  const [logoUrl,        setLogoUrl]        = useState(null);
  const [logoDimensions, setLogoDimensions] = useState(null);
  const [logoLoading,    setLogoLoading]    = useState(false);
  const logoRef = useRef();

  // Step 2 — Video Type
  const [videoType,    setVideoType]    = useState("faceless");
  const [hasTHVideo,   setHasTHVideo]   = useState(null); // null | "yes" | "no"
  const [thUrl,        setThUrl]        = useState(null);
  const [thLoading,    setThLoading]    = useState(false);
  const [hasScript,       setHasScript]       = useState(null);
  const [scriptText,      setScriptText]      = useState("");
  const [hasVoiceover,    setHasVoiceover]    = useState(null);
  const [voUrl,           setVoUrl]           = useState(null);
  const [voLoading,       setVoLoading]       = useState(false);
  const [thTranscriptData, setThTranscriptData] = useState(null);
  const thRef = useRef();
  const voRef = useRef();

  // Step 2 — Style Preferences
  const [visualStyle,     setVisualStyle]     = useState("radiant");
  const [theme,           setTheme]           = useState("dark");
  const [accentColor,     setAccentColor]     = useState("#6366f1");
  const [customAccent,    setCustomAccent]    = useState("");
  const [typographyStyle, setTypographyStyle] = useState("modern");
  const [voiceId,         setVoiceId]         = useState("21m00Tcm4TlvDq8ikWAM");
  const [sceneCount,      setSceneCount]      = useState(3);
  const [promoVoices,     setPromoVoices]     = useState(PROMO_VOICES);
  const [langVoices,      setLangVoices]      = useState({});
  const [playingVoiceId,  setPlayingVoiceId]  = useState(null);
  const voiceAudioRef    = useRef(null);
  const requestedVoiceRef = useRef(null);

  // Step 4/5
  const [editorProjectId, setEditorProjectId] = useState(null);

  // Step 3 — Asset Collection
  const [projectId,     setProjectId]     = useState(null);
  const [assetManifest, setAssetManifest] = useState(null);
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState("");
  const [uploadStatus,  setUploadStatus]  = useState({});
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState("");
  const sceneFileRefs   = useRef({});
  const createdRef      = useRef(false);
  const thFileRef       = useRef(null);   // local File object — uploaded to Supabase only at render time
  const bgTranscribeRef = useRef(null);   // in-flight /transcribe-th promise

  // Step 4 — Generating
  const [msgIdx,       setMsgIdx]       = useState(0);
  const [renderError,  setRenderError]  = useState("");
  const pollRef = useRef(null);

  // Fetch voices from ElevenLabs when Settings step (2) becomes visible.
  useEffect(() => {
    if (step !== 2) return;
    if (language === "en") {
      serverFetch("/api/promo-video/voices")
        .then(r => r.json())
        .then(d => { if (d.voices?.length) setPromoVoices(d.voices); })
        .catch(() => {});
    } else if (language === "hinglish" || language === "es") {
      if (langVoices[language]) return; // already fetched
      serverFetch(`/api/promo-video/voices?lang=${language}`)
        .then(r => r.json())
        .then(d => { if (d.voices?.length) setLangVoices(prev => ({ ...prev, [language]: d.voices })); })
        .catch(() => {});
    }
  }, [step, language]);

  // Reset voice selection to first available voice when language or fetched voice list changes
  useEffect(() => {
    const voices =
      language === "hinglish" ? (langVoices.hinglish?.length ? langVoices.hinglish : HINGLISH_VOICES) :
      language === "es"       ? (langVoices.es?.length       ? langVoices.es       : SPANISH_VOICES)  :
      promoVoices;
    const first = voices[0]?.id;
    if (first) setVoiceId(first);
  }, [language, langVoices, promoVoices]);

  // Stop any playing voice preview when leaving the Settings step
  useEffect(() => {
    if (step !== 2) {
      voiceAudioRef.current?.pause();
      voiceAudioRef.current = null;
      requestedVoiceRef.current = null;
      setPlayingVoiceId(null);
    }
  }, [step]);

  async function handleVoicePlay(voice) {
    // Toggle off if already playing this voice
    if (playingVoiceId === voice.id) {
      voiceAudioRef.current?.pause();
      voiceAudioRef.current = null;
      requestedVoiceRef.current = null;
      setPlayingVoiceId(null);
      return;
    }
    // Stop anything currently playing
    voiceAudioRef.current?.pause();
    voiceAudioRef.current = null;

    // Mark this voice as the current request — used to abort stale fetches
    requestedVoiceRef.current = voice.id;
    setPlayingVoiceId(voice.id);

    try {
      let url = voice.preview_url;
      if (!url) {
        const res = await serverFetch(`/api/promo-video/voice-sample/${voice.id}?lang=${language}`);
        if (!res.ok) throw new Error(`Sample fetch failed: ${res.status}`);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
      }
      // Another voice was clicked while we were fetching — abort
      if (requestedVoiceRef.current !== voice.id) return;

      const audio = new Audio(url);
      const ctx   = new AudioContext();
      const src   = ctx.createMediaElementSource(audio);
      const gain  = ctx.createGain();
      gain.gain.value = 2.5;
      src.connect(gain);
      gain.connect(ctx.destination);
      audio.onended = () => { voiceAudioRef.current = null; setPlayingVoiceId(null); ctx.close(); };
      voiceAudioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.error("[voicePlay]", err?.message || err);
      if (requestedVoiceRef.current === voice.id) {
        voiceAudioRef.current = null;
        setPlayingVoiceId(null);
      }
    }
  }

  // Reset prefill when it changes
  useEffect(() => {
    if (!prefill) return;
    setProductName(prefill.product_name ?? "");
    setProductUrl(prefill.product_url ?? "");
    setProductDesc(prefill.product_description ?? "");
    setLanguage(prefill.language ?? "en");
    setTone(prefill.tone ?? "professional");
    setStep(0);
  }, [prefill]);

  // Resume an existing project loaded from URL param
  useEffect(() => {
    if (!initialState?.project) return;
    const p = initialState.project;

    // Pre-fill step 1 fields so Back navigation works
    setProductName(p.product_name || "");
    setProductUrl(p.product_url || "");
    setProductDesc(p.product_description || "");
    setFormatRatio(p.format_ratio || "9:16");
    setTheme(p.theme || "dark");
    setLanguage(p.language || "en");
    setTone(p.tone || "professional");
    if (p.video_type === "talking_head" || p.has_talking_head) setVideoType("talking_head");

    setProjectId(p.id);

    const s = p.status;
    const manifest = initialState.assetManifest;
    if (s === "script_generated" || s === "waiting_assets" || s === "assets_ready") {
      if (manifest) setAssetManifest(manifest);
      if ((manifest?.total_user_uploads_required ?? 0) > 0) {
        if (p.editor_project_id) setEditorProjectId(p.editor_project_id);
        setStep(5);
      } else if (p.editor_project_id) {
        navigate(`/video-editor/${p.editor_project_id}`, { replace: true, state: { from: "/promo-video" } });
      } else {
        setStep(4);
      }
    } else if (s === "ready_for_render" || s === "rendering") {
      setStep(4);
    } else if (s === "rendered" && p.editor_project_id) {
      if ((manifest?.total_user_uploads_required ?? 0) > 0) {
        if (manifest) setAssetManifest(manifest);
        setEditorProjectId(p.editor_project_id);
        setStep(5);
      } else {
        navigate(`/video-editor/${p.editor_project_id}`, { replace: true, state: { from: "/promo-video" } });
      }
    }
    // "draft" → stay on step 0 with pre-filled form
  }, [initialState]);

  // Step 4: status message cycling
  useEffect(() => {
    if (step !== 4 || renderError) return;  // step 4 = generating
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % RENDER_MESSAGES.length), 4000);
    return () => clearInterval(iv);
  }, [step, renderError]);

  // Step 4: polling
  useEffect(() => {
    if (step !== 4 || !projectId || renderError) return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await serverFetch(`/api/promo-video/${projectId}`);
        const data = await res.json();
        const p    = data.project;
        if (!p) return;
        if (p.status === "rendered") {
          clearInterval(pollRef.current);
          if (p.editor_project_id) {
            if ((assetManifest?.total_user_uploads_required ?? 0) > 0) {
              setEditorProjectId(p.editor_project_id);
              setStep(5);
            } else {
              navigate(`/video-editor/${p.editor_project_id}`, { replace: true, state: { from: "/promo-video" } });
            }
          } else if (p.video_url) {
            window.open(p.video_url, "_blank");
            setRenderError("Video ready — editor project not created. Video opened in new tab.");
          } else {
            setRenderError("Render completed but no output found. Check the dashboard.");
          }
        } else if (p.status === "failed") {
          clearInterval(pollRef.current);
          setRenderError(p.error_message || "Render failed. Please try again.");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [step, projectId, renderError]);

  // Derived validation
  const step1ValidTH       = !!thUrl;
  const step1ValidFaceless = productName.trim().length > 0 && productDesc.trim().length > 0;
  const step1Valid         = videoType === "talking_head" ? step1ValidTH : step1ValidFaceless;

  const step2ValidFaceless =
    hasVoiceover === "yes" && !!voUrl ||
    hasVoiceover === "no" && hasScript === "yes" && scriptText.trim().length > 0 ||
    hasVoiceover === "no" && hasScript === "no";
  const step2Valid = videoType === "talking_head" ? true : step2ValidFaceless;

  // ── File upload helpers ──
  async function handleLogoFile(file) {
    setLogoLoading(true);
    try {
      const url = await uploadPromoFile(file, "logos");
      setLogoUrl(url);
      const img = new window.Image();
      img.onload = () => setLogoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = url;
    } catch { /* ignore */ }
    setLogoLoading(false);
  }

  async function handleThFile(file) {
    setThLoading(true);
    thFileRef.current = file;
    try {
      // Send file directly to server — no Supabase roundtrip
      bgTranscribeRef.current = serverFetch("/api/promo-video/transcribe-th", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "video/mp4",
          "X-File-Ext":   file.name.split(".").pop(),
        },
        body: file,
      }).then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed");
        return data;
      });
      const transcriptResult = await bgTranscribeRef.current;
      setThTranscriptData(transcriptResult);
      setThUrl("ready"); // sentinel — actual file is in thFileRef
    } catch (e) {
      console.error("[handleThFile]", e.message);
      thFileRef.current       = null;
      bgTranscribeRef.current = null;
      setThTranscriptData(null);
      setThUrl(null);
    }
    setThLoading(false);
  }

  async function handleVoFile(file) {
    setVoLoading(true);
    try { setVoUrl(await uploadPromoFile(file, "voiceovers")); }
    catch { /* ignore */ }
    setVoLoading(false);
  }

  // ── Create project (Step 3) ──
  async function createProject() {
    setCreating(true);
    setCreateError("");
    try {
      const isTH = videoType === "talking_head";

      // For TH: transcription already in flight — await it here (usually already done)
      let thSegments = null;
      if (isTH && bgTranscribeRef.current) {
        const transcribeResult = await bgTranscribeRef.current;
        thSegments = transcribeResult.scenes;
      }

      const payload = {
        project_id:              projectId || undefined, // update existing draft if available
        video_type:              isTH ? "talking_head" : "faceless",
        video_goal:              isTH ? "onboarding_demo" : "saas_promo",
        product_name:            productName.trim(),
        product_url:             productUrl.trim() || null,
        product_description:     productDesc.trim(),
        format_ratio:            formatRatio,
        language,
        tone,

        has_talking_head:        isTH,
        has_voiceover:           !isTH && hasVoiceover === "yes",
        has_script:              !isTH && (hasVoiceover === "yes" || hasScript === "yes"),
        has_logo:                !!logoUrl,
        has_screenshots:         false,
        has_recordings:          false,
        talking_head_segments:   thSegments,
        talking_head_url:        null,
        voiceover_url:           voUrl   || null,
        logo_url:                logoUrl || null,
        logo_width:              logoDimensions?.width  || null,
        logo_height:             logoDimensions?.height || null,
        script:                  !isTH && hasVoiceover !== "yes" && hasScript === "yes" ? scriptText : null,
        pipeline_version:        "v2",
        visual_style:            visualStyle,
        theme,
        accent_color:            customAccent || accentColor,
        typography_style:        typographyStyle,
        voice_id:                voiceId,
        scene_count:             sceneCount,
      };

      const res  = await serverFetch("/api/promo-video/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate scene plan");

      setProjectId(data.project.id);
      setAssetManifest(data.assetManifest);

      // Auto-upload pre-staged voiceover / logo files to matching scenes
      const required = data.assetManifest?.user_required || [];
      const autoUploads = [];
      for (const item of required) {
        let url = null;
        if (item.asset_type === "user_recording_audio" && voUrl) url = voUrl;
        if (item.scene_type === "logo_outro" && logoUrl) url = logoUrl;
        if (url) autoUploads.push(autoUploadScene(data.project.id, item.scene_id, url));
      }
      if (autoUploads.length) {
        await Promise.allSettled(autoUploads);
        const freshRes  = await serverFetch(`/api/promo-video/${data.project.id}`);
        const freshData = await freshRes.json();
        if (freshData.assetManifest) setAssetManifest(freshData.assetManifest);
      }
      return { ok: true, assetManifest: data.assetManifest, pid: data.project.id };
    } catch (e) {
      setCreateError(e.message);
      return { ok: false };
    } finally {
      setCreating(false);
    }
  }

  async function autoUploadScene(pid, sceneId, url) {
    await serverFetch(`/api/promo-video/${pid}/upload-asset`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ scene_id: sceneId, asset_url: url }),
    });
  }

  // ── Per-scene upload ──
  function getSceneRef(sceneId) {
    if (!sceneFileRefs.current[sceneId]) sceneFileRefs.current[sceneId] = { current: null };
    return sceneFileRefs.current[sceneId];
  }

  async function handleSceneFile(sceneId, file) {
    setUploadStatus(s => ({ ...s, [sceneId]: "uploading" }));
    try {
      const asset = await uploadUserAsset(file, null, null, "project", projectId);
      const res   = await serverFetch(`/api/promo-video/${projectId}/upload-asset`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scene_id: sceneId, asset_url: asset.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAssetManifest(data.assetManifest);
      setUploadStatus(s => ({ ...s, [sceneId]: "done" }));
    } catch {
      setUploadStatus(s => ({ ...s, [sceneId]: "error" }));
    }
  }

  // ── Generate video ──
  async function handleGenerate(overridePid) {
    const pid = overridePid ?? projectId;
    setGenerating(true);
    setGenError("");
    try {
      // TH: upload local file to Supabase now (deferred from creation time)
      let thUploadedUrl = null;
      if (videoType === "talking_head" && thFileRef.current) {
        thUploadedUrl = await uploadPromoFile(thFileRef.current, "talking-head");
      }

      const res = await serverFetch(`/api/promo-video/${pid}/render`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ talking_head_url: thUploadedUrl }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to start render");
      }
      setStep(4);
    } catch (e) {
      setGenError(e.message);
    }
    setGenerating(false);
  }

  // ── Generate Video — always goes to step 4 (generating). Asset collection is step 5 after render. ──
  async function handleBuildPlan() {
    const result = await createProject();
    if (!result?.ok) return;
    setStep(4);
    handleGenerate(result.pid);
  }

  // ── Step indicator ──
  function StepBar() {
    if (step >= 4) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
        {WIZARD_STEPS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < WIZARD_STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, flexShrink: 0,
                background: i < step ? "rgba(34,197,94,0.2)" : i === step ? T.accent : "rgba(255,255,255,0.06)",
                color:      i < step ? T.success           : i === step ? "#000"  : "#55556a",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 700 : 500, color: i === step ? T.accent : i < step ? T.success : "#55556a", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)", margin: "0 10px" }} />}
          </div>
        ))}
      </div>
    );
  }

  // ── Derived voice list ──
  // langVoices[language] is populated by the server fetch (native voices from ElevenLabs library).
  // Fall back to hardcoded constants if the fetch hasn't returned yet or returned empty.
  const currentVoices =
    language === "hinglish" ? (langVoices.hinglish?.length ? langVoices.hinglish : HINGLISH_VOICES) :
    language === "es"       ? (langVoices.es?.length       ? langVoices.es       : SPANISH_VOICES)  :
    promoVoices;

  // ── Render ──
  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 24px 80px" }}>
        <StepBar />

        {/* ─── Step 0: Video Type ─── */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>What kind of video?</div>
              <div style={{ fontSize: 14, color: T.muted }}>Choose the style that fits your brand.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { id: "faceless",     icon: "🎬", title: "Faceless",      desc: "We handle everything — visuals, captions, and narration." },
                { id: "talking_head", icon: "🎥", title: "Talking Head",  desc: "You on camera. Personal, direct, and authentic." },
              ].map(({ id, icon, title, desc }) => (
                <button key={id} onClick={() => setVideoType(id)}
                  style={{
                    padding: 28, borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    background: videoType === id ? "rgba(245,197,24,0.06)" : "rgba(255,255,255,0.02)",
                    border: videoType === id ? "2px solid rgba(245,197,24,0.55)" : "2px solid rgba(255,255,255,0.1)",
                  }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: videoType === id ? T.accent : T.text, marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(1)} style={{ ...C.btnY, width: "100%", padding: "13px 24px", fontSize: 15 }}>
              Next →
            </button>
          </div>
        )}

        {/* ─── Step 1: Product Info ─── */}
        {step === 1 && videoType === "talking_head" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <label style={C.lbl}>Upload Your Video <span style={{ color: T.danger }}>*</span></label>
              <FileUploadRow
                label="Upload talking head video" accept="video/*"
                url={thUrl} uploading={thLoading}
                loadingLabel="Transcribing…"
                doneLabel={thTranscriptData?.scenes?.length
                  ? `Video ready — ${thTranscriptData.scenes.length} scenes detected`
                  : "Video ready — transcription done"}
                onFile={handleThFile}
                onClear={() => { setThUrl(null); thFileRef.current = null; bgTranscribeRef.current = null; setThTranscriptData(null); }}
                inputRef={thRef} />
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Your audio is used as the narration. We handle the rest automatically.</div>
            </div>
            <div>
              <label style={C.lbl}>Product Name <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional — used for branding)</span></label>
              <input style={C.inp} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Vidquence" maxLength={80} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button onClick={() => setStep(2)} disabled={!step1ValidTH}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15, opacity: step1ValidTH ? 1 : 0.4 }}>
                Next: Settings →
              </button>
            </div>
          </div>
        )}

        {step === 1 && videoType === "faceless" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <label style={C.lbl}>Product Name <span style={{ color: T.danger }}>*</span></label>
              <input style={C.inp} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Vidquence" maxLength={80} />
            </div>
            <div>
              <label style={C.lbl}>Product URL <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <input style={C.inp} value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://yourproduct.com" />
            </div>
            <div>
              <label style={C.lbl}>Product Description <span style={{ color: T.danger }}>*</span></label>
              <textarea style={{ ...C.inp, resize: "vertical", minHeight: 90, lineHeight: 1.5 }}
                value={productDesc} onChange={e => setProductDesc(e.target.value)}
                placeholder="What does your product do? What problem does it solve?" maxLength={500} />
              <div style={{ fontSize: 11, color: "#55556a", marginTop: 3, textAlign: "right" }}>{productDesc.length}/500</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button onClick={() => setStep(2)} disabled={!step1ValidFaceless}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15, opacity: step1ValidFaceless ? 1 : 0.4 }}>
                Next: Settings →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Video Settings ─── */}
        {step === 2 && videoType === "talking_head" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <label style={C.lbl}>Format</label>
              <div style={{ display: "flex", gap: 8 }}>
                {FORMAT_OPTIONS.map(f => {
                  const sel = formatRatio === f.value;
                  const col = sel ? T.accent : T.muted;
                  return (
                    <button key={f.value} onClick={() => setFormatRatio(f.value)}
                      style={{ flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                        background: sel ? "rgba(245,197,24,0.08)" : "rgba(255,255,255,0.03)",
                        border: sel ? "1.5px solid rgba(245,197,24,0.45)" : "1.5px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ width: f.shape.w, height: f.shape.h, border: `1.5px solid ${col}`, borderRadius: 2, background: sel ? `${T.accent}18` : "transparent" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{f.label}</span>
                      <span style={{ fontSize: 10, color: "#55556a", textAlign: "center" }}>{f.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button onClick={() => setStep(3)}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15 }}>
                Next: Style →
              </button>
            </div>
          </div>
        )}

        {step === 2 && videoType === "faceless" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>Video settings</div>
              <div style={{ fontSize: 14, color: T.muted }}>Choose length, language, and voice.</div>
            </div>

            {/* Video Length + Format */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={C.lbl}>Video Length</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {SCENE_COUNT_OPTIONS.map(opt => {
                    const sel = sceneCount === opt.value;
                    const col = sel ? T.accent : T.muted;
                    return (
                      <button key={opt.value} onClick={() => setSceneCount(opt.value)}
                        style={{
                          flex: 1, padding: "8px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                          background: sel ? "rgba(245,197,24,0.08)" : "rgba(255,255,255,0.04)",
                          border: sel ? "1.5px solid rgba(245,197,24,0.45)" : "1.5px solid rgba(255,255,255,0.1)",
                        }}>
                        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                          {Array.from({ length: opt.dots }).map((_, i) => (
                            <div key={i} style={{
                              width: 6, height: 8, borderRadius: 2,
                              background: sel ? T.accent : "rgba(255,255,255,0.2)",
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col, lineHeight: 1 }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={C.lbl}>Format</label>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  {FORMAT_OPTIONS.map(f => {
                    const sel = formatRatio === f.value;
                    const col = sel ? T.accent : T.muted;
                    return (
                      <button key={f.value} onClick={() => setFormatRatio(f.value)}
                        style={{
                          flex: 1, padding: "8px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                          background: sel ? "rgba(245,197,24,0.08)" : "rgba(255,255,255,0.04)",
                          border: sel ? "1.5px solid rgba(245,197,24,0.45)" : "1.5px solid rgba(255,255,255,0.1)",
                        }}>
                        <div style={{
                          width: f.shape.w, height: f.shape.h,
                          border: `1.5px solid ${col}`,
                          borderRadius: 2, flexShrink: 0,
                          background: sel ? `${T.accent}18` : "transparent",
                        }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: col, lineHeight: 1 }}>{f.label}</span>
                        <span style={{ fontSize: 9, color: "#55556a", lineHeight: 1, textAlign: "center" }}>{f.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Language + Tone */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={C.lbl}>Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label style={C.lbl}>Tone</label>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Voice */}
            <div>
              <label style={C.lbl}>Voice</label>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {currentVoices.map(v => {
                  const sel = voiceId === v.id;
                  const playing = playingVoiceId === v.id;
                  const gc = GENDER_COLORS[v.gender] ?? GENDER_COLORS.male;
                  return (
                    <button key={v.id} onClick={() => setVoiceId(v.id)}
                      style={{
                        minWidth: 108, flexShrink: 0, padding: "12px 10px 10px",
                        borderRadius: 10, cursor: "pointer", textAlign: "center",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                        background: sel ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                        border: sel ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid rgba(255,255,255,0.1)",
                      }}>
                      <div onClick={e => { e.stopPropagation(); handleVoicePlay(v); }}
                        style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                          background: playing ? "rgba(99,102,241,0.35)" : sel ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.07)",
                          border: `1.5px solid ${playing ? "rgba(99,102,241,0.9)" : sel ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.15)"}`,
                          color: playing ? "#c4b5fd" : "#a5b4fc",
                          fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        {playing ? "■" : "▶"}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sel ? "#a5b4fc" : T.text }}>{v.label}</span>
                      <span style={{ fontSize: 10, color: T.muted, textAlign: "center", lineHeight: 1.3 }}>{v.desc}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: gc.bg, border: `1px solid ${gc.border}`, color: gc.color }}>
                        {v.gender}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voiceover / Script */}
            <div>
              <label style={C.lbl}>Do you have a recording?</label>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                <YesNo value={hasVoiceover} onChange={v => { setHasVoiceover(v); if (v === "yes") { setHasScript(null); setScriptText(""); } }} />
                {hasVoiceover === "yes" && (
                  <FileUploadRow label="Upload recording" accept="audio/*" url={voUrl} uploading={voLoading}
                    onFile={handleVoFile} onClear={() => setVoUrl(null)} inputRef={voRef} />
                )}
                {hasVoiceover === "no" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ ...C.lbl, marginBottom: 2 }}>Do you have a written script?</label>
                    <YesNo value={hasScript} onChange={setHasScript} />
                    {hasScript === "yes" && (
                      <textarea style={{ ...C.inp, resize: "vertical", minHeight: 80, lineHeight: 1.5 }}
                        placeholder="Paste your script here…" value={scriptText} onChange={e => setScriptText(e.target.value)} />
                    )}
                    {hasScript === "no" && (
                      <div style={{ fontSize: 12, color: T.muted, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: `1px solid ${T.border}` }}>
                        We'll write the script and narration for you.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!step2ValidFaceless}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15, opacity: step2ValidFaceless ? 1 : 0.4 }}>
                Next: Style →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Style ─── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>Customise the look</div>
              <div style={{ fontSize: 14, color: T.muted }}>All optional — we pick sensible defaults if you skip.</div>
            </div>

            {/* Visual Style */}
            <div>
              <label style={C.lbl}>Visual Style</label>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {VISUAL_STYLES.map(s => {
                  const sel = visualStyle === s.id;
                  return (
                    <button key={s.id} onClick={() => setVisualStyle(s.id)}
                      style={{
                        minWidth: 112, flexShrink: 0, padding: 0, border: "none",
                        borderRadius: 10, cursor: "pointer", background: "none",
                        overflow: "hidden",
                        outline: sel ? `2px solid ${s.accent}` : "2px solid rgba(255,255,255,0.09)",
                        outlineOffset: 0,
                      }}>
                      {/* Mini preview frame */}
                      <div style={{ width: "100%", height: 86, background: s.bg, position: "relative", overflow: "hidden" }}>
                        {s.glow && <div style={{ position: "absolute", inset: 0, background: s.glow, filter: "blur(8px)" }} />}
                        {s.id === "cinematic" && <>
                          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "#000", zIndex: 2 }} />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: "#000", zIndex: 2 }} />
                        </>}
                        {/* headline mock */}
                        <div style={{ position: "absolute", top: s.id === "cinematic" ? 18 : 14, left: 10, right: 10,
                          height: s.id === "high-contrast" ? 6 : 4, borderRadius: 2,
                          background: s.light ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.7)" }} />
                        {/* accent element */}
                        {s.id === "high-contrast"
                          ? <div style={{ position: "absolute", top: 25, left: 10, right: 10, height: 20, borderRadius: 3, background: s.accent }} />
                          : <div style={{ position: "absolute", top: 24, left: 10, width: "52%", height: 3, borderRadius: 2, background: `${s.accent}dd` }} />
                        }
                        {/* CTA button mock */}
                        <div style={{ position: "absolute", bottom: s.id === "cinematic" ? 16 : 12,
                          left: "50%", transform: "translateX(-50%)",
                          width: 34, height: 10, borderRadius: s.light ? 2 : 5, background: s.accent }} />
                      </div>
                      {/* Label */}
                      <div style={{ padding: "7px 10px 8px",
                        background: sel ? `${s.accent}1a` : "rgba(255,255,255,0.04)",
                        borderTop: `1px solid ${sel ? s.accent + "50" : "rgba(255,255,255,0.07)"}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: sel ? s.accent : T.text, marginBottom: 1 }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme */}
            <div>
              <label style={C.lbl}>Theme</label>
              <div style={{ display: "flex", gap: 8 }}>
                {THEME_OPTIONS.map(t => {
                  const sel = theme === t.value;
                  return (
                    <button key={t.value} onClick={() => setTheme(t.value)}
                      style={{
                        flex: 1, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                        fontFamily: "inherit", textAlign: "center", display: "flex", flexDirection: "column", gap: 3,
                        background: sel ? "rgba(245,197,24,0.08)" : "rgba(255,255,255,0.03)",
                        border: sel ? "1.5px solid rgba(245,197,24,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                      }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sel ? T.accent : T.text }}>{t.label}</span>
                      <span style={{ fontSize: 11, color: T.muted }}>{t.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label style={C.lbl}>Accent Color</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {ACCENT_SWATCHES.map(sw => (
                  <button key={sw.hex} onClick={() => { setAccentColor(sw.hex); setCustomAccent(""); }}
                    title={sw.label}
                    style={{
                      width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
                      background: sw.hex, border: "none",
                      outline: (accentColor === sw.hex && !customAccent) ? `3px solid ${sw.hex}` : "3px solid transparent",
                      outlineOffset: 2,
                    }} />
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: customAccent || "#444", border: "1.5px dashed rgba(255,255,255,0.3)", flexShrink: 0 }} />
                  <input
                    value={customAccent}
                    onChange={e => { setCustomAccent(e.target.value); if (e.target.value) setAccentColor(""); }}
                    placeholder="#hex"
                    maxLength={7}
                    style={{ ...C.inp, width: 80, fontFamily: "monospace", fontSize: 12, padding: "7px 10px" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: customAccent || accentColor, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: T.muted, fontFamily: "monospace" }}>{customAccent || accentColor}</span>
              </div>
            </div>

            {/* Typography */}
            <div>
              <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:wght@700&family=Josefin+Sans:wght@600&family=Barlow+Condensed:wght@700&display=swap');`}</style>
              <label style={C.lbl}>Typography</label>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {TYPOGRAPHY_STYLES.map(t => {
                  const sel = typographyStyle === t.id;
                  return (
                    <button key={t.id} onClick={() => setTypographyStyle(t.id)}
                      style={{
                        minWidth: 112, flexShrink: 0, padding: "16px 10px 12px",
                        borderRadius: 10, cursor: "pointer", textAlign: "center",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                        background: sel ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)",
                        border: sel ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid rgba(255,255,255,0.1)",
                      }}>
                      <span style={{ fontSize: 38, fontFamily: t.ff, fontWeight: t.fw, letterSpacing: t.ls,
                        textTransform: t.tt, color: sel ? "#a5b4fc" : T.text, lineHeight: 1, display: "block" }}>
                        Aa
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sel ? "#a5b4fc" : T.text, fontFamily: "inherit" }}>{t.label}</span>
                      <span style={{ fontSize: 10, color: T.muted, fontFamily: "inherit" }}>{t.fonts}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logo */}
            <div>
              <label style={C.lbl}>Logo <span style={{ color: T.muted, fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional — appears at the end)</span></label>
              <FileUploadRow label="Upload Logo" accept="image/*" url={logoUrl} uploading={logoLoading}
                onFile={handleLogoFile} onClear={() => setLogoUrl(null)} inputRef={logoRef} />
            </div>

            {createError && (
              <div style={{ padding: "14px 18px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
                ✕ {createError}
                <button onClick={() => setCreateError("")} style={{ ...C.btnG, fontSize: 11, padding: "3px 10px", marginLeft: 12 }}>Dismiss</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...C.btnG, flexShrink: 0 }}>← Back</button>
              <button
                onClick={handleBuildPlan}
                disabled={creating}
                style={{ ...C.btnY, flex: 1, padding: "13px 24px", fontSize: 15, opacity: creating ? 0.4 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {creating
                  ? <><Spinner size={14} color="#000" /> Creating…</>
                  : `✦ Create My Video · ${videoType === "talking_head" ? TH_CREDITS : (PROMO_CREDITS[sceneCount] ?? 120)} ✦`}
              </button>
            </div>
            {!creating && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", margin: "8px 0 0" }}>
                {videoType === "talking_head"
                  ? `${TH_CREDITS} credits · ~1 min to generate`
                  : `${PROMO_CREDITS[sceneCount] ?? 120} credits · ${PROMO_GEN_TIME[sceneCount] ?? "~1 min"} to generate`
                }
              </p>
            )}
          </div>
        )}

        {/* ─── Step 4: Generating ─── */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, paddingTop: 60, textAlign: "center" }}>
            {!renderError ? (
              <>
                <div style={{ position: "relative", width: 80, height: 80 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(245,197,24,0.15)" }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: T.accent, animation: "pv-spin 1s linear infinite" }} />
                  <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: "rgba(245,197,24,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    🎬
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 10 }}>
                    We're on it
                  </div>
                  <div style={{ fontSize: 15, color: T.accent, fontWeight: 600, minHeight: 24 }}>
                    {RENDER_MESSAGES[msgIdx]}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, maxWidth: 380 }}>
                  This usually takes about a minute.
You'll land straight in the editor when it's ready.
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {RENDER_MESSAGES.map((_, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === msgIdx ? T.accent : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48 }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 8 }}>Something went wrong</div>
                  <div style={{ fontSize: 13, color: T.muted, maxWidth: 380, lineHeight: 1.6 }}>
                    {renderError}
                  </div>
                </div>
                <button onClick={() => { setStep(0); setRenderError(""); setProjectId(null); setAssetManifest(null); createdRef.current = false; setVisualStyle("radiant"); setTheme("dark"); setAccentColor("#6366f1"); setCustomAccent(""); setTypographyStyle("modern"); }}
                  style={{ ...C.btnY, padding: "11px 28px" }}>
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── Step 5: Asset Collection (conditional — only reached if assets were queued) ─── */}
        {step === 5 && assetManifest && (() => {
          const RATIO_PREVIEW = {
            '16:9 — Landscape': { w: 80, h: 45 },
            '9:16 — Portrait':  { w: 45, h: 80 },
            '1:1 — Square':     { w: 64, h: 64 },
            '4:3 — Landscape':  { w: 80, h: 60 },
            '3:4 — Portrait':   { w: 60, h: 80 },
          };
          const required     = assetManifest.user_required || [];
          const anyUploading = required.some(i => uploadStatus[i.scene_id] === "uploading");
          const allDecided   = required.every(i =>
            i.status === "resolved" || uploadStatus[i.scene_id] === "done" || uploadStatus[i.scene_id] === "error"
          );
          const canOpen = allDecided && !anyUploading && editorProjectId;
          return (
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 600, margin: "0 auto", width: "100%" }}>
              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", margin: "0 0 8px" }}>
                  One last thing
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>
                  Add a screenshot of your product to make the video feel real. Skip anything — you can always swap it in the editor.
                </p>
                {required.some(item => item.status !== "resolved" && uploadStatus[item.scene_id] !== "done" && uploadStatus[item.scene_id] !== "error") && (
                  <button
                    onClick={() => setUploadStatus(prev => {
                      const next = { ...prev };
                      required.forEach(item => { if (item.status !== "resolved") next[item.scene_id] = "done"; });
                      return next;
                    })}
                    style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 13, padding: "6px 14px", cursor: "pointer", marginTop: 12 }}>
                    Skip all — add in editor
                  </button>
                )}
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {required.map((item) => {
                  const upSt    = uploadStatus[item.scene_id];
                  const isDone  = item.status === "resolved" || upSt === "done";
                  const ref     = getSceneRef(item.scene_id);
                  const preview = RATIO_PREVIEW[item.aspect_ratio] ?? { w: 80, h: 60 };
                  const thumbUrl = item.asset_url || null;
                  return (
                    <div key={item.scene_id} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 16,
                      padding: 20,
                      display: "flex",
                      gap: 16,
                      alignItems: "flex-start",
                    }}>
                      {/* Aspect ratio preview box */}
                      <div style={{
                        width: preview.w, height: preview.h,
                        background: thumbUrl ? "transparent" : "rgba(255,255,255,0.06)",
                        border: thumbUrl ? "none" : "1px dashed rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        flexShrink: 0,
                        position: "relative",
                        overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {thumbUrl
                          ? <img src={thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontWeight: 700, letterSpacing: 0.5 }}>
                              {item.aspect_ratio?.split(" — ")[0] ?? "IMG"}
                            </span>
                        }
                        {isDone && (
                          <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "rgba(34,197,94,0.9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800 }}>
                            ✓
                          </div>
                        )}
                      </div>

                      {/* Right content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                          Screenshot {item.scene_id}
                        </div>
                        {item.asset_hint && (
                          <div style={{ fontSize: 14, fontWeight: 500, color: "#ffffff", lineHeight: 1.5, marginBottom: 8 }}>
                            {item.asset_hint}
                          </div>
                        )}
                        {item.aspect_ratio && (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
                            {item.aspect_ratio}{item.width && item.height ? ` · min ${item.width}×${item.height}px` : ""}
                          </div>
                        )}

                        {/* Action row */}
                        {isDone ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, color: "rgba(34,197,94,0.9)", fontWeight: 600 }}>✓ Uploaded</span>
                            <button onClick={() => ref.current?.click()}
                              style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
                              Change
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <button
                              disabled={upSt === "uploading"}
                              onClick={() => ref.current?.click()}
                              style={{
                                background: "#f5c518", color: "#000", border: "none", borderRadius: 8,
                                padding: "8px 18px", fontSize: 13, fontWeight: 600,
                                cursor: upSt === "uploading" ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                                opacity: upSt === "uploading" ? 0.6 : 1,
                              }}>
                              {upSt === "uploading" ? <><Spinner size={12} color="#fff" /> Uploading…</> : "↑ Upload Screenshot"}
                            </button>
                            <button
                              onClick={() => setUploadStatus(s => ({ ...s, [item.scene_id]: "done" }))}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.35)", padding: 0 }}>
                              Skip for now
                            </button>
                            {upSt === "error" && <span style={{ fontSize: 11, color: T.danger }}>Failed — try again</span>}
                          </div>
                        )}
                        <input ref={el => { ref.current = el; }} type="file" accept="image/*,video/*" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleSceneFile(item.scene_id, f); e.target.value = ""; }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate(`/video-editor/${editorProjectId}`, { state: { from: "/promo-video" } })}
                disabled={!canOpen}
                style={{
                  width: "100%", padding: "15px 24px", fontSize: 16, fontWeight: 700,
                  borderRadius: 12, border: "none", cursor: canOpen ? "pointer" : "not-allowed",
                  background: canOpen ? "#f5c518" : "rgba(255,255,255,0.06)",
                  color: canOpen ? "#000000" : "rgba(255,255,255,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                }}>
                {anyUploading ? <><Spinner size={16} color="#fff" /> Uploading…</> :
                 !allDecided  ? "Upload or skip each asset to continue" :
                 "Open Editor →"}
              </button>

              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 14 }}>
                Skipped assets will appear as placeholders in the editor.
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PromoVideo() {
  const navigate                          = useNavigate();
  const { projectId: paramProjectId }     = useParams();
  const [tab,          setTab]            = useState("create");
  const [prefill,      setPrefill]        = useState(null);
  const [initialState, setInitialState]   = useState(null);

  // When URL has a projectId, fetch the project and resume
  useEffect(() => {
    if (!paramProjectId) return;
    setTab("create");
    serverFetch(`/api/promo-video/${paramProjectId}`)
      .then(r => r.json())
      .then(d => {
        if (d.project) setInitialState({ project: d.project, assetManifest: d.assetManifest });
      })
      .catch(() => {});
  }, [paramProjectId]);

  function handleRetry(project) {
    setPrefill(project);
    setInitialState(null);
    setTab("create");
  }

  function handleCreateNew() {
    setInitialState(null);
    setPrefill(null);
    window.history.replaceState({}, "", "/promo-video");
    setTab("create");
  }

  const tabs = [
    { id: "projects", label: "My Projects" },
    { id: "create",   label: "Create New"  },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Promo Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => t.id === "create" ? handleCreateNew() : setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(245,197,24,0.1)" : "transparent",
                  color:      tab === t.id ? T.accent : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif", cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? `2px solid ${T.accent}` : "2px solid transparent",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "projects"
          ? <ProjectsTab onCreateNew={handleCreateNew} />
          : <CreateWizard
              key={initialState?.project?.id ?? prefill?.id ?? "new"}
              prefill={prefill}
              initialState={initialState}
              onViewProjects={() => setTab("projects")}
            />
        }
      </div>
    </AppLayout>
  );
}
