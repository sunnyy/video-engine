import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import { generateProductVideo } from "../services/ai/productVideo/generateProductVideo";
import { serverFetch } from "../services/serverApi";
import { getProductVideoProjects, deleteProject, invalidateProjectCaches } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";
import { LanguageVoicePicker } from "../ui/LanguageVoicePicker";
import { CREDIT_COSTS } from "../core/utils/creditCosts";

const T = {
  bg:      "#0a0a10",
  surface: "#111118",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#7c5cfc",
  text:    "#e8e8f0",
  muted:   "#9494a8",
  success: "#22c55e",
  danger:  "#f87171",
};

const STEP_LABELS = [
  "Setting up the shoot…",
  "Crafting the concept…",
  "Bringing it to life…",
  "Designing the look…",
  "Almost ready…",
];

const GOALS = [
  {
    id: "launch", label: "Launch", desc: "New product debut",
    ctaDefault: "Get Yours First",
    ctaPlaceholder: "e.g. Get Yours First, Shop Now",
    offerLabel: "Launch Note",
    offerPlaceholder: "e.g. Available Now, Pre-order Open",
    showOffer: true,
  },
  {
    id: "promo", label: "Promo", desc: "General ad",
    ctaDefault: "Shop Now",
    ctaPlaceholder: "e.g. Shop Now, Buy Now",
    offerLabel: "Offer",
    offerPlaceholder: "e.g. Free shipping, Bundle deal",
    showOffer: true,
  },
  {
    id: "discount", label: "Discount", desc: "Sale / offer",
    ctaDefault: "Claim Offer",
    ctaPlaceholder: "e.g. Claim 50% Off, Shop Sale",
    offerLabel: "Discount / Deal",
    offerPlaceholder: "e.g. 50% OFF, Buy 2 Get 1 Free",
    showOffer: true,
  },
  {
    id: "awareness", label: "Awareness", desc: "Brand story",
    ctaDefault: "Learn More",
    ctaPlaceholder: "e.g. Learn More, Discover",
    offerLabel: null,
    offerPlaceholder: null,
    showOffer: false,
  },
];

const SCENE_COUNT_OPTIONS = [
  { value: 1, label: "1 Scene",  desc: "Quick showcase",   dots: 1 },
  { value: 3, label: "3 Scenes", desc: "Short & punchy",   dots: 3 },
  { value: 5, label: "5 Scenes", desc: "Full product ad",  dots: 5 },
];

function timeLabel(dateStr) {
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

/* ── Project card ── */
function VideoCard({ project, onDelete }) {
  const [hovering,   setHovering]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();

  const layers = project.safe_project_json?.layers ?? [];
  const thumb  = project.safe_project_json?.meta?.thumbnail
    || layers.find(l => l.type === "image" && l.src)?.src
    || null;

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(project.id); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const editorHref = `/video-editor/${project.id}`;
  const navProps = { href: editorHref, onClick: e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(editorHref, { state: { from: "/product-video" } }); } }, style: { display: "block", textDecoration: "none", color: "inherit" } };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background:   T.surface,
        border:       `1px solid ${hovering ? "rgba(124,92,252,0.4)" : T.border}`,
        borderRadius: 14,
        overflow:     "hidden",
        transition:   "all 0.2s",
        transform:    hovering ? "translateY(-2px)" : "none",
        boxShadow:    hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <a {...navProps}>
        <div style={{ paddingTop: "177.78%", position: "relative", background: "linear-gradient(135deg,#0f0820,#1a0a2e,#2d1060)" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {thumb
              ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <span style={{ fontSize: 32, opacity: 0.35 }}>🎬</span>
            }
          </div>
          <div style={{ position: "absolute", top: 8, left: 8 }}>
            <span style={{
              padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
              background: "rgba(34,197,94,0.2)", color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.3)",
            }}>Complete</span>
          </div>
        </div>
      </a>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <a {...navProps} style={{ ...navProps.style, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: "#77777f", marginTop: 3 }}>{timeLabel(project.updated_at)}</div>
        </a>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>Edit →</span>
          <button
            onClick={handleDelete}
            style={{
              width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
              background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
              color:      confirming ? "#f87171"               : "#55556a",
              opacity: hovering ? 1 : 0, transition: "opacity 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={confirming ? "Click again to confirm" : "Delete"}
          >{confirming ? "!" : "✕"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Listing tab ── */
function VideoListing() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getProductVideoProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🎬</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>No product videos yet</div>
        <div style={{ fontSize: 14, color: "#77777f" }}>Switch to Create New to generate your first one</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {projects.map(p => <VideoCard key={p.id} project={p} onDelete={handleDelete} />)}
      </div>
    </div>
  );
}

/* ── Form field helpers ── */
function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "10px 13px", boxSizing: "border-box",
        background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
        borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
        outline: "none", opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, disabled, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{
        width: "100%", padding: "10px 13px", boxSizing: "border-box",
        background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
        borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
        outline: "none", opacity: disabled ? 0.5 : 1,
        resize: "vertical", lineHeight: 1.5,
      }}
    />
  );
}

