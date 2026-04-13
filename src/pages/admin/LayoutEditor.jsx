/**
 * LayoutEditor.jsx  — full-screen layout editor
 * Route: /admin/layouts/:layoutId
 *
 * Injects a fake single-beat project into useProjectStore so the
 * real CanvasPreview + ZonesSection work without any changes.
 * Save writes updated zone defs back to the source file via the server.
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useProjectStore }      from "../../store/useProjectStore";
import { layoutRegistry }       from "../../core/registries/layoutRegistry";
import { nichePaletteRegistry } from "../../core/registries/nichePaletteRegistry";
import { generateVideoDNA }     from "../../core/videoDNA";
import { serverFetch }          from "../../services/serverApi";
import CanvasPreview            from "../../ui/Editor/CanvasPreview";
import ZonesSection             from "../../ui/Editor/ZonesSection";

/* ── Constants ─────────────────────────────────────────────── */
const NICHES = Object.keys(nichePaletteRegistry).sort();

const IC = {
  hook:"#f97316", proof:"#22c55e", visual_rest:"#38bdf8", escalate:"#f87171",
  reveal:"#a78bfa", cta:"#f5c518", stat:"#fb923c", explanation:"#818cf8",
  testimonial:"#34d399", contrast:"#f472b6",
};

const PLACEHOLDER = {
  headline:"THIS IS THE HOOK",
  subtext: "Here's what you need to know about this",
  label:   "LABEL",
  caption: "Caption text example that wraps",
  cta:     "TAP NOW →",
  stat:    "94%",
  metric:  "10X",
  quote:   '"This is a testimonial quote right here"',
  default: "Text Zone",
};

const ASSET_BG = ["#1a1e40", "#1a3020", "#301a1a", "#1a2a35", "#2a1a35"];

/* ── Fake project builder ───────────────────────────────────── */
function buildFakeBeat(layoutDef, dna) {
  const zones = {};
  (layoutDef.zones ?? []).forEach((z, i) => {
    if (z.type === "text") {
      zones[z.id] = {
        content:    { kind: "text", text: PLACEHOLDER[z.role] ?? PLACEHOLDER.default },
        background: {},
        style:      {},
      };
    } else if (z.type === "asset") {
      zones[z.id] = {
        background: { kind: "color", color: ASSET_BG[i % ASSET_BG.length] },
        style:      {},
      };
    } else {
      zones[z.id] = { background: {}, style: {} };
    }
  });

  return {
    id:               `lm_${layoutDef.id}`,
    layout:           layoutDef.id,
    zones,
    intent:           Array.isArray(layoutDef.intent) ? layoutDef.intent[0] : layoutDef.intent,
    energy:           0.7,
    start_sec:        0,
    end_sec:          5,
    duration_sec:     5,
    caption:          { show: false, text: "", style: "wordBlaze", position: 80 },
    transition:       { type: "cut", duration: 0 },
    overlays:         [],
    spoken:           "",
    layoutBackground: { type: "color", value: dna?.colorStory?.bg ?? "#111118" },
    dna,
  };
}

function buildFakeProject(beat, dna) {
  return {
    id:           "layout-editor-preview",
    meta:         { width: 1080, height: 1920, fps: 25, orientation: "9:16", mode: "faceless" },
    beats:        [beat],
    duration_sec: 5,
    dna,
    audio:        {},
    avatar:       null,
  };
}

/* ── Save utility ───────────────────────────────────────────── */
const DEF_FIELDS = ["x","y","width","height","zIndex","start","end",
  "enterAnimation","exitAnimation","maxChars","order"];

function buildSaveZones(layoutDef, beatZones) {
  return (layoutDef.zones ?? []).map(defZone => {
    const bz     = beatZones?.[defZone.id] ?? {};
    const merged = { ...defZone };
    for (const f of DEF_FIELDS) {
      if (bz[f] !== undefined) merged[f] = bz[f];
    }
    if (bz.style && Object.keys(bz.style).length > 0) {
      merged.style = { ...(defZone.style ?? {}), ...bz.style };
    }
    delete merged.content;
    delete merged.background;
    return merged;
  });
}

