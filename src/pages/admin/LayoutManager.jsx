/**
 * LayoutManager.jsx  — browse / inspect all layouts
 * Click "Edit" on any card → /admin/layouts/:id  (LayoutEditor)
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Thumbnail } from "@remotion/player";
import { AbsoluteFill } from "remotion";
import { layoutRegistry }       from "../../core/registries/layoutRegistry";
import { nichePaletteRegistry } from "../../core/registries/nichePaletteRegistry";
import AdminLayout from "./AdminLayout";

/* ── Constants ─────────────────────────────────────────────── */
const ALL     = Object.values(layoutRegistry);
const INTENTS = [...new Set(ALL.flatMap(l => Array.isArray(l.intent) ? l.intent : [l.intent]))].sort();
const NICHES  = Object.keys(nichePaletteRegistry).sort();

const IC = {
  hook:"#f97316", proof:"#22c55e", visual_rest:"#38bdf8", escalate:"#f87171",
  reveal:"#a78bfa", cta:"#f5c518", stat:"#fb923c", explanation:"#818cf8",
  testimonial:"#34d399", contrast:"#f472b6",
};

const PLACEHOLDER = {
  headline:"THIS IS THE HOOK", subtext:"Here's what you need to know",
  label:"LABEL", stat:"94%", metric:"10X", cta:"TAP NOW →", default:"Text",
};

/* ── Remotion preview component (module-level) ─────────────── */
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
        return (
          <div key={z.id} style={{ ...base, background:`${accent}20`,
            border:`1px solid ${accent}35` }} />
        );
      })}
    </AbsoluteFill>
  );
}

/* ── Lazy card thumbnail ────────────────────────────────────── */
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
    <div ref={ref} style={{ width, height:h, borderRadius:6, overflow:"hidden", flexShrink:0, background:"#0b0b10" }}>
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

/* ── Layout card ────────────────────────────────────────────── */
function LayoutCard({ layout, palette, onEdit }) {
  const [hov, setHov] = useState(false);
  const pri = Array.isArray(layout.intent) ? layout.intent[0] : layout.intent;
  const zones = layout.def?.zones ?? [];
  const textZones  = zones.filter(z => z.type === "text").length;
  const assetZones = zones.filter(z => z.type === "asset").length;
  const otherZones = zones.filter(z => !["text","asset"].includes(z.type)).length;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#111118",
        border: `1px solid ${hov ? "rgba(124,92,252,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hov ? "0 8px 28px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        cursor: "default",
      }}
    >
      {/* Thumbnail */}
      <div style={{ position:"relative" }}>
        <CardThumb zones={zones} palette={palette} width={220} />

        {/* Overlay badges */}
        <div style={{ position:"absolute", top:6, left:6, display:"flex", gap:4, flexWrap:"wrap" }}>
          <span style={{
            padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
            background:`${IC[pri]??"#888"}cc`, color:"#fff",
          }}>{pri}</span>
          {layout.captionStrategy === "never" && (
            <span style={{ padding:"2px 5px", borderRadius:4, fontSize:8,
              background:"rgba(0,0,0,0.7)", color:"#888" }}>no-caption</span>
          )}
        </div>

        {/* Edit button on hover */}
        {hov && (
          <button
            onClick={onEdit}
            style={{ position:"absolute", bottom:8, right:8,
              padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700,
              background:"#7c5cfc", color:"#fff", border:"none", cursor:"pointer" }}>
            Edit →
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:"10px 12px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#e8e8f0", fontFamily:"monospace",
          marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {layout.id}
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

/* ── Main ───────────────────────────────────────────────────── */
export default function LayoutManager() {
  const navigate = useNavigate();
  const [filterIntent, setFilterIntent] = useState("all");
  const [search,       setSearch]       = useState("");
  const [previewNiche, setPreviewNiche] = useState("entertainment");
  const [groupBy,      setGroupBy]      = useState(false);

  const palette = useMemo(() => {
    const e = nichePaletteRegistry[previewNiche];
    return e ? (e.palettes.find(p => p.energy.includes("high")) ?? e.palettes[0]) : null;
  }, [previewNiche]);

  const filtered = useMemo(() => ALL.filter(l => {
    const intents = Array.isArray(l.intent) ? l.intent : [l.intent];
    if (filterIntent !== "all" && !intents.includes(filterIntent)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.id?.toLowerCase().includes(q) && !l.label?.toLowerCase().includes(q) &&
          !intents.some(i => i.includes(q))) return false;
    }
    return true;
  }), [filterIntent, search]);

  const grouped = useMemo(() => {
    if (!groupBy) return null;
    const g = {};
    for (const l of filtered) {
      const k = Array.isArray(l.intent) ? l.intent[0] : l.intent;
      (g[k] = g[k] ?? []).push(l);
    }
    return g;
  }, [filtered, groupBy]);

  /* per-intent counts */
  const intentCounts = useMemo(() => {
    const c = {};
    for (const l of ALL) {
      const k = Array.isArray(l.intent) ? l.intent[0] : l.intent;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, []);

  const renderGrid = (layouts) => (
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",
      gap:16,
    }}>
      {layouts.map(l => (
        <LayoutCard key={l.id} layout={l} palette={palette}
          onEdit={() => navigate(`/admin/layouts/${l.id}`)} />
      ))}
    </div>
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Layout Manager</h1>
          <p style={{ color:"#555", fontSize:13 }}>{ALL.length} layouts · {INTENTS.length} intent pools</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select value={previewNiche} onChange={e => setPreviewNiche(e.target.value)}
            style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#666", cursor:"pointer" }}>
            <input type="checkbox" checked={groupBy} onChange={e => setGroupBy(e.target.checked)}
              style={{ accentColor:"#7c5cfc" }} />
            Group by intent
          </label>
        </div>
      </div>

      {/* Intent pills */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {["all", ...INTENTS].map(i => (
          <button key={i} onClick={() => setFilterIntent(i)}
            style={{
              padding:"4px 10px", borderRadius:20, fontSize:10, cursor:"pointer",
              background: filterIntent===i ? `${IC[i]??"rgba(255,255,255,0.15)"}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterIntent===i ? (IC[i]??"rgba(255,255,255,0.3)") : "rgba(255,255,255,0.07)"}`,
              color: filterIntent===i ? (IC[i]??"#e8e8f0") : "#555",
              fontWeight: filterIntent===i ? 700 : 400,
            }}>
            {i === "all" ? `all (${ALL.length})` : `${i} (${intentCounts[i]??0})`}
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by ID, label, or intent…"
          style={{ padding:"7px 12px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:8, color:"#fff", fontSize:13, outline:"none", width:280 }} />
        <span style={{ fontSize:12, color:"#444", fontFamily:"monospace" }}>{filtered.length} shown</span>
      </div>

      {/* Grid */}
      {groupBy && grouped ? (
        <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
          {Object.entries(grouped).map(([intent, layouts]) => (
            <div key={intent}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:3, height:20, borderRadius:2, background:IC[intent]??"#888" }} />
                <span style={{ fontSize:13, fontWeight:700, color:IC[intent]??"#aaa",
                  textTransform:"uppercase", letterSpacing:"0.08em" }}>{intent}</span>
                <span style={{ fontSize:11, color:"#444" }}>({layouts.length})</span>
              </div>
              {renderGrid(layouts)}
            </div>
          ))}
        </div>
      ) : (
        renderGrid(filtered)
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:48, color:"#333", fontSize:13 }}>No layouts match</div>
      )}
    </AdminLayout>
  );
}
