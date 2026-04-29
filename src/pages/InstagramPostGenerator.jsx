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

const STYLES = [
  { id: "modern",  label: "Modern"  },
  { id: "playful", label: "Playful" },
  { id: "luxury",  label: "Luxury"  },
  { id: "minimal", label: "Minimal" },
  { id: "bold",    label: "Bold"    },
];

const NICHES = [
  "Digital Marketing", "Business & Entrepreneurship", "Fitness & Health",
  "Food & Restaurant", "Fashion & Beauty", "Real Estate", "Technology",
  "Education & Coaching", "Travel & Lifestyle", "Finance & Investment",
  "Motivation & Mindset", "E-commerce & Products",
];

export default function InstagramPostGenerator() {
  const fetchCredits = useCreditsStore(s => s.fetchCredits);

  const [refFile,     setRefFile]     = useState(null);
  const [refUrl,      setRefUrl]      = useState("");
  const [refPreview,  setRefPreview]  = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [brandName,   setBrandName]   = useState("");
  const [headline,    setHeadline]    = useState("");
  const [subtext,     setSubtext]     = useState("");
  const [niche,       setNiche]       = useState("");
  const [style,       setStyle]       = useState("modern");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [generating,  setGenerating]  = useState(false);
  const [postUrl,     setPostUrl]     = useState(null);
  const [history,     setHistory]     = useState([]);
  const [genErr,      setGenErr]      = useState("");
  const [genTime,     setGenTime]     = useState(null);
  const [uploadErr,   setUploadErr]   = useState("");
  const [showUrl,     setShowUrl]     = useState(false);

  const fileInputRef = useRef();

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    try {
      const res  = await serverFetch("/api/instagram/list");
      const data = await res.json();
      if (res.ok) setHistory(data.posts || []);
    } catch (_) {}
  }

  async function deletePost(post) {
    try {
      await serverFetch("/api/instagram/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, storageKey: post.storage_key }),
      });
      if (postUrl === post.post_url) setPostUrl(null);
      setHistory(h => h.filter(p => p.id !== post.id));
    } catch (_) {}
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFile(file);
    setRefPreview(URL.createObjectURL(file));
    setRefUrl("");
    setUploadErr("");
    setShowUrl(false);
  }

  function handleUrlPaste(e) {
    const url = e.target.value;
    setRefUrl(url);
    setRefPreview(url);
    setRefFile(null);
    setUploadErr("");
  }

  async function handleGenerate() {
    setGenErr(""); setPostUrl(null); setGenerating(true);
    const t0 = Date.now();
    try {
      let finalRefUrl = refUrl;
      if (refFile && !refUrl) {
        setUploading(true);
        const form = new FormData();
        form.append("image", refFile);
        const res  = await serverFetch("/api/instagram/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        finalRefUrl = data.url;
        setRefUrl(data.url);
        setUploading(false);
      }

      const res  = await serverFetch("/api/instagram/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ referenceImageUrl: finalRefUrl || null, headline, subtext, brandName, niche, style, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPostUrl(data.postUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchHistory();
      fetchCredits();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false);
    setUploading(false);
  }

  const canGenerate = niche && !generating && !uploading;

  const resultAspect = aspectRatio === "1:1" ? "1/1" : "4/5";
  const resultMaxW   = aspectRatio === "1:1" ? 400 : 360;

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e8e8f0", margin: 0, fontFamily: "'Syne', sans-serif" }}>
            📱 Instagram Post Generator
          </h1>
          <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
            Upload a reference post or describe your idea — AI generates a ready-to-post graphic
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 28, alignItems: "start" }}>

          {/* ── LEFT: Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Reference image */}
            <div
              onClick={() => !refPreview && fileInputRef.current?.click()}
              style={{
                background: "#111118",
                border: refPreview ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)",
                borderRadius: 12,
                overflow: "hidden",
                cursor: refPreview ? "default" : "pointer",
                position: "relative",
              }}
            >
              {refPreview ? (
                <>
                  <img src={refPreview} alt="Reference" style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block", background: "#0b0b10" }} />
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>↑ Replace</button>
                    <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>🔗 URL</button>
                    <button onClick={() => { setRefPreview(""); setRefUrl(""); setRefFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
                  </div>
                </>
              ) : (
                <div style={{ padding: "28px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#9494a8", marginBottom: 3 }}>Reference Post <span style={{ color: "#44444f", fontWeight: 400 }}>(optional)</span></div>
                  <div style={{ fontSize: 11, color: "#444" }}>Upload a similar post for style inspiration</div>
                  <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 14px", marginTop: 10 }}>
                    🔗 Paste URL instead
                  </button>
                </div>
              )}
            </div>

            {showUrl && (
              <input style={C.inp} placeholder="https://…" value={refFile ? "" : refUrl} onChange={handleUrlPaste} autoFocus />
            )}
            {uploadErr && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {uploadErr}</div>}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />

            {/* Content fields */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={C.lbl}>Brand Name <span style={{ color: "#333", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                <input style={C.inp} placeholder="e.g. GrowthHive" value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
              <div>
                <label style={C.lbl}>Headline <span style={{ color: "#333", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                <input style={C.inp} placeholder="e.g. Grow Your Business 10x" value={headline} onChange={e => setHeadline(e.target.value)} />
              </div>
              <div>
                <label style={C.lbl}>Subtext <span style={{ color: "#333", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  style={{ ...C.inp, resize: "vertical", minHeight: 56 }}
                  rows={2}
                  placeholder="e.g. Join 10,000+ entrepreneurs who scaled with us"
                  value={subtext}
                  onChange={e => setSubtext(e.target.value)}
                />
              </div>
            </div>

            {/* Niche */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
              <label style={C.lbl}>Niche <span style={{ color: "#f87171", fontSize: 10, textTransform: "none", fontWeight: 700 }}>required</span></label>
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
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: style === s.id ? "none" : "1px solid rgba(255,255,255,0.1)",
                      background: style === s.id ? "#7c5cfc" : "transparent",
                      color: style === s.id ? "#fff" : "#666",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
              <label style={C.lbl}>Aspect Ratio</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["1:1", "1:1 Square"], ["4:5", "4:5 Portrait"]].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setAspectRatio(val)}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      border: aspectRatio === val ? "none" : "1px solid rgba(255,255,255,0.1)",
                      background: aspectRatio === val ? "#7c5cfc" : "transparent",
                      color: aspectRatio === val ? "#fff" : "#666",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <div>
              <button onClick={handleGenerate} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
                {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Post"}
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 6 }}>~10 credits</div>
              {genErr && (
                <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginTop: 10 }}>
                  ✕ {genErr}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Result ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{
              width: "100%", maxWidth: resultMaxW, aspectRatio: resultAspect,
              background: "#111118",
              border: postUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {generating && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>✦</div>
                  <div style={{ fontSize: 13, color: "#9494a8" }}>Generating your post…</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>20–30 seconds</div>
                </div>
              )}
              {!generating && !postUrl && (
                <div style={{ textAlign: "center", color: "#2a2a3a" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
                  <div style={{ fontSize: 13 }}>Your post will appear here</div>
                </div>
              )}
              {postUrl && (
                <img src={postUrl} alt="Generated post" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              )}
            </div>

            {postUrl && (
              <div style={{ width: "100%", maxWidth: resultMaxW }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={postUrl} download={`post-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
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

        {/* ── Gallery ── */}
        <div style={{ marginTop: 48 }}>
          {history.length === 0 ? (
            <div style={{ fontSize: 13, color: "#333", textAlign: "center", padding: "20px 0" }}>
              No posts yet. Generate your first Instagram post.
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#9494a8", marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>
                Generated Posts
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                {history.map(post => {
                  const ar = post.aspect_ratio === "4:5" ? "4/5" : "1/1";
                  return (
                    <div key={post.id} style={{ position: "relative", aspectRatio: ar }}>
                      <a href={post.post_url} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", height: "100%" }}>
                        <div style={{
                          width: "100%", height: "100%", borderRadius: 10, overflow: "hidden",
                          border: post.post_url === postUrl ? "2px solid #7c5cfc" : "2px solid rgba(255,255,255,0.06)",
                        }}>
                          <img src={post.post_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </div>
                      </a>
                      <button
                        onClick={() => deletePost(post)}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 4,
                          color: "#f87171", fontSize: 11, cursor: "pointer", padding: "2px 6px", lineHeight: 1.4,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
