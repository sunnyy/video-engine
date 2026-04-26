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
import { MUSIC_LIBRARY } from "../core/registries/musicRegistry";
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
  const [analysis,     setAnalysis]     = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeErr,   setAnalyzeErr]   = useState("");
  const [hasMannequin, setHasMannequin] = useState(false);

  // Step 3 state — base image (model wearing product OR enhanced product)
  const [baseImage,   setBaseImage]   = useState(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseErr,     setBaseErr]     = useState("");

  // Step 3 state — scene shots
  const [images,        setImages]        = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);

  // Step 4 state
  const [clips,        setClips]        = useState({});
  const [clipsLoading, setClipsLoading] = useState(false);
  const generatingClips = useRef(false);
  const pickedModelUrl  = useRef(null);
  const projectDbId     = useRef(null);

  // Step 5 state
  const [creatingProject, setCreatingProject] = useState(false);

  const allImagesReady = analysis?.shots?.every(s => images[s.id]?.url);

  /* ── Auto-start clips when entering step 4 ── */
  useEffect(() => {
    if (step === 4 && !generatingClips.current) {
      runClips();
    }
  }, [step]);

  /* ── Auto-advance to step 5 when all clips done and at least one succeeded ── */
  const allClipsProcessed = analysis?.shots?.every(s => clips[s.id]?.videoUrl || clips[s.id]?.error);
  const anyClipSucceeded  = analysis?.shots?.some(s => clips[s.id]?.videoUrl);
  useEffect(() => {
    if (allClipsProcessed && anyClipSucceeded && !clipsLoading) {
      setStep(5);
    }
  }, [allClipsProcessed, anyClipSucceeded, clipsLoading]);

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
  async function fetchAndPickModel(category) {
    console.log("[fetchAndPickModel] category:", category);
    if (category !== "clothing" && category !== "wearable") {
      console.log("[fetchAndPickModel] skipping — not clothing/wearable");
      return null;
    }
    try {
      const res  = await serverFetch("/api/product-ad/models?gender=female");
      const data = await res.json();
      console.log("[fetchAndPickModel] ── called with category:", category);
      console.log("[fetchAndPickModel] API response ok:", res.ok, "models count:", data.models?.length);
      if (!res.ok || !data.models?.length) {
        console.warn("[fetchAndPickModel] no models available");
        return null;
      }
      const picked = data.models[Math.floor(Math.random() * data.models.length)];
      console.log("[fetchAndPickModel] full picked object:", JSON.stringify(picked));
      console.log("[fetchAndPickModel] picked model id:", picked?.id, "url:", (picked?.url || picked?.image_url)?.slice(0, 80));
      console.log("[fetchAndPickModel] returning url:", (picked?.url || picked?.image_url)?.slice(0, 80) || "NULL");
      return picked.url || picked.image_url;
    } catch (e) {
      console.error("[fetchAndPickModel] error:", e.message);
      return null;
    }
  }

  async function runAnalysis(url) {
    const src = url || imageUrl;
    setAnalyzing(true); setAnalyzeErr("");
    try {
      const res  = await serverFetch("/api/product-ad/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: src }) });
      const data = await res.json();
      if (res.status === 422) {
        setAnalyzeErr(data.error || "Image not suitable for ad generation.");
        setAnalyzing(false);
        setStep(1);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      console.log("[runAnalysis] product category detected:", data.product_analysis?.category);
      console.log("[runAnalysis] hasMannequin:", data.validation?.has_mannequin);
      setHasMannequin(data.validation?.has_mannequin || false);
      setAnalysis(data);
      const modelUrl = await fetchAndPickModel(data.product_analysis?.category);
      pickedModelUrl.current = modelUrl || null;
      console.log("[runAnalysis] modelUrl from fetchAndPickModel:", modelUrl?.slice(0, 80) || "NULL");
      console.log("[runAnalysis] pickedModelUrl.current set to:", pickedModelUrl.current?.slice(0, 80) || "NULL");
    } catch (e) { setAnalyzeErr(e.message); }
    setAnalyzing(false);
  }

  /* ── Step 3a: generate base reference image ── */
  async function runBaseImage(category, modelUrl, mannequin) {
    setBaseLoading(true); setBaseErr("");
    console.log("[runBaseImage] ── called ──");
    console.log("[runBaseImage] productImageUrl (imageUrl state):", imageUrl?.slice(0, 80));
    console.log("[runBaseImage] modelUrl param:", modelUrl?.slice(0, 80) || "NULL");
    console.log("[runBaseImage] category:", category);
    console.log("[runBaseImage] hasMannequin:", mannequin);
    console.log("[runBaseImage] sending to server body:", JSON.stringify({ productImageUrl: imageUrl, modelImageUrl: modelUrl, category, hasMannequin: mannequin }).slice(0, 300));
    try {
      const res  = await serverFetch("/api/product-ad/generate-base-image", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productImageUrl: imageUrl, modelImageUrl: modelUrl, category, hasMannequin: mannequin }),
      });
      const data = await res.json();
      console.log("[runBaseImage] server response ok:", res.ok, "status:", res.status);
      console.log("[runBaseImage] returned imageUrl:", data.imageUrl?.slice(0, 80) || "NULL — check server logs");
      if (!res.ok) throw new Error(data.error || "Base image failed");
      const permanentUrl = await uploadImageToSupabase(data.imageUrl);
      console.log("[runBaseImage] permanentUrl after Supabase proxy:", permanentUrl?.slice(0, 80));
      setBaseImage(permanentUrl);
      return permanentUrl;
    } catch (e) {
      setBaseErr(e.message);
      return null;
    } finally {
      setBaseLoading(false);
    }
  }

  /* Called by "Create Ad →" button — generates base image then all scenes */
  async function handleStartVisuals() {
    setStep(3);
    setImages({});
    const category = analysis.product_analysis?.category;
    console.log("[handleStartVisuals] category:", category);
    console.log("[handleStartVisuals] pickedModelUrl.current:", pickedModelUrl.current?.slice(0, 80) || "NULL");
    console.log("[handleStartVisuals] hasMannequin:", hasMannequin);
    await runBaseImage(category, pickedModelUrl.current, hasMannequin);
    // User reviews base image before proceeding to scene generation
  }

  /* ── Step 3b: generate scene images using base reference ── */
  async function runImages(shotsToRegen = null, refUrl = null) {
    const shots      = shotsToRegen || analysis.shots;
    const referenceImageUrl = refUrl || baseImage;
    console.log("[runImages] ── called ──");
    console.log("[runImages] referenceImageUrl:", referenceImageUrl?.slice(0, 80) || "NULL");
    console.log("[runImages] shots count:", shots?.length);
    if (!referenceImageUrl) return;
    setImagesLoading(true);
    setImages(prev => {
      const next = { ...prev };
      shots.forEach(s => { next[s.id] = { loading: true }; });
      return next;
    });
    try {
      const res  = await serverFetch("/api/product-ad/generate-images", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shots, referenceImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");
      const next = {};
      await Promise.all(data.results.map(async r => {
        if (r.ok) {
          const permanentUrl = await uploadImageToSupabase(r.imageUrl);
          next[r.shotId] = { url: permanentUrl };
        } else {
          next[r.shotId] = { error: r.error || "Failed" };
        }
      }));
      setImages(prev => ({ ...prev, ...next }));
    } catch (e) {
      shots.forEach(s => setImages(prev => ({ ...prev, [s.id]: { error: e.message } })));
    }
    setImagesLoading(false);
  }

  async function regenImage(shot) {
    setImages(prev => ({ ...prev, [shot.id]: { loading: true } }));
    try {
      const res  = await serverFetch("/api/product-ad/generate-images", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shots: [shot], referenceImageUrl: baseImage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const r = data.results?.[0];
      if (r?.ok) {
        const permanentUrl = await uploadImageToSupabase(r.imageUrl);
        setImages(prev => ({ ...prev, [shot.id]: { url: permanentUrl } }));
      } else {
        setImages(prev => ({ ...prev, [shot.id]: { error: r?.error || "Failed" } }));
      }
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
        const permanentUrl = await uploadClipToSupabase(data.videoUrl);
        setClips(prev => ({ ...prev, [shot.id]: { videoUrl: permanentUrl } }));
      } catch (e) { setClips(prev => ({ ...prev, [shot.id]: { error: e.message } })); }
    }
    setClipsLoading(false);
    generatingClips.current = false;
  }

  /* ── Upload helpers — proxy Fal.ai URLs to permanent Supabase storage ── */
  async function uploadImageToSupabase(falUrl) {
    try {
      const res = await serverFetch("/api/proxy-image-upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: falUrl, projectId: projectDbId.current }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[uploadImage] status:", res.status, errText.slice(0, 200));
        return falUrl;
      }
      const data = await res.json();
      return data.url || falUrl;
    } catch (e) {
      console.error("[uploadImage] exception:", e.message);
      return falUrl;
    }
  }

  async function uploadClipToSupabase(falUrl) {
    try {
      const res  = await serverFetch("/api/proxy-video-upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: falUrl, projectId: projectDbId.current }),
      });
      const data = await res.json();
      console.log("[uploadClip] status:", res.status, JSON.stringify(data).slice(0, 100));
      if (!res.ok) return falUrl;
      return data.url || falUrl;
    } catch (e) {
      console.error("[uploadClip] error:", e.message);
      return falUrl;
    }
  }

  /* ── Step 5: build project + open editor ── */
  async function createProject() {
    if (creatingProject) return;
    setCreatingProject(true);

    const successfulShots = analysis.shots.filter(s => clips[s.id]?.videoUrl);
    if (!successfulShots.length) { setCreatingProject(false); return; }

    const TRANSITIONS = [
      { type: "dissolve",  duration: 16 },
      { type: "fade",      duration: 14 },
      { type: "slideLeft", duration: 18 },
      { type: "wipe",      duration: 16 },
      { type: "zoom",      duration: 14 },
    ];

    let currentTime = 0;
    const beats = [];
    successfulShots.forEach((shot, index) => {
      const clipUrl  = clips[shot.id].videoUrl;
      const duration = shot.duration_seconds || 3;
      const start    = currentTime;
      currentTime   += duration;
      beats.push({
        id:               crypto.randomUUID(),
        order:            index,
        layout:           null,
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
          ? TRANSITIONS[index % TRANSITIONS.length]
          : { type: "fade", duration: 14 },
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
    const musicKey = MOOD_TO_MUSIC[analysis.product_analysis.recommended_music_mood] || "eliveta_2";
    const musicSrc = MUSIC_LIBRARY[musicKey]?.file || MUSIC_LIBRARY["eliveta_2"].file;

    const project = {
      id:           crypto.randomUUID(),
      meta:         { width: 1080, height: 1920, fps: 25, orientation: "9:16", mode: "faceless" },
      beats,
      duration_sec: currentTime,
      audio:        { music: { src: musicSrc, volume: 0.4 } },
      avatar:       null,
      dna:          null,
    };

    try {
      const saved = await createDBProject({
        name:        `${analysis.product_analysis.product_type} Ad`,
        rawAI:       {},
        safeProject: project,
      });
      if (!saved?.id) {
        console.error("[ProductAd] DB save failed — no project ID");
        setCreatingProject(false);
        return;
      }
      projectDbId.current = saved.id;
      setDbId(saved.id);
      await updateProject(saved.id, project);
      setProject(project);
      navigate(`/editor/${saved.id}`);
    } catch (e) {
      console.error("[ProductAd] DB save error:", e);
      setCreatingProject(false);
    }
  }

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
                <button onClick={handleStartVisuals} style={C.btnP}>Create Ad →</button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 — Visuals ── */}
        {step === 3 && (
          <div>
            {/* Phase A: generating base reference image */}
            {baseLoading && (
              <div style={{ textAlign: "center", padding: "50px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎨</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#9494a8", marginBottom: 6 }}>
                  {analysis.product_analysis?.category === "clothing" || analysis.product_analysis?.category === "wearable"
                    ? "Fitting model with your product…"
                    : "Enhancing your product image…"}
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>This takes about 15 seconds</div>
              </div>
            )}

            {/* Base image error */}
            {baseErr && !baseLoading && (
              <div style={{ ...C.card, padding: 20, borderColor: "rgba(248,113,113,0.3)", textAlign: "center", marginBottom: 16 }}>
                <div style={{ color: "#f87171", marginBottom: 12 }}>✕ {baseErr}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => handleStartVisuals()} style={C.btnP}>↺ Retry</button>
                  <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
                </div>
              </div>
            )}

            {/* Phase A result: base image ready — user confirms before scenes start */}
            {baseImage && !baseLoading && !baseErr && !imagesLoading && Object.keys(images).length === 0 && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Base Image Ready</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {analysis.product_analysis?.category === "clothing" || analysis.product_analysis?.category === "wearable"
                      ? "Review the model wearing your product. If it looks good, generate scenes."
                      : "Review the enhanced product image. If it looks good, generate scenes."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
                  <div style={{ width: 180, flexShrink: 0 }}>
                    <img src={baseImage} alt="Base reference" style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", display: "block" }} />
                    <div style={{ fontSize: 10, color: "#555", marginTop: 6, textAlign: "center" }}>Reference image</div>
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ fontSize: 13, color: "#9494a8", marginBottom: 16, lineHeight: 1.5 }}>
                      This image will be used as the identity reference for all 5 scenes.<br />
                      If the outfit or model doesn't look right, retry before proceeding.
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => runImages(null, baseImage)} style={C.btnP}>Generate Scenes →</button>
                      <button onClick={() => handleStartVisuals()} style={C.btnG}>↺ Retry</button>
                      <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phase B: scene shots */}
            {!baseLoading && !baseErr && (imagesLoading || Object.keys(images).length > 0) && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>
                    {allImagesReady ? "Your Scenes Are Ready" : "Creating Your Scenes"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {allImagesReady ? "Review and regenerate any scene, then proceed to video generation." : "Generating high-quality product imagery…"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
                  {analysis.shots.map((shot, i) => (
                    <ImageCard key={shot.id} index={i} imageData={images[shot.id]} onRegenerate={() => regenImage(shot)} />
                  ))}
                </div>

                {allImagesReady && !imagesLoading && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setStep(4)} style={C.btnP}>Generate Videos →</button>
                    <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
                  </div>
                )}
                {!imagesLoading && !allImagesReady && (
                  <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STEP 4 — Production ── */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0" }}>Producing Your Video</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  Bringing your scenes to life… this takes a few minutes
                </div>
              </div>
              {/* Live progress counter */}
              <div style={{ fontSize: 12, color: "#9494a8", textAlign: "right", flexShrink: 0 }}>
                {(() => {
                  const done   = analysis.shots.filter(s => clips[s.id]?.videoUrl).length;
                  const failed = analysis.shots.filter(s => clips[s.id]?.error).length;
                  const total  = analysis.shots.length;
                  return (
                    <>
                      <span style={{ color: "#22c55e", fontWeight: 700 }}>{done}</span>
                      {failed > 0 && <span style={{ color: "#f87171", fontWeight: 700 }}> · {failed} failed</span>}
                      <span style={{ color: "#444" }}> / {total} clips</span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {analysis.shots.map((shot, i) => (
                <ClipCard key={shot.id} index={i} clipData={clips[shot.id]} />
              ))}
            </div>

            {/* All clips failed — show error + retry */}
            {allClipsProcessed && !anyClipSucceeded && (
              <div style={{ ...C.card, padding: 20, borderColor: "rgba(248,113,113,0.3)", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>All clips failed to generate</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
                  The video model returned errors for every scene. This is usually a temporary issue.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => { generatingClips.current = false; setClips({}); runClips(); }} style={C.btnP}>
                    ↺ Retry All Clips
                  </button>
                  <button onClick={() => setStep(3)} style={C.btnG}>← Back to Images</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5 — Edit ── */}
        {step === 5 && (() => {
          const succeeded = analysis.shots.filter(s => clips[s.id]?.videoUrl).length;
          const failed    = analysis.shots.filter(s => clips[s.id]?.error).length;
          const total     = analysis.shots.length;
          return (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>
                {failed === 0 ? "Your Ad is Ready" : `${succeeded} of ${total} Scenes Ready`}
              </div>
              <div style={{ fontSize: 14, color: "#666", maxWidth: 400, margin: "0 auto 16px" }}>
                {succeeded} scene{succeeded !== 1 ? "s" : ""} produced for {analysis.product_analysis.product_type}.
              </div>

              {/* Partial failure warning */}
              {failed > 0 && (
                <div style={{ display: "inline-block", marginBottom: 20, padding: "8px 18px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", fontSize: 12, color: "#f87171" }}>
                  ⚠ {failed} clip{failed !== 1 ? "s" : ""} failed — only successful scenes will be added to the editor
                </div>
              )}

              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
                <button onClick={createProject} disabled={creatingProject} style={{ ...C.btnP, fontSize: 14, padding: "12px 28px", opacity: creatingProject ? 0.6 : 1 }}>
                  {creatingProject ? "Opening…" : "Open in Editor →"}
                </button>
                <button onClick={() => { setStep(1); setAnalysis(null); setBaseImage(null); setBaseErr(""); setImages({}); setClips({}); setPreviewUrl(""); setImageUrl(""); setImageFile(null); setHasMannequin(false); generatingClips.current = false; pickedModelUrl.current = null; projectDbId.current = null; }} style={C.btnG}>
                  ← New Product
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </AppLayout>
  );
}
