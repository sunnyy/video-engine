/**
 * LayoutManager.jsx — browse, create, duplicate, delete layouts (Supabase-backed)
 * List mode:  grid of all active layouts with wireframe thumbnails
 * Editor:     navigate to /admin/layouts/:id  (LayoutEditor)
 * New:        navigate to /admin/layouts/new
 */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Thumbnail } from "@remotion/player";
import { AbsoluteFill } from "remotion";
import { getAllLayouts, refreshCache } from "../../core/registries/layoutRegistry";
import { nichePaletteRegistry } from "../../core/registries/nichePaletteRegistry";
import { serverFetch } from "../../services/serverApi";
import AdminLayout from "./AdminLayout";

/* ── Constants ───────────────────────────────────────────────── */
const INTENTS   = ["hook","proof","visual_rest","escalate","reveal","cta","stat","explanation","testimonial","contrast"];
const NICHES    = Object.keys(nichePaletteRegistry).sort();
const ENERGIES  = ["high", "medium", "low"];
const IC = {
  hook:"#f97316", proof:"#22c55e", visual_rest:"#38bdf8", escalate:"#f87171",
  reveal:"#a78bfa", cta:"#f5c518", stat:"#fb923c", explanation:"#818cf8",
  testimonial:"#34d399", contrast:"#f472b6",
};
const PLACEHOLDER = {
  headline:"THIS IS THE HOOK", subtext:"Here's what you need to know",
  label:"LABEL", stat:"94%", metric:"10X", cta:"TAP NOW →", default:"Text",
};

/* ── Remotion preview component ─────────────────────────────── */
function PreviewComp({ zones, bg, primary, accent, textColor }) {
  return (
    <AbsoluteFill style={{ background: bg ?? "#111118", overflow: "hidden" }}>
      {(zones ?? []).map((z, i) => {
        const s = z.style ?? {};
        const base = {
          position:"absolute", left:`${z.x}%`, top:`${z.y}%`,
          width:`${z.width}%`, height:`${z.height}%`,
          zIndex: z.zIndex ?? i+1, boxSizing:"border-box", overflow:"hidden",
        };
        if (z.type === "text") {
          const c = z.role === "label" ? accent : (z.role==="stat"||z.role==="metric") ? primary : (textColor ?? "#fff");
          const align = s.textAlign ?? "center";
          return (
            <div key={z.id} style={{ ...base, display:"flex", alignItems:"center",
              justifyContent: align==="center"?"center":align==="right"?"flex-end":"flex-start",
              padding: s.padding ?? "0 6px" }}>
              <span style={{ fontSize:s.fontSize??72, fontWeight:s.fontWeight??700, color:c,
                textAlign:align, lineHeight:s.lineHeight??1.1, fontFamily:"system-ui",
                width:"100%", wordBreak:"break-word" }}>
                {PLACEHOLDER[z.role] ?? PLACEHOLDER.default}
              </span>
            </div>
          );
        }
        if (z.type === "asset") return (
          <div key={z.id} style={{ ...base, background:`${primary}22`,
            border:`3px solid ${primary}40`, borderRadius:s.borderRadius??0 }} />
        );
        return <div key={z.id} style={{ ...base, background:`${accent}20`, border:`1px solid ${accent}35` }} />;
      })}
    </AbsoluteFill>
  );
}

/* ── Lazy wireframe / Remotion thumbnail ─────────────────────── */
function CardThumb({ zones, palette, width }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  const h = Math.round(width * 1920 / 1080);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const wireframe = (
    <div style={{ position:"relative", width, height:h, background:"#0b0b10" }}>
      {(zones??[]).map(z => (
        <div key={z.id} style={{
          position:"absolute", left:`${z.x}%`, top:`${z.y}%`,
          width:`${z.width}%`, height:`${z.height}%`, boxSizing:"border-box",
          background: z.type==="text"?"rgba(124,92,252,0.3)":z.type==="asset"?"rgba(34,197,94,0.22)":"rgba(245,197,24,0.18)",
          border:"1px solid rgba(255,255,255,0.08)",
        }} />
      ))}
    </div>
  );

  return (
    <div ref={ref} style={{ width, height:h, borderRadius:"6px 6px 0 0", overflow:"hidden", background:"#0b0b10" }}>
      {vis ? (
        <Thumbnail
          component={PreviewComp}
          compositionWidth={1080} compositionHeight={1920}
          durationInFrames={90} fps={30} frameToDisplay={30}
          inputProps={{ zones, bg:palette?.bg??"#111118", primary:palette?.primary??"#7c5cfc",
            accent:palette?.accent??"#f5c518", textColor:palette?.text??"#fff" }}
          style={{ width, height:h }}
          errorFallback={() => wireframe}
        />
      ) : wireframe}
    </div>
  );
}

