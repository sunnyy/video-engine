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
  inp:  { padding: "9px 12px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  lbl:  { fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" },
  btnG: { padding: "9px 18px", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnY: { padding: "11px 24px", background: "#f5c518", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", width: "100%" },
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

const ASPECT_RATIOS = [
  { id: "1:1",  label: "1:1 Square"   },
  { id: "4:5",  label: "4:5 Portrait" },
  { id: "9:16", label: "9:16 Story"   },
];

const RESULT_SIZE = {
  "1:1":  { ratio: "1/1",  maxWidth: 400 },
  "4:5":  { ratio: "4/5",  maxWidth: 360 },
  "9:16": { ratio: "9/16", maxWidth: 280 },
};

const PAGE_SIZE = 12;

function PostCard({ post, onDelete }) {
  const [hov,       setHov]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ar = post.aspect_ratio === "4:5" ? "4/5" : post.aspect_ratio === "9:16" ? "9/16" : "1/1";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{ position: "relative", aspectRatio: ar, borderRadius: 10, overflow: "hidden", border: `2px solid ${hov ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.2s", background: "#111118" }}>
      <img src={post.post_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      {hov && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <a href={post.post_url} download target="_blank" rel="noreferrer"
            style={{ padding: "7px 16px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>↓ Download</a>
        </div>
      )}
      <button
        onClick={() => confirming ? onDelete(post) : (setConfirming(true), setTimeout(() => setConfirming(false), 2500))}
        style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 4, color: confirming ? "#f87171" : "#aaa", fontSize: 11, cursor: "pointer", padding: "2px 6px", lineHeight: 1.4 }}>
        {confirming ? "Sure?" : "✕"}
      </button>
    </div>
  );
}

export default function SocialPostGenerator() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);

  const [activeTab, setActiveTab] = useState("history");

  // form state
  const [refFile,     setRefFile]     = useState(null);
  const [refUrl,      setRefUrl]      = useState("");
  const [refPreview,  setRefPreview]  = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoUrl,     setLogoUrl]     = useState("");
  const [brandColor,  setBrandColor]  = useState("");
  const [brandName,   setBrandName]   = useState("");
  const [headline,    setHeadline]    = useState("");
  const [subtext,     setSubtext]     = useState("");
  const [niche,       setNiche]       = useState("");
  const [style,       setStyle]       = useState("modern");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [generating,  setGenerating]  = useState(false);
  const [postUrl,     setPostUrl]     = useState(null);
  const [genErr,      setGenErr]      = useState("");
  const [genTime,     setGenTime]     = useState(null);
  const [uploadErr,   setUploadErr]   = useState("");
  const [showUrl,     setShowUrl]     = useState(false);

  const fileInputRef = useRef();
  const logoInputRef = useRef();

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
      const res  = await serverFetch("/api/social-post/list");
      const data = await res.json();
      if (res.ok) setHistory(data.posts || []);
    } catch (_) {}
    setHistLoad(false);
  }

  async function deletePost(post) {
    try {
      await serverFetch("/api/social-post/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: post.id, storageKey: post.storage_key }),
      });
      setHistory(h => h.filter(p => p.id !== post.id));
    } catch (_) {}
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFile(file); setRefPreview(URL.createObjectURL(file)); setRefUrl(""); setUploadErr(""); setShowUrl(false);
  }

  function handleUrlPaste(e) {
    const url = e.target.value;
    setRefUrl(url); setRefPreview(url); setRefFile(null); setUploadErr("");
  }

  async function handleGenerateClick() {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.social_post;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
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
        const res  = await serverFetch("/api/social-post/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        finalRefUrl = data.url; setRefUrl(data.url); setUploading(false);
      }

      let finalLogoUrl = logoUrl;
      if (logoFile && !logoUrl) {
        const form = new FormData();
        form.append("image", logoFile);
        const res  = await serverFetch("/api/social-post/upload", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok) { finalLogoUrl = data.url; setLogoUrl(data.url); }
      }

      const res  = await serverFetch("/api/social-post/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ referenceImageUrl: finalRefUrl || null, logoUrl: finalLogoUrl || null, brandColor: brandColor || null, headline, subtext, brandName, niche, style, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPostUrl(data.postUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      fetchCredits();
      loadHistory();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false); setUploading(false);
  }

  const canGenerate = niche && !generating && !uploading;
  const { ratio: resultRatio, maxWidth: resultMaxW } = RESULT_SIZE[aspectRatio] || RESULT_SIZE["1:1"];

  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const paginated  = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f5c518", fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>Banner Design</h1>
        <div style={{ display: "flex", gap: 4 }}>
          {[["history", `My Banners${history.length ? ` (${history.length})` : ""}`], ["generate", "Create New"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                background: activeTab === id ? "rgba(124,92,252,0.15)" : "transparent",
                color: activeTab === id ? "#a78bfa" : "#55556a",
                fontSize: 16, fontWeight: activeTab === id ? 700 : 500,
                fontFamily: "'Outfit',sans-serif", cursor: "pointer", transition: "all 0.15s",
                borderBottom: activeTab === id ? "2px solid #7c5cfc" : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>

        {activeTab === "generate" && (
          <div style={{ maxWidth: 1300, margin: "0 auto", display: "grid", gridTemplateColumns: "260px 1fr 1fr", gap: 24, alignItems: "start" }}>

            {/* ── LEFT: Reference image ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#55556a", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace" }}>
                Reference Post
              </div>
              <div onClick={() => !refPreview && fileInputRef.current?.click()} style={{ background: "#111118", border: refPreview ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", cursor: refPreview ? "default" : "pointer" }}>
                {refPreview ? (
                  <>
                    <img src={refPreview} alt="Reference" style={{ width: "100%", objectFit: "contain", display: "block", background: "#0b0b10" }} />
                    <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
                      <button onClick={() => fileInputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
                      <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>🔗 URL</button>
                      <button onClick={() => { setRefPreview(""); setRefUrl(""); setRefFile(null); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕</button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "32px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#9494a8", marginBottom: 4 }}>Drop a reference post</div>
                    <div style={{ fontSize: 11, color: "#444", marginBottom: 10 }}>Optional — for style inspiration</div>
                    <button onClick={e => { e.stopPropagation(); setShowUrl(v => !v); }} style={{ ...C.btnG, fontSize: 11, padding: "5px 12px" }}>🔗 URL</button>
                  </div>
                )}
              </div>
              {showUrl && <input style={C.inp} placeholder="https://…" value={refFile ? "" : refUrl} onChange={handleUrlPaste} autoFocus />}
              {uploadErr && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {uploadErr}</div>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: "none" }} />
            </div>

            {/* ── CENTER: Form ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Brand fields */}
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>

                <div>
                  <label style={C.lbl}>Logo <span style={{ color: "#444", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {logoUrl || logoFile ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img src={logoFile ? URL.createObjectURL(logoFile) : logoUrl} style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "#0d0d14" }} />
                        <button onClick={() => { setLogoFile(null); setLogoUrl(""); }} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current?.click()} style={{ ...C.btnG, fontSize: 12 }}>↑ Upload Logo</button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoUrl(""); } e.target.value = ""; }} />
                  </div>
                </div>

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
                  <textarea style={{ ...C.inp, resize: "vertical", minHeight: 96 }} rows={4}
                    placeholder={"Describe your service or offer in a sentence or two.\ne.g. We help small businesses get more clients through social media. DM us or visit growthive.com — call/WhatsApp: +1 555 123 4567"}
                    value={subtext} onChange={e => setSubtext(e.target.value)} />
                </div>

                <div>
                  <label style={C.lbl}>Brand Color <span style={{ color: "#444", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="color" value={brandColor || "#7c5cfc"} onChange={e => setBrandColor(e.target.value)}
                      style={{ width: 40, height: 36, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "none", cursor: "pointer", padding: 2 }} />
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

              {/* Niche + Style + Aspect Ratio */}
              <div style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={C.lbl}>Niche <span style={{ color: "#f87171", fontSize: 10, textTransform: "none", fontWeight: 700 }}>required</span></label>
                  <select value={niche} onChange={e => setNiche(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                    <option value="">Select your niche…</option>
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div>
                  <label style={C.lbl}>Style</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {STYLES.map(s => (
                      <button key={s.id} onClick={() => setStyle(s.id)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: style === s.id ? "none" : "1px solid rgba(255,255,255,0.1)", background: style === s.id ? "#7c5cfc" : "transparent", color: style === s.id ? "#fff" : "#666" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={C.lbl}>Aspect Ratio</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {ASPECT_RATIOS.map(({ id, label }) => (
                      <button key={id} onClick={() => setAspectRatio(id)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: aspectRatio === id ? "none" : "1px solid rgba(255,255,255,0.1)", background: aspectRatio === id ? "#7c5cfc" : "transparent", color: aspectRatio === id ? "#fff" : "#666" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate */}
              <div>
                <button onClick={handleGenerateClick} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
                  {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Banner"}
                </button>
                <div style={{ textAlign: "center", fontSize: 11, color: "#444", marginTop: 6 }}>~10 credits</div>
                {genErr && <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)", marginTop: 10 }}>✕ {genErr}</div>}
              </div>
            </div>

            {/* ── RIGHT: Result ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ width: "100%", maxWidth: resultMaxW, aspectRatio: resultRatio, background: "#111118", border: postUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {generating && <GeneratingLoader message="Generating your banner" hint="20–30 seconds" />}
                {!generating && !postUrl && (
                  <div style={{ textAlign: "center", color: "#2a2a3a" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
                    <div style={{ fontSize: 13 }}>Your banner will appear here</div>
                  </div>
                )}
                {postUrl && <img src={postUrl} alt="Generated banner" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
              </div>

              {postUrl && (
                <div style={{ width: "100%", maxWidth: resultMaxW }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <a href={postUrl} download={`banner-${Date.now()}.jpg`} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>📱</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No banners yet</div>
                <div style={{ fontSize: 15, color: "#77777f" }}>Generate your first social media banner</div>
                <button onClick={() => setActiveTab("generate")} style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                  Generate First Banner
                </button>
              </div>
            )}

            {!histLoad && history.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: "#55556a", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                  {history.length} banner{history.length !== 1 ? "s" : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                  {paginated.map(post => (
                    <PostCard key={post.id} post={post} onDelete={deletePost} />
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
      {creditModal && (
        <CreditConfirmModal
          service="Social Post Generator"
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
