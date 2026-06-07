/**
 * CaptionStudio.jsx
 * src/pages/CaptionStudio.jsx
 * Upload a talking-head video → Whisper transcription → styled captions → open in editor
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch, SERVER } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { useProjectsStore } from "../store/useProjectsStore";
import { createProject, deleteProject } from "../services/projects/projectService";
import { captionStylePresets, captionStyleLabels, captionStyleAccents } from "../core/registries/captionTimelineRegistry";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";


/* ── Static caption style thumbnails (no Remotion hooks, pure CSS) ── */
const PREVIEWS = {
  wordBlaze: () => (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 1, textAlign: "center", lineHeight: 1.1 }}>
      <span style={{ color: "rgba(255,255,255,0.9)", margin: "0 3px" }}>YOUR</span>
      <span style={{ color: "#f5c518", margin: "0 3px", textShadow: "0 0 10px #f5c51880" }}>BRAND</span>
      <span style={{ color: "rgba(255,255,255,0.9)", margin: "0 3px" }}>STORY</span>
    </div>
  ),
  karaokeFill: () => (
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, textAlign: "center", lineHeight: 1.2 }}>
      <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 2px" }}>Bold</span>
      <span style={{ position: "relative", display: "inline-block", color: "#fff", margin: "0 2px" }}>
        Move
        <span style={{ position: "absolute", inset: 0, color: "#f5c518", overflow: "hidden", width: "60%", whiteSpace: "nowrap" }}>Move</span>
      </span>
      <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 2px" }}>Today</span>
    </div>
  ),
  stackReveal: () => (
    <div style={{ fontFamily: "'Unbounded',sans-serif", fontSize: 13, fontWeight: 900, textAlign: "center", lineHeight: 1.2 }}>
      <div><span style={{ color: "#fff" }}>STACK</span> <span style={{ color: "#ffd60a" }}>REVEAL</span></div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>STYLE</div>
    </div>
  ),
  markerPen: () => (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 900, textAlign: "center", lineHeight: 1.1 }}>
      <span style={{ color: "rgba(255,255,255,0.6)", margin: "0 2px" }}>BE</span>
      <span style={{ position: "relative", display: "inline-block", color: "#1a1a1a", margin: "0 2px", padding: "0 5px", zIndex: 1 }}>
        <span style={{ position: "absolute", inset: "-2px -5px", background: "#f5c518", borderRadius: "3px 7px 6px 4px", zIndex: -1, transform: "rotate(-0.5deg)" }} />
        SEEN
      </span>
      <span style={{ color: "rgba(255,255,255,0.6)", margin: "0 2px" }}>NOW</span>
    </div>
  ),
  glitchStamp: () => (
    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>
      <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 3px" }}>GLITCH</span>
      <span style={{ position: "relative", display: "inline-block", color: "#fff", margin: "0 3px" }}>
        <span style={{ position: "absolute", inset: 0, color: "#ff003c", opacity: 0.7, transform: "translateX(-2px)" }}>STAMP</span>
        <span style={{ position: "absolute", inset: 0, color: "#00f7ff", opacity: 0.7, transform: "translateX(2px)" }}>STAMP</span>
        STAMP
      </span>
      <span style={{ color: "rgba(255,255,255,0.25)", margin: "0 3px" }}>ON</span>
    </div>
  ),
  editorialSerif: () => (
    <div style={{ background: "linear-gradient(160deg,#f5f3ee,#e8e4db)", borderRadius: 3, padding: "6px 8px", textAlign: "left" }}>
      <div style={{ borderLeft: "3px solid #222", paddingLeft: 7 }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: "rgba(20,18,15,0.35)", marginRight: 4 }}>Your</span>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: "#14120f", fontStyle: "italic", marginRight: 4 }}>brand</span>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 700, color: "rgba(20,18,15,0.35)" }}>voice</span>
      </div>
    </div>
  ),
  neonTicker: () => (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: "#00e5c3", textAlign: "center", textShadow: "0 0 8px rgba(0,229,195,0.6)", letterSpacing: "0.04em" }}>
      TYPING_
      <span style={{ display: "inline-block", width: 2, height: "1em", background: "#00e5c3", boxShadow: "0 0 6px #00e5c3", verticalAlign: "middle", marginLeft: 2 }} />
    </div>
  ),
  pillDrop: () => (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4 }}>
      {["PILL", "DROP", "NOW"].map((w, i) => (
        <span key={w} style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 100, border: `1.5px solid ${i === 1 ? "#7c5cfc" : "rgba(255,255,255,0.15)"}`, background: i === 1 ? "#7c5cfc" : "transparent", color: i === 1 ? "#fff" : "rgba(255,255,255,0.4)", boxShadow: i === 1 ? "0 0 10px #7c5cfc60" : "none" }}>
          {w}
        </span>
      ))}
    </div>
  ),
  brutalSlam: () => (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 900, letterSpacing: -1, textAlign: "center", lineHeight: 1 }}>
      <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>SLAM</span>
      <span style={{ color: "#ff2d55", margin: "0 2px", WebkitTextStroke: "1px #000" }}>IT</span>
      <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>NOW</span>
    </div>
  ),
  luxuryGold: () => (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,155,60,0.2)", borderRadius: 4, padding: "5px 8px", textAlign: "center" }}>
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: "#ffd700", textShadow: "0 0 8px rgba(255,215,0,0.4)", letterSpacing: -0.5 }}>LUXURY</span>
      {" "}
      <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 800, color: "#c9a84c", letterSpacing: -0.5 }}>GOLD</span>
    </div>
  ),
};

