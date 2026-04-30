import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import GeneratingLoader from "../ui/GeneratingLoader";
import AppLayout from "../ui/AppLayout";

const PAGE_SIZE = 12;

const C = {
  inp:  { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnG: { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer", width: "100%" },
};

const STYLES = [
  { id: "bold",    label: "Bold"    },
  { id: "minimal", label: "Minimal" },
  { id: "vibrant", label: "Vibrant" },
  { id: "dark",    label: "Dark"    },
];

const NICHES = [
  "Fitness & Health", "Finance & Money", "Technology", "Food & Cooking",
  "Travel", "Gaming", "Lifestyle", "Business & Entrepreneurship",
  "Education", "Beauty & Fashion", "Motivation", "Entertainment",
];

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function ThumbnailCard({ thumb, onDelete }) {
  const [hov,       setHov]       = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(thumb); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const createdAt = thumb.name
    ? timeLabel(new Date(parseInt(thumb.name.replace("thumb-", "").split(".")[0]) || Date.now()).toISOString())
    : "";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{
        background: "#111118", border: `1px solid ${hov ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14, overflow: "hidden", transition: "all 0.2s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b0b10", overflow: "hidden" }}>
        <img src={thumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {hov && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <a
              href={thumb.url}
              download={`thumbnail-${Date.now()}.jpg`}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ padding: "7px 16px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none" }}
            >
              ↓ Download
            </a>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>{createdAt}</span>
        <button
          onClick={handleDelete}
          style={{ background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 5, cursor: "pointer", color: confirming ? "#f87171" : "#55556a", fontSize: 11, padding: "3px 8px", opacity: hov ? 1 : 0, transition: "opacity 0.15s" }}
          title={confirming ? "Click again to confirm" : "Delete"}
        >
          {confirming ? "Confirm delete" : "✕"}
        </button>
      </div>
    </div>
  );
}

export default function Thumbnails() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);

  const [activeTab, setActiveTab] = useState("generate");
  const [gallPage,  setGallPage]  = useState(0);

  // Generator state
  const [imageUrl,     setImageUrl]     = useState("");
  const [previewUrl,   setPreviewUrl]   = useState("");
  const [imageFile,    setImageFile]    = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [headline,     setHeadline]     = useState("");
  const [subtext,      setSubtext]      = useState("");
  const [style,        setStyle]        = useState("bold");
  const [niche,        setNiche]        = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [genErr,       setGenErr]       = useState("");
  const [genTime,      setGenTime]      = useState(null);
  const [uploadErr,    setUploadErr]    = useState("");
  const [showUrl,      setShowUrl]      = useState(false);

  // Gallery state
  const [thumbnails, setThumbnails] = useState([]);
  const [loading,    setLoading]    = useState(false);

  const fileInputRef = useRef();

  useEffect(() => {
    loadThumbnails();
  }, []);

  function loadThumbnails() {
    setLoading(true);
    serverFetch("/api/thumbnail/list")
      .then(r => r.json())
      .then(d => setThumbnails(d.thumbnails || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageUrl("");
    setUploadErr("");
    setShowUrl(false);
  }

  function handleUrlPaste(e) {
    const url = e.target.value;
    setImageUrl(url);
    setPreviewUrl(url);
    setImageFile(null);
    setUploadErr("");
  }

  async function uploadFile() {
    if (!imageFile) return imageUrl || null;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", imageFile);
      const res  = await serverFetch("/api/thumbnail/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setImageUrl(data.url);
      setUploading(false);
      return data.url;
    } catch (e) {
      setUploadErr(e.message);
      setUploading(false);
      return null;
    }
  }

  async function handleGenerateClick() {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.thumbnail;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleGenerate() {
    setGenErr("");
    let finalUrl = null;

    if (imageFile || imageUrl) {
      if (imageFile && !imageUrl) {
        finalUrl = await uploadFile();
        if (finalUrl === null) return;
      } else {
        finalUrl = imageUrl;
      }
    }

    setGenerating(true);
    setThumbnailUrl(null);
    const t0 = Date.now();
    try {
      const res  = await serverFetch("/api/thumbnail/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl: finalUrl || null, headline, subtext, style, niche }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setThumbnailUrl(data.thumbnailUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchCredits();
      loadThumbnails();
    } catch (e) {
      setGenErr(e.message);
    }
    setGenerating(false);
  }

  async function handleDelete(thumb) {
    try {
      await serverFetch("/api/thumbnail/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storageKey: thumb.storageKey }),
      });
      setThumbnails(prev => prev.filter(t => t.storageKey !== thumb.storageKey));
    } catch (_) {}
  }

  const canGenerate  = headline && niche && !generating && !uploading;
  const totalPages   = Math.ceil(thumbnails.length / PAGE_SIZE);
  const pagedThumbs  = thumbnails.slice(gallPage * PAGE_SIZE, (gallPage + 1) * PAGE_SIZE);

  return (
    <AppLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <h1 className="text-[20px] font-bold" style={{ fontFamily: "'Outfit',sans-serif", color: "#f5c518" }}>Thumbnails</h1>
        <div className="flex gap-1 bg-[#111118] rounded-[8px] p-[3px]">
          {[["generate", "Thumbnail Generator"], ["gallery", "My Generated Thumbnails"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="px-5 py-[6px] rounded-[6px] text-[13px] font-semibold border-0 cursor-pointer transition-all"
              style={{ background: activeTab === id ? "#f5c518" : "transparent", color: activeTab === id ? "#0b0b10" : "#55556a" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">

        {activeTab === "generate" && (
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "400px 1fr", gap: 28, alignItems: "start" }}>

            {/* ── LEFT: Inputs ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Upload zone */}
              <div
                onClick={() => !previewUrl && fileInputRef.current?.click()}
                style={{ background: "#111118", border: previewUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", cursor: previewUrl ? "default" : "pointer" }}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Uploaded" style={{ width: "100%", maxHeight: 180, objectFit: "contain", display: "block", background: "#0b0b10" }} />
                    <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>↑ Replace</button>
                      <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>🔗 URL</button>
                      <button onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "28px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 4 }}>Click to upload a base image</div>
                    <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>JPG, PNG, WEBP</div>
                    <div style={{ fontSize: 11, color: "#3a3a4e", fontStyle: "italic", marginBottom: 10 }}>Optional — leave empty for fully AI-generated</div>
                    <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 14px" }}>🔗 Paste URL instead</button>
                  </div>
                )}
              </div>

              {showUrl && (
                <input style={C.inp} placeholder="https://…" value={imageFile ? "" : imageUrl} onChange={handleUrlPaste} autoFocus />
              )}
              {uploadErr && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {uploadErr}</div>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />

              {/* Text fields */}
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={C.lbl}>Headline <span style={{ color: "#f87171", textTransform: "none", fontWeight: 400 }}>*</span></label>
                  <input style={C.inp} placeholder="e.g. I Made $10,000 in 30 Days" value={headline} onChange={e => setHeadline(e.target.value)} />
                </div>
                <div>
                  <label style={C.lbl}>Subtext <span style={{ color: "#444", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                  <input style={C.inp} placeholder="e.g. This changed everything…" value={subtext} onChange={e => setSubtext(e.target.value)} />
                </div>
              </div>

              {/* Niche */}
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
                <label style={C.lbl}>Niche <span style={{ color: "#f87171", textTransform: "none", fontWeight: 400 }}>*</span></label>
                <select value={niche} onChange={e => setNiche(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                  <option value="">Select your niche…</option>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Style */}
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
                <label style={C.lbl}>Style</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyle(s.id)}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: style === s.id ? "none" : "1px solid rgba(255,255,255,0.1)", background: style === s.id ? "#7c5cfc" : "transparent", color: style === s.id ? "#fff" : "#666" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate */}
              <div>
                <button onClick={handleGenerateClick} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
                  {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Thumbnail"}
                </button>
                <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 6 }}>~5 credits</div>
                {genErr && (
                  <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginTop: 10 }}>
                    ✕ {genErr}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Result ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ width: "100%", aspectRatio: "16/9", background: "#111118", border: thumbnailUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {generating && <GeneratingLoader message="Generating your thumbnail" hint="20–30 seconds" />}
                {!generating && !thumbnailUrl && (
                  <div style={{ textAlign: "center", color: "#2a2a3a" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🖼</div>
                    <div style={{ fontSize: 13 }}>Your thumbnail will appear here</div>
                  </div>
                )}
                {thumbnailUrl && (
                  <img src={thumbnailUrl} alt="Generated thumbnail" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                )}
              </div>

              {thumbnailUrl && (
                <>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a href={thumbnailUrl} download={`thumbnail-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                      <button style={{ ...C.btnY, fontSize: 13 }}>↓ Download</button>
                    </a>
                    <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Regenerate</button>
                  </div>
                  {genTime && <div style={{ fontSize: 11, color: "#444", textAlign: "center" }}>Generated in {genTime}s</div>}
                </>
              )}
            </div>

          </div>
        )}

        {activeTab === "gallery" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: "'Outfit',sans-serif", color: "#e8e8f0" }}>My Generated Thumbnails</h2>
              <button onClick={loadThumbnails} className="text-[12px] text-[#7c5cfc] bg-transparent border-0 cursor-pointer hover:opacity-80">Refresh</button>
            </div>

            {loading && thumbnails.length === 0 && (
              <div className="flex justify-center pt-20">
                <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            )}

            {!loading && thumbnails.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="text-[48px]">🖼</div>
                <div className="text-[20px] font-bold text-[#e8e8f0]">No thumbnails yet</div>
                <div className="text-[14px] text-[#77777f]">Generate clickbait-style thumbnails for YouTube, Reels, and Shorts</div>
                <button onClick={() => setActiveTab("generate")}
                  className="mt-2 px-6 py-[10px] rounded-[10px] text-[14px] font-bold border-0 cursor-pointer"
                  style={{ background: "#f5c518", color: "#0b0b10" }}>
                  Generate First Thumbnail →
                </button>
              </div>
            )}

            {thumbnails.length > 0 && (
              <>
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {pagedThumbs.map((thumb, i) => (
                    <ThumbnailCard key={i} thumb={thumb} onDelete={handleDelete} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button onClick={() => setGallPage(p => Math.max(0, p - 1))} disabled={gallPage === 0}
                      className="px-4 py-[7px] rounded-[8px] text-[13px] border cursor-pointer transition-all disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", color: "#9494a8" }}>
                      ← Prev
                    </button>
                    <span className="text-[12px] px-3" style={{ color: "#55556a" }}>{gallPage + 1} / {totalPages}</span>
                    <button onClick={() => setGallPage(p => Math.min(totalPages - 1, p + 1))} disabled={gallPage === totalPages - 1}
                      className="px-4 py-[7px] rounded-[8px] text-[13px] border cursor-pointer transition-all disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)", color: "#9494a8" }}>
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {creditModal && (
        <CreditConfirmModal
          service="Thumbnail Generator"
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
