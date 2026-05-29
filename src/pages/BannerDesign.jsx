import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import { useCreditsStore } from "../store/useCreditsStore";
import { getCredits } from "../services/credits/creditService";
import { SERVICE_COSTS } from "../core/utils/creditCosts";
import CreditConfirmModal from "../ui/CreditConfirmModal";
import AppLayout from "../ui/AppLayout";

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff}d ago`;
  return d.toLocaleDateString();
}

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

const GOALS = [
  { id: "brand_awareness", label: "Brand Awareness" },
  { id: "sell_product",    label: "Sell Product"    },
  { id: "launch_campaign", label: "Launch Campaign" },
  { id: "promotion",       label: "Promotion"       },
  { id: "engagement",      label: "Engagement"      },
];

const STYLES = [
  { id: "auto",       label: "Auto"       },
  { id: "luxury",     label: "Luxury"     },
  { id: "minimal",    label: "Minimal"    },
  { id: "editorial",  label: "Editorial"  },
  { id: "futuristic", label: "Futuristic" },
  { id: "playful",    label: "Playful"    },
  { id: "cinematic",  label: "Cinematic"  },
];

const PLATFORMS = [
  { id: "square_11",   label: "1:1 Square"   },
  { id: "portrait_45", label: "4:5 Portrait" },
  { id: "story_916",   label: "9:16 Story"   },
];

const RESULT_SIZE = {
  square_11:   { ratio: "1/1",  maxWidth: 480 },
  portrait_45: { ratio: "4/5",  maxWidth: 400 },
  story_916:   { ratio: "9/16", maxWidth: 300 },
};

const PAGE_SIZE = 12;

function BannerCard({ banner, onSelect, onDelete }) {
  const [hov,        setHov]        = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirming) { onDelete(banner); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  };

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{
        position: "relative", aspectRatio: "1/1", borderRadius: 12, overflow: "hidden",
        cursor: "pointer",
        border: `2px solid ${hov ? "rgba(245,197,24,0.5)" : "rgba(255,255,255,0.08)"}`,
        background: "#1e1e30",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <img src={banner.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />

      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: hov ? 1 : 0, transition: "opacity 0.2s", pointerEvents: hov ? "auto" : "none" }}>
        <button onClick={e => { e.stopPropagation(); downloadFile(banner.url, `banner-${Date.now()}.jpg`); }}
          style={{ padding: "8px 20px", background: "#f5c518", color: "#000", borderRadius: 8, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer" }}>
          ↓ Download
        </button>
      </div>

      <button onClick={handleDelete}
        style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 5, background: confirming ? "rgba(239,68,68,0.85)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", border: "none", color: confirming ? "#fff" : "#bbb", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        ✕
      </button>
    </div>
  );
}

export default function BannerDesign() {
  const navigate     = useNavigate();
  const fetchCredits = useCreditsStore(s => s.fetchCredits);
  const [creditModal, setCreditModal] = useState(null);
  const [activeTab,   setActiveTab]   = useState("result");

  // Logo
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoUrl,     setLogoUrl]     = useState("");
  const logoInputRef = useRef();

  // Product image
  const [productFile,    setProductFile]    = useState(null);
  const [productPreview, setProductPreview] = useState("");
  const [productUrl,     setProductUrl]     = useState("");
  const productInputRef = useRef();

  const [bizDesc,    setBizDesc]    = useState("");
  const [goal,       setGoal]       = useState("brand_awareness");
  const [style,      setStyle]      = useState("auto");
  const [brandColor, setBrandColor] = useState("");
  const [platform,   setPlatform]   = useState("square_11");
  const [uploading,  setUploading]  = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bannerUrl,  setBannerUrl]  = useState(null);
  const [genErr,     setGenErr]     = useState("");
  const [genTime,    setGenTime]    = useState(null);
  const [uploadErr,  setUploadErr]  = useState("");

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
      const res  = await serverFetch("/api/banner/list");
      const data = await res.json();
      if (res.ok) setHistory(data.banners || []);
    } catch (_) {}
    setHistLoad(false);
  }

  async function deleteBanner(banner) {
    try {
      await serverFetch("/api/banner/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storageKey: banner.storageKey }),
      });
      setHistory(h => h.filter(b => b.storageKey !== banner.storageKey));
    } catch (_) {}
  }

  async function uploadImage(file) {
    const form = new FormData();
    form.append("image", file);
    const res  = await serverFetch("/api/banner/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  }

  async function handleGenerateClick() {
    const credits = await getCredits();
    const { total, breakdown } = SERVICE_COSTS.social_post;
    setCreditModal({ total, breakdown, balance: credits?.balance ?? 0 });
  }

  async function handleGenerate() {
    setGenErr(""); setBannerUrl(null); setGenerating(true);
    const t0 = Date.now();
    try {
      setUploading(true);
      let finalProductUrl = productUrl;
      let finalLogoUrl    = logoUrl;
      if (productFile && !productUrl) {
        finalProductUrl = await uploadImage(productFile);
        setProductUrl(finalProductUrl);
      }
      if (logoFile && !logoUrl) {
        finalLogoUrl = await uploadImage(logoFile);
        setLogoUrl(finalLogoUrl);
      }
      setUploading(false);

      const res  = await serverFetch("/api/banner/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          productImageUrl: finalProductUrl || null,
          logoUrl:         finalLogoUrl    || null,
          bizDesc, goal, style, brandColor: brandColor || null, platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setBannerUrl(data.bannerUrl);
      setGenTime(((Date.now() - t0) / 1000).toFixed(1));
      setActiveTab("result");
      fetchCredits();
      loadHistory();
    } catch (e) { setGenErr(e.message); }
    setGenerating(false); setUploading(false);
  }

  const canGenerate = bizDesc.trim() && !generating && !uploading;
  const { ratio: resultRatio, maxWidth: resultMaxW } = RESULT_SIZE[platform] || RESULT_SIZE.square_11;
  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const paginated  = history.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function ImageUploadBox({ label, file, preview, url, onFile, onUrl, onClear, inputRef, optional = true }) {
    const [showUrl, setShowUrl] = useState(false);
    return (
      <div>
        <label style={C.lbl}>{label} {optional && <span style={{ color: "#7070a0", fontSize: 10, textTransform: "none", fontWeight: 500 }}>(optional)</span>}</label>
        <div onClick={() => !preview && inputRef.current?.click()}
          style={{ background: "#333345", border: preview ? "1px solid rgba(255,255,255,0.12)" : "2px dashed rgba(255,255,255,0.15)", borderRadius: 12, overflow: "hidden", cursor: preview ? "default" : "pointer" }}>
          {preview ? (
            <>
              <img src={preview} alt="" style={{ width: "100%", maxHeight: 140, objectFit: "contain", display: "block", background: "#22222e" }} />
              <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={() => inputRef.current?.click()} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>↑ Replace</button>
                <button onClick={() => setShowUrl(v => !v)} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px" }}>🔗 URL</button>
                <button onClick={onClear} style={{ ...C.btnG, fontSize: 11, padding: "4px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>✕ Remove</button>
              </div>
            </>
          ) : (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>📷</div>
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

  return (
    <AppLayout>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", background: "#1C1C2E" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif" }}>Banner Design</h1>
          </div>

          <div className="left-panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 22 }}>

            <ImageUploadBox
              label="Logo"
              file={logoFile} preview={logoPreview} url={logoUrl}
              onFile={f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); setLogoUrl(""); }}
              onUrl={u  => { setLogoUrl(u);  setLogoPreview(u); setLogoFile(null); }}
              onClear={() => { setLogoFile(null); setLogoPreview(""); setLogoUrl(""); }}
              inputRef={logoInputRef}
            />

            <ImageUploadBox
              label="Product Image"
              file={productFile} preview={productPreview} url={productUrl}
              onFile={f => { setProductFile(f); setProductPreview(URL.createObjectURL(f)); setProductUrl(""); }}
              onUrl={u  => { setProductUrl(u);  setProductPreview(u); setProductFile(null); }}
              onClear={() => { setProductFile(null); setProductPreview(""); setProductUrl(""); }}
              inputRef={productInputRef}
            />

            {/* Business Description */}
            <div>
              <label style={C.lbl}>Business Description <span style={{ color: "#f87171", fontSize: 10 }}>*</span></label>
              <input style={C.inp} placeholder="e.g. AI-powered video creation platform for marketers" value={bizDesc} onChange={e => setBizDesc(e.target.value)} maxLength={200} />
            </div>

            {/* Goal */}
            <div>
              <label style={C.lbl}>Goal <span style={{ color: "#f87171", fontSize: 10 }}>*</span></label>
              <select value={goal} onChange={e => setGoal(e.target.value)} style={{ ...C.inp, cursor: "pointer" }}>
                {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
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

            {/* Platform */}
            <div>
              <label style={C.lbl}>Platform + Size</label>
              <div style={{ display: "flex", gap: 8 }}>
                {PLATFORMS.map(({ id, label }) => (
                  <button key={id} onClick={() => setPlatform(id)}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: platform === id ? "1.5px solid #f5c518" : "1.5px solid rgba(255,255,255,0.14)", background: platform === id ? "rgba(245,197,24,0.1)" : "transparent", color: platform === id ? "#f5c518" : "#7878a8" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Generate button */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
            {genErr && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", marginBottom: 10 }}>
                ✕ {genErr}
              </div>
            )}
            {uploadErr && (
              <div style={{ fontSize: 12, color: "#f87171", padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", marginBottom: 10 }}>
                ✕ {uploadErr}
              </div>
            )}
            <button onClick={handleGenerateClick} disabled={!canGenerate} style={{ ...C.btnY, opacity: canGenerate ? 1 : 0.45 }}>
              {generating ? "Generating…" : uploading ? "Uploading…" : "✦ Generate Banner"}
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: "#7070a0", marginTop: 6 }}>~15 credits</div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#151523" }}>
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#151523", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
            <div style={{ display: "flex" }}>
              {[["result", "Result"], ["history", `My Banners${history.length ? ` (${history.length})` : ""}`]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{ padding: "16px 20px", border: "none", background: "transparent", color: activeTab === id ? "#f5c518" : "#8888b8", fontSize: 14, fontWeight: activeTab === id ? 700 : 500, fontFamily: "'Outfit',sans-serif", cursor: "pointer", borderBottom: activeTab === id ? "2px solid #f5c518" : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "history" && (
              <button onClick={loadHistory} style={{ fontSize: 12, color: "#f5c518", background: "transparent", border: "none", cursor: "pointer" }}>Refresh</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {activeTab === "result" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", gap: 16 }}>
                {generating && (
                  <div style={{ width: "100%", maxWidth: resultMaxW, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: "100%", aspectRatio: resultRatio, borderRadius: 14, overflow: "hidden", position: "relative", background: "#2e2e40" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 35%, rgba(245,197,24,0.08) 50%, transparent 65%)", backgroundSize: "200% 100%", animation: "banner-shimmer 1.6s ease-in-out infinite" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#9090c0" }}>Generating banner</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#f5c518", display: "block", animation: `gl-bounce 1.3s ease-in-out ${d}s infinite` }} />
                        ))}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#7070a0" }}>20–30 seconds</div>
                  </div>
                )}
                {!generating && !bannerUrl && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 56, marginBottom: 14 }}>📱</div>
                    <div style={{ fontSize: 14, color: "#6868a0" }}>Your banner will appear here</div>
                  </div>
                )}
                {bannerUrl && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: resultMaxW }}>
                    <img src={bannerUrl} alt="Generated banner" style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", display: "block" }} />
                    <div style={{ width: "100%", display: "flex", gap: 10 }}>
                      <button onClick={() => downloadFile(bannerUrl, `banner-${Date.now()}.jpg`)} style={{ ...C.btnY, fontSize: 13, flex: 1 }}>↓ Download</button>
                      <button onClick={handleGenerate} disabled={generating} style={{ ...C.btnG, flexShrink: 0 }}>↺ Regenerate</button>
                    </div>
                    {genTime && <div style={{ fontSize: 11, color: "#7070a0" }}>Generated in {genTime}s</div>}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <>
                {histLoad && (
                  <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                    <div style={{ width: 24, height: 24, border: "2px solid #f5c518", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
                {!histLoad && history.length === 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 48 }}>📱</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>No banners yet</div>
                    <div style={{ fontSize: 13, color: "#9090c0" }}>Generate your first banner</div>
                    <button onClick={() => setActiveTab("result")} style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                      Generate First Banner →
                    </button>
                  </div>
                )}
                {!histLoad && history.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: "#9090b8", marginBottom: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                      {history.length} banner{history.length !== 1 ? "s" : ""}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                      {paginated.map((banner, i) => (
                        <BannerCard key={i} banner={banner} onDelete={deleteBanner} onSelect={() => { setBannerUrl(banner.url); setActiveTab("result"); }} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "#a0a0cc", cursor: "pointer", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                          <button key={n} onClick={() => setPage(n)}
                            style={{ width: 32, height: 32, borderRadius: 7, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: n === page ? "#f5c518" : "rgba(255,255,255,0.07)", color: n === page ? "#000" : "#a0a0cc" }}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                          style={{ padding: "7px 16px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "#a0a0cc", cursor: "pointer", opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes banner-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes gl-bounce { 0%,70%,100% { transform:translateY(0); opacity:.25; } 35% { transform:translateY(-5px); opacity:1; } } .left-panel-scroll::-webkit-scrollbar { width: 10px; } .left-panel-scroll::-webkit-scrollbar-track { background: transparent; } .left-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; } .left-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }`}</style>
      {creditModal && (
        <CreditConfirmModal
          service="Banner Design"
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
