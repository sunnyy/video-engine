import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";
import SizeSelector from "../ui/SizeSelector";

const PAGE_SIZE = 12;

async function downloadFile(url, filename) {
  const res  = await fetch(url);
  const blob = await res.blob();
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const C = {
  inp:  { padding: "9px 12px", background: "#1E1E34", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, display: "block" },
  btnG: { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", width: "100%" },
  card: { background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 },
};

const SKIN_COLORS = {
  light:        "#f5e6d3",
  medium_light: "#e8c9a0",
  medium:       "#c8956c",
  medium_dark:  "#8b5e3c",
  dark:         "#4a2c17",
};

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function UploadZone({ preview, onFile, onClear, label, accept = "image/*", inputRef, compact = false }) {
  const [drag, setDrag] = useState(false);
  const localRef = useRef();
  const ref = inputRef || localRef;

  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <>
      <div
        onClick={() => !preview && ref.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        style={{
          background: "#111118",
          border: preview ? "1px solid rgba(255,255,255,0.08)" : `2px dashed ${drag ? "#7c5cfc" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12, overflow: "hidden",
          cursor: preview ? "default" : "pointer",
          transition: "border-color 0.15s",
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} style={{ width: "100%", maxHeight: compact ? 300 : 260, objectFit: "contain", display: "block", background: "#0b0b10" }} />
            <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => ref.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
              <button onClick={onClear} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
            </div>
          </>
        ) : (
          <div style={{ padding: compact ? "160px 16px" : "36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: compact ? 24 : 32, marginBottom: 8 }}>👕</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 3 }}>Click or drop {label}</div>
            <div style={{ fontSize: 11, color: "#444" }}>JPG, PNG, WEBP</div>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} style={{ display: "none" }} />
    </>
  );
}

function TryOnCard({ tryon, active, onSelect, onDelete }) {
  const [hov,        setHov]        = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirming) { onDelete(tryon); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{
        position: "relative", aspectRatio: "9/16", borderRadius: 12, overflow: "hidden",
        cursor: "pointer",
        border: active ? "2px solid #7c5cfc" : `2px solid ${hov ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: "#1e1e30",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src={tryon.result_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov ? 1 : 0, transition: "opacity 0.2s", pointerEvents: hov ? "auto" : "none" }}>
        <button onClick={e => { e.stopPropagation(); downloadFile(tryon.result_url, `tryon-${Date.now()}.jpg`); }}
          style={{ padding: "8px 20px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
          ↓ Download
        </button>
      </div>

      <button onClick={handleDelete}
        style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 5, background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", border: "none", color: confirming ? "#fff" : "#bbb", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        ✕
      </button>

      {tryon.created_at && (
        <div style={{ position: "absolute", bottom: 6, left: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#9494a8", backdropFilter: "blur(4px)", lineHeight: 1.4, pointerEvents: "none" }}>
          {timeLabel(tryon.created_at)}
        </div>
      )}
    </div>
  );
}

function ModelModal({ models, genderFilter, onSelect, onMyPhoto, onClose }) {
  const [tab, setTab] = useState("models");
  const photoRef = useRef();
  const filtered = genderFilter === "all" ? models : models.filter(m => m.gender === genderFilter);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, width: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#e8e8f0" }}>Select Model</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "10px 20px 0", background: "rgba(255,255,255,0.02)" }}>
          {[["models", "Our Models"], ["mine", "My Photo"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "8px 18px", border: "none", background: "transparent", fontSize: 13, fontWeight: tab === key ? 700 : 500, color: tab === key ? "#a78bfa" : "#55556a", cursor: "pointer", borderBottom: tab === key ? "2px solid #7c5cfc" : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="modal-scroll" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "models" && (
            filtered.length === 0
              ? <div style={{ fontSize: 13, color: "#444", textAlign: "center", padding: "40px 0" }}>{models.length === 0 ? "Loading…" : "No models available"}</div>
              : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {filtered.map(m => (
                    <button key={m.id} onClick={() => onSelect(m)}
                      style={{ padding: 0, border: "2px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "transparent", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#7c5cfc"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                      <img src={m.url} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
          )}
          {tab === "mine" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 12, color: "#7070a0", textAlign: "center" }}>Upload a photo of yourself to try on the outfit</div>
              <button onClick={() => photoRef.current?.click()}
                style={{ padding: "12px 28px", background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.3)", borderRadius: 10, color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Upload Photo
              </button>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onMyPhoto(f); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VirtualTryOn() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);

  const [activeTab, setActiveTab] = useState("result");
  const [gallPage,  setGallPage]  = useState(0);

  const [garmentFile,    setGarmentFile]    = useState(null);
  const [garmentUrl,     setGarmentUrl]     = useState("");
  const [garmentPreview, setGarmentPreview] = useState("");
  const [modelFile,      setModelFile]      = useState(null);
  const [modelUrl,       setModelUrl]       = useState("");
  const [modelPreview,   setModelPreview]   = useState("");
  const [models,         setModels]         = useState([]);
  const [selectedModel,  setSelectedModel]  = useState(null);
  const [genderFilter,   setGenderFilter]   = useState("all");
  const [hasMannequin,   setHasMannequin]   = useState(false);
  const [aspect,         setAspect]         = useState("9:16");
  const [generating,     setGenerating]     = useState(false);
  const [resultUrl,      setResultUrl]      = useState(null);
  const [history,        setHistory]        = useState([]);
  const [genErr,         setGenErr]         = useState("");
  const [genTime,        setGenTime]        = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [analyzing,       setAnalyzing]       = useState(false);
  const [analyzeErr,      setAnalyzeErr]      = useState("");
  const [analysis,        setAnalysis]        = useState(null);
  const [showModelModal,  setShowModelModal]  = useState(false);

  const garmentInputRef = useRef();
  const modelInputRef   = useRef();

  useEffect(() => {
    fetchModels();
    fetchHistory();
  }, []);

  async function fetchModels() {
    try {
      const res  = await serverFetch("/api/outfit/models");
      const data = await res.json();
      if (res.ok) setModels(data.models || []);
    } catch (_) {}
  }

  async function fetchHistory() {
    try {
      const res  = await serverFetch("/api/outfit/list");
      const data = await res.json();
      if (res.ok) setHistory(data.tryons || []);
    } catch (_) {}
  }

  async function uploadImage(file, fieldName = "image") {
    const form = new FormData();
    form.append(fieldName, file);
    const res  = await serverFetch("/api/outfit/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleGarmentFile(file) {
    setGarmentFile(file);
    setGarmentUrl("");
    setGarmentPreview(URL.createObjectURL(file));
    setAnalysis(null);
    setAnalyzeErr("");
  }

  async function handleAnalyze() {
    if (!garmentFile && !garmentUrl) return;
    setAnalyzeErr("");
    try {
      let url = garmentUrl;
      if (!url) {
        setUploading(true);
        url = await uploadImage(garmentFile);
        setGarmentUrl(url);
        setUploading(false);
      }
      setAnalyzing(true);
      const res  = await serverFetch("/api/outfit/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ garmentUrl: url }) });
      const data = await res.json();
      if (!res.ok) { setAnalyzeErr(data.error || "Analysis failed"); }
      else {
        setAnalysis(data);
        if (data.gender === "female" || data.gender === "male") setGenderFilter(data.gender);
        if (typeof data.hasMannequin === "boolean") setHasMannequin(data.hasMannequin);
      }
    } catch (_) { setAnalyzeErr("Something went wrong, please try again."); }
    setUploading(false);
    setAnalyzing(false);
  }

  async function handleGenerateClick() {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.outfit_tryon;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleGenerate() {
    setGenErr(""); setResultUrl(null);
    setGenerating(true);
    const t0 = Date.now();
    try {
      setUploading(true);
      const finalGarmentUrl = garmentUrl;
      if (!finalGarmentUrl) throw new Error("Garment image required");

      let finalModelUrl = selectedModel?.url || modelUrl;
      if (modelFile && !modelUrl) {
        finalModelUrl = await uploadImage(modelFile);
        setModelUrl(finalModelUrl);
      }
      setUploading(false);

      if (!finalGarmentUrl) throw new Error("Garment image required");
      if (!finalModelUrl)   throw new Error("Model photo required");

      const res  = await serverFetch("/api/outfit/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ garmentUrl: finalGarmentUrl, modelUrl: finalModelUrl, hasMannequin, aspect }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResultUrl(data.resultUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      setActiveTab("result");
      fetchHistory();
      fetchCredits();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
    setUploading(false);
  }

  async function deleteTryon(tryon) {
    try {
      await serverFetch("/api/outfit/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: tryon.id, storageKey: tryon.storage_key }),
      });
      if (resultUrl === tryon.result_url) setResultUrl(null);
      setHistory(h => h.filter(t => t.id !== tryon.id));
    } catch (_) {}
  }

  const canGenerate = garmentUrl && (modelFile || modelUrl || selectedModel) && !generating && !uploading && !analyzing;
  const totalPages  = Math.ceil(history.length / PAGE_SIZE);
  const pagedHistory   = history.slice(gallPage * PAGE_SIZE, (gallPage + 1) * PAGE_SIZE);

  return (
    <AppLayout>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", background: "#1E1E34" }}>
          {/* Panel header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Virtual Try-On</h1>
          </div>

          {/* Scrollable form */}
          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Garment */}
            <div>
              <label style={C.lbl}>Garment / Outfit</label>
              <UploadZone
                compact
                preview={garmentPreview}
                label="garment image"
                inputRef={garmentInputRef}
                onFile={handleGarmentFile}
                onClear={() => { setGarmentFile(null); setGarmentUrl(""); setGarmentPreview(""); setAnalysis(null); setAnalyzeErr(""); }}
              />
              {uploading && (
                <div style={{ fontSize: 11, color: "#9494a8", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #9494a8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Uploading…
                </div>
              )}
              {analyzing && (
                <div style={{ fontSize: 11, color: "#7c5cfc", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  Analyzing garment…
                </div>
              )}
              {/* Continue button — always visible, disabled until image selected */}
              {!analysis && !analyzing && !uploading && (
                <button onClick={handleAnalyze} disabled={!garmentPreview}
                  style={{ marginTop: 10, width: "100%", padding: "9px 0", background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.35)", borderRadius: 10, color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: garmentPreview ? "pointer" : "default", opacity: garmentPreview ? 1 : 0.75 }}>
                  Continue →
                </button>
              )}
              {analyzeErr && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>
                  ✕ {analyzeErr}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* Model section — always visible, disabled until analysis done */}
            <div style={{ opacity: analysis ? 1 : 0.75, pointerEvents: analysis ? "auto" : "none", transition: "opacity 0.3s" }}>
              <label style={C.lbl}>Model</label>

              {!selectedModel && !modelPreview && (
                <button onClick={() => setShowModelModal(true)}
                  style={{ width: "100%", padding: "11px 0", background: "rgba(124,92,252,0.12)", border: "1px dashed rgba(124,92,252,0.35)", borderRadius: 10, color: "#a78bfa", fontSize: 13, fontWeight: 700, cursor: analysis ? "pointer" : "default" }}>
                  + Select Model
                </button>
              )}

              {(selectedModel || modelPreview) && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                  <img src={selectedModel?.url || modelPreview} alt="" style={{ width: 48, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>{selectedModel ? "Model selected" : "Your photo"}</div>
                    <button onClick={() => setShowModelModal(true)}
                      style={{ fontSize: 11, padding: "3px 10px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#9494a8", cursor: "pointer" }}>
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate button — always pinned to bottom, disabled until ready */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <SizeSelector value={aspect} onChange={setAspect} options={["9:16", "4:5", "1:1"]} accent="#f5c518" />
            </div>
            {genErr && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginBottom: 10 }}>
                ✕ {genErr}
              </div>
            )}
            <button onClick={handleGenerateClick} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.5 }}>
              {generating ? "Generating…" : uploading ? "Uploading…" : analyzing ? "Analyzing…" : `✦ Generate · ${SERVICE_COSTS.outfit_tryon.total} credits`}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#151523" }}>
          {/* Right top bar */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#151523", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
            <div style={{ display: "flex" }}>
              {[["result", "Result"], ["history", `My Try-Ons${history.length ? ` (${history.length})` : ""}`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: "16px 20px", border: "none", background: "transparent", color: activeTab === id ? "#a78bfa" : "#55556a", fontSize: 14, fontWeight: activeTab === id ? 700 : 500, fontFamily: "'Outfit',sans-serif", cursor: "pointer", borderBottom: activeTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "history" && (
              <button onClick={fetchHistory} style={{ fontSize: 12, color: "#7c5cfc", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            )}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {activeTab === "result" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", gap: 16 }}>
                {generating && (
                  <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: "100%", aspectRatio: "9/16", borderRadius: 14, overflow: "hidden", position: "relative", background: "#1a1a28" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 35%, rgba(124,92,252,0.08) 50%, transparent 65%)", backgroundSize: "200% 100%", animation: "tryon-shimmer 1.6s ease-in-out infinite" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#55556a" }}>Generating try-on</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c5cfc", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#333" }}>20–40 seconds</div>
                  </div>
                )}
                {!generating && !resultUrl && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>👗</div>
                    <div style={{ fontSize: 14, color: "#35354a" }}>Your result will appear here</div>
                  </div>
                )}
                {resultUrl && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 340 }}>
                    <img src={resultUrl} alt="Try-on result" style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", display: "block" }} />
                    <div style={{ width: "100%", display: "flex", gap: 10 }}>
                      <button onClick={() => downloadFile(resultUrl, `outfit-${Date.now()}.jpg`)} style={{ ...C.btnY, fontSize: 13, flex: 1 }}>↓ Download</button>
                      <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Redo</button>
                    </div>
                    {genTime && <div style={{ fontSize: 11, color: "#444" }}>Generated in {genTime}s</div>}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <>
                {history.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center", color: "#444" }}>
                    <div style={{ fontSize: 48 }}>👗</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No try-ons yet</div>
                    <div style={{ fontSize: 13, color: "#77777f" }}>Upload a garment and model to get started</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#f5c518", color: "#0b0b10" }}>
                      Generate First Try-On →
                    </button>
                  </div>
                )}
                {history.length > 0 && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                      {pagedHistory.map(tryon => (
                        <TryOnCard key={tryon.id} tryon={tryon} active={tryon.result_url === resultUrl}
                          onSelect={() => { setResultUrl(tryon.result_url); setActiveTab("result"); }}
                          onDelete={deleteTryon} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
                        <button onClick={() => setGallPage(p => Math.max(0, p - 1))} disabled={gallPage === 0}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#9494a8", cursor: "pointer", opacity: gallPage === 0 ? 0.4 : 1 }}>← Prev</button>
                        <span style={{ fontSize: 12, color: "#55556a", padding: "0 8px" }}>{gallPage + 1} / {totalPages}</span>
                        <button onClick={() => setGallPage(p => Math.min(totalPages - 1, p + 1))} disabled={gallPage === totalPages - 1}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#9494a8", cursor: "pointer", opacity: gallPage === totalPages - 1 ? 0.4 : 1 }}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes tryon-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } } .modal-scroll::-webkit-scrollbar { width: 6px; } .modal-scroll::-webkit-scrollbar-track { background: transparent; } .modal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; } .modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); } .left-panel-scroll::-webkit-scrollbar { width: 10px; } .left-panel-scroll::-webkit-scrollbar-track { background: transparent; } .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; } .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }`}</style>
      {showModelModal && (
        <ModelModal
          models={models}
          genderFilter={genderFilter}
          onSelect={(m) => { setSelectedModel(m); setModelFile(null); setModelUrl(""); setModelPreview(""); setShowModelModal(false); }}
          onMyPhoto={(f) => { setModelFile(f); setModelPreview(URL.createObjectURL(f)); setSelectedModel(null); setShowModelModal(false); }}
          onClose={() => setShowModelModal(false)}
        />
      )}
      {creditModal && (
        <CreditConfirmModal
          service="Outfit Studio"
          breakdown={creditModal.breakdown}
          total={creditModal.total}
          balance={creditModal.balance}
          onConfirm={() => { setCreditModal(null); handleGenerate(); }}
          onCancel={() => setCreditModal(null)}
          onTopUp={() => { setCreditModal(null); navigate("/credits"); }}
        />
      )}
    </AppLayout>
  );
}
