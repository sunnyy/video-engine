import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import AppLayout from "../ui/AppLayout";

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
  { id: "auto",     label: "Auto"     },
  { id: "bold",     label: "Bold"     },
  { id: "minimal",  label: "Minimal"  },
  { id: "vibrant",  label: "Vibrant"  },
  { id: "dark",     label: "Dark"     },
  { id: "cinematic",label: "Cinematic"},
];

const SIZES = [
  { id: "square",       label: "1:1",  w: 14, h: 14 },
  { id: "portrait_45",  label: "4:5",  w: 12, h: 15 },
  { id: "portrait_916", label: "9:16", w: 10, h: 17 },
];

function UploadBox({ label, file, preview, url, onFile, onUrl, onClear, inputRef, optional = true }) {
  const [showUrl, setShowUrl] = useState(false);
  return (
    <div>
      <label style={C.lbl}>{label} {optional && <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span>}</label>
      <div onClick={() => !preview && inputRef.current?.click()}
        style={{ background: "#333345", border: preview ? "1px solid rgba(255,255,255,0.12)" : "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, overflow: "hidden", cursor: preview ? "default" : "pointer" }}>
        {preview ? (
          <>
            <img src={preview} alt="" style={{ width: "100%", maxHeight: 130, objectFit: "contain", display: "block", background: "#22222e" }} />
            <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => inputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
              <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>🔗 URL</button>
              <button onClick={onClear} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
            </div>
          </>
        ) : (
          <div style={{ padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#b0b0d0", marginBottom: 8 }}>Click to upload</div>
            <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 12px" }}>🔗 Paste URL</button>
          </div>
        )}
      </div>
      {showUrl && (
        <input style={{ ...C.inp, marginTop: 8 }} placeholder="https://…" value={file ? "" : url}
          onChange={e => { onUrl(e.target.value); setShowUrl(false); }} autoFocus />
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} style={{ display: "none" }} />
    </div>
  );
}

export default function ThumbnailGenerator() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);

  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl,     setImageUrl]     = useState("");
  const imageInputRef = useRef();

  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoUrl,     setLogoUrl]     = useState("");
  const logoInputRef = useRef();

  const [title,      setTitle]      = useState("");
  const [subText,    setSubText]    = useState("");
  const [style,      setStyle]      = useState("auto");
  const [brandColor, setBrandColor] = useState("");
  const [platform,   setPlatform]   = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [generating, setGenerating] = useState(false);
  const [thumbUrl,   setThumbUrl]   = useState(null);
  const [genErr,     setGenErr]     = useState("");
  const [genTime,    setGenTime]    = useState(null);

  async function uploadImage(file) {
    const form = new FormData();
    form.append("image", file);
    const res  = await serverFetch("/api/thumbnail/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleGenerate() {
    setGenErr(""); setThumbUrl(null); setGenerating(true);
    const t0 = Date.now();
    try {
      setUploading(true);
      let finalImageUrl = imageUrl;
      let finalLogoUrl  = logoUrl;
      if (imageFile && !imageUrl) { finalImageUrl = await uploadImage(imageFile); setImageUrl(finalImageUrl); }
      if (logoFile  && !logoUrl)  { finalLogoUrl  = await uploadImage(logoFile);  setLogoUrl(finalLogoUrl); }
      setUploading(false);

      const res  = await serverFetch("/api/thumbnail/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl: finalImageUrl || null, logoUrl: finalLogoUrl || null, title, subText: subText || null, style, brandColor: brandColor || null, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setThumbUrl(data.thumbnailUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchCredits();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false); setUploading(false);
  }

  const canGenerate = title.trim() && platform && !generating && !uploading;

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#1C1C2E", flexShrink: 0 }}>
        <button onClick={() => navigate("/thumbnail")} style={{ background: "transparent", border: "none", color: "#7878a8", fontSize: 13, cursor: "pointer", padding: "4px 0", fontFamily: "'Outfit',sans-serif" }}>
          ← Thumbnails
        </button>
        <span style={{ color: "#2a2a3a", margin: "0 8px" }}>/</span>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>New Thumbnail</h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "400px 1fr", gap: 28, alignItems: "start" }}>

          {/* ── LEFT: Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <UploadBox
              label="Image"
              file={imageFile} preview={imagePreview} url={imageUrl}
              onFile={f => { setImageFile(f); setImagePreview(URL.createObjectURL(f)); setImageUrl(""); }}
              onUrl={u  => { setImageUrl(u);  setImagePreview(u); setImageFile(null); }}
              onClear={() => { setImageFile(null); setImagePreview(""); setImageUrl(""); }}
              inputRef={imageInputRef}
            />

            <UploadBox
              label="Logo"
              file={logoFile} preview={logoPreview} url={logoUrl}
              onFile={f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); setLogoUrl(""); }}
              onUrl={u  => { setLogoUrl(u);  setLogoPreview(u); setLogoFile(null); }}
              onClear={() => { setLogoFile(null); setLogoPreview(""); setLogoUrl(""); }}
              inputRef={logoInputRef}
            />

            {/* Title */}
            <div>
              <label style={C.lbl}>Title <span style={{ color: "#f87171", fontSize: 10 }}>*</span></label>
              <input style={C.inp} placeholder="e.g. I Made $10,000 in 30 Days" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Sub Text */}
            <div>
              <label style={C.lbl}>Sub Text <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <input style={C.inp} placeholder="e.g. This changed everything…" value={subText} onChange={e => setSubText(e.target.value)} />
            </div>

            {/* Style */}
            <div>
              <label style={C.lbl}>Style</label>
              <select value={style} onChange={e => setStyle(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {/* Brand Colors */}
            <div>
              <label style={C.lbl}>Brand Colors <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={brandColor || "#f5c518"} onChange={e => setBrandColor(e.target.value)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "none", cursor: "pointer", padding: 2, flexShrink: 0 }} />
                <input type="text" placeholder="#000000" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                  style={{ ...C.inp, width: 90 }} maxLength={7} />
                {brandColor && <button onClick={() => setBrandColor("")} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>Clear</button>}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {["#000000","#FFFFFF","#FF0000","#0066FF","#FFD700","#FF6600","#00AA44","#9900CC"].map(c => (
                  <div key={c} onClick={() => setBrandColor(c)}
                    style={{ width: 22, height: 22, borderRadius: 5, background: c, cursor: "pointer", border: brandColor === c ? "2px solid #f5c518" : "1px solid rgba(255,255,255,0.15)" }} />
                ))}
              </div>
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

            {/* Generate */}
            <div>
              <button onClick={handleGenerate} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
                {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Thumbnail"}
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#7070a0", marginTop: 6 }}>~10 credits</div>
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
              background: "#1C1C2E",
              border: thumbUrl ? "1px solid rgba(255,255,255,0.1)" : "2px dashed rgba(255,255,255,0.08)",
              borderRadius: 14, overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {generating && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 12 }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#f5c518", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: "#9090c0" }}>Generating thumbnail…</div>
                  <div style={{ fontSize: 11, color: "#7070a0", marginTop: 4 }}>20–30 seconds</div>
                </div>
              )}
              {!generating && !thumbUrl && (
                <div style={{ textAlign: "center", color: "#3a3a5a" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🖼</div>
                  <div style={{ fontSize: 13 }}>Your thumbnail will appear here</div>
                </div>
              )}
              {thumbUrl && (
                <img src={thumbUrl} alt="Generated thumbnail" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              )}
            </div>

            {thumbUrl && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => downloadFile(thumbUrl, `thumbnail-${Date.now()}.jpg`)} style={{ ...C.btnY, fontSize: 13, flex: 1 }}>↓ Download</button>
                <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Regenerate</button>
                <button onClick={() => navigate("/thumbnail")} style={{ ...C.btnG, flexShrink: 0 }}>← All</button>
              </div>
            )}
            {thumbUrl && genTime && (
              <div style={{ fontSize: 11, color: "#7070a0", textAlign: "center" }}>Generated in {genTime}s</div>
            )}
          </div>

        </div>
      </div>
      <style>{`@keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } }`}</style>
    </AppLayout>
  );
}
