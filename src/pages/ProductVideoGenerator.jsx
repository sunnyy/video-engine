import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generateProductVideo } from "../services/ai/generateProductVideo";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";
import { serverFetch } from "../services/serverApi";
import { getProductVideoProjects, deleteProject } from "../services/projects/projectService";
import AppLayout from "../ui/AppLayout";

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
  "Analyzing your product...",
  "Creating your visuals...",
  "Building your video...",
  "Adding music...",
];

const VIDEO_TYPES = [
  { id: "promo",   label: "Promo"   },
  { id: "launch",  label: "Launch"  },
  { id: "feature", label: "Feature" },
  { id: "brand",   label: "Brand"   },
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

  return (
    <div
      onClick={() => navigate(`/video-editor/${project.id}`)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirming(false); }}
      style={{
        background:   T.surface,
        border:       `1px solid ${hovering ? "rgba(124,92,252,0.4)" : T.border}`,
        borderRadius: 14,
        overflow:     "hidden",
        cursor:       "pointer",
        transition:   "all 0.2s",
        transform:    hovering ? "translateY(-2px)" : "none",
        boxShadow:    hovering ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ paddingTop: "56.25%", position: "relative", background: "linear-gradient(135deg,#0f0820,#1a0a2e,#2d1060)" }}>
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
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </div>
          <div style={{ fontSize: 11, color: "#77777f", marginTop: 3 }}>{timeLabel(project.updated_at)}</div>
        </div>
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

/* ── Generator form tab ── */
function GeneratorForm() {
  const navigate  = useNavigate();
  const productRef = useRef(null);
  const logoRef    = useRef(null);

  // Product image
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl,     setLogoUrl]     = useState(null);

  // Ad fields — dev defaults
  const [brandName,  setBrandName]  = useState("");
  const [videoType,  setVideoType]  = useState("promo");
  const [offerText,  setOfferText]  = useState("");
  const [ctaText,    setCtaText]    = useState("Shop Now");
  const [website,    setWebsite]    = useState("");

  // Voiceover
  const [voices,        setVoices]        = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [voiceOpen,     setVoiceOpen]     = useState(false);

  // State
  const [generating, setGenerating] = useState(false);
  const [step,       setStep]       = useState(0);
  const [stepLabel,  setStepLabel]  = useState("");
  const [error,      setError]      = useState(null);

  useEffect(() => {
    serverFetch("/api/tts/voices")
      .then(r => r.json())
      .then(data => setVoices(data.voices || []))
      .catch(() => {});
  }, []);

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

  async function handleGenerate() {
    if (!imageFile) { setError("Please upload a product image first."); return; }
    setError(null);
    setGenerating(true);
    setStep(0);
    setStepLabel("Uploading image...");

    let projectId = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload product image
      const assetRow = await uploadUserAsset(imageFile, "image", null, "project", null);
      const productImageUrl = assetRow.url;

      // Create project row
      const projectName = brandName
        ? `${brandName} — ${new Date().toLocaleDateString()}`
        : `Product Video — ${new Date().toLocaleDateString()}`;

      const emptyProjectJson = {
        version: "2.0",
        id: crypto.randomUUID(),
        name: projectName,
        format: { width: 1080, height: 1920, fps: 30, duration: 30 },
        layers: [],
        meta: {
          thumbnail: null,
          source: "product_video",
          editor_version: "timeline",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const { data: projectRow, error: insertError } = await supabase
        .from("projects")
        .insert([{
          user_id:           user.id,
          name:              projectName,
          safe_project_json: emptyProjectJson,
          orientation:       "9:16",
          mode:              "timeline",
          source:            "product_video",
          editor_version:    "timeline",
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      projectId = projectRow.id;

      // Run pipeline
      const result = await generateProductVideo({
        productImageUrl,
        logoUrl:   logoUrl ?? null,
        brandName: brandName.trim(),
        videoType,
        offerText: offerText.trim(),
        ctaText:   ctaText.trim() || "Shop Now",
        website:   website.trim(),
        tagline:   "",
        projectId,
        onProgress: (s) => {
          setStep(s);
          setStepLabel(STEP_LABELS[s - 1] ?? "");
        },
      });

      // Save final project
      const finalProjectJson = {
        ...emptyProjectJson,
        layers: result.layers,
        format: { ...emptyProjectJson.format, duration: result.totalDuration },
        meta: {
          ...emptyProjectJson.meta,
          productAnalysis: result.productAnalysis,
          shots:           result.shots,
          updatedAt:       new Date().toISOString(),
        },
      };

      const { error: updateError } = await supabase
        .from("projects")
        .update({ safe_project_json: finalProjectJson })
        .eq("id", projectId);

      if (updateError) throw updateError;
      navigate(`/video-editor/${projectId}`);
    } catch (err) {
      console.error("[ProductVideoGenerator]", err);
      setError(err.message || "Something went wrong. Please try again.");
      if (projectId) {
        supabase.from("projects").delete().eq("id", projectId).then(() => {});
      }
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = !!imageFile && !generating;

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 24px 60px" }}>

        {/* Product image */}
        <div style={{ marginBottom: 24 }}>
          <Label>Product Image</Label>
          <div
            onClick={() => !generating && productRef.current?.click()}
            style={{
              border: `2px dashed ${imagePreview ? T.accent : T.border}`,
              borderRadius: 12, cursor: generating ? "default" : "pointer",
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
          {imagePreview && !generating && (
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              style={{ marginTop: 7, fontSize: 12, color: T.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Remove image
            </button>
          )}
        </div>

        {/* Brand name */}
        <div style={{ marginBottom: 18 }}>
          <Label>Brand Name</Label>
          <TextInput value={brandName} onChange={setBrandName} placeholder="e.g. Glow Skincare" disabled={generating} />
        </div>

        {/* Video type */}
        <div style={{ marginBottom: 18 }}>
          <Label>Video Type</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {VIDEO_TYPES.map(vt => (
              <button
                key={vt.id}
                onClick={() => !generating && setVideoType(vt.id)}
                disabled={generating}
                style={{
                  flex: 1, padding: "9px 0", border: "none", borderRadius: 10,
                  background: videoType === vt.id ? T.accent : "rgba(255,255,255,0.05)",
                  color:      videoType === vt.id ? "#fff"   : T.muted,
                  fontSize: 13, fontWeight: videoType === vt.id ? 700 : 500,
                  fontFamily: "inherit", cursor: generating ? "not-allowed" : "pointer",
                  transition: "all 0.15s", opacity: generating ? 0.6 : 1,
                }}
              >
                {vt.label}
              </button>
            ))}
          </div>
        </div>

        {/* CTA + Offer */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div>
            <Label>CTA Text</Label>
            <TextInput value={ctaText} onChange={setCtaText} placeholder="Shop Now" disabled={generating} />
          </div>
          <div>
            <Label>Offer Text <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional)</span></Label>
            <TextInput value={offerText} onChange={setOfferText} placeholder="e.g. 50% OFF" disabled={generating} />
          </div>
        </div>

        {/* Website */}
        <div style={{ marginBottom: 24 }}>
          <Label>Website <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional)</span></Label>
          <TextInput value={website} onChange={setWebsite} placeholder="yourwebsite.com" disabled={generating} />
        </div>

        {/* Logo upload */}
        <div style={{ marginBottom: 24 }}>
          <Label>Logo <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional)</span></Label>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              onClick={() => !generating && logoRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: 12, flexShrink: 0,
                border: `2px dashed ${logoPreview ? T.accent : T.border}`,
                background: "rgba(255,255,255,0.02)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: generating ? "default" : "pointer", overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {logoPreview
                ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <span style={{ fontSize: 22, opacity: 0.4 }}>🏷️</span>
              }
            </div>
            <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
              {logoUploading
                ? "Uploading..."
                : logoUrl
                ? <span style={{ color: T.success }}>✓ Logo ready</span>
                : "Upload your logo (PNG with transparent background recommended)"
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

        {/* Voiceover — collapsed secondary */}
        {voices.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setVoiceOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: 12, fontWeight: 600, color: T.muted,
                textTransform: "uppercase", letterSpacing: "0.07em",
              }}
            >
              <span style={{ fontSize: 10, transition: "transform 0.15s", transform: voiceOpen ? "rotate(90deg)" : "none" }}>▶</span>
              Voiceover
            </button>
            {voiceOpen && (
              <div style={{ marginTop: 10 }}>
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  disabled={generating}
                  style={{
                    width: "100%", padding: "10px 13px",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`,
                    borderRadius: 10, color: T.text, fontSize: 13,
                    fontFamily: "inherit", outline: "none",
                    cursor: generating ? "not-allowed" : "pointer",
                    opacity: generating ? 0.5 : 1,
                  }}
                >
                  {voices.map(v => (
                    <option key={v.id} value={v.id} style={{ background: "#111118" }}>
                      {v.label} — {v.desc}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
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

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width: "100%", padding: "14px 24px",
            background: canGenerate ? T.accent : "rgba(124,92,252,0.35)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 700,
            cursor: canGenerate ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "background 0.2s",
          }}
        >
          {generating ? "Generating..." : "Generate Video"}
        </button>

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
