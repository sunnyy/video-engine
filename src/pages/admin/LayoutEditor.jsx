/**
 * LayoutEditor.jsx — create / edit a layout
 * Route: /admin/layouts/:layoutId   (layoutId === "new" → create mode)
 *
 * Injects a fake single-beat project into useProjectStore so CanvasPreview
 * and ZonesSection work without modification.
 * Save writes zones + metadata to Supabase via the admin API.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate }  from "react-router-dom";

import { useProjectStore }      from "../../store/useProjectStore";
import { layoutRegistry, refreshCache, initLayoutRegistry } from "../../core/registries/layoutRegistry";
import { nichePaletteRegistry } from "../../core/registries/nichePaletteRegistry";
import { generateVideoDNA }     from "../../core/videoDNA";
import { serverFetch }          from "../../services/serverApi";
import CanvasPreview            from "../../ui/Editor/CanvasPreview";
import ZonesSection             from "../../ui/Editor/ZonesSection";
import BeatSection              from "../../ui/Editor/BeatSection";

/* ── Constants ────────────────────────────────────────────────── */
const NICHES     = Object.keys(nichePaletteRegistry).sort();
const INTENTS    = ["hook","proof","visual_rest","escalate","reveal","cta","stat","explanation","testimonial","contrast"];
const BEAT_TYPES = ["hook","item","fact","stat","reveal","explanation","cta","contrast","tension"];
const ENERGIES = ["high","medium","low"];
const IC = {
  hook:"#f97316", proof:"#22c55e", visual_rest:"#38bdf8", escalate:"#f87171",
  reveal:"#a78bfa", cta:"#f5c518", stat:"#fb923c", explanation:"#818cf8",
  testimonial:"#34d399", contrast:"#f472b6",
};
const PLACEHOLDER = {
  headline:"THIS IS THE HOOK", subtext:"Here's what you need to know",
  label:"LABEL", cta:"TAP NOW →", stat:"94%", metric:"10X",
  quote:'"This is a testimonial quote"', default:"Text Zone",
};
const ASSET_BG = ["#1a1e40","#1a3020","#301a1a","#1a2a35","#2a1a35"];

/* ── Helpers ──────────────────────────────────────────────────── */
function buildFakeBeat(layoutDef, dna) {
  const zones = {};
  (layoutDef?.zones ?? []).forEach((z, i) => {
    if (z.type === "text") {
      zones[z.id] = {
        type:       "text",
        content:    z.content?.text
          ? z.content
          : { kind:"text", text: PLACEHOLDER[z.role] ?? PLACEHOLDER.default },
        background: z.background ?? {},
        style:      z.style ?? {},
      };
    } else if (z.type === "asset") {
      zones[z.id] = {
        type:       "asset",
        content:    z.content?.asset?.src ? z.content : undefined,
        background: z.content?.asset?.src
          ? (z.background ?? {})
          : { kind:"color", color: ASSET_BG[i % ASSET_BG.length] },
        style:      z.style ?? {},
      };
    } else {
      zones[z.id] = { type: z.type, content: z.content ?? {}, background: z.background ?? {}, style: z.style ?? {} };
    }
  });

  return {
    id:           `lm_${layoutDef?.id ?? "new"}`,
    layout:       layoutDef?.id ?? "new",
    zones,
    intent:       layoutDef?.intent ?? "hook",
    energy:       0.7,
    start_sec:    0, end_sec: 5, duration_sec: 5,
    caption:      { show:false, text:"", style:"wordBlaze", position:80 },
    transition:   { type:"cut", duration:0 },
    overlays:     [],
    spoken:       "",
    layoutBackground: layoutDef?.generation_meta?.default_background ?? layoutDef?.default_background ?? null,
    dna,
  };
}

