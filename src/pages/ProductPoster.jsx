import { useState, useRef, useEffect } from "react";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

const C = {
  inp:  { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnG: { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%" },
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
  const [hov,       setHov]       = useState(false);
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
  const fetchCredits = useCreditsStore(s => s.fetchCredits);

  // tabs
  const [activeTab, setActiveTab] = useState("generate");

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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Syne',sans-serif" }}>Product Poster</h1>
        <div style={{ display: "flex", gap: 4, background: "#111118", borderRadius: 8, padding: 3 }}>
          {[["generate", "Poster Generator"], ["history", "My Generated Posters"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding: "6px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s",
                background: activeTab === id ? "#f5c518" : "transparent",
                color:      activeTab === id ? "#0b0b10"  : "#55556a" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>

        {activeTab === "generate" && (
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "420px 1fr", gap: 28, alignItems: "start" }}>

            {/* ── LEFT: Inputs ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div onClick={() => !previewUrl && fileInputRef.current?.click()} style={{ background: "#111118", border: previewUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", cursor: previewUrl ? "default" : "pointer" }}>
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Product" style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block", background: "#0b0b10" }} />
                    <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>↑ Replace</button>
                      <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>🔗 URL</button>
                      <button onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "40px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 4 }}>Click to upload product image</div>
                    <div style={{ fontSize: 11, color: "#444" }}>JPG, PNG, WEBP</div>
                    <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 14px", marginTop: 12 }}>🔗 Paste URL instead</button>
                  </div>
                )}
              </div>

              {showUrl && <input style={C.inp} placeholder="https://…" value={imageFile ? "" : imageUrl} onChange={handleUrlPaste} autoFocus />}
              {uploadErr && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {uploadErr}</div>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />

              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
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
                  <input style={C.inp} placeholder="e.g. Premium skincare, naturally crafted" value={tagline} onChange={e => setTagline(e.target.value)} />
                </div>
              </div>

              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
                <label style={C.lbl}>Color Mood</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {MOODS.map(m => (
                    <button key={m.id} onClick={() => setColorMood(m.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: colorMood === m.id ? "none" : "1px solid rgba(255,255,255,0.1)", background: colorMood === m.id ? "#7c5cfc" : "transparent", color: colorMood === m.id ? "#fff" : "#666" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
                <label style={C.lbl}>Text Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>

              <div>
                <button onClick={handleGenerate} disabled={!canGen} style={{ ...C.btnY, opacity: canGen ? 1 : 0.45 }}>
                  {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Poster"}
                </button>
                <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 6 }}>~5 credits</div>
                {genErr && <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginTop: 10 }}>✕ {genErr}</div>}
              </div>
            </div>

            {/* ── RIGHT: Result ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ width: "100%", maxWidth: 380, aspectRatio: "9/16", background: "#111118", border: posterUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {generating && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>✦</div>
                    <div style={{ fontSize: 13, color: "#9494a8" }}>Generating your poster…</div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>20–30 seconds</div>
                  </div>
                )}
                {!generating && !posterUrl && (
                  <div style={{ textAlign: "center", color: "#2a2a3a" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
                    <div style={{ fontSize: 13 }}>Your poster will appear here</div>
                  </div>
                )}
                {posterUrl && <img src={posterUrl} alt="Generated poster" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
              </div>

              {posterUrl && (
                <div style={{ width: "100%", maxWidth: 380 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a href={posterUrl} download={`poster-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                      <button style={{ ...C.btnY, fontSize: 13 }}>↓ Download</button>
                    </a>
                    <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Regenerate</button>
                  </div>
                  {genTime && <div style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 6 }}>Generated in {genTime}s</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {histLoad && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            )}

            {!histLoad && history.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>🖼️</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No posters yet</div>
                <div style={{ fontSize: 15, color: "#77777f" }}>Upload a product photo and generate a premium ad poster</div>
                <button onClick={() => setActiveTab("generate")} style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
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

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
