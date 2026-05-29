import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";
import RefundClaimTrigger from "../ui/components/RefundClaimTrigger";

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
  inp: { padding: "9px 12px", background: "#35354a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl: { fontSize: 11, fontWeight: 700, color: "#b0b0cc", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnG: { padding: "9px 18px", background: "rgba(255,255,255,0.07)", color: "#c0c0d8", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", width: "100%" },
};

const GOALS = [
  { id: "sell",      label: "Sell Product"    },
  { id: "launch",    label: "Launch Campaign" },
  { id: "awareness", label: "Brand Awareness" },
  { id: "showcase",  label: "Showcase"        },
];

const SIZES = [
  { id: "square",       label: "1:1",  w: 14, h: 14 },
  { id: "portrait_45",  label: "4:5",  w: 12, h: 15 },
  { id: "portrait_916", label: "9:16", w: 10, h: 17 },
];

const STYLES = [
  { id: "auto",       label: "Auto"       },
  { id: "luxury",     label: "Luxury"     },
  { id: "minimal",    label: "Minimal"    },
  { id: "editorial",  label: "Editorial"  },
  { id: "futuristic", label: "Futuristic" },
  { id: "playful",    label: "Playful"    },
  { id: "cinematic",  label: "Cinematic"  },
];

const PAGE_SIZE = 12;

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function PosterCard({ poster, onSelect, onDelete }) {
  const [hov,        setHov]        = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirming) { onDelete(poster); }
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
        border: `2px solid ${hov ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: "#1e1e30",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src={poster.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov ? 1 : 0, transition: "opacity 0.2s", pointerEvents: hov ? "auto" : "none" }}>
        <button onClick={e => { e.stopPropagation(); downloadFile(poster.url, `poster-${Date.now()}.jpg`); }}
          style={{ padding: "8px 20px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
          ↓ Download
        </button>
      </div>

      <button onClick={handleDelete}
        style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 5, background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", border: "none", color: confirming ? "#fff" : "#bbb", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        ✕
      </button>

      {poster.created_at && (
        <div style={{ position: "absolute", bottom: 6, left: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#9494a8", backdropFilter: "blur(4px)", lineHeight: 1.4, pointerEvents: "none" }}>
          {timeLabel(poster.created_at)}
        </div>
      )}
    </div>
  );
}

export default function PosterStudio() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);
  const [activeTab,   setActiveTab]   = useState("result");

  const [imageUrl,   setImageUrl]   = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile,  setImageFile]  = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [goal,       setGoal]       = useState("awareness");
  const [platform,   setPlatform]   = useState("");
  const [style,      setStyle]      = useState("auto");
  const [brandColor, setBrandColor] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posterUrl,  setPosterUrl]  = useState(null);
  const [genErr,     setGenErr]     = useState("");
  const [genTime,    setGenTime]    = useState(null);
  const [uploadErr,  setUploadErr]  = useState("");
  const [showUrl,    setShowUrl]    = useState(false);
  const fileInputRef = useRef();

  const [history,  setHistory]  = useState([]);
  const [histLoad, setHistLoad] = useState(true);
  const [page,     setPage]     = useState(1);

  useEffect(() => {
    fetchCredits();
    loadHistory();
  }, []);

  async function loadHistory() {
    setHistLoad(true);
    try {
      const res  = await serverFetch("/api/poster/list");
      const data = await res.json();
      if (res.ok) setHistory(data.posters || []);
    } catch (_) {}
    setHistLoad(false);
  }

  async function deletePoster(poster) {
    try {
      await serverFetch("/api/poster/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storageKey: poster.storageKey }),
      });
      setHistory(h => h.filter(p => p.storageKey !== poster.storageKey));
    } catch (_) {}
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file); setPreviewUrl(URL.createObjectURL(file)); setImageUrl(""); setUploadErr(""); setShowUrl(false);
  }

  function handleUrlPaste(e) {
    const url = e.target.value;
    setImageUrl(url); setPreviewUrl(url); setImageFile(null); setUploadErr("");
  }

  async function uploadFile() {
    if (!imageFile) return imageUrl;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", imageFile);
      const res  = await serverFetch("/api/poster/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
      setUploading(false);
      return data.url;
    } catch (e) {
      setUploadErr(e.message); setUploading(false); return null;
    }
  }

  async function handleGenerateClick() {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.poster;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleGenerate() {
    setGenErr("");
    let finalUrl = imageUrl;
    if (imageFile && !imageUrl) {
      finalUrl = await uploadFile();
      if (!finalUrl) return;
    }
    if (!finalUrl) return;
    setGenerating(true); setPosterUrl(null);
    const t0 = Date.now();
    try {
      const res  = await serverFetch("/api/poster/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          productImageUrl: finalUrl,
          goal,
          style,
          brandColor: brandColor || undefined,
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPosterUrl(data.posterUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      setActiveTab("result");
      fetchCredits();
      loadHistory();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  const hasImage   = imageUrl || imageFile;
  const canGen     = hasImage && platform && !generating && !uploading;
  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const paginated  = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppLayout>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", background: "#1C1C2E" }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Product Poster</h1>
          </div>

          {/* Scrollable form */}
          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 26 }}>

            {/* Product Image */}
            <div>
              <label style={C.lbl}>Product Image</label>
              <div
                onClick={() => !previewUrl && fileInputRef.current?.click()}
                style={{ background: "#333345", border: previewUrl ? "1px solid rgba(255,255,255,0.12)" : "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, overflow: "hidden", cursor: previewUrl ? "default" : "pointer" }}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Product" style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block", background: "#22222e" }} />
                    <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
                      <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>🔗 URL</button>
                      <button onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "36px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#b0b0d0", marginBottom: 4 }}>Click to upload product image</div>
                    <div style={{ fontSize: 11, color: "#7878a8", marginBottom: 10 }}>JPG, PNG, WEBP</div>
                    <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 14px" }}>🔗 Paste URL</button>
                  </div>
                )}
              </div>
              {showUrl && <input style={{ ...C.inp, marginTop: 8 }} placeholder="https://…" value={imageFile ? "" : imageUrl} onChange={handleUrlPaste} autoFocus />}
              {uploadErr && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>✕ {uploadErr}</div>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />
            </div>

            {/* Goal */}
            <div>
              <label style={C.lbl}>Goal <span style={{ color: "#f87171", fontSize: 10 }}>*</span></label>
              <select value={goal} onChange={e => setGoal(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>

            {/* Size */}
            <div>
              <label style={C.lbl}>Size <span style={{ color: "#f87171", fontSize: 10 }}>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                {SIZES.map(s => {
                  const active = platform === s.id;
                  return (
                    <button key={s.id} onClick={() => setPlatform(s.id)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: active ? "1.5px solid #f5c518" : "1.5px solid rgba(255,255,255,0.14)", background: active ? "rgba(245,197,24,0.1)" : "transparent", color: active ? "#f5c518" : "#7878a8" }}>
                      <div style={{ width: s.w, height: s.h, border: `1.5px solid ${active ? "#f5c518" : "#7878a8"}`, borderRadius: 2 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style */}
            <div>
              <label style={C.lbl}>Style</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: style === s.id ? "1.5px solid #f5c518" : "1.5px solid rgba(255,255,255,0.14)", background: style === s.id ? "rgba(245,197,24,0.1)" : "transparent", color: style === s.id ? "#f5c518" : "#7878a8" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Colors */}
            <div>
              <label style={C.lbl}>Brand Colors <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <input type="color" value={brandColor || "#7c5cfc"} onChange={e => setBrandColor(e.target.value)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "none", cursor: "pointer", padding: 2, flexShrink: 0 }} />
                <input type="text" placeholder="#000000" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                  style={{ ...C.inp, width: 90 }} maxLength={7} />
                {brandColor && (
                  <button onClick={() => setBrandColor("")} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>Clear</button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {["#000000", "#FFFFFF", "#FF0000", "#0066FF", "#FFD700", "#FF6600", "#00AA44", "#9900CC"].map(c => (
                  <div key={c} onClick={() => setBrandColor(c)}
                    style={{ width: 22, height: 22, borderRadius: 5, background: c, cursor: "pointer", border: brandColor === c ? "2px solid #7c5cfc" : "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
                ))}
              </div>
            </div>

          </div>

          {/* Generate button — pinned bottom */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            {genErr && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", marginBottom: 10 }}>
                ✕ {genErr}
              </div>
            )}
            <button onClick={handleGenerateClick} disabled={!canGen} style={{ ...C.btnY, opacity: canGen ? 1 : 0.45 }}>
              {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Poster"}
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: "#7070a0", marginTop: 6 }}>~10 credits</div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#151523" }}>
          {/* Tab bar */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#151523", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
            <div style={{ display: "flex" }}>
              {[["result", "Result"], ["history", `My Posters${history.length ? ` (${history.length})` : ""}`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: "16px 20px", border: "none", background: "transparent", color: activeTab === id ? "#f5c518" : "#8888b8", fontSize: 14, fontWeight: activeTab === id ? 700 : 500, fontFamily: "'Outfit',sans-serif", cursor: "pointer", borderBottom: activeTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "history" && (
              <button onClick={loadHistory} style={{ fontSize: 12, color: "#7c5cfc", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {activeTab === "result" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", gap: 16 }}>
                {generating && (
                  <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: "100%", aspectRatio: "9/16", borderRadius: 14, overflow: "hidden", position: "relative", background: "#2e2e40" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 35%, rgba(124,92,252,0.1) 50%, transparent 65%)", backgroundSize: "200% 100%", animation: "poster-shimmer 1.6s ease-in-out infinite" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#9090c0" }}>Generating poster</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c5cfc", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#7070a0" }}>20–30 seconds</div>
                  </div>
                )}
                {!generating && !posterUrl && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🖼️</div>
                    <div style={{ fontSize: 14, color: "#6868a0" }}>Your poster will appear here</div>
                  </div>
                )}
                {posterUrl && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 300 }}>
                    <img src={posterUrl} alt="Generated poster" style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", display: "block" }} />
                    <div style={{ width: "100%", display: "flex", gap: 10 }}>
                      <button onClick={() => downloadFile(posterUrl, `poster-${Date.now()}.jpg`)} style={{ ...C.btnY, fontSize: 13, flex: 1 }}>↓ Download</button>
                      <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Redo</button>
                    </div>
                    {genTime && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <div style={{ fontSize: 11, color: "#7070a0" }}>Generated in {genTime}s</div>
                        <RefundClaimTrigger service="product_poster" creditsUsed={10} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <>
                {histLoad && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                    <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
                {!histLoad && history.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🖼️</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No posters yet</div>
                    <div style={{ fontSize: 13, color: "#9090c0" }}>Upload a product photo and generate a premium ad poster</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                      Generate First Poster →
                    </button>
                  </div>
                )}
                {!histLoad && history.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#9090b8", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                      {history.length} poster{history.length !== 1 ? "s" : ""}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                      {paginated.map((poster, i) => (
                        <PosterCard key={i} poster={poster} onDelete={deletePoster} onSelect={() => { setPosterUrl(poster.url); setActiveTab("result"); }} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "#a0a0cc", cursor: "pointer", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                          <button key={n} onClick={() => setPage(n)}
                            style={{ width: 32, height: 32, borderRadius: 7, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: n === page ? "#7c5cfc" : "rgba(255,255,255,0.07)", color: n === page ? "#fff" : "#a0a0cc" }}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "#a0a0cc", cursor: "pointer", opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes poster-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } } .left-panel-scroll::-webkit-scrollbar { width: 10px; } .left-panel-scroll::-webkit-scrollbar-track { background: transparent; } .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; } .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }`}</style>
      {creditModal && (
        <CreditConfirmModal
          service="Poster Studio"
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