/* ── Generator form tab ── */
function GeneratorForm() {
  const navigate   = useNavigate();
  const productRef = useRef(null);
  const logoRef    = useRef(null);

  // Multi-step
  const [formStep, setFormStep] = useState(1);

  // Input mode: upload image vs. paste URL
  const [inputMode,       setInputMode]       = useState("upload");
  const [productUrl,      setProductUrl]       = useState("");
  const [scraping,        setScraping]         = useState(false);
  const [scrapeError,     setScrapeError]      = useState(null);
  const [scrapedImageUrl, setScrapedImageUrl]  = useState(null);

  // Product image
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Logo
  const [logoPreview,   setLogoPreview]   = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl,       setLogoUrl]       = useState(null);

  // Ad fields
  const [brandName,          setBrandName]          = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [goal,               setGoal]               = useState("promo");
  const [offerText,          setOfferText]           = useState("");
  const [ctaText,            setCtaText]             = useState("Shop Now");
  const [website,            setWebsite]             = useState("");

  // Sync CTA default when goal changes (only if value matches a known goal default)
  const goalDefaults = GOALS.map(g => g.ctaDefault);
  useEffect(() => {
    const cfg = GOALS.find(g => g.id === goal);
    if (cfg) setCtaText(prev => goalDefaults.includes(prev) ? cfg.ctaDefault : prev);
  }, [goal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scene count + visuals
  const [sceneCount, setSceneCount] = useState(3);
  const [visualMode, setVisualMode] = useState("image");
  const productVideoCost = sceneCount * (CREDIT_COSTS.product_video_per_scene[visualMode] ?? CREDIT_COSTS.product_video_per_scene.image);

  // Voiceover
  const [language,      setLanguage]      = useState("en");
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [step,       setStep]       = useState(0);
  const [stepLabel,  setStepLabel]  = useState("");
  const [error,      setError]      = useState(null);

  function handleProductFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoUploading(true);
    try {
      const asset = await uploadUserAsset(file, "image", null, "project", null);
      setLogoUrl(asset.url);
    } catch {
      setLogoUrl(null);
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleScrape() {
    if (!productUrl.trim()) return;
    setScraping(true);
    setScrapeError(null);
    setScrapedImageUrl(null);
    try {
      const res = await serverFetch("/api/product-video/scrape-url", {
        method: "POST",
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed");

      if (data.brandName)          setBrandName(data.brandName);
      if (data.productDescription) setProductDescription(data.productDescription);
      if (data.price && !website)  setWebsite(productUrl.trim());
      if (data.productImageUrl)    setScrapedImageUrl(data.productImageUrl);

      setFormStep(2);
    } catch (err) {
      setScrapeError(err.message || "Could not fetch product details. Try a different URL.");
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate() {
    const hasImage = inputMode === "upload" ? !!imageFile : !!scrapedImageUrl;
    if (!hasImage) { setError("Please provide a product image."); return; }
    setError(null);
    setGenerating(true);
    setStep(1);
    setStepLabel("Getting started…");

    try {
      let productImageUrl;
      if (inputMode === "url") {
        productImageUrl = scrapedImageUrl;
      } else {
        const assetRow = await uploadUserAsset(imageFile, "image", null, "project", null);
        productImageUrl = assetRow.url;
      }

      setStep(2);
      setStepLabel("Crafting your ad…");

      const result = await generateProductVideo({
        productImageUrl,
        logoUrl:            logoUrl            ?? null,
        brandName:          brandName.trim(),
        productDescription: productDescription.trim() || "",
        goal,
        ctaText:            ctaText.trim()   || "Shop Now",
        offerText:          offerText.trim() || "",
        website:            website.trim()   || "",
        visualMode,
        voice_id:           selectedVoice ?? null,
        language,
        sceneCount,
      }, ({ step }) => {
        if (typeof step === "number") { setStep(step + 1); setStepLabel(STEP_LABELS[step] ?? ""); }
      });

      invalidateProjectCaches("product_video", "all");
      if (result.incomplete) { navigate("/projects", { state: { from: "/product-video" } }); return; }
      navigate(`/video-editor/${result.projectId}`, { state: { from: "/product-video" } });
    } catch (err) {
      console.error("[ProductVideoGenerator]", err);
      setError(err.code === "NO_CREDITS"
        ? `Not enough credits. You need ${productVideoCost} credits for this video.`
        : (err.message || "Something went wrong. Please try again."));
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = (inputMode === "upload" ? !!imageFile : !!scrapedImageUrl) && !generating;

  const FORM_STEPS = [
    { num: 1, label: "Product"  },
    { num: 2, label: "Campaign" },
    { num: 3, label: "Style"    },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛍️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif" }}>
            Turn a product photo into an ad
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
            Upload a product photo or paste an Amazon/Flipkart URL and get a scroll-stopping video ad ready in minutes.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 40 }}>
          {FORM_STEPS.flatMap((s, i) => {
            const done   = formStep > s.num;
            const active = formStep === s.num;
            const items  = [];
            if (i > 0) items.push(
              <div key={`line-${i}`} style={{
                flex: 1, height: 2, marginTop: 15, borderRadius: 2,
                background: done || active ? T.accent : "rgba(255,255,255,0.08)",
                transition: "background 0.3s",
              }} />
            );
            items.push(
              <div key={s.num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700,
                  background: done ? T.accent : active ? "rgba(124,92,252,0.18)" : "rgba(255,255,255,0.05)",
                  color: done ? "#fff" : active ? "#c4b5fd" : T.muted,
                  border: `2px solid ${done || active ? T.accent : "rgba(255,255,255,0.1)"}`,
                  transition: "all 0.3s",
                }}>
                  {done ? "✓" : s.num}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: active ? 700 : 400,
                  color: active ? T.text : T.muted,
                  transition: "all 0.3s",
                }}>
                  {s.label}
                </span>
              </div>
            );
            return items;
          })}
        </div>

        {/* ── Step 1: Product ── */}
        {formStep === 1 && (
          <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
              {[
                { id: "upload", label: "📷  Upload Image" },
                { id: "url",    label: "🔗  Product URL"  },
              ].map(m => {
                const sel = inputMode === m.id;
                return (
                  <button key={m.id} onClick={() => { setInputMode(m.id); setScrapeError(null); }}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 7, border: "none",
                      background: sel ? T.accent : "transparent",
                      color: sel ? "#fff" : T.muted,
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                    }}>
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Upload mode */}
            {inputMode === "upload" && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <Label>Product Image</Label>
                  <div
                    onClick={() => productRef.current?.click()}
                    style={{
                      border: `2px dashed ${imagePreview ? T.accent : T.border}`,
                      borderRadius: 12, cursor: "pointer",
                      overflow: "hidden", minHeight: 180,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.02)", transition: "border-color 0.2s",
                    }}
                  >
                    {imagePreview
                      ? <img src={imagePreview} alt="Product" style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block" }} />
                      : (
                        <div style={{ textAlign: "center", padding: 28 }}>
                          <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                          <div style={{ fontSize: 13, color: T.muted }}>Click to upload product image</div>
                          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>JPG, PNG, WEBP</div>
                        </div>
                      )
                    }
                  </div>
                  <input ref={productRef} type="file" accept="image/*" onChange={handleProductFile} style={{ display: "none" }} />
                  {imagePreview && (
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      style={{ marginTop: 7, fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Remove image
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: 18 }}>
                  <Label>Brand Name</Label>
                  <TextInput value={brandName} onChange={setBrandName} placeholder="e.g. Glow Skincare" />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Label>Product Description <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional but recommended)</span></Label>
                  <TextArea
                    value={productDescription}
                    onChange={setProductDescription}
                    placeholder="e.g. A 3-in-1 vitamin C serum that brightens skin, reduces dark spots, and boosts collagen. Key ingredients: niacinamide, hyaluronic acid."
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* URL mode */}
            {inputMode === "url" && (
              <div>
                <Label>Product Page URL</Label>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                  Paste a product link from Amazon, Flipkart, or any e-commerce site.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={productUrl}
                    onChange={e => { setProductUrl(e.target.value); setScrapeError(null); }}
                    onKeyDown={e => e.key === "Enter" && handleScrape()}
                    placeholder="https://amazon.in/… or flipkart.com/…"
                    disabled={scraping}
                    style={{
                      flex: 1, padding: "10px 13px", boxSizing: "border-box",
                      background: "rgba(255,255,255,0.04)", border: `1px solid ${productUrl.trim() ? "rgba(124,92,252,0.35)" : T.border}`,
                      borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit",
                      outline: "none", opacity: scraping ? 0.5 : 1,
                    }}
                  />
                  <button
                    onClick={handleScrape}
                    disabled={!productUrl.trim() || scraping}
                    style={{
                      padding: "10px 18px", borderRadius: 10, border: "none",
                      background: productUrl.trim() && !scraping ? T.accent : "rgba(124,92,252,0.25)",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: productUrl.trim() && !scraping ? "pointer" : "not-allowed",
                      fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                    }}
                  >
                    {scraping ? "Fetching…" : "Fetch →"}
                  </button>
                </div>

                {scraping && (
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, color: T.muted, fontSize: 13 }}>
                    <div style={{ width: 16, height: 16, border: `2px solid ${T.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pv-spin 0.8s linear infinite", flexShrink: 0 }} />
                    Reading product details…
                  </div>
                )}

                {scrapeError && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 13, color: "#f87171" }}>
                    {scrapeError}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Step 2: Campaign ── */}
        {formStep === 2 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <Label>Campaign Goal</Label>
              <div style={{ display: "flex", gap: 8 }}>
                {GOALS.map(g => {
                  const sel = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      style={{
                        flex: 1, padding: "10px 6px", borderRadius: 10,
                        background: sel ? "rgba(124,92,252,0.10)" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${sel ? "rgba(124,92,252,0.5)" : T.border}`,
                        cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sel ? "#c4b5fd" : T.text }}>{g.label}</span>
                      <span style={{ fontSize: 10, color: T.muted }}>{g.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const cfg = GOALS.find(g => g.id === goal) ?? GOALS[1];
              return (
                <div style={{ display: "grid", gridTemplateColumns: cfg.showOffer ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 18 }}>
                  <div>
                    <Label>CTA Text</Label>
                    <TextInput value={ctaText} onChange={setCtaText} placeholder={cfg.ctaPlaceholder} />
                  </div>
                  {cfg.showOffer && (
                    <div>
                      <Label>
                        {cfg.offerLabel}
                        {goal !== "discount" && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}> (optional)</span>}
                      </Label>
                      <TextInput value={offerText} onChange={setOfferText} placeholder={cfg.offerPlaceholder} />
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ marginBottom: 8 }}>
              <Label>Website <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional)</span></Label>
              <TextInput value={website} onChange={setWebsite} placeholder="yourwebsite.com" />
            </div>
          </>
        )}

        {/* ── Step 3: Style ── */}
        {formStep === 3 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <LanguageVoicePicker
                language={language}
                onLanguageChange={setLanguage}
                voiceId={selectedVoice}
                onVoiceChange={setSelectedVoice}
                disabled={generating}
                accentColor={T.accent}
                border={T.border}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Label>Logo <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional)</span></Label>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  onClick={() => !generating && logoRef.current?.click()}
                  style={{
                    width: 72, height: 72, borderRadius: 12, flexShrink: 0,
                    border: `2px dashed ${logoPreview ? T.accent : T.border}`,
                    background: "rgba(255,255,255,0.02)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: generating ? "default" : "pointer", overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                >
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <span style={{ fontSize: 20, opacity: 0.4 }}>🏷️</span>
                  }
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                  {logoUploading
                    ? "Uploading..."
                    : logoUrl
                    ? <span style={{ color: T.success }}>✓ Logo ready</span>
                    : "PNG with transparent background recommended"
                  }
                  {logoPreview && !generating && (
                    <div>
                      <button
                        onClick={() => { setLogoPreview(null); setLogoUrl(null); }}
                        style={{ marginTop: 4, fontSize: 11, color: T.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Label>Video Length</Label>
              <div style={{ display: "flex", gap: 8 }}>
                {SCENE_COUNT_OPTIONS.map(opt => {
                  const sel = sceneCount === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { if (generating) return; setSceneCount(opt.value); if (opt.value === 1 && visualMode === "hybrid") setVisualMode("image"); }}
                      disabled={generating}
                      style={{
                        flex: 1, padding: "10px 8px", borderRadius: 10,
                        background: sel ? "rgba(124,92,252,0.10)" : "rgba(255,255,255,0.04)",
                        border: `1.5px solid ${sel ? "rgba(124,92,252,0.5)" : T.border}`,
                        cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        opacity: generating ? 0.6 : 1, transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {Array.from({ length: opt.dots }).map((_, i) => (
                          <div key={i} style={{ width: 6, height: 8, borderRadius: 2, background: sel ? T.accent : "rgba(255,255,255,0.2)" }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sel ? "#c4b5fd" : T.text }}>{opt.label}</span>
                      <span style={{ fontSize: 10, color: T.muted }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <Label>Visuals</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "image",  icon: "🖼",  label: "Image Only",    credits: "~50 credits",  desc: "AI-generated product shots with designed text layouts" },
                  { id: "hybrid", icon: "🎬",  label: "Image + Video", credits: "~160 credits", desc: "Hook and hero scenes as video clips, CTA as image", recommended: true, multiSceneOnly: true },
                  { id: "video",  icon: "⚡",  label: "Full Video",    credits: "~230 credits", desc: "All scenes as video clips for maximum impact" },
                ].filter(opt => !(opt.multiSceneOnly && sceneCount === 1)).map(opt => {
                  const active = visualMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !generating && setVisualMode(opt.id)}
                      disabled={generating}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "13px 16px",
                        background: active ? "rgba(124,92,252,0.10)" : "rgba(255,255,255,0.03)",
                        border: `1.5px solid ${active ? "rgba(124,92,252,0.55)" : T.border}`,
                        borderRadius: 12, cursor: generating ? "not-allowed" : "pointer",
                        textAlign: "left", fontFamily: "inherit",
                        transition: "all 0.15s", opacity: generating ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{opt.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: active ? "#c4b5fd" : T.text }}>{opt.label}</span>
                          {opt.recommended && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
                              background: "rgba(124,92,252,0.2)", color: "#a78bfa",
                              border: "1px solid rgba(124,92,252,0.3)", lineHeight: 1.4,
                            }}>RECOMMENDED</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.4 }}>{opt.desc}</div>
                      </div>
                      <div style={{
                        flexShrink: 0, fontSize: 12, fontWeight: 700,
                        color: active ? "#a78bfa" : "#55556a",
                        background: active ? "rgba(124,92,252,0.15)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${active ? "rgba(124,92,252,0.3)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap",
                      }}>~{(CREDIT_COSTS.product_video_per_scene[opt.id] || 0) * sceneCount} credits</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: T.danger }}>
            {error}
          </div>
        )}

        {/* Progress */}
        {generating && (
          <div style={{ marginBottom: 24, padding: "20px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              {step > 0 ? `Step ${step} of ${STEP_LABELS.length} — ` : ""}{stepLabel}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {STEP_LABELS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < step ? T.accent : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {STEP_LABELS.map((label, i) => (
                <div key={i} style={{ fontSize: 12, color: i + 1 === step ? T.text : i + 1 < step ? T.success : T.muted, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, width: 10 }}>{i + 1 < step ? "✓" : i + 1 === step ? "▶" : "○"}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10 }}>
          {formStep > 1 && !generating && (
            <button
              onClick={() => setFormStep(s => s - 1)}
              style={{
                padding: "14px 24px", borderRadius: 12, border: `1px solid ${T.border}`,
                background: "rgba(255,255,255,0.04)", color: T.muted,
                fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s", flexShrink: 0,
              }}
            >
              ← Back
            </button>
          )}
          {formStep < 3 && !(formStep === 1 && inputMode === "url") && (
            <button
              onClick={() => { setError(null); setFormStep(s => s + 1); }}
              disabled={formStep === 1 && inputMode === "upload" && !imageFile}
              style={{
                flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                background: (formStep === 1 && inputMode === "upload" && !imageFile) ? "rgba(124,92,252,0.35)" : T.accent,
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: (formStep === 1 && inputMode === "upload" && !imageFile) ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "background 0.2s",
              }}
            >
              Next →
            </button>
          )}
          {formStep === 3 && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                background: canGenerate ? T.accent : "rgba(124,92,252,0.35)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: canGenerate ? "pointer" : "not-allowed",
                fontFamily: "inherit", transition: "background 0.2s",
              }}
            >
              {generating ? "Generating..." : `Generate Video (${productVideoCost} credits)`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Main page ── */
export default function ProductVideoGenerator() {
  const [tab, setTab] = useState("create");

  const tabs = [
    { id: "videos", label: "My Videos"  },
    { id: "create", label: "Create New" },
  ];

  return (
    <AppLayout>
      <style>{`@keyframes pv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* Header + tabs */}
        <div style={{ padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0, display: "flex", alignItems: "center", gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.accent, fontFamily: "'Outfit',sans-serif", whiteSpace: "nowrap" }}>
            Product Video
          </h1>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "16px 28px", border: "none", borderRadius: "8px 8px 0 0",
                  background: tab === t.id ? "rgba(124,92,252,0.15)" : "transparent",
                  color:      tab === t.id ? "#a78bfa" : "#55556a",
                  fontSize: 16, fontWeight: tab === t.id ? 700 : 500,
                  fontFamily: "'Outfit',sans-serif",
                  cursor: "pointer", transition: "all 0.15s",
                  borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {tab === "videos" ? <VideoListing /> : <GeneratorForm />}

      </div>
    </AppLayout>
  );
}
