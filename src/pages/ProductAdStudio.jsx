/**
 * ProductAdStudio.jsx — AI Product Video Ad Generator
 * /product-ad-studio
 *
 * Step 1 — Upload product photo
 * Step 2 — Analyze (GPT-4o Vision → shot strategy)
 * Step 3 — Images (Fal.ai → one image per shot)
 * Step 4 — Clips (Fal.ai LTX → video clip per shot)
 * Step 5 — Done (download / open editor)
 */
import { useState, useRef } from "react";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";

const STEP_LABELS = ["Upload", "Analyze", "Images", "Clips", "Done"];

/* ── Styles ── */
const C = {
  card:  { background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" },
  inp:   { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:   { fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnP:  { padding: "10px 24px", background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnG:  { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  badge: (color) => ({ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${color}22`, color, border: `1px solid ${color}44` }),
};

/* ── StepBar ── */
function StepBar({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1, done = n < step, active = n === step;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: n < STEP_LABELS.length ? 1 : "none", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
                background: done ? "#22c55e" : active ? "#7c5cfc" : "#1c1c28",
                color: done || active ? "#fff" : "#444",
                border: active ? "2px solid #a78bfa" : "2px solid transparent",
              }}>{done ? "✓" : n}</div>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: done ? "#22c55e" : active ? "#e8e8f0" : "#444", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {n < STEP_LABELS.length && (
              <div style={{ flex: 1, height: 2, margin: "0 8px", background: done ? "#22c55e33" : "#1c1c28", minWidth: 8 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── ShotCard (Step 2) ── */
function ShotCard({ shot, index, onEditMotion }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(shot.video_motion_prompt);
  return (
    <div style={{ ...C.card, padding: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7c5cfc22", border: "1px solid #7c5cfc44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#a78bfa", flexShrink: 0 }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 2 }}>{shot.shot_type}</div>
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{shot.narrative}</div>
        </div>
        <div style={{ ...C.badge("#22d3ee"), flexShrink: 0 }}>{shot.duration_seconds}s</div>
      </div>
      <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>
        <span style={{ color: "#666", fontWeight: 600 }}>Camera: </span>{shot.camera_motion}
      </div>
      <div style={{ fontSize: 11, color: "#7878a0", marginBottom: 6, fontStyle: "italic", lineHeight: 1.5 }}>
        <span style={{ color: "#555", fontWeight: 600, fontStyle: "normal" }}>Motion prompt: </span>
        {editing ? null : shot.video_motion_prompt}
      </div>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            style={{ ...C.inp, resize: "vertical", fontSize: 11, marginBottom: 6 }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { onEditMotion(shot.id, draft); setEditing(false); }} style={{ ...C.btnP, padding: "6px 14px", fontSize: 11 }}>Save</button>
            <button onClick={() => { setDraft(shot.video_motion_prompt); setEditing(false); }} style={{ ...C.btnG, padding: "6px 14px", fontSize: 11 }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ ...C.btnG, padding: "4px 10px", fontSize: 10 }}>✎ Edit motion</button>
      )}
    </div>
  );
}

/* ── ImageCard (Step 3) ── */
function ImageCard({ shot, imageData, onRegenerate }) {
  const THUMB_W = 160, THUMB_H = Math.round(160 * 16 / 9);
  return (
    <div style={{ ...C.card, width: THUMB_W + 16, flexShrink: 0 }}>
      <div style={{ width: THUMB_W, height: THUMB_H, margin: 8, borderRadius: 6, overflow: "hidden", background: "#0b0b10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {imageData?.loading && <div style={{ textAlign: "center", color: "#444", fontSize: 10 }}>⏳ generating…</div>}
        {imageData?.error   && <div style={{ textAlign: "center", color: "#f87171", fontSize: 9, padding: 4 }}>✕ {imageData.error.slice(0, 50)}</div>}
        {imageData?.url     && <img src={imageData.url} alt={shot.shot_type} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div style={{ padding: "0 8px 8px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9494a8", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shot.shot_type}</div>
        <button onClick={onRegenerate} disabled={imageData?.loading} style={{ ...C.btnG, padding: "4px 10px", fontSize: 10, width: "100%", opacity: imageData?.loading ? 0.4 : 1 }}>↺ Regen</button>
      </div>
    </div>
  );
}

/* ── ClipCard (Step 4) ── */
function ClipCard({ shot, clipData }) {
  return (
    <div style={{ ...C.card, padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Thumbnail */}
        <div style={{ width: 72, height: 128, borderRadius: 6, overflow: "hidden", background: "#0b0b10", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {clipData?.videoUrl
            ? <video src={clipData.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted loop autoPlay playsInline />
            : clipData?.loading
              ? <div style={{ fontSize: 10, color: "#444", textAlign: "center" }}>⏳</div>
              : clipData?.error
                ? <div style={{ fontSize: 8, color: "#f87171", textAlign: "center", padding: 4 }}>✕</div>
                : <div style={{ fontSize: 10, color: "#333", textAlign: "center" }}>—</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 4 }}>{shot.shot_type}</div>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 8, lineHeight: 1.4 }}>{shot.narrative}</div>
          {clipData?.loading && <div style={{ ...C.badge("#f5c518"), display: "inline-block" }}>⏳ Generating…</div>}
          {clipData?.error   && <div style={{ ...C.badge("#f87171"), display: "inline-block" }}>✕ {clipData.error.slice(0, 60)}</div>}
          {clipData?.videoUrl && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...C.badge("#22c55e"), display: "inline-block" }}>✓ Done</span>
              <a href={clipData.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#7c5cfc" }}>Download ↗</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══ Main Component ══════════════════════════════════════════════ */
export default function ProductAdStudio() {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [imageUrl,    setImageUrl]    = useState("");
  const [imageFile,   setImageFile]   = useState(null);
  const [previewUrl,  setPreviewUrl]  = useState("");
  const [brandName,   setBrandName]   = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [uploadErr,   setUploadErr]   = useState("");
  const fileInputRef = useRef();

  // Step 2 state
  const [analysis,    setAnalysis]    = useState(null);  // { product_analysis, shots }
  const [analyzing,   setAnalyzing]   = useState(false);
  const [analyzeErr,  setAnalyzeErr]  = useState("");

  // Step 3 state
  const [images, setImages] = useState({});  // { [shotId]: { loading, url, error } }
  const [imagesLoading, setImagesLoading] = useState(false);

  // Step 4 state
  const [clips, setClips]  = useState({});  // { [shotId]: { loading, videoUrl, error } }
  const [clipsLoading, setClipsLoading] = useState(false);

  const generatingClips = useRef(false);

  /* ── Step 1: file pick ── */
  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageUrl("");
    setUploadErr("");
  }

  function handleUrlPaste(e) {
    const url = e.target.value;
    setImageUrl(url);
    setPreviewUrl(url);
    setImageFile(null);
    setUploadErr("");
  }

  async function handleUpload() {
    setUploadErr("");
    if (!imageFile && !imageUrl) { setUploadErr("Please select an image or paste a URL."); return; }
    let finalUrl = imageUrl;
    if (imageFile) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("image", imageFile);
        const res  = await serverFetch("/api/product-ad/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        finalUrl = data.url;
        setImageUrl(data.url);
        setPreviewUrl(data.url);
      } catch (e) { setUploadErr(e.message); setUploading(false); return; }
      setUploading(false);
    }
    setStep(2);
    runAnalysis(finalUrl);
  }

  /* ── Step 2: analyze ── */
  async function runAnalysis(url) {
    const src = url || imageUrl;
    setAnalyzing(true); setAnalyzeErr("");
    try {
      const res  = await serverFetch("/api/product-ad/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: src }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data);
    } catch (e) { setAnalyzeErr(e.message); }
    setAnalyzing(false);
  }

  function handleEditMotion(shotId, newPrompt) {
    setAnalysis(prev => ({
      ...prev,
      shots: prev.shots.map(s => s.id === shotId ? { ...s, video_motion_prompt: newPrompt } : s),
    }));
  }

  /* ── Step 3: generate images ── */
  async function runImages(shotsToRegen = null) {
    const shots = shotsToRegen || analysis.shots;
    setImagesLoading(true);
    setImages(prev => {
      const next = { ...prev };
      shots.forEach(s => { next[s.id] = { loading: true }; });
      return next;
    });
    try {
      const res  = await serverFetch("/api/product-ad/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shots }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");
      setImages(prev => {
        const next = { ...prev };
        data.results.forEach(r => {
          next[r.shotId] = r.ok ? { url: r.imageUrl } : { error: r.error || "Failed" };
        });
        return next;
      });
    } catch (e) {
      shots.forEach(s => setImages(prev => ({ ...prev, [s.id]: { error: e.message } })));
    }
    setImagesLoading(false);
  }

  async function regenImage(shot) {
    setImages(prev => ({ ...prev, [shot.id]: { loading: true } }));
    try {
      const res  = await serverFetch("/api/product-ad/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shots: [shot] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const r = data.results?.[0];
      setImages(prev => ({ ...prev, [shot.id]: r?.ok ? { url: r.imageUrl } : { error: r?.error || "Failed" } }));
    } catch (e) { setImages(prev => ({ ...prev, [shot.id]: { error: e.message } })); }
  }

  /* ── Step 4: generate clips (sequential) ── */
  async function runClips() {
    if (generatingClips.current) return;
    generatingClips.current = true;
    setClipsLoading(true);
    for (const shot of analysis.shots) {
      const imgData = images[shot.id];
      if (!imgData?.url) {
        setClips(prev => ({ ...prev, [shot.id]: { error: "No image available" } }));
        continue;
      }
      setClips(prev => ({ ...prev, [shot.id]: { loading: true } }));
      try {
        const res  = await serverFetch("/api/product-ad/generate-clip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: imgData.url, motionPrompt: shot.video_motion_prompt, durationSeconds: shot.duration_seconds || 3 }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Clip failed");
        setClips(prev => ({ ...prev, [shot.id]: { videoUrl: data.videoUrl } }));
      } catch (e) { setClips(prev => ({ ...prev, [shot.id]: { error: e.message } })); }
    }
    setClipsLoading(false);
    generatingClips.current = false;
  }

  const allImagesReady = analysis?.shots?.every(s => images[s.id]?.url);
  const allClipsDone   = analysis?.shots?.every(s => clips[s.id]?.videoUrl || clips[s.id]?.error);

  /* ══ Render ══════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Syne',sans-serif" }}>
            🛍️ Product Ad Studio
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
            Upload a product photo — AI writes the shot strategy, generates images, and produces video clips.
          </p>
        </div>

        <StepBar step={step} />

        {/* ── STEP 1 — Upload ── */}
        {step === 1 && (
          <div style={{ display: "grid", gridTemplateColumns: previewUrl ? "1fr 1fr" : "1fr", gap: 24 }}>
            <div style={{ ...C.card, padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <label style={C.lbl}>Product Image</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed rgba(124,92,252,0.3)", borderRadius: 10, padding: "28px 20px", textAlign: "center", cursor: "pointer", marginBottom: 12, transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,92,252,0.6)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(124,92,252,0.3)"}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
                  <div style={{ fontSize: 13, color: "#9494a8" }}>Click to upload product photo</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>JPG, PNG, WEBP — any size</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFilePick} />
                <div style={{ textAlign: "center", fontSize: 11, color: "#555", marginBottom: 8 }}>— or paste URL —</div>
                <input
                  type="text" placeholder="https://example.com/product.jpg"
                  value={imageFile ? "" : imageUrl}
                  onChange={handleUrlPaste}
                  style={C.inp}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={C.lbl}>Brand Name (optional)</label>
                <input type="text" placeholder="e.g. Zara, Apple, Nykaa" value={brandName} onChange={e => setBrandName(e.target.value)} style={C.inp} />
              </div>

              {uploadErr && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>✕ {uploadErr}</div>}

              <button onClick={handleUpload} disabled={uploading || (!imageFile && !imageUrl)} style={{ ...C.btnP, width: "100%", opacity: (!imageFile && !imageUrl) ? 0.5 : 1 }}>
                {uploading ? "Uploading…" : "Analyze Product →"}
              </button>
            </div>

            {previewUrl && (
              <div style={{ borderRadius: 12, overflow: "hidden", background: "#0b0b10", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                <img src={previewUrl} alt="Product preview" style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 — Analyze ── */}
        {step === 2 && (
          <div>
            {analyzing && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#9494a8", marginBottom: 6 }}>Analyzing your product…</div>
                <div style={{ fontSize: 12 }}>GPT-4o Vision is reading the image and writing your shot strategy</div>
              </div>
            )}
            {analyzeErr && (
              <div style={{ ...C.card, padding: 20, color: "#f87171", marginBottom: 16 }}>
                ✕ {analyzeErr}
                <button onClick={() => runAnalysis(imageUrl)} style={{ ...C.btnG, marginLeft: 12, padding: "5px 12px", fontSize: 11 }}>Retry</button>
              </div>
            )}
            {analysis && !analyzing && (
              <div>
                {/* Product summary */}
                <div style={{ ...C.card, padding: 18, marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <img src={previewUrl} alt="product" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0", marginBottom: 6 }}>{analysis.product_analysis.product_type}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={C.badge("#7c5cfc")}>{analysis.product_analysis.category}</span>
                        <span style={C.badge("#22d3ee")}>{analysis.product_analysis.recommended_music_mood}</span>
                        <span style={C.badge("#f5c518")}>{analysis.product_analysis.aesthetic_style}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        <span style={{ fontWeight: 600, color: "#888" }}>Audience: </span>{analysis.product_analysis.target_audience}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {analysis.product_analysis.key_features?.map((f, i) => (
                          <span key={i} style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 7px", color: "#9494a8" }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shot cards */}
                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Shot Strategy — {analysis.shots.length} shots
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {analysis.shots.map((shot, i) => (
                    <ShotCard key={shot.id} shot={shot} index={i} onEditMotion={handleEditMotion} />
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setStep(3); runImages(); }} style={C.btnP}>Generate Images →</button>
                  <button onClick={() => setStep(1)} style={C.btnG}>← Back</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 — Images ── */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Generating Shot Images</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>All {analysis.shots.length} shots generated in parallel via Fal.ai</div>
              </div>
              {!imagesLoading && (
                <button onClick={() => runImages()} style={{ ...C.btnG, padding: "7px 14px", fontSize: 11 }}>↺ Regenerate All</button>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {analysis.shots.map(shot => (
                <ImageCard key={shot.id} shot={shot} imageData={images[shot.id]} onRegenerate={() => regenImage(shot)} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(4)}
                disabled={!allImagesReady || imagesLoading}
                style={{ ...C.btnP, opacity: (!allImagesReady || imagesLoading) ? 0.5 : 1 }}
              >
                {imagesLoading ? "Generating…" : "Generate Clips →"}
              </button>
              <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Clips ── */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Generating Video Clips</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                Clips generated one at a time via LTX-Video 13B — takes ~1–2 min per clip
              </div>
            </div>

            {!clipsLoading && !Object.keys(clips).length && (
              <div style={{ ...C.card, padding: 24, textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎬</div>
                <div style={{ fontSize: 14, color: "#9494a8", marginBottom: 16 }}>Ready to generate {analysis.shots.length} video clips</div>
                <button onClick={() => { setStep(4); runClips(); }} style={C.btnP}>Start Generating Clips</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {analysis.shots.map(shot => (
                <ClipCard key={shot.id} shot={shot} clipData={clips[shot.id]} />
              ))}
            </div>

            {allClipsDone && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(5)} style={C.btnP}>View Results →</button>
              </div>
            )}
            {!allClipsDone && Object.keys(clips).length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep(2)} style={C.btnG}>← Back to Analysis</button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5 — Done ── */}
        {step === 5 && (
          <div>
            <div style={{ textAlign: "center", padding: "32px 0 24px", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Syne',sans-serif", marginBottom: 6 }}>Your Ad is Ready!</div>
              <div style={{ fontSize: 13, color: "#666" }}>{analysis.shots.length} video clips generated for {analysis.product_analysis.product_type}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              {analysis.shots.map((shot, i) => {
                const clip = clips[shot.id];
                return (
                  <div key={shot.id} style={{ ...C.card, overflow: "hidden" }}>
                    <div style={{ aspectRatio: "9/16", background: "#0b0b10", position: "relative" }}>
                      {clip?.videoUrl
                        ? <video src={clip.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted loop autoPlay playsInline />
                        : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#444", fontSize: 12 }}>No clip</div>
                      }
                      <div style={{ position: "absolute", top: 6, left: 6, ...C.badge("#111118"), fontSize: 9 }}>Shot {i + 1}</div>
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9494a8", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {shot.shot_type}
                      </div>
                      {clip?.videoUrl && (
                        <a href={clip.videoUrl} target="_blank" rel="noreferrer"
                          style={{ display: "block", textAlign: "center", padding: "6px 0", background: "rgba(124,92,252,0.1)", border: "1px solid rgba(124,92,252,0.3)", borderRadius: 6, fontSize: 11, color: "#a78bfa", textDecoration: "none" }}>
                          ↓ Download
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setStep(1); setAnalysis(null); setImages({}); setClips({}); setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={C.btnG}>
                ← New Product
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
