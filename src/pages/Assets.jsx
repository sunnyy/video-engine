import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "../ui/AppLayout";
import { serverFetch } from "../services/serverApi";
import { supabase } from "../lib/supabase";

const FONT  = "'Outfit', sans-serif";
const ACCENT = "#a78bfa";
const PREV  = 8;   // items shown per section in All view
const PS    = { videos: 12, images: 24, audio: 20, transcriptions: 20 };

/* ── Helpers ── */
async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function triggerDownload(url, name = "asset") {
  const a = document.createElement("a");
  a.href = url; a.download = name; a.target = "_blank";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso)) / 1000;
  if (d < 60)         return "just now";
  if (d < 3600)       return `${Math.floor(d / 60)}m ago`;
  if (d < 86400)      return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Normalizers ── */
const toVideo = x => ({ id: x.id, url: x.video_url, created_at: x.created_at });
const toAiImg = x => ({ id: x.id, subtype: "ai_image", url: x.url, title: x.prompt, created_at: x.created_at });
const toAudio = x => ({ id: x.id, url: x.audio_url, script: x.script, voice_id: x.voice_id, created_at: x.created_at });
const toTrans = x => ({ id: x.id, file_name: x.file_name, transcript: x.transcript, duration_seconds: x.duration_seconds, language: x.language, created_at: x.created_at });

