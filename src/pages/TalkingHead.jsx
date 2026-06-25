/**
 * TalkingHead.jsx — standalone Talking Head service.
 * Upload a talking-head clip → transcribe → captions over the speaker → open in editor.
 * (Phase 1a: speaker base + word-synced captions. B-roll/cutaways arrive in 1b.)
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../ui/AppLayout";
import { useCreditsStore } from "../store/useCreditsStore";
import { uploadTalkingHeadVideo, generateTalkingHead } from "../services/ai/talkingHead/generateTalkingHead";
import { captionStylePresets, captionStyleLabels, captionStyleAccents } from "../core/registries/captionTimelineRegistry.jsx";
import { CAPTION_PREVIEWS as PREVIEWS } from "../ui/components/CaptionStylePreview.jsx";

const T = { bg: "#0a0a10", surface: "#13131c", border: "rgba(255,255,255,0.08)", text: "#e8eaf0", muted: "#8896a8", accent: "#7c5cfc" };

function Toggle({ on, onToggle, title, sub }) {
  return (
    <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>
      </div>
      <button onClick={onToggle} aria-pressed={on} style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: on ? T.accent : "rgba(255,255,255,0.15)", position: "relative", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </button>
    </div>
  );
}
const STEPS = ["Listening…", "Reading words…", "Finding beats…", "Styling captions…", "Composing…", "Almost ready…"];

export default function TalkingHead() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore((s) => s.fetchCredits);
  const fileRef      = useRef();
  const probeRef     = useRef();

  const [file, setFile]             = useState(null);
  const [localPreview, setPreview]  = useState(null);
  const [duration, setDuration]     = useState(0);
  const [captionStyle, setStyle]    = useState("wordBlaze");
  const [captionPos, setPos]        = useState(80);
  const [reframe, setReframe]       = useState("source");
  const [music, setMusic]           = useState(true);
  const [busy, setBusy]             = useState(false);
  const [stepIdx, setStepIdx]       = useState(0);
  const [error, setError]           = useState(null);

  function pick(f) {
    if (!f || !f.type.startsWith("video/")) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setFile(f); setPreview(URL.createObjectURL(f)); setError(null); setDuration(0);
  }

  async function handleGenerate() {
    if (!file || busy) return;
    setBusy(true); setError(null); setStepIdx(0);
    try {
      const { url } = await uploadTalkingHeadVideo(file);
      const result = await generateTalkingHead(
        { videoUrl: url, durationSeconds: Math.round(duration), captionStyle, captionPos, reframe, music },
        ({ step }) => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1)),
      );
      fetchCredits?.();
      if (!result?.projectId) throw new Error("No project returned");
      navigate(`/video-editor/${result.projectId}`);
    } catch (e) {
      setError(e.code === "NO_CREDITS" ? "You don't have enough credits for this clip." : e.message);
      setBusy(false);
    }
  }

  const styleKeys = Object.keys(captionStylePresets);

  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg, color: T.text }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 24px 80px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>Talking Head</h1>
          <p style={{ color: T.muted, margin: "0 0 28px", fontSize: 14 }}>
            Upload a clip of yourself talking — we transcribe it, add styled captions, and open it in the editor. B-roll and auto-cuts are coming next.
          </p>

          {/* Uploader */}
          {!file ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
              style={{ border: `1.5px dashed ${T.border}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: T.surface }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
              <div style={{ fontWeight: 700 }}>Drop your talking-head video, or click to browse</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 6 }}>MP4 / MOV / WebM · any orientation</div>
              <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          ) : (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
              <video
                ref={probeRef}
                src={localPreview}
                controls
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                style={{ width: "100%", maxHeight: 320, borderRadius: 10, background: "#000", objectFit: "contain" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 13, color: T.muted }}>
                <span>{file.name} · {duration ? `${Math.round(duration)}s` : "…"}</span>
                <button onClick={() => { setFile(null); setPreview(null); }} disabled={busy} style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          )}

          {file && (
            <>
              {/* Caption style */}
              <div style={{ marginTop: 26 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 10 }}>Caption style</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {styleKeys.map((k) => {
                    const sel = captionStyle === k;
                    const PreviewFn = PREVIEWS[k];
                    return (
                      <button key={k} onClick={() => setStyle(k)} style={{ background: sel ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.02)", border: `1.5px solid ${sel ? "rgba(124,92,252,0.6)" : T.border}`, borderRadius: 10, padding: 0, cursor: "pointer", overflow: "hidden", textAlign: "left" }}>
                        <div style={{ background: "#0a0a10", minHeight: 54, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}>
                          {PreviewFn ? <PreviewFn /> : <span style={{ color: captionStyleAccents[k], fontWeight: 800 }}>Aa</span>}
                        </div>
                        <div style={{ padding: "5px 8px", fontSize: 10, fontWeight: 700, color: sel ? "#c4b0ff" : T.muted, textTransform: "uppercase", letterSpacing: "0.05em", borderTop: `1px solid ${T.border}` }}>{captionStyleLabels[k] || k}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caption position */}
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 8 }}>
                  Caption position — {captionPos >= 70 ? "Bottom" : captionPos >= 40 ? "Middle" : "Top"}
                </div>
                <input type="range" min="10" max="90" value={captionPos} onChange={(e) => setPos(+e.target.value)} style={{ width: "100%", accentColor: T.accent }} />
              </div>

              {/* Aspect */}
              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.muted, marginBottom: 8 }}>Format</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["source", "Keep original"], ["9:16", "Reframe to 9:16"]].map(([v, label]) => (
                    <button key={v} onClick={() => setReframe(v)} style={{ flex: 1, background: reframe === v ? "rgba(124,92,252,0.14)" : "rgba(255,255,255,0.02)", border: `1.5px solid ${reframe === v ? "rgba(124,92,252,0.6)" : T.border}`, color: reframe === v ? "#c4b0ff" : T.text, borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Music */}
              <Toggle on={music} onToggle={() => setMusic((v) => !v)} title="Background music" sub="A subtle bed, ducked well under your voice." />

              {error && <div style={{ marginTop: 18, color: "#f87171", fontSize: 13 }}>{error}</div>}

              <button onClick={handleGenerate} disabled={busy || !duration} style={{ marginTop: 26, width: "100%", background: busy ? "rgba(124,92,252,0.5)" : T.accent, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
                {busy ? STEPS[stepIdx] : "Generate"}
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
