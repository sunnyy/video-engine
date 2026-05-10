/**
 * ProductAdStudio.jsx — AI Product Video Ad Generator
 * Left panel (controls) + right panel (output)
 * Fancy animated timeline replaces step pills
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { createProject as createDBProject, updateProject, updateProjectProgress, getProductAdProjects, deleteProject } from "../services/projects/projectService";
import { useProjectStore } from "../store/useProjectStore";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import { loadMusicLibrary, pickMusicByMood } from "../core/registries/musicRegistry";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";

const DRAFT_KEY = "vidquence_product_ad_draft";

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

const LOADING_MESSAGES = [
  "Crafting your ad concept…",
  "Rendering visuals…",
  "Building your scenes…",
  "Putting it all together…",
  "Almost there…",
];

/* ── Design tokens ── */
const T = {
  bg:      "#0a0a10",
  surface: "#111118",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#7c5cfc",
  yellow:  "#f5c518",
  text:    "#e8e8f0",
  muted:   "#9494a8",
  dim:     "#444",
  success: "#22c55e",
  danger:  "#f87171",
};

const S = {
  panel:      { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" },
  inp:        { padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
  btnPrimary: { padding: "11px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 },
  btnYellow:  { padding: "11px 22px", background: T.yellow, color: "#0a0a10", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" },
  btnGhost:   { padding: "10px 16px", background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" },
};


/* ── Shell ── */
function Shell({ left, right }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ ...S.panel, position: "sticky", top: 20 }}>{left}</div>
      <div style={{ ...S.panel, minHeight: 480 }}>{right}</div>
    </div>
  );
}

/* ── Section ── */
function Section({ title, children, style = {} }) {
  return (
    <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, ...style }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>{title}</div>}
      {children}
    </div>
  );
}

/* ── Spinner ── */
function Spinner({ size = 18, color = T.accent }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: color, animation: "spin 0.8s linear infinite", flexShrink: 0 }} />;
}

/* ── RightEmpty ── */
function RightEmpty({ icon, title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 480, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginBottom: 8 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: T.dim, maxWidth: 260, lineHeight: 1.6 }}>{subtitle}</div>}
    </div>
  );
}