/* ── Layout card ─────────────────────────────────────────────── */
function LayoutCard({ layout, palette, onEdit, onDuplicate, onDelete }) {
  const [hov, setHov] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const zones = layout.def?.zones ?? [];

  const textZones  = zones.filter(z => z.type === "text").length;
  const assetZones = zones.filter(z => z.type === "asset").length;
  const otherZones = zones.filter(z => !["text","asset"].includes(z.type)).length;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirm(false); }}
      style={{
        background: "#111118",
        border: `1px solid ${hov ? "rgba(124,92,252,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12, overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hov ? "0 8px 28px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Thumbnail area */}
      <div style={{ position:"relative" }}>
        <CardThumb zones={zones} palette={palette} width={220} />

        {/* Intent + visibility badges */}
        <div style={{ position:"absolute", top:6, left:6, display:"flex", gap:4, flexWrap:"wrap" }}>
          <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
            background:`${IC[layout.intent]??"#888"}cc`, color:"#fff" }}>
            {layout.intent}
          </span>
          {layout.visibility === "external" && (
            <span style={{ padding:"2px 5px", borderRadius:4, fontSize:8,
              background:"rgba(34,197,94,0.7)", color:"#fff" }}>public</span>
          )}
          {layout.showCaption === false && (
            <span style={{ padding:"2px 5px", borderRadius:4, fontSize:8,
              background:"rgba(0,0,0,0.7)", color:"#888" }}>no-caption</span>
          )}
        </div>

        {/* Action buttons on hover */}
        {hov && (
          <div style={{ position:"absolute", bottom:8, right:8, display:"flex", gap:4 }}>
            <button onClick={onDuplicate}
              title="Duplicate"
              style={{ padding:"4px 8px", borderRadius:5, fontSize:10, fontWeight:700,
                background:"rgba(0,0,0,0.8)", color:"#9494a8", border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer" }}>
              ⧉
            </button>
            {confirm ? (
              <button onClick={onDelete}
                style={{ padding:"4px 8px", borderRadius:5, fontSize:10, fontWeight:700,
                  background:"#dc2626", color:"#fff", border:"none", cursor:"pointer" }}>
                Confirm
              </button>
            ) : (
              <button onClick={() => setConfirm(true)}
                style={{ padding:"4px 8px", borderRadius:5, fontSize:10, fontWeight:700,
                  background:"rgba(0,0,0,0.8)", color:"#f87171", border:"1px solid rgba(248,113,113,0.2)", cursor:"pointer" }}>
                ✕
              </button>
            )}
            <button onClick={onEdit}
              style={{ padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:700,
                background:"#7c5cfc", color:"#fff", border:"none", cursor:"pointer" }}>
              Edit →
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:"10px 12px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#e8e8f0", fontFamily:"monospace",
          marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {layout.name}
        </div>
        <div style={{ fontSize:10, color:"#555", marginBottom:6,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {layout.label}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", fontSize:9, fontFamily:"monospace" }}>
          <span style={{ color:"#7c5cfc" }}>{textZones}t</span>
          <span style={{ color:"#22c55e" }}>{assetZones}a</span>
          {otherZones > 0 && <span style={{ color:"#f5c518" }}>{otherZones}d</span>}
          <span style={{ color:"#444", marginLeft:"auto" }}>
            {(Array.isArray(layout.energy) ? layout.energy : [layout.energy]).join("·")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function LayoutManager() {
  const navigate = useNavigate();

  const [layouts,       setLayouts]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterIntent,  setFilterIntent]  = useState("all");
  const [filterEnergy,  setFilterEnergy]  = useState("all");
  const [filterVis,     setFilterVis]     = useState("all");
  const [search,        setSearch]        = useState("");
  const [previewNiche,  setPreviewNiche]  = useState("entertainment");

  const palette = useMemo(() => {
    const e = nichePaletteRegistry[previewNiche];
    return e ? (e.palettes.find(p => p.energy.includes("high")) ?? e.palettes[0]) : null;
  }, [previewNiche]);

  const load = useCallback(async () => {
    setLoading(true);
    await refreshCache();
    setLayouts(getAllLayouts());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => layouts.filter(l => {
    if (filterIntent !== "all" && l.intent !== filterIntent) return false;
    if (filterEnergy !== "all" && !l.energy.includes(filterEnergy)) return false;
    if (filterVis    !== "all" && l.visibility !== filterVis) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.name?.toLowerCase().includes(q) && !l.label?.toLowerCase().includes(q) &&
          !l.intent?.includes(q)) return false;
    }
    return true;
  }), [layouts, filterIntent, filterEnergy, filterVis, search]);

  const handleDuplicate = async (id) => {
    try {
      await serverFetch(`/api/admin/layouts/${id}/duplicate`, { method: "POST" });
      await load();
    } catch (err) {
      alert("Duplicate failed: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await serverFetch(`/api/admin/layouts/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Layout Manager</h1>
          <p style={{ color:"#555", fontSize:13 }}>
            {loading ? "Loading…" : `${layouts.length} layouts · ${filtered.length} shown`}
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/layouts/new")}
          style={{ padding:"8px 18px", background:"#7c5cfc", color:"#fff", border:"none",
            borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          + New Layout
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#e8e8f0", fontSize:12, outline:"none", width:160 }}
        />
        <select value={filterIntent} onChange={e => setFilterIntent(e.target.value)}
          style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
          <option value="all">All Intents</option>
          {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={filterEnergy} onChange={e => setFilterEnergy(e.target.value)}
          style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
          <option value="all">All Energies</option>
          {ENERGIES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterVis} onChange={e => setFilterVis(e.target.value)}
          style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
          <option value="all">All Visibility</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
        </select>
        <select value={previewNiche} onChange={e => setPreviewNiche(e.target.value)}
          style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
          {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={load} style={{ padding:"6px 12px", background:"#1c1c28", border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:6, color:"#9494a8", fontSize:12, cursor:"pointer" }}>
          ↺ Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color:"#444", fontSize:14, textAlign:"center", padding:60 }}>Loading layouts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color:"#444", fontSize:14, textAlign:"center", padding:60 }}>
          No layouts found.{" "}
          <button onClick={() => navigate("/admin/layouts/new")}
            style={{ background:"none", border:"none", color:"#7c5cfc", cursor:"pointer", fontSize:14 }}>
            Create one →
          </button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16 }}>
          {filtered.map(l => (
            <LayoutCard
              key={l.id}
              layout={l}
              palette={palette}
              onEdit={()      => navigate(`/admin/layouts/${l.id}`)}
              onDuplicate={()  => handleDuplicate(l.id)}
              onDelete={()     => handleDelete(l.id)}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
