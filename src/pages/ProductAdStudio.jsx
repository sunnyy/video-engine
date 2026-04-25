/**
 * ProductAdStudio.jsx — AI Product Video Ad Generator
 * /product-ad-studio
 *
 * Step 1 — Upload product photo
 * Step 2 — Strategy (GPT-4o Vision)
 * Step 3 — Visuals (Fal.ai Kontext images)
 * Step 4 — Production (Fal.ai LTX clips)
 * Step 5 — Edit (create project + open editor)
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { createProject as createDBProject, updateProject } from "../services/projects/projectService";
import { useProjectStore } from "../store/useProjectStore";
import AppLayout from "../ui/AppLayout";

const STEP_LABELS = ["Product", "Strategy", "Visuals", "Production", "Edit"];

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

/* ── ImageCard (Step 3) ── */
function ImageCard({ index, imageData, onRegenerate }) {
  const THUMB_W = 160, THUMB_H = Math.round(160 * 16 / 9);
  return (
    <div style={{ ...C.card, width: THUMB_W + 16, flexShrink: 0 }}>
      <div style={{ width: THUMB_W, height: THUMB_H, margin: 8, borderRadius: 6, overflow: "hidden", background: "#0b0b10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {imageData?.loading && <div style={{ textAlign: "center", color: "#444", fontSize: 10 }}>⏳ generating…</div>}
        {imageData?.error   && <div style={{ textAlign: "center", color: "#f87171", fontSize: 9, padding: 4 }}>✕ {imageData.error.slice(0, 50)}</div>}
        {imageData?.url     && <img src={imageData.url} alt={`Scene ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div style={{ padding: "0 8px 8px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9494a8", marginBottom: 4 }}>Scene {index + 1}</div>
        <button onClick={onRegenerate} disabled={imageData?.loading} style={{ ...C.btnG, padding: "4px 10px", fontSize: 10, width: "100%", opacity: imageData?.loading ? 0.4 : 1 }}>↺ Regen</button>
      </div>
    </div>
  );
}

/* ── ClipCard (Step 4) ── */
function ClipCard({ index, clipData }) {
  return (
    <div style={{ ...C.card, padding: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 52, height: 92, borderRadius: 6, overflow: "hidden", background: "#0b0b10", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 6 }}>Scene {index + 1}</div>
          {clipData?.loading  && <div style={{ ...C.badge("#f5c518"), display: "inline-block" }}>⏳ Generating…</div>}
          {clipData?.error    && <div style={{ ...C.badge("#f87171"), display: "inline-block" }}>✕ {clipData.error.slice(0, 60)}</div>}
          {clipData?.videoUrl && <div style={{ ...C.badge("#22c55e"), display: "inline-block" }}>✓ Done</div>}
          {!clipData          && <div style={{ fontSize: 11, color: "#444" }}>Queued…</div>}
        </div>
      </div>
    </div>
  );
}

/* ══ Main Component ══════════════════════════════════════════════ */
export default function ProductAdStudio() {
  const navigate   = useNavigate();
  const setProject = useProjectStore(s => s.setProject);
  const setDbId    = useProjectStore(s => s.setDatabaseId);

  const [step, setStep] = useState(1);

  // Step 1 state
  const [imageUrl,   setImageUrl]   = useState("");
  const [imageFile,  setImageFile]  = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [brandName,  setBrandName]  = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState("");
  const fileInputRef = useRef();

  // Step 2 state
  const [analysis,   setAnalysis]   = useState(null);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState("");

  // Step 3 state
  const [images,        setImages]        = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);

  // Step 4 state
  const [clips,        setClips]        = useState({});
  const [clipsLoading, setClipsLoading] = useState(false);
  const generatingClips = useRef(false);

  // Step 5 state
  const [creatingProject, setCreatingProject] = useState(false);

  /* ── Auto-start clips when entering step 4 ── */
  useEffect(() => {
    if (step === 4 && !generatingClips.current) {
      runClips();
    }
  }, [step]);

  /* ── Auto-advance to step 5 when all clips done ── */
  const allClipsDone = analysis?.shots?.every(s => clips[s.id]?.videoUrl || clips[s.id]?.error);
  useEffect(() => {
    if (allClipsDone && clipsLoading === false && Object.keys(clips).length > 0) {
      setStep(5);
    }
  }, [allClipsDone, clipsLoading]);

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
      const res  = await serverFetch("/api/product-ad/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shots, productImageUrl: imageUrl }) });
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
      const res  = await serverFetch("/api/product-ad/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shots: [shot], productImageUrl: imageUrl }) });
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

  /* ── Proxy a Fal.ai clip URL to permanent Supabase storage ── */
  async function uploadClipToSupabase(falUrl, index) {
    try {
      const res = await serverFetch("/api/proxy-image", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: falUrl }),
      });
      if (!res.ok) return falUrl;
      const blob = await res.blob();
      const file = new File([blob], `product-clip-${Date.now()}-${index}.mp4`, { type: "video/mp4" });
      const { supabase } = await import("../lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      const storageKey = `product-ads/${user.id}/${file.name}`;
      const { error } = await supabase.storage.from("user-assets").upload(storageKey, file, { contentType: "video/mp4", upsert: false });
      if (error) return falUrl;
      const { data: { publicUrl } } = supabase.storage.from("user-assets").getPublicUrl(storageKey);
      return publicUrl;
    } catch {
      return falUrl;
    }
  }

  /* ── Step 5: build project + open editor ── */
  async function createProject() {
    if (creatingProject) return;
    setCreatingProject(true);

    const successfulShots = analysis.shots.filter(s => clips[s.id]?.videoUrl);
    if (!successfulShots.length) { setCreatingProject(false); return; }

    // Upload clips to permanent Supabase storage (avoids Fal.ai QUIC/expiry issues)
    const uploadedClipUrls = {};
    await Promise.all(
      successfulShots.map(async (shot, index) => {
        uploadedClipUrls[shot.id] = await uploadClipToSupabase(clips[shot.id].videoUrl, index);
      })
    );

    let currentTime = 0;
    const beats = [];
    successfulShots.forEach((shot, index) => {
      const clipUrl  = uploadedClipUrls[shot.id];
      const duration = shot.duration_seconds || 3;
      const start    = currentTime;
      currentTime   += duration;
      beats.push({
        id:               crypto.randomUUID(),
        order:            index,
        layout:           "blank",
        layoutBackground: { type: "color", value: "#000000" },
        zones: {
          z1: {
            type:       "asset",
            content:    { kind: "asset", asset: { src: clipUrl, type: "video", objectFit: "cover", motion: "none", enterTransition: "none", exitTransition: "none" } },
            style:      {},
            background: {},
          },
        },
        overlays:    [],
        audio_cues:  [],
        caption:     { show: false, text: "", style: "wordBlaze", position: 80 },
        transition:  index < successfulShots.length - 1
          ? { type: "dissolve", duration: 16 }
          : { type: "fade",     duration: 14 },
        spoken:      "",
        intent:      "hook",
        energy:      0.8,
        beatType:    null,
        duration_sec: duration,
        start_sec:   start,
        end_sec:     currentTime,
      });
    });

    const MOOD_TO_MUSIC = {
      energetic: "eliveta_1", luxury: "nastelbom", playful: "eliveta_2",
      calm: "the_mountain",   dramatic: "mood_mode",
    };
    const musicKey = MOOD_TO_MUSIC[analysis.product_analysis.recommended_music_mood] || "eliveta_1";

    const project = {
      id:           crypto.randomUUID(),
      meta:         { width: 1080, height: 1920, fps: 25, orientation: "9:16", mode: "faceless" },
      beats,
      duration_sec: currentTime,
      audio:        { music: { key: musicKey, volume: 0.4 } },
      avatar:       null,
      dna:          null,
    };

    try {
      const saved = await createDBProject({
        name:        `${analysis.product_analysis.product_type} Ad`,
        rawAI:       {},
        safeProject: project,
      });
      if (saved?.id) {
        setDbId(saved.id);
        await updateProject(saved.id, project);
      }
    } catch (e) {
      console.error("[ProductAd] DB save error:", e);
    }

    setProject(project);
    navigate("/editor");
  }

  const allImagesReady = analysis?.shots?.every(s => images[s.id]?.url);

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
            Upload a product photo — AI creates your video ad and opens it in the editor.
          </p>
        </div>

        <StepBar step={step} />

        {/* ── STEP 1 — Product ── */}
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
                {uploading ? "Uploading…" : "Create Ad →"}
              </button>
            </div>

            {previewUrl && (
              <div style={{ borderRadius: 12, overflow: "hidden", background: "#0b0b10", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                <img src={previewUrl} alt="Product preview" style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2 — Strategy ── */}
        {step === 2 && (
          <div>
            {analyzing && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#9494a8", marginBottom: 6 }}>Crafting your video strategy…</div>
                <div style={{ fontSize: 12 }}>This usually takes 10–15 seconds</div>
              </div>
            )}
            {analyzeErr && (
              <div style={{ ...C.card, padding: 20, color: "#f87171", marginBottom: 16 }}>
                ✕ {analyzeErr}
                <button onClick={() => runAnalysis(imageUrl)} style={{ ...C.btnG, marginLeft: 12, padding: "5px 12px", fontSize: 11 }}>Retry</button>
              </div>
            )}
            {analysis && !analyzing && (
              <div style={{ ...C.card, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 6 }}>
                  Strategy Ready
                </div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
                  {analysis.shots.length} scenes planned for your {analysis.product_analysis.product_type}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
                  {analysis.product_analysis.key_features?.slice(0, 4).map((f, i) => (
                    <span key={i} style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 9px", color: "#9494a8" }}>{f}</span>
                  ))}
                </div>
                <button onClick={() => { setStep(3); runImages(); }} style={C.btnP}>Create Ad →</button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 — Visuals ── */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Creating Your Scenes</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Generating high-quality product imagery…</div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {analysis.shots.map((shot, i) => (
                <ImageCard key={shot.id} index={i} imageData={images[shot.id]} onRegenerate={() => regenImage(shot)} />
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(4)}
                disabled={!allImagesReady || imagesLoading}
                style={{ ...C.btnP, opacity: (!allImagesReady || imagesLoading) ? 0.5 : 1 }}
              >
                {imagesLoading ? "Generating…" : "Produce Clips →"}
              </button>
              <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Production ── */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Producing Your Video</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                Bringing your scenes to life… this takes a few minutes
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {analysis.shots.map((shot, i) => (
                <ClipCard key={shot.id} index={i} clipData={clips[shot.id]} />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5 — Edit ── */}
        {step === 5 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>
              Your Ad is Ready
            </div>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
              {analysis.shots.filter(s => clips[s.id]?.videoUrl).length} scenes produced for {analysis.product_analysis.product_type}. Open in editor to add text, adjust transitions, and export.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={createProject} disabled={creatingProject} style={{ ...C.btnP, fontSize: 14, padding: "12px 28px", opacity: creatingProject ? 0.6 : 1 }}>
                {creatingProject ? "Opening…" : "Open in Editor →"}
              </button>
              <button onClick={() => { setStep(1); setAnalysis(null); setImages({}); setClips({}); setPreviewUrl(""); setImageUrl(""); setImageFile(null); generatingClips.current = false; }} style={C.btnG}>
                ← New Product
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