/* ── Main ───────────────────────────────────────────────────── */
export default function LayoutEditor() {
  const { layoutId } = useParams();
  const navigate     = useNavigate();
  const layout       = layoutRegistry[layoutId];

  /* Store */
  const setProject    = useProjectStore(s => s.setProject);
  const setDatabaseId = useProjectStore(s => s.setDatabaseId);
  const project       = useProjectStore(s => s.project);
  const activeBeat    = project?.beats?.[0] ?? null;

  /* State */
  const [niche,          setNiche]          = useState("entertainment");
  const [energy,         setEnergy]         = useState("high");
  const [selectedZoneIds,setSelectedZoneIds]= useState(new Set());
  const [saving,         setSaving]         = useState(false);
  const [saveMsg,        setSaveMsg]        = useState(null);

  const selectedZoneId = selectedZoneIds.size === 1 ? [...selectedZoneIds][0] : null;

  const primaryIntent = layout
    ? (Array.isArray(layout.intent) ? layout.intent[0] : layout.intent)
    : null;

  /* Inject fake project into store on mount / niche / energy change */
  useEffect(() => {
    if (!layout?.def) return;
    const energyNum = energy === "high" ? 0.9 : energy === "medium" ? 0.6 : 0.3;
    const dna       = generateVideoDNA({ videoType: "viral", tone: "bold", niche, energy: energyNum });
    const beat      = buildFakeBeat(layout.def, dna);
    const proj      = buildFakeProject(beat, dna);
    setDatabaseId(null);
    setProject(proj);
    setSelectedZoneIds(new Set());
    setSaveMsg(null);
  }, [layoutId, niche, energy]);

  const handleSelectZone = useCallback((id, mod = false) => {
    if (!id) { setSelectedZoneIds(new Set()); return; }
    if (mod) {
      setSelectedZoneIds(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
    } else {
      setSelectedZoneIds(new Set([id]));
    }
  }, []);

  const handleSave = async () => {
    if (!layout) return;
    const beat = useProjectStore.getState().project?.beats?.[0];
    if (!beat) return;
    const zones = buildSaveZones(layout.def, beat.zones);
    setSaving(true);
    setSaveMsg(null);
    try {
      const res  = await serverFetch("/api/admin/layout/save", {
        method: "POST",
        body:   JSON.stringify({ layoutId, intent: layout.intent, zones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaveMsg({ ok: true, text: `Saved ${data.saved} zones` });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!layout) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#0d0d14", color:"#555", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:32 }}>⚠</div>
        <div>Layout "{layoutId}" not found</div>
        <button onClick={() => navigate("/admin/layouts")}
          style={{ padding:"6px 14px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#888", cursor:"pointer", fontSize:12 }}>
          ← Back to Layout Manager
        </button>
      </div>
    );
  }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden",
      background:"#0d0d14", color:"#e8e8f0", fontFamily:"system-ui" }}>

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
        borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0, background:"#111118" }}>

        <button onClick={() => navigate("/admin/layouts")}
          style={{ padding:"5px 10px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#888", cursor:"pointer", fontSize:12 }}>
          ← Layouts
        </button>

        <div style={{ width:1, height:16, background:"rgba(255,255,255,0.1)" }} />

        <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#e8e8f0" }}>
          {layoutId}
        </span>
        {primaryIntent && (
          <span style={{ padding:"2px 7px", borderRadius:4, fontSize:10, fontWeight:700,
            background:`${IC[primaryIntent]??"#888"}22`, color:IC[primaryIntent]??"#aaa" }}>
            {primaryIntent}
          </span>
        )}

        <span style={{ fontSize:10, color:"#444", fontFamily:"monospace" }}>
          {layout.def?.zones?.length ?? 0} zones · {layout.assetCount}a · {layout.textCount}t · cap:{layout.captionStrategy}
        </span>

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {/* Niche */}
          <select value={niche} onChange={e => setNiche(e.target.value)}
            style={{ padding:"4px 8px", background:"#0d0d18", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, color:"#aaa", fontSize:11, outline:"none" }}>
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Energy */}
          <select value={energy} onChange={e => setEnergy(e.target.value)}
            style={{ padding:"4px 8px", background:"#0d0d18", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, color:"#aaa", fontSize:11, outline:"none" }}>
            {["high","medium","low"].map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {saveMsg && (
            <span style={{ fontSize:11, color:saveMsg.ok ? "#22c55e" : "#f87171" }}>
              {saveMsg.text}
            </span>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ padding:"6px 16px", borderRadius:6, fontSize:12, fontWeight:700,
              background:"#f5c518", color:"#0b0b10", border:"none",
              cursor:saving ? "not-allowed" : "pointer", opacity:saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save Layout"}
          </button>
        </div>
      </div>

      {/* ── Canvas + Zone Editor ── */}
      {activeBeat ? (
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* Canvas */}
          <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
            <CanvasPreview
              selectedZoneIds={selectedZoneIds}
              onSelectZone={handleSelectZone}
            />
          </div>

          {/* Zones panel */}
          <div style={{ width:560, flexShrink:0, borderLeft:"1px solid rgba(255,255,255,0.07)", overflowY:"auto", background:"#13131f" }}
            className="flex flex-col p-10">
            <ZonesSection
              beat={activeBeat}
              project={project}
              selectedZoneId={selectedZoneId}
              selectedZoneIds={selectedZoneIds}
              onSelectZone={handleSelectZone}
            />
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#333" }}>
          Loading…
        </div>
      )}
    </div>
  );
}
