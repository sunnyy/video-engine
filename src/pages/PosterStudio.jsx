import { useState, useRef } from "react";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";

const C = {
  card:  { background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 },
  inp:   { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:   { fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnP:  { padding: "10px 24px", background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnG:  { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY:  { padding: "10px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" },
};

const MOODS = [
  { id: "luxury",  label: "Luxury"  },
  { id: "dark",    label: "Dark"    },
  { id: "light",   label: "Light"   },
  { id: "vibrant", label: "Vibrant" },
];

export default function PosterStudio() {
  const [imageUrl,   setImageUrl]   = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile,  setImageFile]  = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [brandName,  setBrandName]  = useState("");
  const [headline,   setHeadline]   = useState("");
  const [tagline,    setTagline]    = useState("");
  const [colorMood,  setColorMood]  = useState("luxury");
  const [generating, setGenerating] = useState(false);
  const [posterUrl,  setPosterUrl]  = useState(null);
  const [genErr,     setGenErr]     = useState("");
  const [genTime,    setGenTime]    = useState(null);
  const [uploadErr,  setUploadErr]  = useState("");
  const fileInputRef = useRef();

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
    if (!imageFile && !imageUrl) { setUploadErr("Select an image or paste a URL."); return; }
    if (imageFile) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("image", imageFile);
        const res  = await serverFetch("/api/poster/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setImageUrl(data.url);
        setPreviewUrl(data.url);
      } catch (e) { setUploadErr(e.message); setUploading(false); return; }
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!imageUrl && !imageFile) return;
    let finalUrl = imageUrl;
    if (imageFile && !imageUrl) {
      await handleUpload();
      finalUrl = imageUrl;
      if (!finalUrl) return;
    }
    setGenerating(true); setGenErr(""); setPosterUrl(null);
    const t0 = Date.now();
    try {
      const res  = await serverFetch("/api/poster/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ productImageUrl: finalUrl || imageUrl, brandName, headline, tagline, colorMood }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPosterUrl(data.posterUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  const canGenerate = (imageUrl || imageFile) && !generating && !uploading;

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Syne', sans-serif" }}>
            🖼️ Poster Studio
          </h1>
          <p style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
            Upload a product photo and generate a premium ad poster
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>

          {/* ── LEFT: Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Image upload */}
            <div style={{ ...C.card, padding: 20 }}>
              <label style={C.lbl}>Product Image</label>

              {/* Preview */}
              {previewUrl && (
                <div style={{ width: "100%", aspectRatio: "9/16", borderRadius: 8, overflow: "hidden", background: "#0b0b10", marginBottom: 12 }}>
                  <img src={previewUrl} alt="Product" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ ...C.btnG, fontSize: 12, padding: "7px 14px" }}
                >
                  {uploading ? "Uploading…" : "↑ Upload"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFilePick}
                  style={{ display: "none" }}
                />
              </div>

              <input
                style={C.inp}
                placeholder="Or paste image URL…"
                value={imageFile ? "" : imageUrl}
                onChange={handleUrlPaste}
              />
              {uploadErr && <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>✕ {uploadErr}</div>}
            </div>

            {/* Optional fields */}
            <div style={{ ...C.card, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={C.lbl}>Brand Name <span style={{ color: "#444", fontWeight: 400 }}>(optional)</span></label>
                <input style={C.inp} placeholder="e.g. LUMIÈRE" value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
              <div>
                <label style={C.lbl}>Headline <span style={{ color: "#444", fontWeight: 400 }}>(optional)</span></label>
                <input style={C.inp} placeholder="e.g. Redefine Your Glow" value={headline} onChange={e => setHeadline(e.target.value)} />
              </div>
              <div>
                <label style={C.lbl}>Tagline <span style={{ color: "#444", fontWeight: 400 }}>(optional)</span></label>
                <input style={C.inp} placeholder="e.g. Premium skincare, naturally crafted" value={tagline} onChange={e => setTagline(e.target.value)} />
              </div>
            </div>

            {/* Color Mood */}
            <div style={{ ...C.card, padding: 20 }}>
              <label style={C.lbl}>Color Mood</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setColorMood(m.id)}
                    style={{
                      padding: "7px 18px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: colorMood === m.id ? "none" : "1px solid rgba(255,255,255,0.12)",
                      background: colorMood === m.id ? "#7c5cfc" : "transparent",
                      color: colorMood === m.id ? "#fff" : "#888",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  style={{ ...C.btnY, flex: 1, opacity: canGenerate ? 1 : 0.5 }}
                >
                  {generating ? "Generating…" : "✦ Generate Poster"}
                </button>
                <span style={{ fontSize: 11, color: "#555", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.15)", borderRadius: 6, padding: "4px 8px", whiteSpace: "nowrap" }}>
                  ~5 credits
                </span>
              </div>
              {genErr && (
                <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)" }}>
                  ✕ {genErr}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Result ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              ...C.card,
              width: "100%", aspectRatio: "9/16",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              border: posterUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.08)",
            }}>
              {generating && (
                <div style={{ textAlign: "center", color: "#555" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
                  <div style={{ fontSize: 13, color: "#9494a8" }}>Generating your poster…</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>This takes about 20–30 seconds</div>
                </div>
              )}
              {!generating && !posterUrl && (
                <div style={{ textAlign: "center", color: "#333" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🖼️</div>
                  <div style={{ fontSize: 13 }}>Your poster will appear here</div>
                </div>
              )}
              {posterUrl && (
                <img src={posterUrl} alt="Generated poster" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>

            {posterUrl && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <a href={posterUrl} download={`poster-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                  <button style={{ ...C.btnY, width: "100%" }}>↓ Download Poster</button>
                </a>
                <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>
                  ↺ Regenerate
                </button>
              </div>
            )}

            {genTime && posterUrl && (
              <div style={{ fontSize: 11, color: "#444", textAlign: "center" }}>
                Generated in {genTime}s
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
