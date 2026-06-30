/**
 * VideoClipping.jsx — standalone Video Clipping service.
 * Upload a long video/podcast → transcribe → GPT-4.1 picks the best moments → each becomes a
 * captioned 9:16 clip you can open in the editor. We keep only the clips; the source is deleted
 * after processing. No render here — clips open in the editor and export from there.
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { useCreditsStore } from "../store/useCreditsStore";
import { uploadClipSource, generateClips } from "../services/ai/videoClipping/generateClips";
import { captionStyleLabels } from "../core/registries/captionTimelineRegistry.jsx";
import { creditsForClipping } from "../core/utils/creditCosts";

const T = { bg: "#0a0a10", surface: "#13131c", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", accent: "#7c5cfc" };

const STEPS = ["Uploading & analyzing…", "Transcribing…", "Finding the best moments…", "Cutting your clips…", "Almost ready…"];

const LENGTH_PRESETS = [
  { id: "short",    label: "Shorts (15–30s)", min: 15, max: 30 },
  { id: "standard", label: "Standard (20–60s)", min: 20, max: 60 },
  { id: "long",     label: "Long (45–90s)", min: 45, max: 90 },
];

const MAX_MIN = 90;
const fmtDur = (s) => { const m = Math.floor(s / 60), sec = Math.round(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; };

export default function VideoClipping() {
  const navigate = useNavigate();
  const fetchCredits = useCreditsStore((s) => s.fetchCredits);
  const fileRef = useRef();
  const probeRef = useRef();

  const [file, setFile] = useState(null);
  const [localPreview, setPreview] = useState(null);
  const [duration, setDuration] = useState(0);
  const [tooLong, setTooLong] = useState(false);
  const [captionStyle, setStyle] = useState("wordBlaze");
  const [lengthId, setLengthId] = useState("standard");
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState(null);
  const [clips, setClips] = useState(null);

  const styleEntries = Object.entries(captionStyleLabels || { wordBlaze: "Word Blaze" });
  const estCost = duration ? creditsForClipping(duration) : null;

  function pick(f) {
    if (!f || !f.type.startsWith("video/")) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setFile(f); setPreview(URL.createObjectURL(f));
    setError(null); setDuration(0); setTooLong(false); setClips(null);
  }

  function onMeta(e) {
    const d = e.target?.duration || 0;
    setDuration(d);
    setTooLong(d > MAX_MIN * 60 + 10);
  }

  async function handleGenerate() {
    if (!file || busy || tooLong) return;
    setBusy(true); setError(null); setStepIdx(0); setClips(null);
    try {
      const { url, key } = await uploadClipSource(file);
      const preset = LENGTH_PRESETS.find((p) => p.id === lengthId) || LENGTH_PRESETS[1];
      const result = await generateClips(
        { videoUrl: url, sourceKey: key, captionStyle, clipLenMin: preset.min, clipLenMax: preset.max },
        () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1)),
      );
      fetchCredits?.();
      if (!result?.clips?.length) throw new Error("No clips were produced — try a different video.");
      setClips(result.clips);
    } catch (err) {
      setError(err?.code === "NO_CREDITS" ? "Not enough credits for this video." : (err?.message || "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <style>{`@keyframes vc-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 90px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: 0 }}>
            Video Clipping <span style={{ fontSize: 12, fontWeight: 800, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "3px 8px", borderRadius: 7, verticalAlign: "middle", marginLeft: 8 }}>BETA</span>
          </h1>
          <p style={{ color: T.muted, fontSize: 14, margin: "8px 0 28px", lineHeight: 1.5 }}>
            Upload a long video or podcast. We find the best moments and turn them into captioned vertical clips, ready to edit. Charged by source length (under {MAX_MIN} min).
          </p>

          {/* Results view */}
          {clips ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{clips.length} clip{clips.length === 1 ? "" : "s"} ready</div>
                <button onClick={() => { setClips(null); setFile(null); setPreview(null); setDuration(0); }}
                  style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Clip another video
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {clips.map((c, i) => (
                  <div key={c.projectId || i} onClick={() => navigate(`/video-editor/${c.projectId}`, { state: { from: "/video-clipping" } })}
                    style={{ cursor: "pointer", borderRadius: 13, overflow: "hidden", border: `1px solid ${T.border}`, background: T.surface, transition: "border-color .15s, transform .15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ aspectRatio: "9/16", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      {c.clipUrl
                        ? <video src={c.clipUrl} muted playsInline preload="metadata"
                            onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 30, opacity: 0.5 }}>🎬</span>}
                      <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "3px 7px", borderRadius: 6, pointerEvents: "none" }}>{fmtDur(c.duration || 0)}</span>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.title || "Clip"}</div>
                      <div style={{ fontSize: 11, color: T.accent, marginTop: 6, fontWeight: 700 }}>Open in editor →</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Upload area */}
              <div onClick={() => !busy && fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (!busy) pick(e.dataTransfer.files?.[0]); }}
                style={{ border: `2px dashed ${file ? "rgba(124,92,252,0.5)" : T.border}`, borderRadius: 16, padding: file ? 16 : "48px 24px", textAlign: "center", cursor: busy ? "default" : "pointer", background: T.surface, transition: "border-color .15s" }}>
                <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => pick(e.target.files?.[0])} />
                {localPreview ? (
                  <div style={{ display: "flex", gap: 16, alignItems: "center", textAlign: "left" }}>
                    <video ref={probeRef} src={localPreview} onLoadedMetadata={onMeta} muted style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, background: "#000", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file?.name}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{duration ? `${fmtDur(duration)} • ` : ""}{estCost ? `~${estCost} credits` : "reading…"}</div>
                      {tooLong && <div style={{ fontSize: 12, color: "#f87171", marginTop: 6, fontWeight: 700 }}>Too long — please upload a video under {MAX_MIN} minutes.</div>}
                      <div style={{ fontSize: 11, color: T.accent, marginTop: 8, fontWeight: 700 }}>Choose a different file</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 34, marginBottom: 8 }}>⬆️</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Drop a video here, or click to upload</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>MP4, MOV, WebM • up to {MAX_MIN} min</div>
                  </>
                )}
              </div>

              {/* Options */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6 }}>Clip length</label>
                  <select value={lengthId} onChange={(e) => setLengthId(e.target.value)} disabled={busy}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.surface, color: T.text, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                    {LENGTH_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, display: "block", marginBottom: 6 }}>Caption style</label>
                  <select value={captionStyle} onChange={(e) => setStyle(e.target.value)} disabled={busy}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: T.surface, color: T.text, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                    {styleEntries.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </div>
              </div>

              {error && <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 13 }}>{error}</div>}

              <button onClick={handleGenerate} disabled={!file || busy || tooLong}
                style={{ marginTop: 22, width: "100%", padding: "14px 0", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 15, fontFamily: "inherit", cursor: (!file || busy || tooLong) ? "default" : "pointer", background: (!file || busy || tooLong) ? "rgba(124,92,252,0.4)" : T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                {busy ? (
                  <>
                    <span style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "vc-spin 0.8s linear infinite" }} />
                    {STEPS[stepIdx]}
                  </>
                ) : (estCost ? `Find clips · ~${estCost} credits` : "Find clips")}
              </button>
              {busy && <div style={{ marginTop: 10, fontSize: 12, color: T.muted, textAlign: "center" }}>This can take a few minutes for long videos — keep this tab open.</div>}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
