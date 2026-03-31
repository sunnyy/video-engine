import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateStructuredShort } from "../services/ai/generateStructuredShort";
import { buildSafeProject } from "../normalize/normalizeProject";
import { createProject } from "../services/projects/projectService";
import { uploadUserAsset } from "../services/assets/uploadUserAsset";

/* ── Options ──────────────────────────────────────────────── */

const VIDEO_TYPES = [
  { value: "viral",         label: "Viral / Hook"       },
  { value: "entertainment", label: "Entertainment"       },
  { value: "news",          label: "News"                },
  { value: "explainer",     label: "Explainer"           },
  { value: "opinion",       label: "Opinion / Hot Take"  },
  { value: "story",         label: "Story / Narrative"   },
];

const LANGUAGES = [
  { value: "english",    label: "English"    },
  { value: "hindi",      label: "Hindi"      },
  { value: "hinglish",   label: "Hinglish"   },
  { value: "tamil",      label: "Tamil"      },
  { value: "telugu",     label: "Telugu"     },
  { value: "arabic",     label: "Arabic"     },
  { value: "portuguese", label: "Portuguese" },
];

const MODES = [
  { value: "faceless",     label: "Faceless"      },
  { value: "talking_head", label: "Talking Head"  },
];

const ASSET_SOURCES = [
  { value: "stock",    label: "Stock Library"          },
  { value: "user",     label: "Upload My Assets"        },
  { value: "internet", label: "Auto-Find from Internet" },
];

const AUDIENCES = [
  { value: "general",       label: "General Audience"   },
  { value: "teens",         label: "Teens / Gen Z"       },
  { value: "professionals", label: "Professionals"       },
  { value: "creators",      label: "Creators / Builders" },
  { value: "parents",       label: "Parents / Families"  },
];

const TONES = [
  { value: "bold",          label: "Bold / Aggressive"   },
  { value: "conversational",label: "Conversational"       },
  { value: "educational",   label: "Educational"          },
  { value: "funny",         label: "Funny / Witty"        },
  { value: "emotional",     label: "Emotional / Empathy"  },
];

const DURATIONS = [
  { value: "short",  label: "Short  (15–30 sec)"  },
  { value: "medium", label: "Medium (30–60 sec)"  },
  { value: "long",   label: "Long   (60+ sec)"    },
];

const ORIENTATIONS = [
  { value: "9:16",  label: "9:16  — Vertical (TikTok / Reels)" },
  { value: "16:9",  label: "16:9  — Horizontal (YouTube)"      },
];

/* ── Small form helpers ───────────────────────────────────── */

