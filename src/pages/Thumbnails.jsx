import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";
import SizeSelector from "../ui/SizeSelector";
import { useImageDrop } from "../ui/hooks/useImageDrop";

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
  inp:  { padding: "9px 12px", background: "#35354a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#b0b0cc", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnG: { padding: "9px 18px", background: "rgba(255,255,255,0.07)", color: "#c0c0d8", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", width: "100%" },
};

const STYLES = [
  { id: "bold",    label: "Bold"    },
  { id: "minimal", label: "Minimal" },
  { id: "vibrant", label: "Vibrant" },
  { id: "dark",    label: "Dark"    },
];

const THUMB_GOALS = [
  { id: "views",       label: "Views & Clicks"  },
  { id: "educational", label: "Educational"     },
  { id: "shocking",    label: "Shocking"        },
  { id: "tutorial",    label: "Tutorial"        },
  { id: "storytime",   label: "Story Time"      },
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

function ThumbnailCard({ thumb, onSelect, onDelete }) {
  const [hov,        setHov]        = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirming) { onDelete(thumb); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  };

  const createdAt = thumb.name
    ? timeLabel(new Date(parseInt(thumb.name.replace("thumb-", "").split(".")[0]) || Date.now()).toISOString())
    : "";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{
        position: "relative", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden",
        cursor: "pointer",
        border: `2px solid ${hov ? "rgba(124,92,252,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: "#1e1e30",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src={thumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov ? 1 : 0, transition: "opacity 0.2s", pointerEvents: hov ? "auto" : "none" }}>
        <button onClick={e => { e.stopPropagation(); downloadFile(thumb.url, `thumbnail-${Date.now()}.jpg`); }}
          style={{ padding: "8px 20px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
          ↓ Download
        </button>
      </div>

      <button onClick={handleDelete}
        style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 5, background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", border: "none", color: confirming ? "#fff" : "#bbb", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        ✕
      </button>

      {createdAt && (
        <div style={{ position: "absolute", bottom: 6, left: 6, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.65)", color: "#9494a8", backdropFilter: "blur(4px)", lineHeight: 1.4, pointerEvents: "none" }}>
          {createdAt}
        </div>
      )}
    </div>
  );
}

export default function Thumbnails() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);

  const [activeTab, setActiveTab] = useState("result");
  const [gallPage,  setGallPage]  = useState(0);

  const [imageUrl,     setImageUrl]     = useState("");
  const [previewUrl,   setPreviewUrl]   = useState("");
  const [imageFile,    setImageFile]    = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [thumbGoal,    setThumbGoal]    = useState("");
  const [platform,     setPlatform]     = useState("16:9");
  const [headline,     setHeadline]     = useState("");
  const [style,        setStyle]        = useState("bold");
  const [refFile,      setRefFile]      = useState(null);
  const [refUrl,       setRefUrl]       = useState("");
  const [refPreview,   setRefPreview]   = useState("");
  const [brandColor,   setBrandColor]   = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [genErr,       setGenErr]       = useState("");
  const [genTime,      setGenTime]      = useState(null);
  const [uploadErr,    setUploadErr]    = useState("");
  const [showUrl,      setShowUrl]      = useState(false);
  const [thumbnails,   setThumbnails]   = useState([]);
  const [loading,      setLoading]      = useState(false);

  const fileInputRef = useRef();
  const refInputRef  = useRef();

  useEffect(() => { loadThumbnails(); }, []);

  function loadThumbnails() {
    setLoading(true);
    serverFetch("/api/thumbnail/list")
      .then(r => r.json())
      .then(d => setThumbnails(d.thumbnails || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function selectFile(file) {
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageUrl("");
    setUploadErr("");
    setShowUrl(false);
  }
  function handleFilePick(e) { selectFile(e.target.files?.[0]); }
  const { drag, dropProps } = useImageDrop(selectFile);

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
        body:    JSON.stringify({ imageUrl: finalUrl || null, headline, style, thumbGoal, platform, brandColor: brandColor || null, referenceImageUrl: refUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setThumbnailUrl(data.thumbnailUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      setActiveTab("result");
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

  const canGenerate = headline && thumbGoal && !generating && !uploading;
  const totalPages  = Math.ceil(thumbnails.length / PAGE_SIZE);
  const pagedThumbs = thumbnails.slice(gallPage * PAGE_SIZE, (gallPage + 1) * PAGE_SIZE);

  return (
    <AppLayout>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", background: "#1E1E34" }}>
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Thumbnail Generator</h1>
          </div>

          {/* Scrollable form */}
          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Upload Assets */}
            <div>
              <label style={C.lbl}>Upload Assets <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <div
                onClick={() => !previewUrl && fileInputRef.current?.click()} {...dropProps}
                style={{ background: "#333345", border: previewUrl ? "1px solid rgba(255,255,255,0.12)" : `2px dashed ${drag ? "#7c5cfc" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, overflow: "hidden", cursor: previewUrl ? "default" : "pointer", transition: "border-color 0.15s" }}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Uploaded" style={{ width: "100%", maxHeight: 180, objectFit: "contain", display: "block", background: "#151523" }} />
                    <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
                      <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>🔗 URL</button>
                      <button onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "32px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#b0b0d0", marginBottom: 4 }}>Click or drop an image</div>
                    <div style={{ fontSize: 11, color: "#7878a8", marginBottom: 8 }}>JPG, PNG, WEBP</div>
                    <div style={{ fontSize: 11, color: "#6868a0", fontStyle: "italic", marginBottom: 10 }}>Leave empty for fully AI-generated</div>
                    <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 14px" }}>🔗 Paste URL instead</button>
                  </div>
                )}
              </div>
              {showUrl && (
                <input style={{ ...C.inp, marginTop: 8 }} placeholder="https://…" value={imageFile ? "" : imageUrl} onChange={handleUrlPaste} autoFocus />
              )}
              {uploadErr && <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>✕ {uploadErr}</div>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

            {/* Thumbnail Goal */}
            <div>
              <label style={C.lbl}>Thumbnail Goal</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {THUMB_GOALS.map(g => (
                  <button key={g.id} onClick={() => setThumbGoal(g.id)}
                    style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: thumbGoal === g.id ? "none" : "1px solid rgba(255,255,255,0.18)", background: thumbGoal === g.id ? "#7c5cfc" : "rgba(255,255,255,0.04)", color: thumbGoal === g.id ? "#fff" : "#a0a0c8" }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <SizeSelector value={platform} onChange={setPlatform} options={["16:9", "9:16"]} accent="#7c5cfc" />
            </div>

            {/* Headline */}
            <div>
              <label style={C.lbl}>Headline</label>
              <input style={C.inp} placeholder="e.g. I Made $10,000 in 30 Days" value={headline} onChange={e => setHeadline(e.target.value)} />
            </div>

            {/* Thumbnail Style */}
            <div>
              <label style={C.lbl}>Thumbnail Style</label>
              <div style={{ display: "flex", gap: 8 }}>
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: style === s.id ? "none" : "1px solid rgba(255,255,255,0.18)", background: style === s.id ? "#7c5cfc" : "rgba(255,255,255,0.04)", color: style === s.id ? "#fff" : "#a0a0c8" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div>
              <label style={C.lbl}>Reference <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              {refPreview ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={refPreview} alt="Reference" style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "#22222e" }} />
                  <span style={{ fontSize: 11, color: "#9090b8", flex: 1 }}>{refFile?.name || "Reference image"}</span>
                  <button onClick={() => { setRefPreview(""); setRefUrl(""); setRefFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => refInputRef.current?.click()} style={{ ...C.btnG, fontSize: 12 }}>↑ Upload Reference</button>
                </div>
              )}
              <input ref={refInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { setRefFile(f); setRefPreview(URL.createObjectURL(f)); setRefUrl(""); } e.target.value = ""; }} />
            </div>

            {/* Brand Colors */}
            <div>
              <label style={C.lbl}>Brand Colors <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={brandColor || "#7c5cfc"} onChange={e => setBrandColor(e.target.value)}
                  style={{ width: 40, height: 36, borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "none", cursor: "pointer", padding: 2 }} />
                <input type="text" placeholder="#FF0000" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                  style={{ ...C.inp, width: 100 }} maxLength={7} />
                {brandColor && <button onClick={() => setBrandColor("")} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>Clear</button>}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {["#FF0000","#0066FF","#00AA44","#FF6600","#9900CC","#FFD700","#000000","#FFFFFF"].map(c => (
                  <div key={c} onClick={() => setBrandColor(c)} style={{ width: 22, height: 22, borderRadius: 4, background: c, cursor: "pointer", border: brandColor === c ? "2px solid #7c5cfc" : "1px solid rgba(255,255,255,0.15)" }} />
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
            <button onClick={handleGenerateClick} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
              {generating ? "Generating…" : uploading ? "Uploading…" : `✦ Generate · ${SERVICE_COSTS.thumbnail.total} credits`}
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#151523" }}>
          {/* Tab bar */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#151523", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
            <div style={{ display: "flex" }}>
              {[["result", "Result"], ["gallery", `My Thumbnails${thumbnails.length ? ` (${thumbnails.length})` : ""}`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: "16px 20px", border: "none", background: "transparent", color: activeTab === id ? "#a78bfa" : "#8888b8", fontSize: 14, fontWeight: activeTab === id ? 700 : 500, fontFamily: "'Outfit',sans-serif", cursor: "pointer", borderBottom: activeTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "gallery" && (
              <button onClick={loadThumbnails} style={{ fontSize: 12, color: "#7c5cfc", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            )}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {activeTab === "result" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", gap: 16 }}>
                {generating && (
                  <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", position: "relative", background: "#2e2e40" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 35%, rgba(124,92,252,0.1) 50%, transparent 65%)", backgroundSize: "200% 100%", animation: "thumb-shimmer 1.6s ease-in-out infinite" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#9090c0" }}>Generating thumbnail</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c5cfc", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#7070a0" }}>20–30 seconds</div>
                  </div>
                )}
                {!generating && !thumbnailUrl && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>🖼</div>
                    <div style={{ fontSize: 14, color: "#6868a0" }}>Your thumbnail will appear here</div>
                  </div>
                )}
                {thumbnailUrl && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 560 }}>
                    <img src={thumbnailUrl} alt="Generated thumbnail" style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", display: "block" }} />
                    <div style={{ width: "100%", display: "flex", gap: 10 }}>
                      <button onClick={() => downloadFile(thumbnailUrl, `thumbnail-${Date.now()}.jpg`)} style={{ ...C.btnY, fontSize: 13, flex: 1 }}>↓ Download</button>
                      <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Regenerate</button>
                    </div>
                    {genTime && <div style={{ fontSize: 11, color: "#7070a0" }}>Generated in {genTime}s</div>}
                  </div>
                )}
              </div>
            )}

            {activeTab === "gallery" && (
              <>
                {loading && thumbnails.length === 0 && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                    <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
                {!loading && thumbnails.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>🖼</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No thumbnails yet</div>
                    <div style={{ fontSize: 13, color: "#9090c0" }}>Generate clickbait-style thumbnails for YouTube, Reels, and Shorts</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#f5c518", color: "#0b0b10" }}>
                      Generate First Thumbnail →
                    </button>
                  </div>
                )}
                {thumbnails.length > 0 && (
                  <>
                    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                      {pagedThumbs.map((thumb, i) => (
                        <ThumbnailCard key={i} thumb={thumb} onDelete={handleDelete} onSelect={() => { setThumbnailUrl(thumb.url); setActiveTab("result"); }} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
                        <button onClick={() => setGallPage(p => Math.max(0, p - 1))} disabled={gallPage === 0}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "#a0a0cc", cursor: "pointer", opacity: gallPage === 0 ? 0.4 : 1 }}>← Prev</button>
                        <span style={{ fontSize: 12, color: "#8888b8", padding: "0 8px" }}>{gallPage + 1} / {totalPages}</span>
                        <button onClick={() => setGallPage(p => Math.min(totalPages - 1, p + 1))} disabled={gallPage === totalPages - 1}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "#a0a0cc", cursor: "pointer", opacity: gallPage === totalPages - 1 ? 0.4 : 1 }}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes thumb-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } } .left-panel-scroll::-webkit-scrollbar { width: 10px; } .left-panel-scroll::-webkit-scrollbar-track { background: transparent; } .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; } .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }`}</style>
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