function CaptionStylePreview({ styleKey, selected, onClick }) {
  const [hov, setHov] = useState(false);
  const PreviewFn = PREVIEWS[styleKey];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background:   selected ? "rgba(124,92,252,0.12)" : hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:       `1.5px solid ${selected ? "rgba(124,92,252,0.6)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding:      0,
        cursor:       "pointer",
        overflow:     "hidden",
        transition:   "all 0.15s",
        display:      "flex",
        flexDirection:"column",
        textAlign:    "left",
      }}
    >
      <div style={{ background: "#0a0a10", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 8px" }}>
        {PreviewFn ? <PreviewFn /> : null}
      </div>
      <div style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: selected ? "#c4b0ff" : "#6b6b82", textTransform: "uppercase", letterSpacing: "0.06em", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {captionStyleLabels[styleKey] || styleKey}
      </div>
    </button>
  );
}

function chunkSegments(segments, wordsPerChunk = 3) {
  const result = [];
  for (const seg of segments) {
    const words = seg.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const dur = Math.max(0.3, seg.end - seg.start);
    const timePerWord = dur / words.length;
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const count = Math.min(wordsPerChunk, words.length - i);
      result.push({
        text:  words.slice(i, i + count).join(" "),
        start: parseFloat((seg.start + i * timePerWord).toFixed(3)),
        end:   parseFloat((seg.start + (i + count) * timePerWord).toFixed(3)),
      });
    }
  }
  return result;
}

const captionStylePresets = {
  wordBlaze: {
    style:      { fontFamily: "'Bebas Neue',sans-serif",       fontSize: 84, fontWeight: "400", color: "#ffffff", textAlign: "center", letterSpacing: 1,      textShadow: "0 0 20px rgba(245,197,24,0.5)" },
    transition: { in: { type: "zoom",       duration: 0.12, intensity: 0.7 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  karaokeFill: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 70, fontWeight: "800", color: "#ffffff", textAlign: "center" },
    transition: { in: { type: "slide-up",   duration: 0.12, intensity: 0.6 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  stackReveal: {
    style:      { fontFamily: "'Unbounded',sans-serif",        fontSize: 58, fontWeight: "900", color: "#ffffff", textAlign: "center" },
    transition: { in: { type: "fade",       duration: 0.15, intensity: 1   }, out: { type: "fade",    duration: 0.1,  intensity: 1   } },
  },
  markerPen: {
    style:      { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 72, fontWeight: "900", color: "#ffffff", textAlign: "center", textShadow: "0 2px 0 rgba(0,0,0,0.5)" },
    transition: { in: { type: "slide-right",duration: 0.12, intensity: 0.5 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  glitchStamp: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 68, fontWeight: "800", color: "#ffffff", textAlign: "center", textShadow: "-2px 0 #ff003c, 2px 0 #00f7ff" },
    transition: { in: { type: "zoom",       duration: 0.08, intensity: 0.9 }, out: { type: "dissolve",duration: 0.1,  intensity: 0.8 } },
  },
  editorialSerif: {
    style:      { fontFamily: "'Playfair Display',serif",      fontSize: 52, fontWeight: "700", color: "#14120f", textAlign: "left",   letterSpacing: 0 },
    transition: { in: { type: "fade",       duration: 0.2,  intensity: 1   }, out: { type: "fade",    duration: 0.15, intensity: 1   } },
  },
  neonTicker: {
    style:      { fontFamily: "'JetBrains Mono',monospace",    fontSize: 62, fontWeight: "700", color: "#00e5c3", textAlign: "center", letterSpacing: "0.04em", textShadow: "0 0 12px rgba(0,229,195,0.7)" },
    transition: { in: { type: "slide-up",   duration: 0.1,  intensity: 0.5 }, out: { type: "dissolve",duration: 0.12, intensity: 0.7 } },
  },
  pillDrop: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 66, fontWeight: "800", color: "#ffffff", textAlign: "center", textShadow: "0 0 20px rgba(124,92,252,0.6)" },
    transition: { in: { type: "slide-down", duration: 0.12, intensity: 0.6 }, out: { type: "fade",    duration: 0.08, intensity: 1   } },
  },
  brutalSlam: {
    style:      { fontFamily: "'Barlow Condensed',sans-serif", fontSize: 92, fontWeight: "900", color: "#ff2d55", textAlign: "center", letterSpacing: -1,     textShadow: "2px 2px 0 #000, -1px -1px 0 #000" },
    transition: { in: { type: "zoom",       duration: 0.07, intensity: 0.95}, out: { type: "fade",    duration: 0.06, intensity: 1   } },
  },
  luxuryGold: {
    style:      { fontFamily: "'Outfit',sans-serif",           fontSize: 56, fontWeight: "800", color: "#ffd700", textAlign: "center", letterSpacing: -0.5,   textShadow: "0 0 16px rgba(255,215,0,0.5)" },
    transition: { in: { type: "dissolve",   duration: 0.2,  intensity: 0.8 }, out: { type: "dissolve",duration: 0.15, intensity: 0.8 } },
  },
};

function positionLabel(v) {
  if (v >= 70) return "Bottom";
  if (v >= 40) return "Middle";
  return "Top";
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function CaptionCard({ project, onDelete }) {
  const [hov,  setHov]  = useState(false);
  const [conf, setConf] = useState(false);
  const pj = project.safe_project_json;
  const avatarSrc = pj?.layers?.find(l => l.type === "video")?.src || pj?.avatar?.src || null;
  return (
    <a href={`/video-editor/${project.id}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConf(false); }}
      style={{ display: "block", textDecoration: "none", background: "#111118", border: `1px solid ${hov ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, overflow: "hidden", transition: "all 0.2s", transform: hov ? "translateY(-2px)" : "none" }}>
      <div style={{ aspectRatio: "9/16", background: "linear-gradient(135deg,#111118,#1a1a28)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {avatarSrc ? (
          <video src={avatarSrc} preload="metadata" muted playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onLoadedMetadata={e => { e.target.currentTime = 0.1; }}
            onError={e => { e.target.style.display = "none"; }} />
        ) : (
          <span style={{ fontSize: 32, opacity: 0.3 }}>🎬</span>
        )}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); if (conf) onDelete(project.id); else { setConf(true); setTimeout(() => setConf(false), 2500); } }}
          style={{ position: "absolute", top: 6, right: 6, background: conf ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, color: conf ? "#fff" : "#f87171", fontSize: 11, cursor: "pointer", padding: "2px 6px", lineHeight: 1.4, zIndex: 1 }}>
          {conf ? "Sure?" : "✕"}
        </button>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name || "Untitled"}</div>
        <div style={{ fontSize: 11, color: "#55556a", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>
          {new Date(project.updated_at).toLocaleDateString()}
        </div>
      </div>
    </a>
  );
}

/* ── Listing ── */
function VideoListing() {
  const { projects, loading, fetchProjects, removeProject } = useProjectsStore();

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    try { await deleteProject(id); removeProject(id); } catch (_) {}
  };

  const captionProjects = projects.filter(p => p.source === "caption_studio");

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "cs-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (captionProjects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🎬</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No caption videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to add captions to your first video</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {captionProjects.map(p => (
          <CaptionCard key={p.id} project={p} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

/* ── Generator form ── */
function GeneratorForm() {
  const navigate      = useNavigate();
  const fetchCredits  = useCreditsStore(s => s.fetchCredits);
  const fileInputRef  = useRef();

  const [file,         setFile]         = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [videoUrl,     setVideoUrl]     = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [segments,     setSegments]     = useState(null);
  const [projectName,  setProjectName]  = useState("");
  const [captionStyle, setCaptionStyle] = useState("wordBlaze");
  const [captionPos,   setCaptionPos]   = useState(80);
  const [creating,     setCreating]     = useState(false);
  const [creditModal,  setCreditModal]  = useState(null);
  const [error,        setError]        = useState(null);
  const [dragging,     setDragging]     = useState(false);

  function pickFile(f) {
    if (!f) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setFile(f);
    setLocalPreview(URL.createObjectURL(f));
    setError(null);
  }

  function clearFile() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setFile(null); setLocalPreview(null); setPreviewUrl(null); setError(null);
  }

  function handleFilePick(e) { pickFile(e.target.files?.[0]); }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) pickFile(f);
  }

  async function handleUploadAndTranscribe() {
    if (!file) return;
    setTranscribing(true); setError(null);
    try {
      const form1 = new FormData();
      form1.append("file", file);
      const uploadRes = await serverFetch("/api/caption/upload-video", { method: "POST", body: form1 });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
      setVideoUrl(uploadData.url);
      setPreviewUrl(uploadData.url);

      const form2 = new FormData();
      form2.append("file", file);
      const { supabase } = await import("../lib/supabase");
      const token = (await supabase.auth.getSession())?.data?.session?.access_token;
      const transRes = await fetch(`${SERVER}/api/transcription/transcribe`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form2,
      });
      const transData = await transRes.json();
      if (!transRes.ok) throw new Error(transData.error || "Transcription failed");
      setSegments(transData.segments);
      const fullText = (transData.segments || []).map(s => s.text.trim()).join(" ").trim();
      const nameFromTranscript = fullText.split(/\s+/).slice(0, 8).join(" ");
      setProjectName(nameFromTranscript || file.name.replace(/\.[^.]+$/, ""));
      fetchCredits();
    } catch (e) { setError(e.message); }
    setTranscribing(false);
  }

  async function handleCreateClick() {
    if (!segments?.length || !videoUrl) return;
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.caption_render;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleCreate() {
    setCreditModal(null);
    if (!segments?.length || !videoUrl) return;
    setCreating(true);
    try {
      const fps = 30;
      const captionW = 980;
      const captionH = 220;
      const captionX = (1080 - captionW) / 2; // 50px

      const preset  = captionStylePresets[captionStyle] ?? captionStylePresets.wordBlaze;
      const yCenter = (captionPos / 100) * 1920;
      const captionY = Math.max(0, Math.min(1920 - captionH, yCenter - captionH / 2));

      const chunks = chunkSegments(segments, 3);
      const captionLayers = chunks.map((chunk, i) => ({
        id:        `caption_${i}`,
        trackId:   `caption_${i}`,
        name:      `Caption ${i + 1}`,
        type:      "text",
        content:   chunk.text,
        style:     { ...preset.style, _captionStyle: captionStyle },
        captionStyle,
        start:     chunk.start,
        end:       chunk.end,
        zIndex:    10,
        visible:   true,
        locked:    false,
        sfx:       null,
        animation: null,
        keyframes:  { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
        transition: preset.transition,
        transform:  { x: captionX, y: captionY, width: captionW, height: captionH, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      }));

      const totalDuration = (segments[segments.length - 1]?.end ?? 0) + 0.3;

      const timelineProject = {
        version: "2.0",
        format:  { width: 1080, height: 1920, fps, duration: totalDuration },
        layers:  [
          {
            id: "base_video", trackId: "track_base_video", name: "Video",
            type: "video", src: videoUrl, objectFit: "cover",
            start: 0, end: totalDuration, zIndex: 0,
            visible: true, locked: false, sfx: null, animation: null,
            volume: 1, muted: false, trimStart: 0, trimEnd: totalDuration, fadeIn: 0, fadeOut: 0,
            keyframes:  { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] },
            transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
            transform:  { x: 0, y: 0, width: 1080, height: 1920, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
          },
          ...captionLayers,
        ],
      };

      const saved = await createProject({
        name:        projectName || file.name.replace(/\.[^.]+$/, ""),
        rawAI:       { captionStyle, captionPos, segmentCount: segments.length },
        safeProject: timelineProject,
        source:      "caption_studio",
      });
      if (!saved?.id) throw new Error("Failed to create project");

      navigate(`/video-editor/${saved.id}`);
    } catch (e) { setError(e.message); setCreating(false); }
  }

  const done = !!segments;

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: "row-reverse" }}>

      {/* ── Left panel — controls ── */}
      <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Upload */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Video</div>

          {done ? (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "#55556a" }}>{segments.length} segments transcribed</div>
              </div>
              <button
                onClick={() => { clearFile(); setVideoUrl(null); setSegments(null); }}
                style={{ fontSize: 11, color: "#55556a", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
              >✕</button>
            </div>
          ) : (
            <>
              <div
                onClick={() => !file && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragging ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12,
                  padding: "28px 20px",
                  textAlign: "center",
                  cursor: file ? "default" : "pointer",
                  background: dragging ? "rgba(124,92,252,0.06)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.2s",
                }}
              >
                {file ? (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🎬</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: "#55556a", marginTop: 2 }}>{formatSize(file.size)}</div>
                    <button
                      onClick={e => { e.stopPropagation(); clearFile(); }}
                      style={{ marginTop: 8, fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer" }}
                    >Remove</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📹</div>
                    <div style={{ fontSize: 13, color: "#9494a8" }}>Drop your video here</div>
                    <div style={{ fontSize: 11, color: "#55556a", marginTop: 4 }}>or click to browse · MP4, MOV, WebM</div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,video/webm,video/avi,video/quicktime"
                onChange={handleFilePick}
                style={{ display: "none" }}
              />

              {file && !transcribing && (
                <button
                  onClick={handleUploadAndTranscribe}
                  style={{ marginTop: 12, width: "100%", padding: "12px", background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}
                >
                  Transcribe Video →
                </button>
              )}
            </>
          )}
        </div>

        {/* Caption Style */}
        {done && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Caption Style</div>
            <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 2 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.keys(captionStylePresets).map(key => (
                  <CaptionStylePreview
                    key={key}
                    styleKey={key}
                    selected={captionStyle === key}
                    onClick={() => setCaptionStyle(key)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Caption Position */}
        {done && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Position</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9494a8" }}>{positionLabel(captionPos)}</div>
            </div>
            <input
              type="range" min={10} max={90} value={captionPos}
              onChange={e => setCaptionPos(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#7c5cfc" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: "#44444f" }}>Top</span>
              <span style={{ fontSize: 10, color: "#44444f" }}>Bottom</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Action */}
        {done && (
          <div>
            <button
              onClick={handleCreateClick}
              disabled={creating}
              style={{ width: "100%", padding: "13px", background: creating ? "#6b5a00" : "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 800, cursor: creating ? "not-allowed" : "pointer", fontFamily: "'Outfit',sans-serif" }}
            >
              {creating ? "Creating Project…" : "Open in Editor · 8 credits →"}
            </button>
          </div>
        )}

        {creditModal && (
          <CreditConfirmModal
            service="Video Captions"
            breakdown={creditModal.breakdown}
            total={creditModal.total}
            balance={creditModal.balance}
            onConfirm={handleCreate}
            onCancel={() => setCreditModal(null)}
            onTopUp={() => { setCreditModal(null); window.location.href = "/credits"; }}
          />
        )}
      </div>

      {/* ── Right panel — preview ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

        {!file && !transcribing && !done && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", opacity: 0.5 }}>
            <div style={{ fontSize: 52 }}>🎬</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>Upload your talking-head video</div>
            <div style={{ fontSize: 13, color: "#55556a" }}>We'll transcribe it and add styled captions to every segment</div>
          </div>
        )}

        {file && !transcribing && !done && localPreview && (
          <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", maxWidth: 480 }}>
            <video src={localPreview} controls style={{ width: "100%", display: "block", maxHeight: 360 }} />
          </div>
        )}

        {transcribing && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
            <div style={{ width: 36, height: 36, border: "3px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "cs-spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Transcribing your video…</div>
            <div style={{ fontSize: 13, color: "#55556a" }}>This takes 30–60 seconds depending on length</div>
          </div>
        )}

        {done && previewUrl && (
          <>
            <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", maxWidth: 480 }}>
              <video controls src={previewUrl} style={{ width: "100%", display: "block", maxHeight: 300 }} />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Transcript Preview — {segments.length} segments
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {segments.slice(0, 4).map((seg, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 10, color: "#55556a", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", paddingTop: 2 }}>
                      {formatTime(seg.start)}
                    </span>
                    <span style={{ fontSize: 13, color: "#c8c8d8", lineHeight: 1.5 }}>{seg.text.trim()}</span>
                  </div>
                ))}
                {segments.length > 4 && (
                  <div style={{ fontSize: 12, color: "#44444f", textAlign: "center", padding: "4px 0" }}>
                    + {segments.length - 4} more segments
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function CaptionStudio() {
  const [tab, setTab] = useState("create");

  const tabs = [
    { id: "videos", label: "My Videos" },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes cs-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Video Captions
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px",
                  border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "videos" ? <VideoListing /> : <GeneratorForm />}
      </div>
    </AppLayout>
  );
}
