import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

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

export default function ThumbnailGenerator() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);

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

  const fileInputRef = useRef();

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
    } catch (e) {
      setGenErr(e.message);
    }
    setGenerating(false);
  }

  const canGenerate = headline && niche && !generating && !uploading;

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/thumbnail")}
            style={{ background: "transparent", border: "none", color: "#77777f", fontSize: 13, cursor: "pointer", padding: "4px 0", fontFamily: "'Outfit',sans-serif" }}
          >
            ← Thumbnails
          </button>
          <span style={{ color: "#2a2a3a" }}>/</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>
            New Thumbnail
          </h1>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "400px 1fr", gap: 28, alignItems: "start" }}>

          {/* ── LEFT: Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Upload zone */}
            <div
              onClick={() => !previewUrl && fileInputRef.current?.click()}
              style={{
                background: "#111118",
                border: previewUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)",
                borderRadius: 12,
                overflow: "hidden",
                cursor: previewUrl ? "default" : "pointer",
              }}
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
                  <button key={s.id} onClick={() => setStyle(s.id)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: style === s.id ? "none" : "1px solid rgba(255,255,255,0.1)",
                    background: style === s.id ? "#7c5cfc" : "transparent",
                    color: style === s.id ? "#fff" : "#666",
                  }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <div>
              <button onClick={handleGenerate} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
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
            <div style={{
              width: "100%", aspectRatio: "16/9",
              background: "#111118",
              border: thumbnailUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)",
              borderRadius: 12, overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {generating && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>✦</div>
                  <div style={{ fontSize: 13, color: "#9494a8" }}>Generating your thumbnail…</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>20–30 seconds</div>
                </div>
              )}
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
              <div style={{ display: "flex", gap: 10 }}>
                <a href={thumbnailUrl} download={`thumbnail-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <button style={{ ...C.btnY, fontSize: 13 }}>↓ Download</button>
                </a>
                <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Regenerate</button>
                <button onClick={() => navigate("/thumbnail")} style={{ ...C.btnG, flexShrink: 0 }}>← All Thumbnails</button>
              </div>
            )}
            {thumbnailUrl && genTime && (
              <div style={{ fontSize: 11, color: "#444", textAlign: "center" }}>Generated in {genTime}s</div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