/* ── Image Card ── */
function ImageCard({ item }) {
  const [hov, setHov] = useState(false);
  const LABELS = { poster: "Poster", thumbnail: "Thumbnail", social_post: "Social", outfit_tryon: "Try-On", ai_image: "AI Image" };
  const label = LABELS[item.subtype] || "Image";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", aspectRatio: "1/1" }}>
      <img src={item.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
      <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", backdropFilter: "blur(4px)" }}>
        {label}
      </div>
      {hov && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <button onClick={() => triggerDownload(item.url, `${label.toLowerCase().replace(" ","-")}.jpg`)}
            style={{ padding: "7px 18px", borderRadius: 8, background: ACCENT, border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>Download</button>
          <a href={item.url} target="_blank" rel="noreferrer"
            style={{ padding: "7px 18px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#ccc", fontSize: 12, cursor: "pointer", fontFamily: FONT, textDecoration: "none" }}>Open</a>
          {item.title && (
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2, textAlign: "center", padding: "0 10px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {item.title.slice(0, 80)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Video Card ── */
function VideoCard({ item }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#111118", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", aspectRatio: "16/10" }}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "linear-gradient(135deg, #111118 0%, #0d0d1a 100%)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, display: "flex", overflow: "hidden" }}>
          {Array.from({ length: 20 }).map((_, i) => <div key={i} style={{ width: 18, flexShrink: 0, height: 10, margin: "2px 2px 0", borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />)}
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 14, display: "flex", overflow: "hidden" }}>
          {Array.from({ length: 20 }).map((_, i) => <div key={i} style={{ width: 18, flexShrink: 0, height: 10, margin: "0 2px 2px", borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />)}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={ACCENT}><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6e6e88", fontFamily: FONT }}>Exported Video</div>
      </div>
      <div style={{ position: "absolute", top: 18, right: 8, background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#aaa", letterSpacing: "0.06em", backdropFilter: "blur(4px)" }}>
        AI Video
      </div>
      {item.created_at && (
        <div style={{ position: "absolute", bottom: 18, left: 10, fontSize: 10, color: "#55556a", fontFamily: FONT }}>{timeAgo(item.created_at)}</div>
      )}
      {hov && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <a href={item.url} target="_blank" rel="noreferrer"
            style={{ padding: "7px 18px", borderRadius: 8, background: ACCENT, border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT, textDecoration: "none" }}>Watch</a>
          <button onClick={() => triggerDownload(item.url, `video-${item.id}.mp4`)}
            style={{ padding: "7px 18px", borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#ccc", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>Download</button>
        </div>
      )}
    </div>
  );
}

/* ── Audio Card ── */
function AudioCard({ item, audioRef, playingId, setPlayingId }) {
  const isPlaying = playingId === item.id;
  const toggle = () => {
    if (isPlaying) { audioRef.current?.pause(); setPlayingId(null); }
    else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
      audioRef.current = new Audio(item.url);
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(item.id);
    }
  };
  return (
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <button onClick={toggle} style={{ width: 40, height: 40, borderRadius: "50%", background: isPlaying ? ACCENT : "rgba(124,92,252,0.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
        {isPlaying
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill={ACCENT}><polygon points="5 3 19 12 5 21 5 3"/></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 2, alignItems: "center", height: 18, marginBottom: 8 }}>
          {[5,10,7,14,9,12,6,10,8,13,7,11].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, borderRadius: 2, background: isPlaying ? ACCENT : "rgba(124,92,252,0.35)", transition: "all 0.15s" }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#9494a8", fontFamily: FONT, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.script || "—"}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "#55556a", fontFamily: FONT }}>
          {item.voice_id && <span style={{ textTransform: "capitalize" }}>{item.voice_id}</span>}
          {item.created_at && <span>{timeAgo(item.created_at)}</span>}
        </div>
      </div>
      <button onClick={() => triggerDownload(item.url, `voice-${item.id}.mp3`)} title="Download"
        style={{ background: "transparent", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.color = "#aaa"} onMouseLeave={e => e.currentTarget.style.color = "#555"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Transcription Card ── */
function TranscriptionCard({ item }) {
  return (
    <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", fontFamily: FONT, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.file_name || "Transcription"}
        </div>
        <div style={{ fontSize: 12, color: "#7070a0", fontFamily: FONT, lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.transcript ? item.transcript.slice(0, 120) + (item.transcript.length > 120 ? "…" : "") : "—"}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: "#55556a", fontFamily: FONT }}>
          {item.duration_seconds != null && <span>{Math.round(item.duration_seconds)}s</span>}
          {item.language && <span style={{ textTransform: "uppercase" }}>{item.language}</span>}
          {item.created_at && <span>{timeAgo(item.created_at)}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function SkeletonGrid({ cols, count, tall }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: tall ? 10 : 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderRadius: 10, background: "rgba(255,255,255,0.04)", aspectRatio: tall ? "auto" : (cols >= 3 ? "1/1" : "auto"), height: tall ? 84 : undefined, animation: "assetPulse 1.6s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

/* ── Pill ── */
function Pill({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20,
      border: `1px solid ${active ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.08)"}`,
      background: active ? "rgba(124,92,252,0.15)" : "transparent",
      color: active ? ACCENT : "#7070a0",
      fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {label}
      {count !== undefined && (
        <span style={{ background: active ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.06)", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700, color: active ? ACCENT : "#555" }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── All-view section ── */
function PreviewSection({ label, items, cols, onSeeAll, children }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#6e6e88", fontFamily: FONT, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#44444f", fontWeight: 600 }}>{items.length}{items.length === PREV ? "+" : ""}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
        {items.length >= PREV && (
          <button onClick={onSeeAll} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7070a0", fontSize: 12, fontFamily: FONT, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = ACCENT} onMouseLeave={e => e.currentTarget.style.color = "#7070a0"}>
            See all →
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: cols >= 3 ? 12 : 10 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Load More button ── */
function LoadMoreBtn({ loading, onClick }) {
  return (
    <div style={{ textAlign: "center", marginTop: 28 }}>
      <button onClick={onClick} disabled={loading}
        style={{ padding: "10px 32px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: loading ? "#555" : "#aaa", cursor: loading ? "default" : "pointer", fontSize: 13, fontFamily: FONT, transition: "all 0.15s" }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
        {loading ? "Loading…" : "Load more"}
      </button>
    </div>
  );
}

/* ── Empty state ── */
function Empty({ icon, label }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 20px", color: "#44444f" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: FONT, color: "#55556a" }}>{label}</div>
    </div>
  );
}

/* ── Main page ── */
export default function Assets() {
  const [filter,     setFilter]     = useState("all");
  const [imgSub,     setImgSub]     = useState("all");
  const [playingId,  setPlayingId]  = useState(null);
  const audioRef = useRef(null);
  const userIdRef = useRef(null);
  const nonAiRef  = useRef(null); // cached non-AI images (null = not yet fetched)

  /* ── All-view state ── */
  const [preview,     setPreview]     = useState({ videos: [], images: [], audio: [], transcriptions: [] });
  const [prevLoading, setPrevLoading] = useState(true);
  const [prevError,   setPrevError]   = useState("");

  /* ── Filter-view state ── */
  const [items,         setItems]        = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [filterError,   setFilterError]   = useState("");
  const offsetRef  = useRef(0); // for videos / audio / transcriptions
  const aiOffRef   = useRef(0); // for images (AI images offset only)

  const ensureUser = async () => {
    if (!userIdRef.current) {
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id;
    }
    return userIdRef.current;
  };

  /* ── Load preview (All view) ── */
  const loadPreview = useCallback(async () => {
    setPrevLoading(true);
    setPrevError("");
    try {
      const uid = await ensureUser();
      const [aiRes, ttsRes, transRes, vidRes] = await Promise.allSettled([
        serverFetch(`/api/image-generation/library?limit=${PREV}&offset=0`).then(safeJson),
        serverFetch(`/api/tts/history?limit=${PREV}&offset=0`).then(safeJson),
        serverFetch(`/api/transcription/history?limit=${PREV}&offset=0`).then(safeJson),
        uid
          ? supabase.from("renders").select("id, video_url, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(PREV)
          : Promise.resolve({ data: [] }),
      ]);
      const ok = r => r.status === "fulfilled" && r.value;
      setPreview({
        videos:         ok(vidRes)  ? (vidRes.value.data   || []).filter(x => x.video_url).map(toVideo) : [],
        images:         ok(aiRes)   ? (aiRes.value.images  || []).map(toAiImg) : [],
        audio:          ok(ttsRes)  ? (ttsRes.value.history|| []).filter(x => x.audio_url).map(toAudio) : [],
        transcriptions: ok(transRes)? (transRes.value.transcriptions || []).map(toTrans) : [],
      });
    } catch (e) {
      setPrevError(e.message);
    } finally {
      setPrevLoading(false);
    }
  }, []);

  /* ── Load filter page ── */
  const loadFilter = useCallback(async (f, append) => {
    if (append) setLoadingMore(true);
    else { setFilterLoading(true); setItems([]); setHasMore(false); setFilterError(""); }

    try {
      const uid = await ensureUser();

      if (f === "videos") {
        const off = append ? offsetRef.current : 0;
        if (!append) offsetRef.current = 0;
        const { data } = await supabase.from("renders")
          .select("id, video_url, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .range(off, off + PS.videos - 1);
        const next = (data || []).filter(x => x.video_url).map(toVideo);
        setItems(prev => append ? [...prev, ...next] : next);
        offsetRef.current = off + next.length;
        setHasMore(data?.length === PS.videos);

      } else if (f === "images") {
        const aiOff = append ? aiOffRef.current : 0;
        if (!append) aiOffRef.current = 0;

        // Load non-AI sources once and cache
        if (!nonAiRef.current) {
          const [pR, tR, sR, oR] = await Promise.allSettled([
            serverFetch("/api/poster/list").then(safeJson),
            serverFetch("/api/thumbnail/list").then(safeJson),
            serverFetch("/api/social-post/list").then(safeJson),
            serverFetch("/api/outfit/list").then(safeJson),
          ]);
          const ok = r => r.status === "fulfilled" && r.value;
          nonAiRef.current = [
            ...(ok(pR) ? (pR.value.posters    || []).map(x => ({ id: x.id || x.storageKey, subtype: "poster",       url: x.url,        title: null,                     created_at: null })) : []),
            ...(ok(tR) ? (tR.value.thumbnails  || []).map(x => ({ id: x.storageKey||x.name, subtype: "thumbnail",    url: x.url,        title: x.name,                   created_at: null })) : []),
            ...(ok(sR) ? (sR.value.posts        || []).map(x => ({ id: x.id,                subtype: "social_post",  url: x.post_url,   title: x.headline||x.niche||null, created_at: x.created_at })) : []),
            ...(ok(oR) ? (oR.value.tryons        || []).map(x => ({ id: x.id,                subtype: "outfit_tryon", url: x.result_url, title: null,                     created_at: x.created_at })) : []),
          ].filter(x => x.url);
        }

        const aiRes = await serverFetch(`/api/image-generation/library?limit=${PS.images}&offset=${aiOff}`).then(safeJson);
        const aiNext = (aiRes?.images || []).map(toAiImg);
        aiOffRef.current = aiOff + aiNext.length;
        setHasMore(aiNext.length === PS.images);
        setItems(prev => append ? [...prev, ...aiNext] : [...nonAiRef.current, ...aiNext]);

      } else if (f === "audio") {
        const off = append ? offsetRef.current : 0;
        if (!append) offsetRef.current = 0;
        const res = await serverFetch(`/api/tts/history?limit=${PS.audio}&offset=${off}`).then(safeJson);
        const next = (res?.history || []).filter(x => x.audio_url).map(toAudio);
        setItems(prev => append ? [...prev, ...next] : next);
        offsetRef.current = off + next.length;
        setHasMore(next.length === PS.audio);

      } else if (f === "transcriptions") {
        const off = append ? offsetRef.current : 0;
        if (!append) offsetRef.current = 0;
        const res = await serverFetch(`/api/transcription/history?limit=${PS.transcriptions}&offset=${off}`).then(safeJson);
        const next = (res?.transcriptions || []).map(toTrans);
        setItems(prev => append ? [...prev, ...next] : next);
        offsetRef.current = off + next.length;
        setHasMore(next.length === PS.transcriptions);
      }
    } catch (e) {
      setFilterError(e.message);
    } finally {
      if (append) setLoadingMore(false);
      else setFilterLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
    return () => { audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    if (filter !== "all") loadFilter(filter, false);
  }, [filter]);

  const switchFilter = (f) => {
    if (f === filter) return;
    setPlayingId(null);
    audioRef.current?.pause();
    setFilter(f);
  };

  const handleRefresh = () => {
    nonAiRef.current = null;
    if (filter === "all") loadPreview();
    else loadFilter(filter, false);
  };

  // Visible items in filter view (apply imgSub)
  const shownItems = filter === "images" && imgSub !== "all"
    ? items.filter(x => x.subtype === imgSub)
    : items;

  const gridCols = { videos: 3, images: 4, audio: 2, transcriptions: 2 };
  const emptyCopy = { videos: ["🎬","No videos yet"], images: ["🖼","No images yet"], audio: ["🎙","No audio yet"], transcriptions: ["📝","No transcriptions yet"] };
  const prevTotal = preview.videos.length + preview.images.length + preview.audio.length + preview.transcriptions.length;

  return (
    <AppLayout>
      <style>{`@keyframes assetPulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8e8f0", fontFamily: FONT, margin: 0 }}>Assets</h1>
          <p style={{ fontSize: 13, color: "#55556a", margin: "3px 0 0", fontFamily: FONT }}>All your generated media in one place</p>
        </div>
        <button onClick={handleRefresh}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 14px", color: "#7070a0", cursor: "pointer", fontSize: 13, fontFamily: FONT, transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#aaa"} onMouseLeave={e => e.currentTarget.style.color = "#7070a0"}>
          Refresh
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 36px" }}>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Pill label="All"            active={filter === "all"}            onClick={() => switchFilter("all")} />
          <Pill label="Videos"         active={filter === "videos"}         count={filter === "videos" ? items.length : undefined} onClick={() => switchFilter("videos")} />
          <Pill label="Images"         active={filter === "images"}         count={filter === "images" ? items.length : undefined} onClick={() => switchFilter("images")} />
          <Pill label="Audio"          active={filter === "audio"}          count={filter === "audio"  ? items.length : undefined} onClick={() => switchFilter("audio")} />
          <Pill label="Transcriptions" active={filter === "transcriptions"} count={filter === "transcriptions" ? items.length : undefined} onClick={() => switchFilter("transcriptions")} />
        </div>

        {/* Image sub-filters */}
        {filter === "images" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {[["all","All Images"],["ai_image","AI Images"],["poster","Posters"],["thumbnail","Thumbnails"],["social_post","Social Posts"],["outfit_tryon","Try-On"]].map(([k, l]) => (
              <Pill key={k} label={l} active={imgSub === k}
                count={imgSub === k ? shownItems.length : undefined}
                onClick={() => setImgSub(k)} />
            ))}
          </div>
        )}

        {/* Errors */}
        {(prevError || filterError) && (
          <div style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 10, padding: "10px 16px", color: "#f97316", fontSize: 13, fontFamily: FONT, marginBottom: 16 }}>
            {prevError || filterError}
          </div>
        )}

        {/* ── All view ── */}
        {filter === "all" && (
          prevLoading ? (
            <>
              <SkeletonGrid cols={3} count={3} />
              <div style={{ marginTop: 20 }}><SkeletonGrid cols={4} count={4} /></div>
              <div style={{ marginTop: 20 }}><SkeletonGrid cols={2} count={4} tall /></div>
            </>
          ) : prevTotal === 0 ? (
            <Empty icon="🗂" label="No assets yet — items you generate will appear here" />
          ) : (
            <>
              <PreviewSection label="Videos" items={preview.videos} cols={3} onSeeAll={() => switchFilter("videos")}>
                {preview.videos.map(item => <VideoCard key={item.id} item={item} />)}
              </PreviewSection>
              <PreviewSection label="Images" items={preview.images} cols={4} onSeeAll={() => switchFilter("images")}>
                {preview.images.map(item => <ImageCard key={item.id} item={item} />)}
              </PreviewSection>
              <PreviewSection label="Audio" items={preview.audio} cols={2} onSeeAll={() => switchFilter("audio")}>
                {preview.audio.map(item => <AudioCard key={item.id} item={item} audioRef={audioRef} playingId={playingId} setPlayingId={setPlayingId} />)}
              </PreviewSection>
              <PreviewSection label="Transcriptions" items={preview.transcriptions} cols={2} onSeeAll={() => switchFilter("transcriptions")}>
                {preview.transcriptions.map(item => <TranscriptionCard key={item.id} item={item} />)}
              </PreviewSection>
            </>
          )
        )}

        {/* ── Filter views ── */}
        {filter !== "all" && (
          filterLoading ? (
            <SkeletonGrid cols={gridCols[filter]} count={gridCols[filter] * 2} tall={filter === "audio" || filter === "transcriptions"} />
          ) : shownItems.length === 0 ? (
            <Empty icon={emptyCopy[filter][0]} label={emptyCopy[filter][1]} />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols[filter]}, 1fr)`, gap: gridCols[filter] >= 3 ? 12 : 10 }}>
                {filter === "videos"         && shownItems.map(item => <VideoCard         key={item.id} item={item} />)}
                {filter === "images"         && shownItems.map(item => <ImageCard         key={item.id} item={item} />)}
                {filter === "audio"          && shownItems.map(item => <AudioCard         key={item.id} item={item} audioRef={audioRef} playingId={playingId} setPlayingId={setPlayingId} />)}
                {filter === "transcriptions" && shownItems.map(item => <TranscriptionCard key={item.id} item={item} />)}
              </div>
              {/* Hide load-more for image sub-filters (data is fully loaded) */}
              {hasMore && !(filter === "images" && imgSub !== "all" && imgSub !== "ai_image") && (
                <LoadMoreBtn loading={loadingMore} onClick={() => loadFilter(filter, true)} />
              )}
            </>
          )
        )}

      </div>
    </AppLayout>
  );
}
