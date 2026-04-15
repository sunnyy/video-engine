/**
 * LayoutGenerator.jsx — AI Layout Generation Pipeline (v1 restored)
 * /admin/ai-generator
 *
 * Step 1 — Configure (niche, intent, energy, count)
 * Step 2 — Generate Prompts (OpenAI → image-generation prompts)
 * Step 3 — Generate Images (Fal.ai → layout mockup per prompt)
 * Step 4 — Convert to Zones (GPT-4o Vision → zone JSON)
 * Step 5 — Review + Metadata
 * Step 6 — Save
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../../services/serverApi";
import { nichePaletteRegistry } from "../../core/registries/nichePaletteRegistry";
import AdminLayout from "./AdminLayout";

const INTENTS  = ["hook","proof","visual_rest","escalate","reveal","cta","stat","explanation","testimonial","contrast"];
const NICHES   = Object.keys(nichePaletteRegistry).sort();
const ENERGIES = ["high","medium","low"];
const STEP_LABELS = ["Configure","Prompts","Images","Convert","Review","Save"];

/* ── Styles ─────────────────────────────────────────────────── */
const C = {
  card:  { background:"#111118", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, overflow:"hidden" },
  inp:   { padding:"8px 12px", background:"#0d0d14", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, color:"#e8e8f0", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" },
  lbl:   { fontSize:11, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, display:"block" },
  btnP:  { padding:"10px 22px", background:"#7c5cfc", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" },
  btnG:  { padding:"9px 18px", background:"transparent", color:"#888", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
  badge: (color) => ({ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4, background:`${color}22`, color, border:`1px solid ${color}44` }),
};

/* ── StepBar ─────────────────────────────────────────────────── */
function StepBar({ step }) {
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:28, overflowX:"auto", paddingBottom:4 }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1, done = n < step, active = n === step;
        return (
          <div key={n} style={{ display:"flex", alignItems:"center", flex: n < STEP_LABELS.length ? 1 : "none", minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, fontWeight:800,
                background: done ? "#22c55e" : active ? "#7c5cfc" : "#1c1c28",
                color: done || active ? "#fff" : "#444",
                border: active ? "2px solid #a78bfa" : "2px solid transparent",
              }}>{done ? "✓" : n}</div>
              <span style={{ fontSize:13, fontWeight:active?700:500, color:done?"#22c55e":active?"#e8e8f0":"#444", whiteSpace:"nowrap" }}>
                {label}
              </span>
            </div>
            {n < STEP_LABELS.length && (
              <div style={{ flex:1, height:2, margin:"0 8px", background:done?"#22c55e33":"#1c1c28", minWidth:8 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── PromptCard (Step 2) ─────────────────────────────────────── */
function PromptCard({ prompt, approved, onApprove, onReject, onRegenerate, rerolling }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ ...C.card, opacity: approved === false ? 0.4 : 1, transition:"opacity 0.2s" }}>
      <div style={{ padding:"12px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#e8e8f0", flex:1, paddingRight:8 }}>{prompt.title}</div>
          {approved === true  && <span style={C.badge("#22c55e")}>✓ Approved</span>}
          {approved === false && <span style={C.badge("#f87171")}>✕ Rejected</span>}
        </div>
        <p style={{ fontSize:11, color:"#666", margin:"0 0 8px", lineHeight:1.5, fontStyle:"italic" }}>
          {prompt.visual_direction}
        </p>
        {expanded && (
          <div style={{ fontSize:10, color:"#555", lineHeight:1.6, padding:"8px 10px", background:"rgba(255,255,255,0.02)", borderRadius:6, marginBottom:8, whiteSpace:"pre-wrap" }}>
            {prompt.prompt}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={() => setExpanded(e => !e)} style={{ background:"none", border:"none", color:"#7c5cfc", fontSize:10, cursor:"pointer", padding:0 }}>
            {expanded ? "▲ Hide prompt" : "▼ View prompt"}
          </button>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={onApprove} style={{ padding:"4px 10px", borderRadius:5, fontSize:11, cursor:"pointer", background:approved===true?"#22c55e22":"transparent", border:approved===true?"1px solid #22c55e66":"1px solid rgba(255,255,255,0.1)", color:approved===true?"#22c55e":"#555" }}>✓</button>
            <button onClick={onReject}  style={{ padding:"4px 10px", borderRadius:5, fontSize:11, cursor:"pointer", background:approved===false?"#f8717122":"transparent", border:approved===false?"1px solid #f8717166":"1px solid rgba(255,255,255,0.1)", color:approved===false?"#f87171":"#555" }}>✕</button>
            <button onClick={onRegenerate} disabled={rerolling} style={{ padding:"4px 10px", borderRadius:5, fontSize:11, cursor:"pointer", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"#666", opacity:rerolling?0.4:1 }}>↺</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ImageCard (Step 3) ──────────────────────────────────────── */
function ImageCard({ prompt, image, onGenerate }) {
  const W = 120, H = Math.round(120 * 1920 / 1080);
  return (
    <div style={{ ...C.card, width:W + 16 }}>
      <div style={{ width:W, height:H, margin:8, borderRadius:6, overflow:"hidden", background:"#0b0b10", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {image?.loading && (
          <div style={{ textAlign:"center", color:"#444" }}>
            <div style={{ fontSize:18, marginBottom:4 }}>⏳</div>
            <div style={{ fontSize:9 }}>~30s</div>
          </div>
        )}
        {image?.error && (
          <div style={{ textAlign:"center", color:"#f87171", padding:8 }}>
            <div style={{ fontSize:14, marginBottom:3 }}>✕</div>
            <div style={{ fontSize:8, lineHeight:1.4 }}>{image.error.slice(0, 60)}</div>
          </div>
        )}
        {image?.imageUrl && (
          <img src={image.imageUrl} alt={prompt.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        )}
        {!image?.imageUrl && !image?.loading && !image?.error && (
          <div style={{ textAlign:"center", color:"#333" }}>
            <div style={{ fontSize:20 }}>🖼</div>
          </div>
        )}
      </div>
      <div style={{ padding:"0 8px 8px" }}>
        <div style={{ fontSize:9, fontWeight:700, color:"#aaa", marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prompt.title}</div>
        <button onClick={onGenerate} disabled={image?.loading}
          style={{ width:"100%", padding:"4px 0", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)", color:"#a78bfa", opacity:image?.loading?0.4:1 }}>
          {image?.imageUrl ? "↺" : "Gen"}
        </button>
      </div>
    </div>
  );
}

/* ── ConvertCard (Step 4) ─────────────────────────────────────── */
function ConvertCard({ prompt, image, conversion, onConvert }) {
  const [expanded, setExpanded] = useState(false);
  const W = 60, H = Math.round(W * 1920 / 1080);
  const bgType = conversion?.background_type;
  const bgColor = bgType === "environmental" ? "#06b6d4" : bgType === "subject" ? "#f59e0b" : "#22c55e";

  return (
    <div style={{ ...C.card, padding:"12px 14px" }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        {image?.imageUrl && (
          <img src={image.imageUrl} alt={prompt.title}
            style={{ width:W, height:H, objectFit:"cover", borderRadius:5, flexShrink:0, border:"1px solid rgba(255,255,255,0.1)" }} />
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#e8e8f0", marginBottom:4 }}>{prompt.title}</div>
          <div style={{ fontSize:10, color:"#555", marginBottom:8, lineHeight:1.4 }}>{prompt.visual_direction}</div>
          {conversion?.loading && <div style={{ fontSize:10, color:"#666" }}>⏳ Converting with GPT-4o Vision…</div>}
          {conversion?.error   && <div style={{ fontSize:10, color:"#f87171" }}>✕ {conversion.error}</div>}
          {conversion?.zones   && !conversion?.loading && (
            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
              <span style={C.badge("#22c55e")}>{conversion.zones.length} zones</span>
              {bgType && <span style={C.badge(bgColor)}>{bgType}</span>}
              <button onClick={() => setExpanded(e => !e)} style={{ ...C.btnG, padding:"3px 8px", fontSize:9 }}>
                {expanded ? "▲" : "▼ JSON"}
              </button>
              <button onClick={onConvert} style={{ ...C.btnG, padding:"3px 8px", fontSize:9 }}>↺</button>
            </div>
          )}
          {!conversion?.zones && !conversion?.loading && !conversion?.error && (
            <button onClick={onConvert} disabled={!image?.imageUrl}
              style={{ ...C.btnP, padding:"6px 14px", fontSize:11, opacity:!image?.imageUrl?0.4:1 }}>
              Convert →
            </button>
          )}
        </div>
      </div>
      {expanded && conversion?.zones && (
        <pre style={{ marginTop:10, padding:"8px 10px", background:"#0b0b10", borderRadius:6, fontSize:8, color:"#6366f1", overflowX:"auto", maxHeight:180, overflowY:"auto" }}>
          {JSON.stringify(conversion.zones, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── ValidationBadges ────────────────────────────────────────── */
function ValidationBadges({ zones }) {
  if (!zones?.length) return null;
  const errors = [], warnings = [];
  const hasTextZones = zones.some(z => z.type === "text");
  const hasBgZone    = zones.some(z => z.x === 0 && z.y === 0 && (z.width ?? 0) >= 95 && (z.height ?? 0) >= 95);
  const boundsOk     = zones.every(z => (z.x ?? 0) + (z.width ?? 0) <= 100.5 && (z.y ?? 0) + (z.height ?? 0) <= 100.5);
  if (!hasTextZones) errors.push("No text zones");
  if (!boundsOk)     errors.push("Zone out of bounds");
  if (!hasBgZone)    warnings.push("No background zone");
  if (zones.length < 3) warnings.push("Fewer than 3 zones");

  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
      {errors.map(e   => <span key={e} style={C.badge("#f87171")}>{e}</span>)}
      {warnings.map(w => <span key={w} style={C.badge("#f59e0b")}>{w}</span>)}
      {errors.length === 0 && warnings.length === 0 && <span style={C.badge("#22c55e")}>✓ Valid</span>}
    </div>
  );
}

/* ── MetaForm (Step 5) ───────────────────────────────────────── */
function MetaForm({ prompt, meta, onChange }) {
  return (
    <div style={{ ...C.card, padding:"14px" }}>
      <div style={{ fontSize:12, fontWeight:700, color:"#e8e8f0", marginBottom:12 }}>{prompt.title}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <span style={C.lbl}>Name (snake_case)</span>
          <input style={C.inp} value={meta.name ?? ""} placeholder="layout_name"
            onChange={e => onChange("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} />
        </div>
        <div>
          <span style={C.lbl}>Label</span>
          <input style={C.inp} value={meta.label ?? ""} placeholder="Human Readable Label"
            onChange={e => onChange("label", e.target.value)} />
        </div>
        <div>
          <span style={C.lbl}>Energy</span>
          <select style={C.inp} value={meta.energy ?? "high"} onChange={e => onChange("energy", e.target.value)}>
            {ENERGIES.map(en => <option key={en} value={en}>{en}</option>)}
          </select>
        </div>
        <div>
          <span style={C.lbl}>Visibility</span>
          <select style={C.inp} value={meta.visibility ?? "internal"} onChange={e => onChange("visibility", e.target.value)}>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
        </div>
        <div>
          <span style={C.lbl}>Caption</span>
          <select style={C.inp} value={String(meta.show_caption ?? true)} onChange={e => onChange("show_caption", e.target.value === "true")}>
            <option value="true">Show</option>
            <option value="false">Hide</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ── SavedCard (Step 6) ──────────────────────────────────────── */
function SavedCard({ layout, onEdit }) {
  return (
    <div style={{ ...C.card, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
      {layout.thumbnail_url && (
        <img src={layout.thumbnail_url} alt={layout.label} style={{ width:40, height:72, objectFit:"cover", borderRadius:5, flexShrink:0 }} />
      )}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#22c55e", marginBottom:2 }}>✓ {layout.label}</div>
        <div style={{ fontSize:10, color:"#555", fontFamily:"monospace" }}>{layout.name} · {layout.zones?.length ?? 0} zones</div>
      </div>
      <button onClick={onEdit} style={{ ...C.btnP, padding:"6px 14px", fontSize:11 }}>Edit →</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export default function LayoutGenerator() {
  const navigate = useNavigate();

  const [step,   setStep]   = useState(1);
  const [config, setConfig] = useState({ niche:"entertainment", intent:"hook", energy:"high", count:4 });

  // Step 2 — prompts
  const [prompts,        setPrompts]        = useState([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError,   setPromptsError]   = useState(null);
  const [approvals,      setApprovals]      = useState({});   // { [id]: true|false }
  const [rerolling,      setRerolling]      = useState({});

  // Step 3 — images[promptId]: { imageUrl, falUrl, loading, error }
  const [images,      setImages]      = useState({});
  const imgStarted = useRef(false);

  // Step 4 — conversions[promptId]: { zones, background_type, loading, error }
  const [conversions,      setConversions]      = useState({});
  const convertStarted = useRef(false);

  // Step 5 — metas[promptId]
  const [metas, setMetas] = useState({});

  // Step 6 — save
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);
  const [savedLayouts, setSavedLayouts] = useState([]);

  /* ── Derived ──────────────────────────────────────────────── */
  const approvedPrompts  = prompts.filter(p => approvals[p.id] !== false && !!p.id);
  const imagesDone       = approvedPrompts.filter(p => images[p.id]?.imageUrl || images[p.id]?.error).length;
  const allImagesDone    = approvedPrompts.length > 0 && imagesDone >= approvedPrompts.length;
  const allConvertsDone  = approvedPrompts.length > 0 && approvedPrompts.every(p => conversions[p.id]?.zones || conversions[p.id]?.error);
  const readyToSave      = approvedPrompts.filter(p => conversions[p.id]?.zones?.length > 0);

  /* ── Step 2: Generate prompts ─────────────────────────────── */
  const handleGeneratePrompts = useCallback(async () => {
    setPromptsLoading(true); setPromptsError(null); setPrompts([]);
    setApprovals({}); setImages({}); setConversions({}); setMetas({}); setSavedLayouts([]); setSaveError(null);
    imgStarted.current = false; convertStarted.current = false;
    try {
      const r = await serverFetch("/api/admin/generate-layout-prompts", { method:"POST", body:JSON.stringify(config) });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      const { prompts: list } = await r.json();
      setPrompts(list);
      const auto = {};
      list.forEach(p => { auto[p.id] = true; });
      setApprovals(auto);
    } catch (e) { setPromptsError(e.message); }
    finally     { setPromptsLoading(false); }
  }, [config]);

  const handleReroll = useCallback(async (idx) => {
    const pid = prompts[idx]?.id; if (!pid) return;
    setRerolling(r => ({ ...r, [pid]:true }));
    try {
      const r = await serverFetch("/api/admin/generate-layout-prompts", { method:"POST", body:JSON.stringify({ ...config, count:1 }) });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      const { prompts:[fresh] } = await r.json();
      if (fresh) {
        setPrompts(prev => prev.map((p, i) => i === idx ? { ...fresh, id:pid } : p));
        setImages(prev => { const n = { ...prev }; delete n[pid]; return n; });
        setConversions(prev => { const n = { ...prev }; delete n[pid]; return n; });
      }
    } catch {}
    finally { setRerolling(r => { const n = { ...r }; delete n[pid]; return n; }); }
  }, [prompts, config]);

  /* ── Step 3: Generate images ──────────────────────────────── */
  const generateImage = useCallback(async (p) => {
    setImages(prev => ({ ...prev, [p.id]:{ ...prev[p.id], loading:true, error:null } }));
    try {
      const r = await serverFetch("/api/admin/generate-layout-preview", {
        method:"POST",
        body:JSON.stringify({ prompt: p.prompt, niche: config.niche, intent: config.intent }),
      });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      const { imageUrl, falUrl } = await r.json();
      setImages(prev => ({ ...prev, [p.id]:{ imageUrl, falUrl, loading:false } }));
    } catch (e) {
      setImages(prev => ({ ...prev, [p.id]:{ loading:false, error:e.message } }));
    }
  }, [config]);

  const generateAllImages = useCallback(async () => {
    if (imgStarted.current) return;
    imgStarted.current = true;
    await Promise.all(approvedPrompts.map(p => generateImage(p)));
  }, [approvedPrompts, generateImage]);

  /* ── Step 4: Convert images to zones ─────────────────────── */
  const convertImage = useCallback(async (p) => {
    const imageUrl = images[p.id]?.imageUrl;
    if (!imageUrl) return;
    setConversions(prev => ({ ...prev, [p.id]:{ loading:true, error:null } }));
    try {
      const r = await serverFetch("/api/admin/convert-layout-image", {
        method:"POST",
        body:JSON.stringify({ imageUrl, niche: config.niche, intent: config.intent, energy: config.energy }),
      });
      if (!r.ok) throw new Error((await r.json()).error || r.status);
      const { zones, background_type } = await r.json();
      setConversions(prev => ({ ...prev, [p.id]:{ zones, background_type, loading:false } }));
      // Pre-populate metadata
      setMetas(prev => ({
        ...prev,
        [p.id]: prev[p.id] || {
          name:  p.title.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,30),
          label: p.title,
          intent: config.intent, energy: config.energy,
          niche: config.niche, show_caption: true, visibility: "internal",
        },
      }));
    } catch (e) {
      setConversions(prev => ({ ...prev, [p.id]:{ loading:false, error:e.message } }));
    }
  }, [images, config]);

  const convertAllImages = useCallback(async () => {
    if (convertStarted.current) return;
    convertStarted.current = true;
    await Promise.all(approvedPrompts.filter(p => images[p.id]?.imageUrl).map(p => convertImage(p)));
  }, [approvedPrompts, images, convertImage]);

  // Auto-start conversions when entering step 4
  useEffect(() => {
    if (step === 4) convertAllImages();
  }, [step]);

  /* ── Step 6: Save ─────────────────────────────────────────── */
  const handleSaveAll = useCallback(async () => {
    setSaving(true); setSaveError(null);
    for (const p of readyToSave) {
      const meta  = metas[p.id] || {};
      const zones = conversions[p.id]?.zones;
      const thumbnailUrl = images[p.id]?.imageUrl || null;
      try {
        const r = await serverFetch("/api/admin/layouts", {
          method:"POST",
          body:JSON.stringify({
            name:         meta.name  || p.title.toLowerCase().replace(/[^a-z0-9]+/g,"_").slice(0,30),
            label:        meta.label || p.title,
            intent:       config.intent,
            energy:       [meta.energy || config.energy],
            niche:        [config.niche],
            orientation:  "9:16",
            visibility:   meta.visibility  || "internal",
            show_caption: meta.show_caption ?? true,
            zones,
            thumbnail_url: thumbnailUrl,
            generation_meta: {
              title:            p.title,
              visual_direction: p.visual_direction,
              background_type:  conversions[p.id]?.background_type,
              generated_at:     new Date().toISOString(),
            },
          }),
        });
        if (!r.ok) throw new Error((await r.json()).error || r.status);
        const saved = await r.json();
        setSavedLayouts(prev => [...prev, saved]);
      } catch (e) {
        setSaveError(prev => prev ? `${prev}\n${e.message}` : e.message);
      }
    }
    setSaving(false);
    if (readyToSave.length > 0) setStep(6);
  }, [readyToSave, metas, conversions, images, config]);

  /* ── Reset ────────────────────────────────────────────────── */
  const reset = () => {
    setStep(1); setPrompts([]); setApprovals({}); setImages({}); setConversions({}); setMetas({});
    setSavedLayouts([]); setSaveError(null);
    imgStarted.current = false; convertStarted.current = false;
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <AdminLayout>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, margin:"0 0 4px" }}>Layout Generator</h1>
            <p style={{ color:"#555", fontSize:13, margin:0 }}>Prompts → Images → Vision → Zones → Save</p>
          </div>
          <button onClick={() => navigate("/admin/layouts")} style={{ ...C.btnG, fontSize:12 }}>← Layout Manager</button>
        </div>

        <StepBar step={step} />

        {/* ═══ STEP 1: Configure ═══════════════════════════════ */}
        {step === 1 && (
          <div style={{ ...C.card, padding:24, maxWidth:600 }}>
            <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 18px" }}>Configure Generation</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <span style={C.lbl}>Niche</span>
                <select style={C.inp} value={config.niche} onChange={e => setConfig(c => ({ ...c, niche:e.target.value }))}>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <span style={C.lbl}>Intent</span>
                <select style={C.inp} value={config.intent} onChange={e => setConfig(c => ({ ...c, intent:e.target.value }))}>
                  {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <span style={C.lbl}>Energy</span>
                <select style={C.inp} value={config.energy} onChange={e => setConfig(c => ({ ...c, energy:e.target.value }))}>
                  {ENERGIES.map(en => <option key={en} value={en}>{en}</option>)}
                </select>
              </div>
              <div>
                <span style={C.lbl}>Prompts to generate</span>
                <select style={C.inp} value={config.count} onChange={e => setConfig(c => ({ ...c, count:Number(e.target.value) }))}>
                  {[1,2,3,4,5,6,8].map(n => <option key={n} value={n}>{n} prompt{n !== 1 ? "s" : ""}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => { handleGeneratePrompts(); setStep(2); }}
              style={C.btnP}>
              Generate Prompts →
            </button>
          </div>
        )}

        {/* ═══ STEP 2: Prompts ═════════════════════════════════ */}
        {step === 2 && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px" }}>Review Prompts</h2>
                <p style={{ color:"#555", fontSize:12, margin:0 }}>
                  {promptsLoading ? `GPT-4o generating ${config.count} layout prompts…` : `${prompts.length} prompts ready — approve, reject, or re-roll`}
                </p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep(1)} style={C.btnG}>← Back</button>
                <button onClick={handleGeneratePrompts} disabled={promptsLoading} style={C.btnG}>↺ Regenerate</button>
                <button onClick={() => { imgStarted.current = false; setStep(3); generateAllImages(); }}
                  disabled={promptsLoading || approvedPrompts.length === 0}
                  style={{ ...C.btnP, opacity:promptsLoading||approvedPrompts.length===0?0.5:1 }}>
                  Generate Images ({approvedPrompts.length}) →
                </button>
              </div>
            </div>

            {promptsLoading && (
              <div style={{ ...C.card, padding:40, textAlign:"center", color:"#444" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>⏳</div>
                <div style={{ fontSize:13 }}>GPT-4o designing {config.count} unique layouts…</div>
              </div>
            )}
            {promptsError && (
              <div style={{ color:"#f87171", fontSize:12, marginBottom:14, padding:"10px 14px", background:"rgba(248,113,113,0.1)", borderRadius:8 }}>
                {promptsError}
              </div>
            )}
            {prompts.length > 0 && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12 }}>
                  {prompts.map((p, i) => (
                    <PromptCard key={p.id} prompt={p}
                      approved={approvals[p.id]}
                      onApprove={() => setApprovals(a => ({ ...a, [p.id]:true }))}
                      onReject ={() => setApprovals(a => ({ ...a, [p.id]:false }))}
                      onRegenerate={() => handleReroll(i)}
                      rerolling={!!rerolling[p.id]}
                    />
                  ))}
                </div>
                <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
                  <button onClick={() => { imgStarted.current = false; setStep(3); generateAllImages(); }}
                    disabled={approvedPrompts.length === 0}
                    style={{ ...C.btnP, opacity:approvedPrompts.length===0?0.5:1 }}>
                    Generate Images ({approvedPrompts.length}) →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 3: Images ══════════════════════════════════ */}
        {step === 3 && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px" }}>Generating Layout Mockups</h2>
                <p style={{ color:"#555", fontSize:12, margin:0 }}>flux/dev · Full composite layout images · {imagesDone}/{approvedPrompts.length} done</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep(2)} style={C.btnG}>← Back</button>
                <button onClick={() => { convertStarted.current = false; setStep(4); }}
                  disabled={!allImagesDone}
                  style={{ ...C.btnP, opacity:!allImagesDone?0.5:1 }}>
                  Convert to Zones →
                </button>
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
              {approvedPrompts.map(p => (
                <ImageCard key={p.id} prompt={p} image={images[p.id]}
                  onGenerate={() => generateImage(p)}
                />
              ))}
            </div>
            {allImagesDone && (
              <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
                <button onClick={() => { convertStarted.current = false; setStep(4); }} style={C.btnP}>
                  Convert to Zones →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Convert ═════════════════════════════════ */}
        {step === 4 && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px" }}>Converting to Zones</h2>
                <p style={{ color:"#555", fontSize:12, margin:0 }}>GPT-4o Vision analyzing each mockup and decomposing into zone JSON</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep(3)} style={C.btnG}>← Back</button>
                <button onClick={() => setStep(5)} disabled={!allConvertsDone}
                  style={{ ...C.btnP, opacity:!allConvertsDone?0.5:1 }}>
                  Review & Metadata →
                </button>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {approvedPrompts.map(p => (
                <ConvertCard key={p.id} prompt={p} image={images[p.id]}
                  conversion={conversions[p.id]}
                  onConvert={() => convertImage(p)}
                />
              ))}
            </div>
            {allConvertsDone && (
              <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
                <button onClick={() => setStep(5)} style={C.btnP}>Review & Metadata →</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 5: Review + Metadata ═══════════════════════ */}
        {step === 5 && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px" }}>Review & Metadata</h2>
                <p style={{ color:"#555", fontSize:12, margin:0 }}>{readyToSave.length} layout{readyToSave.length!==1?"s":""} ready to save</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setStep(4)} style={C.btnG}>← Back</button>
                <button onClick={handleSaveAll} disabled={saving || readyToSave.length === 0}
                  style={{ ...C.btnP, opacity:saving||readyToSave.length===0?0.6:1 }}>
                  {saving ? "Saving…" : `Save ${readyToSave.length} Layout${readyToSave.length!==1?"s":""} →`}
                </button>
              </div>
            </div>

            {saveError && (
              <div style={{ color:"#f87171", fontSize:12, padding:"10px 14px", background:"rgba(248,113,113,0.1)", borderRadius:8, marginBottom:14 }}>
                {saveError}
              </div>
            )}

            {/* Conversion summaries */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:12, marginBottom:20 }}>
              {readyToSave.map(p => {
                const conv = conversions[p.id];
                const W = 50, H = Math.round(W * 1920 / 1080);
                return (
                  <div key={p.id} style={{ ...C.card, padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                      {images[p.id]?.imageUrl && (
                        <img src={images[p.id].imageUrl} alt={p.title}
                          style={{ width:W, height:H, objectFit:"cover", borderRadius:4, flexShrink:0 }} />
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#e8e8f0", marginBottom:2 }}>{p.title}</div>
                        <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>{p.visual_direction}</div>
                        <ValidationBadges zones={conv?.zones} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metadata forms */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {readyToSave.map(p => (
                <MetaForm key={p.id} prompt={p} meta={metas[p.id] || {}}
                  onChange={(field, val) => setMetas(prev => ({ ...prev, [p.id]:{ ...prev[p.id], [field]:val } }))} />
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 6: Done ════════════════════════════════════ */}
        {step === 6 && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, margin:"0 0 4px" }}>
                  {savedLayouts.length} Layout{savedLayouts.length!==1?"s":""} Saved
                </h2>
                <p style={{ color:"#555", fontSize:12, margin:0 }}>
                  Saved with mockup thumbnails and Vision-derived zone JSON
                </p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={reset} style={C.btnG}>Generate More</button>
                <button onClick={() => navigate("/admin/layouts")} style={C.btnP}>View in Layout Manager →</button>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {savedLayouts.map(l => (
                <SavedCard key={l.id} layout={l} onEdit={() => navigate(`/admin/layouts/${l.id}`)} />
              ))}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