function Label({ children }) {
  return (
    <label className="block text-[14px] font-semibold uppercase tracking-wider text-[#55556a] mb-[5px]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Main component ───────────────────────────────────────── */

export default function AIGenerator() {
  const navigate = useNavigate();

  /* form state */
  const [name,             setName]             = useState("");
  const [topic,            setTopic]            = useState("");
  const [context,          setContext]          = useState("");  // optional facts
  const [videoType,        setVideoType]        = useState("viral");
  const [mode,             setMode]             = useState("faceless");
  const [language,         setLanguage]         = useState("english");
  const [orientation,      setOrientation]      = useState("9:16");
  const [durationCategory, setDurationCategory] = useState("short");
  const [assetSource,      setAssetSource]      = useState("stock");

  /* asset upload state */
  const [uploadFiles, setUploadFiles] = useState([]);
  const [previews,    setPreviews]    = useState([]);

  const [brandColor, setBrandColor] = useState("");
  const [brandName,  setBrandName]  = useState("");
  const [audience,   setAudience]   = useState("general");
  const [tone,       setTone]       = useState("bold");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  /* ── File handling ── */
  function handleFiles(e) {
    const files = Array.from(e.target.files);
    const newPreviews = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setUploadFiles(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }

  function removeFile(index) {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev    => prev.filter((_, i) => i !== index));
  }

  /* ── Generate ── */
  const handleGenerate = async () => {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setError("");
    setLoading(true);

    try {
      /* Upload assets if needed */
      let uploadedAssets = [];
      if (assetSource === "user" && uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          const uploaded = await uploadUserAsset(file);
          uploadedAssets.push(uploaded);
        }
      }

      /* Generate */
      const aiResult = await generateStructuredShort({
        topic,
        context,
        videoType,
        mode,
        language,
        orientation,
        durationCategory,
        assetSource,
        uploadedAssets,
        brandColor:  brandColor.trim() || null,
        brandName:   brandName.trim()  || null,
        audience,
        tone,
      });

      /* Build safe project */
      const safeProject = buildSafeProject({
        meta: {
          orientation,
          mode,
          videoType,
          language,
          assetSource,
          uploadedAssets,
          brand_color: brandColor.trim() || null,
          brand_name:  brandName.trim()  || null,
          audience,
          tone,
        },
        script: {
          text:         aiResult.script,
          emotionalArc: aiResult.meta?.emotionalArc,
        },
        beats: aiResult.beats,
        workflow: {
          script_completed:  true,
          avatar_completed:  false,
          beats_initialized: true,
        },
      });

      /* Save and navigate */
      const saved = await createProject({
        name: name || topic.slice(0, 60),
        rawAI: aiResult,
        safeProject,
      });

      navigate(`/editor/${saved.id}`);

    } catch (err) {
      console.error(err);
      setError(err.message || "Generation failed. Please try again.");
    }

    setLoading(false);
  };

  /* ── UI ── */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#08080d" }}
    >
      <div
        className="w-full max-w-[520px] rounded-[20px] border border-[rgba(255,255,255,0.07)] p-8 flex flex-col gap-5"
        style={{ background: "#111118" }}
      >

        {/* Header */}
        <div>
          <h2
            className="text-[22px] font-bold text-[#e8e8f0] mb-1"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Create New Video
          </h2>
        </div>

        {/* Project name */}
        <div>
          <Label>Project Name</Label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Dhurandhar 2 Review"
            className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors"
          />
        </div>

        {/* Topic */}
        <div>
          <Label>Topic</Label>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="What is this video about? Be specific."
            rows={3}
            className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none transition-colors"
          />
        </div>

        {/* Context / facts (optional) */}
        <div>
          <Label>Context / Facts  <span className="text-[#55556a] normal-case tracking-normal font-normal">(optional)</span></Label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Paste any facts, stats, or notes you want AI to use. Leave empty to let AI decide."
            rows={2}
            className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none resize-none transition-colors"
          />
        </div>

        {/* Two-col row: Audience + Tone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Audience</Label>
            <Select value={audience} onChange={setAudience} options={AUDIENCES} />
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onChange={setTone} options={TONES} />
          </div>
        </div>

        {/* Two-col row: Video Type + Language */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Video Type</Label>
            <Select value={videoType} onChange={setVideoType} options={VIDEO_TYPES} />
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onChange={setLanguage} options={LANGUAGES} />
          </div>
        </div>

        {/* Two-col row: Mode + Orientation */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onChange={setMode} options={MODES} />
          </div>
          <div>
            <Label>Duration</Label>
            <Select value={durationCategory} onChange={setDurationCategory} options={DURATIONS} />
          </div>
        </div>

        {/* Brand — optional */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Brand Color <span className="text-[#55556a] normal-case tracking-normal font-normal">(optional)</span></Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={brandColor || "#7c5cfc"}
                onChange={e => setBrandColor(e.target.value)}
                className="w-[40px] h-[36px] rounded-[6px] border border-[rgba(255,255,255,0.07)] cursor-pointer bg-[#16161f] p-[2px]"
              />
              <input
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1 bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>
          <div>
            <Label>Brand Name <span className="text-[#55556a] normal-case tracking-normal font-normal">(optional)</span></Label>
            <input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. @yourchannel"
              className="w-full bg-[#16161f] border border-[rgba(255,255,255,0.07)] rounded-[8px] px-3 py-[8px] text-[15px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Orientation + Asset Source */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Orientation</Label>
            <Select value={orientation} onChange={setOrientation} options={ORIENTATIONS} />
          </div>
          <div>
            <Label>Assets</Label>
            <Select value={assetSource} onChange={setAssetSource} options={ASSET_SOURCES} />
          </div>
        </div>

        {/* Asset upload */}
        {assetSource === "user" && (
          <div>
            <Label>Upload Assets</Label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFiles}
              className="w-full text-[14px] text-[#9494a8]"
            />
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {previews.map((p, i) => (
                  <div key={i} className="relative w-[60px] h-[80px] rounded-[6px] overflow-hidden border border-[rgba(255,255,255,0.08)]">
                    {p.file.type.startsWith("video") ? (
                      <video src={p.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={p.url} className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-[2px] right-[2px] bg-black/70 text-white text-[10px] w-[16px] h-[16px] rounded-full flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-[14px] text-[#f87171] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[8px] px-3 py-2">
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full rounded-[10px] py-[13px] text-[14px] font-bold transition-all"
          style={{
            fontFamily: "'Syne', sans-serif",
            background: loading || !topic.trim() ? "#1c1c28" : "#f0e040",
            color:      loading || !topic.trim() ? "#55556a" : "#08080d",
            cursor:     loading || !topic.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating…" : "Generate Video"}
        </button>

      </div>
    </div>
  );
}