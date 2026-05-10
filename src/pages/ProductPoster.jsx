import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import GeneratingLoader from "../ui/GeneratingLoader";
import AppLayout from "../ui/AppLayout";

const C = {
  inp: { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl: { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
};

const MOODS = [
  { id: "auto",    label: "Auto"    },
  { id: "luxury",  label: "Luxury"  },
  { id: "dark",    label: "Dark"    },
  { id: "light",   label: "Light"   },
  { id: "vibrant", label: "Vibrant" },
];

const LANGUAGES = [
  { id: "English",    label: "English"    },
  { id: "Hindi",      label: "Hindi"      },
  { id: "Arabic",     label: "Arabic"     },
  { id: "French",     label: "French"     },
  { id: "Spanish",    label: "Spanish"    },
  { id: "Portuguese", label: "Portuguese" },
  { id: "Urdu",       label: "Urdu"       },
  { id: "Turkish",    label: "Turkish"    },
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

function PosterCard({ poster, onDelete }) {
  const [hov,        setHov]        = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{ position: "relative", aspectRatio: "9/16", borderRadius: 10, overflow: "hidden", border: `2px solid ${hov ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.2s", background: "#111118" }}
    >
      <img src={poster.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      {hov && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <a href={poster.url} download target="_blank" rel="noreferrer"
            style={{ padding: "7px 16px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
            ↓ Download
          </a>
        </div>
      )}
      <button
        onClick={() => confirming ? onDelete(poster) : (setConfirming(true), setTimeout(() => setConfirming(false), 2500))}
        style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 4, color: confirming ? "#f87171" : "#aaa", fontSize: 11, cursor: "pointer", padding: "2px 6px", lineHeight: 1.4 }}
      >
        {confirming ? "Sure?" : "✕"}
      </button>
      {poster.created_at && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px", background: "rgba(0,0,0,0.6)", fontSize: 10, color: "#888", fontFamily: "'JetBrains Mono',monospace" }}>
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
  const [topTab,      setTopTab]      = useState("history");

  // form state
  const [imageUrl,   setImageUrl]   = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile,  setImageFile]  = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [brandName,  setBrandName]  = useState("");
  const [headline,   setHeadline]   = useState("");
  const [tagline,    setTagline]    = useState("");
  const [colorMood,  setColorMood]  = useState("auto");
  const [language,   setLanguage]   = useState("English");
  const [generating, setGenerating] = useState(false);
  const [posterUrl,  setPosterUrl]  = useState(null);
  const [genErr,     setGenErr]     = useState("");
  const [genTime,    setGenTime]    = useState(null);
  const [uploadErr,  setUploadErr]  = useState("");
  const [showUrl,    setShowUrl]    = useState(false);
  const fileInputRef = useRef();

  // history
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
    setGenerating(true); setPosterUrl(null); setTopTab("create");
    const t0 = Date.now();
    try {
      const res  = await serverFetch("/api/poster/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productImageUrl: finalUrl, brandName, headline, tagline, colorMood, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPosterUrl(data.posterUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchCredits();
      loadHistory();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  const hasImage = imageUrl || imageFile;
  const canGen   = hasImage && !generating && !uploading;

  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const paginated  = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "16px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif" }}>Product Poster</h1>
          <div style={{ display: "flex", gap: 4 }}>
            {[["history", "My Posters"], ["create", "Create New"]].map(([id, label]) => (
              <button key={id} onClick={() => setTopTab(id)}
                style={{ padding: "8px 20px", border: "none", borderRadius: "8px 8px 0 0",
                  background: topTab === id ? "rgba(124,92,252,0.15)" : "transparent",
                  color: topTab === id ? "#a78bfa" : "#55556a",
                  fontSize: 14, fontWeight: topTab === id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif", cursor: "pointer", transition: "all 0.15s",
                  borderBottom: topTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── My Posters tab ── */}
        {topTab === "history" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            {histLoad && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pp-spin 0.8s linear infinite" }} />
              </div>
            )}

            {!histLoad && history.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🖼️</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No posters yet</div>
                <div style={{ fontSize: 15, color: "#77777f" }}>Upload a product photo and generate a premium ad poster</div>
                <button onClick={() => setTopTab("create")}
                  style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                  Generate First Poster
                </button>
              </div>
            )}

            {!histLoad && history.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: "#55556a", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                  {history.length} poster{history.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                  {paginated.map((poster, i) => (
                    <PosterCard key={i} poster={poster} onDelete={deletePoster} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      style={{ padding: "6px 12px", borderRadius: 7, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "#a0a0b8", opacity: page === 1 ? 0.3 : 1 }}>← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setPage(n)}
                        style={{ width: 32, height: 32, borderRadius: 7, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: n === page ? "#7c5cfc" : "rgba(255,255,255,0.06)", color: n === page ? "#fff" : "#a0a0b8" }}>
                        {n}
                      </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      style={{ padding: "6px 12px", borderRadius: 7, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.06)", color: "#a0a0b8", opacity: page === totalPages ? 0.3 : 1 }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Create New tab — two-column layout ── */}
        {topTab === "create" && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* Left sidebar — controls */}
            <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", overflow: "hidden" }}>

              {/* Scrollable controls */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>

                {/* Image upload */}
                <div style={{ marginBottom: 14 }}>
                  <label style={C.lbl}>Product Image</label>
                  <div
                    onClick={() => !previewUrl && fileInputRef.current?.click()}
                    style={{ background: "#111118", border: previewUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", cursor: previewUrl ? "default" : "pointer" }}
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Product" style={{ width: "100%", maxHeight: 160, objectFit: "contain", display: "block", background: "#0b0b10" }} />
                        <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "5px 0", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>↑ Replace</button>
                          <button onClick={() => setShowUrl(v => !v)} style={{ flex: 1, padding: "5px 0", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🔗 URL</button>
                          <button onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={{ flex: 1, padding: "5px 0", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✕</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: "24px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>📷</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#9494a8", marginBottom: 3 }}>Click to upload</div>
                        <div style={{ fontSize: 10, color: "#444" }}>JPG, PNG, WEBP</div>
                        <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ marginTop: 10, padding: "4px 12px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>🔗 Paste URL</button>
                      </div>
                    )}
                  </div>
                  {showUrl && (
                    <input style={{ ...C.inp, marginTop: 8 }} placeholder="https://…" value={imageFile ? "" : imageUrl} onChange={handleUrlPaste} autoFocus />
                  )}
                  {uploadErr && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>✕ {uploadErr}</div>}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />
                </div>

                {/* Text fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={C.lbl}>Brand Name <span style={{ color: "#333", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                    <input style={C.inp} placeholder="e.g. LUMIÈRE" value={brandName} onChange={e => setBrandName(e.target.value)} />
                  </div>
                  <div>
                    <label style={C.lbl}>Headline <span style={{ color: "#333", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                    <input style={C.inp} placeholder="e.g. Redefine Your Glow" value={headline} onChange={e => setHeadline(e.target.value)} />
                  </div>
                  <div>
                    <label style={C.lbl}>Tagline <span style={{ color: "#333", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                    <input style={C.inp} placeholder="e.g. Premium skincare" value={tagline} onChange={e => setTagline(e.target.value)} />
                  </div>
                </div>

                {/* Color mood */}
                <div style={{ marginBottom: 14 }}>
                  <label style={C.lbl}>Color Mood</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {MOODS.map(m => (
                      <button key={m.id} onClick={() => setColorMood(m.id)}
                        style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", border: colorMood === m.id ? "none" : "1px solid rgba(255,255,255,0.1)", background: colorMood === m.id ? "#7c5cfc" : "transparent", color: colorMood === m.id ? "#fff" : "#666" }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div style={{ marginBottom: 14 }}>
                  <label style={C.lbl}>Text Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                    {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Generate button — pinned */}
              <div style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                {genErr && (
                  <div style={{ fontSize: 11, color: "#f87171", padding: "6px 10px", background: "rgba(248,113,113,0.06)", borderRadius: 6, border: "1px solid rgba(248,113,113,0.15)", marginBottom: 10 }}>
                    ✕ {genErr}
                  </div>
                )}
                <button
                  onClick={handleGenerateClick}
                  disabled={!canGen}
                  style={{ width: "100%", padding: "11px 0", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: canGen ? "pointer" : "not-allowed", opacity: canGen ? 1 : 0.45 }}
                >
                  {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Poster"}
                </button>
                <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 5 }}>~5 credits</div>
              </div>
            </div>

            {/* Right panel — result */}
            <div style={{ flex: 1, overflowY: "auto", padding: "28px", background: "#0b0b10", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: "100%", maxWidth: 340, aspectRatio: "9/16", background: "#111118", border: posterUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {generating && <GeneratingLoader message="Generating your poster" hint="20–30 seconds" />}
                {!generating && !posterUrl && (
                  <div style={{ textAlign: "center", color: "#2a2a3a", padding: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
                    <div style={{ fontSize: 13 }}>Your poster will appear here</div>
                  </div>
                )}
                {posterUrl && <img src={posterUrl} alt="Generated poster" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
              </div>

              {posterUrl && (
                <div style={{ width: "100%", maxWidth: 340, display: "flex", gap: 10 }}>
                  <a href={posterUrl} download={`poster-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                    <button style={{ width: "100%", padding: "11px 0", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>↓ Download</button>
                  </a>
                  <button onClick={handleGenerate} disabled={generating}
                    style={{ padding: "11px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    ↺ Regenerate
                  </button>
                </div>
              )}
              {genTime && posterUrl && (
                <div style={{ fontSize: 11, color: "#444" }}>Generated in {genTime}s</div>
              )}
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes pp-spin { to { transform: rotate(360deg); } }`}</style>
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