/* ── SceneCard ── */
function SceneCard({ index, data, onRegen }) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", background: "rgba(0,0,0,0.3)", border: `1px solid ${T.border}` }}>
      <div style={{ aspectRatio: "9/16", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
        {data?.loading && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><Spinner size={24} /><div style={{ fontSize: 10, color: T.dim }}>generating…</div></div>}
        {data?.error   && <div style={{ fontSize: 9, color: T.danger, padding: 8, textAlign: "center" }}>✕ {data.error.slice(0, 60)}</div>}
        {data?.url     && <img src={data.url} alt={`Scene ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {!data         && <div style={{ fontSize: 10, color: T.dim }}>—</div>}
      </div>
      <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>Scene {index + 1}</span>
        <button onClick={onRegen} disabled={data?.loading} style={{ ...S.btnGhost, padding: "3px 10px", fontSize: 10, opacity: data?.loading ? 0.4 : 1 }}>↺</button>
      </div>
    </div>
  );
}

/* ── ClipRow ── */
function ClipRow({ index, data }) {
  const col  = data?.videoUrl ? T.success : data?.error ? T.danger : data?.loading ? T.yellow : T.dim;
  const text = data?.videoUrl ? "Done" : data?.error ? "Failed" : data?.loading ? "Generating…" : "Queued";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
      <div style={{ width: 44, height: 78, borderRadius: 6, overflow: "hidden", background: "rgba(0,0,0,0.4)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {data?.videoUrl ? <video src={data.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted loop autoPlay playsInline /> : data?.loading ? <Spinner size={16} color={T.yellow} /> : <div style={{ fontSize: 10, color: T.dim }}>—</div>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Scene {index + 1}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
          <span style={{ fontSize: 11, color: col }}>{text}</span>
        </div>
      </div>
    </div>
  );
}

/* ══ Main generator — used both as a standalone page and as a tab ══ */
export function AdGenerator({ resumeId: propResumeId = null }) {
  const navigate       = useNavigate();
  const setProject     = useProjectStore(s => s.setProject);
  const setDbId      = useProjectStore(s => s.setDatabaseId);
  const fetchCredits = useCreditsStore(s => s.fetchCredits);

  const [step, setStep] = useState(1);
  const [imageUrl,      setImageUrl]      = useState("");
  const [imageFile,     setImageFile]     = useState(null);
  const [previewUrl,    setPreviewUrl]    = useState("");
  const [brandName,     setBrandName]     = useState("");
  const [targetMarket,  setTargetMarket]  = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState("");
  const fileInputRef = useRef();

  const [analysis,     setAnalysis]     = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeErr,   setAnalyzeErr]   = useState("");
  const [hasMannequin, setHasMannequin] = useState(false);

  const [baseImage,   setBaseImage]   = useState(null);
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseErr,     setBaseErr]     = useState("");

  const [images,        setImages]        = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);

  const [clips,        setClips]        = useState({});
  const [clipsLoading, setClipsLoading] = useState(false);
  const generatingClips = useRef(false);
  const pickedModelUrl  = useRef(null);
  const projectDbId     = useRef(null);

  const [creatingProject, setCreatingProject] = useState(false);
  const [savedDraft,      setSavedDraft]      = useState(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [creditModal,     setCreditModal]     = useState(null);
  const [msgIdx,          setMsgIdx]          = useState(0);

  const allImagesReady    = analysis?.shots?.every(s => images[s.id]?.url);
  const allClipsProcessed = analysis?.shots?.every(s => clips[s.id]?.videoUrl || clips[s.id]?.error);
  const anyClipSucceeded  = analysis?.shots?.some(s => clips[s.id]?.videoUrl);

  useEffect(() => {
    localStorage.removeItem(DRAFT_KEY);
    getProductAdProjects().then(projects => {
      const incomplete = propResumeId
        ? projects.find(p => p.id === propResumeId)
        : projects.find(p => (p.steps_completed ?? 0) > 1 && (p.steps_completed ?? 0) < 5 && p.raw_ai_json?.analysis);
      if (incomplete) setSavedDraft(incomplete);
    }).catch(() => {});
  }, [propResumeId]);

  // Rotate loading messages while working
  useEffect(() => {
    if (step < 2 || step > 4) return;
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length), 3000);
    return () => clearInterval(iv);
  }, [step]);

  // Auto-chain: analysis done → start visuals
  useEffect(() => {
    if (analysis && !analyzing && step === 2) handleStartVisuals();
  }, [analysis, analyzing]);

  // Auto-chain: base image ready → generate scenes
  useEffect(() => {
    if (baseImage && !baseLoading && !baseErr && step === 3 && !imagesLoading) {
      const missing = analysis?.shots?.filter(s => !images[s.id]?.url) ?? [];
      if (missing.length > 0) runImages(missing, baseImage);
    }
  }, [baseImage, baseLoading, baseErr]);

  // Auto-chain: all images ready → produce video
  useEffect(() => {
    if (allImagesReady && !imagesLoading && step === 3) setStep(4);
  }, [allImagesReady, imagesLoading]);

  useEffect(() => { if (step === 4 && !generatingClips.current) runClips(); }, [step]);
  useEffect(() => { if (allClipsProcessed && anyClipSucceeded && !clipsLoading) setStep(5); }, [allClipsProcessed, anyClipSucceeded, clipsLoading]);

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); setImageUrl(""); setUploadErr("");
  }

  function handleUrlPaste(e) { setImageUrl(e.target.value); setPreviewUrl(e.target.value); setImageFile(null); setUploadErr(""); }

  async function handleUploadClick() {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.product_ad_full;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleUpload() {
    setUploadErr("");
    if (!imageFile && !imageUrl) { setUploadErr("Please select an image or paste a URL."); return; }
    let finalUrl = imageUrl;
    if (imageFile) {
      setUploading(true);
      try {
        const form = new FormData(); form.append("image", imageFile);
        const res = await serverFetch("/api/product-ad/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        finalUrl = data.url; setImageUrl(data.url); setPreviewUrl(data.url);
      } catch (e) { setUploadErr(e.message); setUploading(false); return; }
      setUploading(false);
    }
    setStep(2); runAnalysis(finalUrl);
  }

  async function fetchAndPickModel(category) {
    if (category !== "clothing" && category !== "wearable") return null;
    try {
      const res = await serverFetch("/api/product-ad/models?gender=female");
      const data = await res.json();
      if (!res.ok || !data.models?.length) return null;
      const picked = data.models[Math.floor(Math.random() * data.models.length)];
      return picked.url || picked.image_url;
    } catch { return null; }
  }

  async function runAnalysis(url) {
    const src = url || imageUrl; setAnalyzing(true); setAnalyzeErr("");
    try {
      const res = await serverFetch("/api/product-ad/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: src, targetMarket }) });
      const data = await res.json();
      if (res.status === 403) { setUpgradeRequired(true); setAnalyzing(false); return; }
      if (res.status === 422) { setAnalyzeErr(data.error || "Image not suitable."); setAnalyzing(false); setStep(1); return; }
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      fetchCredits(); setHasMannequin(data.validation?.has_mannequin || false); setAnalysis(data);
      const modelUrl = await fetchAndPickModel(data.product_analysis?.category);
      pickedModelUrl.current = modelUrl || null;
      // Create project record in DB at step 2 so progress is trackable
      try {
        const saved = await createDBProject({
          name: `${(data.product_analysis?.product_type || "Product").replace(/^\w/, c => c.toUpperCase())} Ad`,
          rawAI: { analysis: data, product_image_url: src, has_mannequin: data.validation?.has_mannequin || false, category: data.product_analysis?.category || null, target_market: targetMarket },
          safeProject: null,
          source: "product_ad",
          stepsCompleted: 2,
        });
        if (saved?.id) projectDbId.current = saved.id;
      } catch (e) { console.warn("[ProductAd] early project create failed:", e.message); }
    } catch (e) { setAnalyzeErr(e.message); }
    setAnalyzing(false);
  }

  async function runBaseImage(category, modelUrl, mannequin) {
    setBaseLoading(true); setBaseErr("");
    try {
      const res = await serverFetch("/api/product-ad/generate-base-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productImageUrl: imageUrl, modelImageUrl: modelUrl, category, hasMannequin: mannequin, hasWatermark: analysis?.validation?.has_watermark || false }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Base image failed");
      fetchCredits();
      const u = await uploadImageToSupabase(data.imageUrl);
      setBaseImage(u);
      if (projectDbId.current) {
        updateProjectProgress(projectDbId.current, 3, { analysis, product_image_url: imageUrl, has_mannequin: mannequin, category, base_image_url: u, target_market: targetMarket }).catch(() => {});
      }
      return u;
    } catch (e) { setBaseErr(e.message); return null; }
    finally { setBaseLoading(false); }
  }

  async function handleStartVisuals() { setStep(3); setImages({}); await runBaseImage(analysis.product_analysis?.category, pickedModelUrl.current, hasMannequin); }

  async function runImages(shotsToRegen = null, refUrl = null) {
    const shots = shotsToRegen || analysis.shots, referenceImageUrl = refUrl || baseImage;
    if (!referenceImageUrl) return;
    setImagesLoading(true);
    setImages(prev => { const next = { ...prev }; shots.forEach(s => { next[s.id] = { loading: true }; }); return next; });
    const successfulImages = {};
    for (const shot of shots) {
      try {
        const res = await serverFetch("/api/product-ad/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shots: [shot], referenceImageUrl, category: analysis.product_analysis?.category, modelImageUrl: pickedModelUrl.current || null }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        const r = data.results?.[0];
        if (r?.ok) { const u = await uploadImageToSupabase(r.imageUrl); setImages(prev => ({ ...prev, [shot.id]: { url: u } })); successfulImages[shot.id] = { url: u }; }
        else setImages(prev => ({ ...prev, [shot.id]: { error: r?.error || "Failed" } }));
      } catch (e) { setImages(prev => ({ ...prev, [shot.id]: { error: e.message } })); }
    }
    setImagesLoading(false); fetchCredits();
    if (projectDbId.current && Object.keys(successfulImages).length) {
      updateProjectProgress(projectDbId.current, 3, { analysis, product_image_url: imageUrl, has_mannequin: hasMannequin, category: analysis.product_analysis?.category, base_image_url: baseImage, images: successfulImages, target_market: targetMarket }).catch(() => {});
    }
  }

  async function regenImage(shot) {
    setImages(prev => ({ ...prev, [shot.id]: { loading: true } }));
    try {
      const res = await serverFetch("/api/product-ad/generate-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shots: [shot], referenceImageUrl: baseImage, category: analysis.product_analysis?.category, modelImageUrl: pickedModelUrl.current || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const r = data.results?.[0];
      if (r?.ok) { const u = await uploadImageToSupabase(r.imageUrl); setImages(prev => ({ ...prev, [shot.id]: { url: u } })); }
      else setImages(prev => ({ ...prev, [shot.id]: { error: r?.error || "Failed" } }));
    } catch (e) { setImages(prev => ({ ...prev, [shot.id]: { error: e.message } })); }
  }

  async function runClips() {
    if (generatingClips.current) return;
    generatingClips.current = true; setClipsLoading(true);
    const currentImages = { ...images }; // snapshot — state may update mid-loop
    const successfulClips = {};
    for (const shot of analysis.shots) {
      const imgData = images[shot.id];
      if (!imgData?.url) { setClips(prev => ({ ...prev, [shot.id]: { error: "No image" } })); continue; }
      setClips(prev => ({ ...prev, [shot.id]: { loading: true } }));
      try {
        const res = await serverFetch("/api/product-ad/generate-clip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: imgData.url, motionPrompt: shot.video_motion_prompt, durationSeconds: shot.duration_seconds || 3 }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Clip failed");
        const u = await uploadClipToSupabase(data.videoUrl); setClips(prev => ({ ...prev, [shot.id]: { videoUrl: u } })); successfulClips[shot.id] = { videoUrl: u };
      } catch (e) { setClips(prev => ({ ...prev, [shot.id]: { error: e.message } })); }
    }
    setClipsLoading(false); generatingClips.current = false; fetchCredits();
    if (projectDbId.current && Object.keys(successfulClips).length) {
      const imagesSnap = Object.fromEntries(Object.entries(currentImages).filter(([,v]) => v?.url).map(([k,v]) => [k, {url: v.url}]));
      updateProjectProgress(projectDbId.current, 4, { analysis, product_image_url: imageUrl, has_mannequin: hasMannequin, category: analysis.product_analysis?.category, base_image_url: baseImage, images: imagesSnap, clips: successfulClips, target_market: targetMarket }).catch(() => {});
    }
  }

  async function uploadImageToSupabase(falUrl) {
    try {
      const res = await serverFetch("/api/proxy-image-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: falUrl, projectId: projectDbId.current }) });
      if (!res.ok) return falUrl;
      const data = await res.json(); return data.url || falUrl;
    } catch { return falUrl; }
  }

  async function uploadClipToSupabase(falUrl) {
    try {
      const res = await serverFetch("/api/proxy-video-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: falUrl, projectId: projectDbId.current }) });
      const data = await res.json(); if (!res.ok) return falUrl; return data.url || falUrl;
    } catch { return falUrl; }
  }

  async function createProject() {
    if (creatingProject) return; setCreatingProject(true);
    const successfulShots = analysis.shots.filter(s => clips[s.id]?.videoUrl);
    if (!successfulShots.length) { setCreatingProject(false); return; }
    const TRANSITIONS = [{ type: "dissolve", duration: 16 }, { type: "fade", duration: 14 }, { type: "slideLeft", duration: 18 }, { type: "wipe", duration: 16 }, { type: "zoom", duration: 14 }];
    let currentTime = 0; const beats = [];
    successfulShots.forEach((shot, index) => {
      const clipUrl = clips[shot.id].videoUrl, duration = shot.duration_seconds || 3, start = currentTime; currentTime += duration;
      beats.push({ id: crypto.randomUUID(), order: index, layout: "blank", layoutBackground: { type: "color", value: "#000000" }, zones: { z1: { type: "asset", x: 0, y: 0, width: 100, height: 100, zIndex: 0, content: { kind: "asset", asset: { src: clipUrl, type: "video", objectFit: "cover", motion: "none", enterTransition: "none", exitTransition: "none" } }, style: { objectFit: "cover" }, background: {} } }, deletedZones: ["z2"], overlays: [], audio_cues: [], caption: { show: false, text: "", style: "wordBlaze", position: 80 }, transition: index < successfulShots.length - 1 ? TRANSITIONS[index % TRANSITIONS.length] : { type: "fade", duration: 14 }, spoken: "", intent: "hook", energy: 0.8, beatType: null, duration_sec: duration, start_sec: start, end_sec: currentTime });
    });
    const musicLib = await loadMusicLibrary();
    const { src: musicSrc } = pickMusicByMood(analysis.product_analysis.recommended_music_mood, musicLib);
    const project = { id: crypto.randomUUID(), meta: { width: 1080, height: 1920, fps: 25, orientation: "9:16", mode: "faceless" }, beats, duration_sec: currentTime, audio: { music: { src: musicSrc, volume: 0.4 } }, avatar: null, dna: null };
    try {
      let finalId = projectDbId.current;
      if (finalId) {
        // Update the project record created at step 2
        await updateProject(finalId, project, { name: `${analysis.product_analysis.product_type.replace(/^\w/, c => c.toUpperCase())} Ad`, raw_ai_json: {}, steps_completed: 5 });
      } else {
        // Fallback: create fresh (shouldn't normally happen)
        const saved = await createDBProject({ name: `${analysis.product_analysis.product_type.replace(/^\w/, c => c.toUpperCase())} Ad`, rawAI: {}, safeProject: project, source: "product_ad", stepsCompleted: 5 });
        if (!saved?.id) { setCreatingProject(false); return; }
        finalId = saved.id;
        projectDbId.current = finalId;
      }
      setDbId(finalId);
      localStorage.removeItem(DRAFT_KEY);
      setProject(project); navigate(`/editor/${finalId}`);
    } catch (e) { console.error("[ProductAd]", e); setCreatingProject(false); }
  }

  async function handleResume(project) {
    const d = project.raw_ai_json || {};
    setSavedDraft(null);
    projectDbId.current = project.id;
    setStep(project.steps_completed || 2);
    setImageUrl(d.product_image_url || "");
    setPreviewUrl(d.product_image_url || "");
    setAnalysis(d.analysis || null);
    setHasMannequin(d.has_mannequin || false);
    setTargetMarket(d.target_market || "");
    setBaseImage(d.base_image_url || null);
    setImages(d.images || {});
    setClips(d.clips || {});
    const category = d.analysis?.product_analysis?.category;
    if (category) {
      const modelUrl = await fetchAndPickModel(category);
      pickedModelUrl.current = modelUrl || null;
    }
  }

  function resetAll() {
    localStorage.removeItem(DRAFT_KEY);
    setSavedDraft(null); setStep(1); setAnalysis(null); setBaseImage(null);
    setBaseErr(""); setImages({}); setClips({}); setPreviewUrl(""); setImageUrl(""); setImageFile(null);
    setHasMannequin(false); setTargetMarket(""); setMsgIdx(0);
    generatingClips.current = false; pickedModelUrl.current = null; projectDbId.current = null;
  }

  /* ══ Render ══ */
  return (
    <>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeIn   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes hintFade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn 0.35s ease forwards; }
      `}</style>
      <div style={{ padding: "28px 28px 40px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.3px" }}>Ad Studio</h1>
            <p style={{ fontSize: 13, color: T.dim, marginTop: 4, marginBottom: 0 }}>Upload a product photo and let AI craft your video ad.</p>
          </div>
          {step > 1 && <button onClick={resetAll} style={{ ...S.btnGhost, fontSize: 12, padding: "7px 14px" }}>← New Product</button>}
        </div>

        {/* Incomplete product ad resume banner */}
        {savedDraft && step === 1 && !analysis && (
          <div style={{ marginBottom: 24, padding: "14px 20px", borderRadius: 12, background: "rgba(124,92,252,0.08)", border: "1px solid rgba(124,92,252,0.25)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>Resume where you left off</div>
              <div style={{ fontSize: 11, color: T.muted }}>
                {savedDraft.raw_ai_json?.analysis?.product_analysis?.product_type || savedDraft.name || "Product"}
                {" · "}{timeLabel(savedDraft.updated_at)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => handleResume(savedDraft)} style={{ ...S.btnPrimary, padding: "8px 18px", fontSize: 12 }}>Resume →</button>
              <button onClick={() => { deleteProject(savedDraft.id).catch(() => {}); setSavedDraft(null); }} style={{ ...S.btnGhost, padding: "8px 14px", fontSize: 12 }}>Discard</button>
            </div>
          </div>
        )}

        {/* Upgrade gate */}
        {upgradeRequired && (
          <div style={{ margin: "0 0 24px", padding: "28px 32px", borderRadius: 16, background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.25)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 8, fontFamily: "'Outfit',sans-serif" }}>Paid Plan Required</div>
            <div style={{ fontSize: 13, color: T.dim, marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>
              Product Ad Studio is available on all paid plans. Upgrade to create AI-powered video ads for your products.
            </div>
            <button onClick={() => navigate("/#pricing")} style={{ ...S.btnPrimary, padding: "12px 28px", fontSize: 14 }}>
              View Plans →
            </button>
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <Shell
            left={<>
              <Section title="Product Photo">
                <div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed rgba(124,92,252,0.25)", borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", marginBottom: 12, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.6)"; e.currentTarget.style.background = "rgba(124,92,252,0.04)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(124,92,252,0.25)"; e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
                  <div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>Click to upload</div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>JPG, PNG, WEBP</div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFilePick} />
                <div style={{ fontSize: 11, color: T.dim, textAlign: "center", marginBottom: 10 }}>— or paste URL —</div>
                <input type="text" placeholder="https://example.com/product.jpg" value={imageFile ? "" : imageUrl} onChange={handleUrlPaste} style={S.inp} />
              </Section>
              <Section title="Brand (optional)">
                <input type="text" placeholder="e.g. Zara, Apple, Nykaa" value={brandName} onChange={e => setBrandName(e.target.value)} style={S.inp} />
              </Section>
              <Section title="Target Market (optional)">
                <select value={targetMarket} onChange={e => setTargetMarket(e.target.value)} style={{ ...S.inp, appearance: "none", cursor: "pointer" }}>
                  <option value="">Global / International</option>
                  <option value="south_asia">South Asia (India, Pakistan, Bangladesh)</option>
                  <option value="east_asia">East Asia (China, Japan, Korea)</option>
                  <option value="southeast_asia">Southeast Asia</option>
                  <option value="middle_east">Middle East & North Africa</option>
                  <option value="africa">Sub-Saharan Africa</option>
                  <option value="europe">Europe</option>
                  <option value="north_america">North America</option>
                  <option value="latin_america">Latin America</option>
                </select>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>Helps match people in your ad to your audience.</div>
              </Section>
              <Section style={{ borderBottom: "none" }}>
                {uploadErr && <div style={{ color: T.danger, fontSize: 12, marginBottom: 12 }}>✕ {uploadErr}</div>}
                <button onClick={handleUploadClick} disabled={uploading || (!imageFile && !imageUrl)} style={{ ...S.btnYellow, width: "100%", opacity: (!imageFile && !imageUrl) ? 0.4 : 1 }}>
                  {uploading ? "Uploading…" : "Create Ad →"}
                </button>
              </Section>
            </>}
            right={previewUrl ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 480, padding: 32 }}><img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 500, objectFit: "contain", borderRadius: 10 }} /></div> : <RightEmpty icon="🛍️" title="Upload your product" subtitle="Your product photo will appear here." />}
          />
        )}

        {/* ── WORKING (steps 2–4) — single loading screen ── */}
        {(step === 2 || step === 3 || step === 4) && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 520, textAlign: "center", padding: "60px 40px" }}>
            {previewUrl && (
              <img src={previewUrl} alt="Product" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 14, border: `1px solid ${T.border}`, marginBottom: 36, opacity: 0.65 }} />
            )}

            {/* Error: analysis failed */}
            {analyzeErr && (
              <div>
                <div style={{ fontSize: 14, color: T.danger, marginBottom: 20 }}>✕ {analyzeErr}</div>
                <button onClick={() => runAnalysis(imageUrl)} style={S.btnGhost}>↺ Try Again</button>
              </div>
            )}

            {/* Error: base image failed */}
            {baseErr && !analyzeErr && (
              <div>
                <div style={{ fontSize: 14, color: T.danger, marginBottom: 20 }}>Something went wrong. Please try again.</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={handleStartVisuals} style={S.btnPrimary}>↺ Retry</button>
                  <button onClick={resetAll} style={S.btnGhost}>Start Over</button>
                </div>
              </div>
            )}

            {/* Error: all clips failed */}
            {allClipsProcessed && !anyClipSucceeded && !baseErr && !analyzeErr && (
              <div>
                <div style={{ fontSize: 14, color: T.danger, marginBottom: 20 }}>Video generation failed. Please try again.</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => { generatingClips.current = false; setClips({}); runClips(); }} style={S.btnPrimary}>↺ Retry</button>
                  <button onClick={resetAll} style={S.btnGhost}>Start Over</button>
                </div>
              </div>
            )}

            {/* Normal loading state */}
            {!analyzeErr && !baseErr && !(allClipsProcessed && !anyClipSucceeded) && (
              <>
                <div style={{ position: "relative", width: 72, height: 72, marginBottom: 32 }}>
                  <Spinner size={72} color={T.accent} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>✦</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", marginBottom: 10, letterSpacing: "-0.3px" }}>
                  Creating your ad…
                </div>
                <div key={msgIdx} style={{ fontSize: 13, color: T.dim, animation: "hintFade 0.4s ease forwards" }}>
                  {LOADING_MESSAGES[msgIdx]}
                </div>
                {step === 4 && analysis && (
                  <div style={{ marginTop: 36, width: "100%", maxWidth: 300 }}>
                    {(() => {
                      const done  = analysis.shots.filter(s => clips[s.id]?.videoUrl).length;
                      const total = analysis.shots.length;
                      const pct   = Math.round((done / total) * 100);
                      return (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: T.dim }}>
                            <span>{done} of {total} scenes</span><span>{pct}%</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${T.accent},${T.yellow})`, width: `${pct}%`, transition: "width 0.5s ease" }} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STEP 5 ── */}
        {step === 5 && (() => {
          const succeeded = analysis.shots.filter(s => clips[s.id]?.videoUrl).length, failed = analysis.shots.filter(s => clips[s.id]?.error).length, total = analysis.shots.length;
          return (
            <Shell
              left={<>
                <Section title="Summary">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[["Product", analysis.product_analysis.product_type], ["Scenes", `${succeeded} of ${total} ready`], ["Music", analysis.product_analysis.recommended_music_mood]].map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: T.dim }}>{k}</span><span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{v}</span></div>)}
                  </div>
                </Section>
                <Section title="Scenes" style={{ borderBottom: "none" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 20 }}>
                    {analysis.shots.map(shot => { const data = clips[shot.id]; return <div key={shot.id} style={{ aspectRatio: "9/16", borderRadius: 6, overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>{data?.videoUrl ? <video src={data.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted loop autoPlay playsInline /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: T.danger }}>✕</span></div>}</div>; })}
                  </div>
                  <button onClick={createProject} disabled={creatingProject} style={{ ...S.btnYellow, width: "100%", opacity: creatingProject ? 0.6 : 1 }}>{creatingProject ? "Opening…" : "Open in Editor →"}</button>
                  <button onClick={resetAll} style={{ ...S.btnGhost, width: "100%", marginTop: 8, fontSize: 12 }}>← New Product</button>
                </Section>
              </>}
              right={
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 480, padding: 48, textAlign: "center" }}>
                  <div style={{ fontSize: 64, marginBottom: 20, animation: "fadeIn 0.5s ease" }}>🎬</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", marginBottom: 10, letterSpacing: "-0.5px", animation: "fadeIn 0.5s ease 0.1s both" }}>{failed === 0 ? "Your Ad is Ready" : `${succeeded} of ${total} Scenes Ready`}</div>
                  <div style={{ fontSize: 14, color: T.dim, maxWidth: 380, lineHeight: 1.7, animation: "fadeIn 0.5s ease 0.2s both" }}>
                    {succeeded} scene{succeeded !== 1 ? "s" : ""} produced.{failed > 0 && ` ${failed} failed — only successful scenes added.`}{" "}Open in the editor to add text, adjust transitions, and export.
                  </div>
                  <div style={{ marginTop: 32, animation: "fadeIn 0.5s ease 0.3s both" }}>
                    <button onClick={createProject} disabled={creatingProject} style={{ ...S.btnYellow, padding: "13px 32px", fontSize: 15, opacity: creatingProject ? 0.6 : 1 }}>{creatingProject ? "Opening…" : "Open in Editor →"}</button>
                  </div>
                </div>
              }
            />
          );
        })()}

      </div>
      {creditModal && (
        <CreditConfirmModal
          service="Product Ad Studio"
          breakdown={creditModal.breakdown}
          total={creditModal.total}
          balance={creditModal.balance}
          onConfirm={() => { setCreditModal(null); handleUpload(); }}
          onCancel={() => setCreditModal(null)}
          onTopUp={() => { setCreditModal(null); navigate("/credits"); }}
        />
      )}
    </>
  );
}

/* Standalone page — keeps /product-ads/new route working */
export default function NewProductAd() {
  const [searchParams] = useSearchParams();
  return (
    <AppLayout>
      <AdGenerator resumeId={searchParams.get("resume")} />
    </AppLayout>
  );
}