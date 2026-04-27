import { useState, useRef, useEffect } from "react";
import { serverFetch } from "../services/serverApi";
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

export default function PosterStudio() {
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
  const [history,    setHistory]    = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      const res  = await serverFetch("/api/poster/list");
      const data = await res.json();
      console.log("[poster/list] status:", res.status, "data:", data);
      if (res.ok) setHistory(data.posters || []);
    } catch (e) {
      console.error("[poster/list] error:", e.message);
    }
  }

  async function deletePoster(poster) {
    try {
      await serverFetch("/api/poster/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: poster.storageKey }),
      });
      if (posterUrl === poster.url) setPosterUrl(null);
      setHistory(h => h.filter(p => p.storageKey !== poster.storageKey));
    } catch (_) {}
  }
  const [genErr,     setGenErr]     = useState("");
  const [genTime,    setGenTime]    = useState(null);
  const [uploadErr,  setUploadErr]  = useState("");
  const [showUrl,    setShowUrl]    = useState(false);
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
      setUploadErr(e.message);
      setUploading(false);
      return null;
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
      const payload = { productImageUrl: finalUrl, brandName, headline, tagline, colorMood, language };
      console.log("[poster] sending payload:", payload);
      const res  = await serverFetch("/api/poster/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("[poster] response status:", res.status, "data:", data);
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPosterUrl(data.posterUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchHistory();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
  }

  const hasImage  = imageUrl || imageFile;
  const canGen    = hasImage && !generating && !uploading;

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Syne', sans-serif" }}>
            🖼️ Poster Studio
          </h1>
          <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
            Upload a product photo and generate a premium ad poster
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 28, alignItems: "start" }}>

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
                position: "relative",
              }}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Product" style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block", background: "#0b0b10" }} />
                  {/* Replace overlay */}
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>
                      ↑ Replace
                    </button>
                    <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>
                      🔗 URL
                    </button>
                    <button onClick={() => { setPreviewUrl(""); setImageUrl(""); setImageFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>
                      ✕ Remove
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📷</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 4 }}>Click to upload product image</div>
                  <div style={{ fontSize: 11, color: "#444" }}>JPG, PNG, WEBP</div>
                  <button
                    onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }}
                    style={{ ...C.btnG, fontSize: 11, padding: "5px 14px", marginTop: 12 }}
                  >
                    🔗 Paste URL instead
                  </button>
                </div>
              )}
            </div>

            {/* URL input (toggle) */}
            {showUrl && (
              <input
                style={C.inp}
                placeholder="https://…"
                value={imageFile ? "" : imageUrl}
                onChange={handleUrlPaste}
                autoFocus
              />
            )}
            {uploadErr && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {uploadErr}</div>}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />

            {/* Fields */}
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

            {/* Mood */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
              <label style={C.lbl}>Color Mood</label>
              <div style={{ display: "flex", gap: 8 }}>
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setColorMood(m.id)}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: colorMood === m.id ? "none" : "1px solid rgba(255,255,255,0.1)",
                      background: colorMood === m.id ? "#7c5cfc" : "transparent",
                      color: colorMood === m.id ? "#fff" : "#666",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
              <label style={C.lbl}>Text Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{ ...C.inp, cursor: "pointer" }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Generate */}
            <div>
              <button onClick={handleGenerate} disabled={!canGen} style={{ ...C.btnY, opacity: canGen ? 1 : 0.45 }}>
                {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Poster"}
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 6 }}>~5 credits</div>
              {genErr && (
                <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginTop: 10 }}>
                  ✕ {genErr}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Poster result ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{
              width: "100%", maxWidth: 380, aspectRatio: "9/16",
              background: "#111118",
              border: posterUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
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
              {posterUrl && (
                <img src={posterUrl} alt="Generated poster" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              )}
            </div>

            {posterUrl && (
              <div style={{ width: "100%", maxWidth: 380 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={posterUrl} download={`poster-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                    <button style={{ ...C.btnY, fontSize: 13 }}>↓ Download</button>
                  </a>
                  <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>
                    ↺ Regenerate
                  </button>
                </div>
                {genTime && <div style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 6 }}>Generated in {genTime}s</div>}
              </div>
            )}

          </div>

        </div>

        {/* ── Poster Gallery ── */}
        {history.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#9494a8", marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>
              Generated Posters
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {history.map((poster, i) => (
                <div key={i} style={{ position: "relative", aspectRatio: "9/16" }}>
                  <div
                    onClick={() => setPosterUrl(poster.url)}
                    style={{
                      width: "100%", height: "100%", borderRadius: 10, overflow: "hidden", cursor: "pointer",
                      border: poster.url === posterUrl ? "2px solid #7c5cfc" : "2px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <img src={poster.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <button
                    onClick={() => deletePoster(poster)}
                    style={{
                      position: "absolute", top: 6, right: 6,
                      background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 4,
                      color: "#f87171", fontSize: 11, cursor: "pointer", padding: "2px 6px", lineHeight: 1.4,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