function buildFakeProject(beat, dna, layoutDef) {
  return {
    id:           "layout-editor-preview",
    meta:         { width:1080, height:1920, fps:25, orientation:"9:16", mode:"faceless",
                    inlineLayoutDef: layoutDef ?? null },
    beats:        [beat],
    duration_sec: 5,
    dna,
    audio:        {},
    avatar:       null,
  };
}

/* Starter layout definition for brand-new layouts */
const NEW_LAYOUT_DEF = {
  id: "new",
  intent: "hook",
  zones: [
    {
      id: "z1", type: "text", role: "headline",
      x: 5, y: 38, width: 90, height: 8, zIndex: 2,
      style: { fontSize: 80, fontWeight: 900, textAlign: "center", color: "#ffffff", lineHeight: 1.1 },
      enterAnimation: "fadeIn", maxChars: 40,
    },
  ],
};

/* Collect edited zone definitions from the store beat, merging back into def zones */
const DEF_FIELDS = ["x","y","width","height","zIndex","start","end",
  "enterAnimation","exitAnimation","maxChars","order","role","visual_type","locked"];

function buildSaveZones(defZones, beatZones, deletedZones = []) {
  const deletedSet  = new Set(deletedZones);
  // Only count zones with real string ids in the def set — undefined/"undefined" ghost
  // zones must not pollute defZoneIds or be re-saved.
  // Deduplicate by id — bad data from earlier saves may have duplicate zone ids
  const seen = new Set();
  const validDefZones = (defZones ?? []).filter(z => {
    if (!z.id || typeof z.id !== "string" || z.id === "undefined") return false;
    if (seen.has(z.id)) return false;
    seen.add(z.id);
    return true;
  });
  const defZoneIds  = new Set(validDefZones.map(z => z.id));

  // 1. Layout-defined zones — merge beat overrides, skip deleted ones
  const layoutZones = validDefZones
    .filter(defZone => !deletedSet.has(defZone.id))
    .map(defZone => {
      const bz     = beatZones?.[defZone.id] ?? {};
      const merged = { ...defZone };
      for (const f of DEF_FIELDS) {
        if (bz[f] !== undefined) merged[f] = bz[f];
      }
      if (bz.style && Object.keys(bz.style).length > 0) {
        merged.style = { ...(defZone.style ?? {}), ...bz.style };
      }
      if (bz.content && Object.keys(bz.content).length > 0) {
        merged.content = bz.content;
      }
      if (bz.background !== undefined) {
        merged.background = bz.background;
      }
      return merged;
    });

  // 2. Custom zones (added during editing) — stored whole in beat.zones, not in defZones.
  //    The id is the dict key, not inside zoneData, so inject it explicitly.
  //    Also exclude explicitly-deleted zones: after a save+refreshCache the def no longer
  //    contains the deleted zone, so without this check it would be re-saved as a "custom" zone.
  const customZones = Object.entries(beatZones ?? {})
    .filter(([id]) => id && id !== "undefined" && !defZoneIds.has(id) && !deletedSet.has(id))
    .map(([id, zoneData]) => {
      // Strip any nested `id` field from the zone data — the dict key is authoritative.
      // Without this, a duplicated zone carries the original def zone's id and overwrites
      // the unique custom id, causing it to be silently deduped away on save+reload.
      const { id: _ignored, ...rest } = zoneData;
      return { id, ...rest };
    });

  return [...layoutZones, ...customZones];
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function LayoutEditor() {
  const { layoutId } = useParams();
  const navigate     = useNavigate();
  const isNew        = layoutId === "new";

  // Load from registry proxy (cache-backed); new layouts start from the starter def
  const layout     = isNew ? null : layoutRegistry[layoutId];
  const layoutDef  = layout?.def ?? (isNew ? NEW_LAYOUT_DEF : null);

  /* Project store */
  const setProject    = useProjectStore(s => s.setProject);
  const setDatabaseId = useProjectStore(s => s.setDatabaseId);
  const project       = useProjectStore(s => s.project);
  const activeBeat    = project?.beats?.[0] ?? null;

  /* Preview DNA — derived from meta so there's only one source of truth */

  /* Metadata state — pre-filled from existing layout or blank for new */
  const [metaName,       setMetaName]       = useState(layout?.name            ?? "");
  const [metaLabel,      setMetaLabel]      = useState(layout?.label           ?? "");
  const [metaIntent,     setMetaIntent]     = useState(layout?.intent          ?? "hook");
  const [metaEnergy,     setMetaEnergy]     = useState(layout?.energy          ?? ["high","medium","low"]);
  const [metaNiche,      setMetaNiche]      = useState(layout?.niche           ?? []);
  const [metaType,         setMetaType]         = useState(layout?.type        ?? "template");
  const [metaBeatType,     setMetaBeatType]     = useState(layout?.beatType    ?? "");
  const [metaVisibility,   setMetaVisibility]   = useState(layout?.visibility  ?? "active");
  const [metaShowCaption,    setMetaShowCaption]    = useState(layout?.showCaption ?? false);
  const [metaTransitionType, setMetaTransitionType] = useState(layout?.defaultTransition?.type ?? "");
  const [metaTransitionDur,  setMetaTransitionDur]  = useState(layout?.defaultTransition?.duration ?? 12);

  /* UI state */
  const [registryReady,   setRegistryReady]   = useState(false);
  const [selectedZoneIds, setSelectedZoneIds] = useState(new Set());
  const [saving,          setSaving]          = useState(false);
  const [saveMsg,         setSaveMsg]         = useState(null);
  const [metaOpen,        setMetaOpen]        = useState(isNew);
  const [rightTab,        setRightTab]        = useState("beat"); // "beat" | "zones" | "assets"

  /* Asset background-removal state: { [zoneId]: { loading, error } } */
  const [rembgState, setRembgState] = useState({});

  /* Auto-save refs */
  const autoSaveTimer   = useRef(null);
  const skipAutoSave    = useRef(true);   // true until first project load settles
  const handleSaveRef   = useRef(null);  // always points to latest handleSave closure

  const selectedZoneId = selectedZoneIds.size === 1 ? [...selectedZoneIds][0] : null;

  /* Auto-update maxChars when text content changes for the selected zone */
  useEffect(() => {
    if (!selectedZoneId || !activeBeat) return;
    const defZone = (layoutDef?.zones ?? []).find(z => z.id === selectedZoneId);
    if (defZone?.type !== "text") return;
    const text = activeBeat.zones?.[selectedZoneId]?.content?.text ?? "";
    if (!text) return;
    const zones = { ...(activeBeat.zones ?? {}) };
    zones[selectedZoneId] = { ...(zones[selectedZoneId] ?? {}), maxChars: text.length };
    useProjectStore.getState().updateBeatSilent(activeBeat.id, { zones });
  }, [activeBeat?.zones?.[selectedZoneId]?.content?.text]);

  /* Wait for registry on mount — resolves the "not found in cache" flash on refresh.
     Once ready, also re-populate metadata state (useState initial values are computed
     before the registry loads, so they're all empty strings on first render). */
  useEffect(() => {
    initLayoutRegistry().then(() => {
      setRegistryReady(true);
      if (!isNew) {
        const entry = layoutRegistry[layoutId];
        if (!entry) return;
        setMetaName(entry.name            ?? "");
        setMetaLabel(entry.label          ?? "");
        setMetaIntent(entry.intent        ?? "hook");
        setMetaEnergy(entry.energy        ?? ["high","medium","low"]);
        setMetaNiche(entry.niche          ?? []);
        setMetaType(entry.type     ?? "template");
        setMetaBeatType(entry.beatType ?? "");
        setMetaVisibility(entry.visibility ?? "active");
        setMetaShowCaption(entry.showCaption ?? true);
        setMetaTransitionType(entry.defaultTransition?.type ?? "");
        setMetaTransitionDur(entry.defaultTransition?.duration ?? 12);
      }
    });
  }, []);

  /* Keep handleSaveRef current so auto-save always calls the latest closure */
  useEffect(() => { handleSaveRef.current = handleSave; });

  /* Inject fake project into store on mount / niche / energy / layout change.
     registryReady in deps ensures we rebuild with the correct layoutDef once
     the cache loads — fixes the stale-closure bug that showed wrong zones. */
  useEffect(() => {
    if (!isNew && !registryReady) return; // wait for cache before loading existing layouts
    const previewNiche  = metaNiche[0] ?? "entertainment";
    const previewEnergy = metaEnergy[0] ?? "high";
    const energyNum = previewEnergy === "high" ? 0.9 : previewEnergy === "medium" ? 0.6 : 0.3;
    const dna       = generateVideoDNA({ videoType:"viral", tone:"bold", niche: previewNiche, energy:energyNum });
    const beat      = buildFakeBeat(layoutDef, dna);
    // Preserve background when only niche/energy changed — but NOT when switching layouts.
    // Checking existingBeat.layout === (layoutDef?.id ?? layoutId) guards against copying
    // Layout A's background onto Layout B when the user navigates between layouts.
    const existingBeat = useProjectStore.getState().project?.beats?.[0];
    if (existingBeat && existingBeat.layout === (layoutDef?.id ?? layoutId) && existingBeat.layoutBackground) {
      beat.layoutBackground = existingBeat.layoutBackground;
    }
    const proj      = buildFakeProject(beat, dna, layoutDef);
    setDatabaseId(null);
    setProject(proj);
    setSelectedZoneIds(new Set());
    setSaveMsg(null);
    // Give the store one tick to settle before auto-save watches for changes
    skipAutoSave.current = true;
    setTimeout(() => { skipAutoSave.current = false; }, 500);
  }, [layoutId, metaNiche, metaEnergy, registryReady]);

  /* Auto-save — debounced 3 s after any zone/style change, existing layouts only */
  useEffect(() => {
    if (isNew || !activeBeat) return;
    if (skipAutoSave.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSaveRef.current?.();
    }, 3000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [activeBeat]);

  const handleSelectZone = useCallback((id, mod = false) => {
    if (!id) { setSelectedZoneIds(new Set()); return; }
    setRightTab("zones");
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

  const toggleEnergy = (e) => {
    setMetaEnergy(prev =>
      prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]
    );
  };

  const toggleNiche = (n) => {
    setMetaNiche(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    );
  };

  const handleSave = async () => {
    if (!metaName.trim() || !metaLabel.trim()) {
      setSaveMsg({ ok:false, text:"Name and label are required" });
      return;
    }
    const beat = useProjectStore.getState().project?.beats?.[0];
    if (!beat) return;

    // Build zone objects from current canvas state
    const defZones  = layoutDef?.zones ?? [];
    const saveZones = buildSaveZones(defZones, beat?.zones, beat?.deletedZones);


    const payload = {
      name:             metaName.trim(),
      label:            metaLabel.trim(),
      intent:           metaIntent,
      energy:           metaEnergy,
      niche:            metaNiche,
      orientation:      "9:16",
      type:             metaType,
      beat_type:        metaType === "layout" && metaBeatType ? metaBeatType : null,
      visibility:       metaVisibility,
      show_caption:       metaShowCaption,
      default_transition: metaTransitionType ? { type: metaTransitionType, duration: metaTransitionDur } : null,
      // Persist the layout background inside generation_meta (no standalone DB column exists).
      // Merge with any existing generation_meta so we don't clobber other keys.
      generation_meta: {
        ...(layoutDef?.generation_meta ?? {}),
        default_background: beat?.layoutBackground ?? null,
      },
      zones:              saveZones,
    };

    setSaving(true);
    setSaveMsg(null);
    try {
      let res, data;
      if (isNew) {
        res  = await serverFetch("/api/admin/layouts", { method:"POST", body:JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Create failed");
        await refreshCache();
        setSaveMsg({ ok:true, text:"Created!" });
        // Navigate to the new layout's editor
        navigate(`/admin/layouts/${data.id}`, { replace:true });
      } else {
        res  = await serverFetch(`/api/admin/layouts/${layoutId}`, { method:"PUT", body:JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        await refreshCache();
        clearTimeout(autoSaveTimer.current); // cancel pending auto-save — we just saved
        setSaveMsg({ ok:true, text:`Saved ${saveZones.length} zones` });
      }
    } catch (err) {
      setSaveMsg({ ok:false, text:err.message });
    } finally {
      setSaving(false);
    }
  };

  /* Show loading spinner until registry resolves */
  if (!isNew && !registryReady) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#0d0d14", color:"#555", fontSize:13 }}>
        Loading…
      </div>
    );
  }

  /* Not-found state — only shown after registry has loaded */
  if (!isNew && !layout) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#0d0d14", color:"#555", flexDirection:"column", gap:12 }}>
        <div style={{ fontSize:32 }}>⚠</div>
        <div>Layout "{layoutId}" not found in cache</div>
        <button onClick={() => navigate("/admin/layouts")}
          style={{ padding:"6px 14px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#888", cursor:"pointer", fontSize:12 }}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden",
      background:"#0d0d14", color:"#e8e8f0", fontFamily:"system-ui" }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px",
        borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0, background:"#111118" }}>

        <button onClick={() => navigate("/admin/layouts")}
          style={{ padding:"5px 10px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#888", cursor:"pointer", fontSize:12 }}>
          ← Layouts
        </button>

        <div style={{ width:1, height:16, background:"rgba(255,255,255,0.1)" }} />

        <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#e8e8f0" }}>
          {isNew ? "New Layout" : (layout?.name ?? layoutId)}
        </span>
        {!isNew && (
          <span style={{ padding:"2px 7px", borderRadius:4, fontSize:14, fontWeight:700,
            background:`${IC[layout?.intent]??"#888"}22`, color:IC[layout?.intent]??"#aaa" }}>
            {layout?.intent}
          </span>
        )}

        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {/* Metadata toggle */}
          <button onClick={() => setMetaOpen(o => !o)}
            style={{ padding:"4px 10px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, color:"#9494a8", fontSize:11, cursor:"pointer" }}>
            {metaOpen ? "Hide Meta ▲" : "Edit Meta ▼"}
          </button>


          {saveMsg && (
            <span style={{ fontSize:11, color:saveMsg.ok ? "#22c55e" : "#f87171" }}>
              {saveMsg.text}
            </span>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{ padding:"6px 16px", borderRadius:6, fontSize:12, fontWeight:700,
              background:isNew ? "#22c55e" : "#f5c518",
              color:"#0b0b10", border:"none",
              cursor:saving ? "not-allowed" : "pointer", opacity:saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : isNew ? "Create Layout" : "Save Layout"}
          </button>
        </div>
      </div>

      {/* ── Metadata panel (collapsible) ─────────────────────────── */}
      {metaOpen && (
        <div style={{ background:"#13131f", borderBottom:"1px solid rgba(255,255,255,0.07)",
          padding:"12px 20px", flexShrink:0 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-start" }}>

            {/* Name + Label */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>NAME (slug)</label>
              <input value={metaName} onChange={e => setMetaName(e.target.value)}
                placeholder="e.g. CenterHook"
                style={{ padding:"5px 8px", background:"#0d0d18", border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:5, color:"#e8e8f0", fontSize:12, outline:"none", width:160 }} />
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>LABEL</label>
              <input value={metaLabel} onChange={e => setMetaLabel(e.target.value)}
                placeholder="e.g. Center Hook"
                style={{ padding:"5px 8px", background:"#0d0d18", border:"1px solid rgba(255,255,255,0.1)",
                  borderRadius:5, color:"#e8e8f0", fontSize:12, outline:"none", width:160 }} />
            </div>

            {/* Type */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>TYPE</label>
              <div style={{ display:"flex", background:"#0d0d18", borderRadius:5, overflow:"hidden",
                border:"1px solid rgba(255,255,255,0.1)" }}>
                {[["template","Template"],["layout","Layout"]].map(([v, lbl]) => (
                  <button key={v} onClick={() => { setMetaType(v); setMetaBeatType(""); }}
                    style={{ flex:1, padding:"5px 10px", border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                      background: metaType === v ? "#7c5cfc" : "transparent",
                      color: metaType === v ? "#fff" : "#666" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Beat Type — only for layout type */}
            {metaType === "layout" && (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>BEAT TYPE</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {["", ...BEAT_TYPES].map(bt => (
                    <button key={bt} onClick={() => setMetaBeatType(bt)}
                      style={{ padding:"4px 9px", borderRadius:4, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                        background: metaBeatType === bt ? "#f97316" : "#1c1c28",
                        color: metaBeatType === bt ? "#fff" : "#666" }}>
                      {bt === "" ? "none" : bt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Intent — templates only (structural layouts use beatType instead) */}
            {metaType !== "layout" && (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>INTENT</label>
                <select value={metaIntent} onChange={e => setMetaIntent(e.target.value)}
                  style={{ padding:"5px 8px", background:"#0d0d18", border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:5, color:"#e8e8f0", fontSize:12, outline:"none" }}>
                  {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            )}

            {/* Visibility */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>STATUS</label>
              <div style={{ display:"flex", background:"#0d0d18", borderRadius:5, overflow:"hidden",
                border:"1px solid rgba(255,255,255,0.1)" }}>
                {[["active","Active"],["inactive","Inactive"]].map(([v, label]) => (
                  <button key={v} onClick={() => setMetaVisibility(v)}
                    style={{ padding:"5px 10px", border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                      background: metaVisibility === v ? (v === "inactive" ? "#dc2626" : "#7c5cfc") : "transparent",
                      color: metaVisibility === v ? "#fff" : "#666" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Captions */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>CAPTIONS</label>
              <div style={{ display:"flex", background:"#0d0d18", borderRadius:5, overflow:"hidden",
                border:"1px solid rgba(255,255,255,0.1)" }}>
                {[["show","Show"],["hide","Hide"]].map(([v, lbl]) => {
                  const active = v === "show" ? metaShowCaption : !metaShowCaption;
                  return (
                    <button key={v} onClick={() => setMetaShowCaption(v === "show")}
                      style={{ flex:1, padding:"5px 10px", border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                        background: active ? "#7c5cfc" : "transparent",
                        color: active ? "#fff" : "#666" }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Default transition */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>DEFAULT TRANSITION</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {["", "cut","fade","dissolve","zoom","slideLeft","slideRight","slideUp","slideDown","dipBlack","dipWhite","whipPan","spin","glitch","flash"].map(t => (
                  <button key={t} onClick={() => setMetaTransitionType(t)}
                    style={{ padding:"4px 9px", borderRadius:4, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                      background: metaTransitionType === t ? "#7c5cfc" : "#1c1c28",
                      color: metaTransitionType === t ? "#fff" : "#666" }}>
                    {t === "" ? "auto" : t}
                  </button>
                ))}
              </div>
              {metaTransitionType && (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                  <label style={{ fontSize:12, color:"#555", fontFamily:"monospace", whiteSpace:"nowrap" }}>DURATION (frames)</label>
                  <input type="range" min={4} max={30} step={1} value={metaTransitionDur}
                    onChange={e => setMetaTransitionDur(Number(e.target.value))}
                    style={{ flex:1, accentColor:"#7c5cfc" }} />
                  <span style={{ fontSize:12, color:"#7c5cfc", fontFamily:"monospace", minWidth:24 }}>{metaTransitionDur}</span>
                </div>
              )}
            </div>

            {/* Energy multi-select */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:14, color:"#555", fontFamily:"monospace" }}>ENERGY</label>
              <div style={{ display:"flex", gap:4 }}>
                {ENERGIES.map(e => (
                  <button key={e} onClick={() => toggleEnergy(e)}
                    style={{ padding:"4px 8px", borderRadius:4, border:"none", cursor:"pointer", fontSize:14, fontWeight:700,
                      background: metaEnergy.includes(e) ? "#7c5cfc" : "#1c1c28",
                      color: metaEnergy.includes(e) ? "#fff" : "#555" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Niche multi-select — templates only (structural layouts are niche-agnostic) */}
            {metaType !== "layout" && (
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxWidth:400 }}>
                <label style={{ fontSize:12, color:"#555", fontFamily:"monospace" }}>
                  NICHE <span style={{ color:"#777" }}>(empty = all niches)</span>
                </label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                  {NICHES.map(n => (
                    <button key={n} onClick={() => toggleNiche(n)}
                      style={{ padding:"3px 7px", borderRadius:4, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                        background: metaNiche.includes(n) ? "#f5c518" : "#1c1c28",
                        color: metaNiche.includes(n) ? "#0b0b10" : "#777" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Canvas + Zone Editor ─────────────────────────────────── */}
      {activeBeat ? (
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          <div style={{ flex:1, minWidth:0, overflow:"hidden", paddingBottom: 24, display:"flex", flexDirection:"column" }}>
            <CanvasPreview
              selectedZoneIds={selectedZoneIds}
              onSelectZone={handleSelectZone}
            />
          </div>
          <div style={{ width:560, flexShrink:0, borderLeft:"1px solid rgba(255,255,255,0.07)",
            display:"flex", flexDirection:"column", background:"#13131f" }}>

            {/* Tab bar */}
            <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
              {[{ id:"beat", label:"Beat" }, { id:"zones", label:"Zones" }, { id:"assets", label:"Assets" }].map(t => (
                <button key={t.id} onClick={() => setRightTab(t.id)}
                  style={{
                    flex:1, padding:"10px 0", border:"none", cursor:"pointer", fontSize:12,
                    fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase",
                    background: rightTab === t.id ? "#13131f" : "#0f0f1a",
                    color:      rightTab === t.id ? "#e8e8f0" : "#55556a",
                    borderBottom: rightTab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                    transition:"all 0.15s",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"16px 20px", minWidth:0 }}>
              {rightTab === "beat" && (
                <BeatSection beat={activeBeat} />
              )}
              {rightTab === "zones" && (
                <ZonesSection
                  beat={activeBeat}
                  project={project}
                  selectedZoneId={selectedZoneId}
                  selectedZoneIds={selectedZoneIds}
                  onSelectZone={handleSelectZone}
                  isAdmin={true}
                />
              )}
              {rightTab === "assets" && (() => {
                // Collect all asset zones that have a src image set
                const assetZones = (layoutDef?.zones ?? []).filter(z => {
                  if (z.type !== "asset") return false;
                  const beatZone = activeBeat?.zones?.[z.id];
                  const src = beatZone?.content?.asset?.src ?? z.content?.asset?.src;
                  return !!src;
                });

                const handleRemoveBg = async (zoneId, currentSrc) => {
                  setRembgState(s => ({ ...s, [zoneId]:{ loading:true, error:null } }));
                  try {
                    const r = await serverFetch("/api/admin/remove-background", {
                      method:"POST",
                      body:JSON.stringify({ imageUrl: currentSrc }),
                    });
                    if (!r.ok) throw new Error((await r.json()).error || r.status);
                    const { transparentUrl } = await r.json();

                    // Update the zone in the project store
                    const currentBeatZones = { ...(activeBeat?.zones ?? {}) };
                    const existing = currentBeatZones[zoneId] ?? {};
                    currentBeatZones[zoneId] = {
                      ...existing,
                      type: "asset",
                      content: {
                        kind: "asset",
                        asset: {
                          ...(existing.content?.asset ?? {}),
                          src: transparentUrl,
                          type: "image",
                          objectFit: existing.content?.asset?.objectFit ?? "contain",
                          motion: "none",
                          enterTransition: "none",
                          exitTransition: "none",
                        },
                      },
                    };
                    useProjectStore.getState().updateBeatSilent(activeBeat.id, { zones: currentBeatZones });
                    setRembgState(s => ({ ...s, [zoneId]:{ loading:false, done:true } }));

                    // Trigger auto-save
                    if (handleSaveRef.current) handleSaveRef.current();
                  } catch (e) {
                    setRembgState(s => ({ ...s, [zoneId]:{ loading:false, error:e.message } }));
                  }
                };

                if (assetZones.length === 0) {
                  return (
                    <div style={{ textAlign:"center", color:"#333", padding:"40px 20px" }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>🖼</div>
                      <div style={{ fontSize:12 }}>No asset zones with images</div>
                      <div style={{ fontSize:11, color:"#222", marginTop:4 }}>Add images to asset zones first</div>
                    </div>
                  );
                }

                return (
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <div style={{ fontSize:11, color:"#444", marginBottom:4 }}>
                      Remove background from any asset zone image using AI (birefnet).
                    </div>
                    {assetZones.map(defZone => {
                      const beatZone = activeBeat?.zones?.[defZone.id];
                      const src = beatZone?.content?.asset?.src ?? defZone.content?.asset?.src;
                      const state = rembgState[defZone.id] ?? {};
                      const H = Math.round(72 * 1920 / 1080);

                      return (
                        <div key={defZone.id} style={{
                          display:"flex", gap:10, alignItems:"center",
                          padding:"10px 12px", background:"rgba(255,255,255,0.03)",
                          borderRadius:8, border:"1px solid rgba(255,255,255,0.06)",
                        }}>
                          {/* Thumbnail */}
                          <div style={{ width:40, height:H, borderRadius:4, overflow:"hidden", flexShrink:0, border:"1px solid rgba(255,255,255,0.08)",
                            background:"repeating-conic-gradient(#2a2a35 0% 25%, #1c1c28 0% 50%) 0 0 / 8px 8px" }}>
                            <img src={src} alt={defZone.role}
                              style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
                          </div>

                          {/* Info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#aaa", marginBottom:2 }}>
                              {defZone.id} · {defZone.role}
                            </div>
                            <div style={{ fontSize:9, color:"#444", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {src?.split("/").pop()?.slice(0, 40) ?? ""}
                            </div>
                            {state.error && (
                              <div style={{ fontSize:9, color:"#f87171", marginTop:3 }}>{state.error.slice(0, 60)}</div>
                            )}
                            {state.done && (
                              <div style={{ fontSize:9, color:"#22c55e", marginTop:3 }}>✓ Background removed</div>
                            )}
                          </div>

                          {/* Button */}
                          <button
                            onClick={() => handleRemoveBg(defZone.id, src)}
                            disabled={state.loading}
                            style={{
                              padding:"5px 10px", borderRadius:5, fontSize:10, fontWeight:700,
                              cursor:state.loading ? "not-allowed" : "pointer",
                              background: state.done ? "rgba(34,197,94,0.15)" : "rgba(124,92,252,0.15)",
                              border: state.done ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(124,92,252,0.3)",
                              color: state.done ? "#22c55e" : "#a78bfa",
                              opacity: state.loading ? 0.5 : 1,
                              flexShrink: 0,
                            }}>
                            {state.loading ? "…" : state.done ? "↺ Redo" : "Remove BG"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#333" }}>
          Loading canvas…
        </div>
      )}
    </div>
  );
}
