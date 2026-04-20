/**
 * LayoutManager.jsx — browse, create, duplicate, delete layouts (Supabase-backed)
 * Tabs: Layouts (structural, AI pipeline) | Templates (styled, user-facing)
 * Multi-select with bulk type assignment and bulk delete.
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
const INTENTS    = ["hook","proof","visual_rest","escalate","reveal","cta","stat","explanation","testimonial","contrast"];
const BEAT_TYPES = ["hook","item","fact","stat","reveal","explanation","cta","contrast","tension"];
const NICHES     = Object.keys(nichePaletteRegistry).sort();
const ENERGIES   = ["high", "medium", "low"];
const IC = {
  hook:"#f97316", proof:"#22c55e", visual_rest:"#38bdf8", escalate:"#f87171",
  reveal:"#a78bfa", cta:"#f5c518", stat:"#fb923c", explanation:"#818cf8",
  testimonial:"#34d399", contrast:"#f472b6",
};
const BT_COLOR = {
  hook:"#f97316", item:"#22c55e", fact:"#38bdf8", stat:"#fb923c",
  reveal:"#a78bfa", explanation:"#818cf8", cta:"#f5c518", contrast:"#f472b6", tension:"#f87171",
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
function CardThumb({ zones, palette, width, thumbnailUrl }) {
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

  if (thumbnailUrl) {
    return (
      <div ref={ref} style={{ width, height:h, borderRadius:"6px 6px 0 0", overflow:"hidden", background:"#0b0b10" }}>
        {vis ? (
          <img src={thumbnailUrl} alt="layout preview"
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", background:"#0b0b10" }} />
        )}
      </div>
    );
  }

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
function LayoutCard({ layout, palette, onEdit, onDuplicate, onDelete, selected, onToggle, showBeatType }) {
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
      onClick={() => onToggle()}
      style={{
        background: "#111118",
        border: `1px solid ${selected ? "#7c5cfc" : hov ? "rgba(124,92,252,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12, overflow: "hidden",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: selected ? "0 0 0 2px #7c5cfc44" : hov ? "0 8px 28px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.2)",
        display: "flex", flexDirection: "column",
        cursor: "pointer",
      }}
    >
      {/* Thumbnail area */}
      <div style={{ position:"relative" }}>
        <CardThumb zones={zones} palette={palette} width={220} thumbnailUrl={layout.thumbnail_url ?? null} />

        {/* Checkbox */}
        <div
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{ position:"absolute", top:6, right:6,
            width:18, height:18, borderRadius:4, border:`2px solid ${selected?"#7c5cfc":"rgba(255,255,255,0.3)"}`,
            background: selected?"#7c5cfc":"rgba(0,0,0,0.6)",
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          {selected && <span style={{ color:"#fff", fontSize:11, lineHeight:1 }}>✓</span>}
        </div>

        {/* Badges */}
        <div style={{ position:"absolute", top:6, left:6, display:"flex", gap:4, flexWrap:"wrap" }}>
          {showBeatType ? (
            layout.beatType ? (
              <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
                background:`${BT_COLOR[layout.beatType]??"#888"}cc`, color:"#fff" }}>
                {layout.beatType}
              </span>
            ) : (
              <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
                background:"rgba(255,255,255,0.15)", color:"#aaa" }}>
                no beatType
              </span>
            )
          ) : (
            <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:700,
              background:`${IC[layout.intent]??"#888"}cc`, color:"#fff" }}>
              {layout.intent}
            </span>
          )}
          {!layout.isActive && (
            <span style={{ padding:"2px 5px", borderRadius:4, fontSize:8,
              background:"rgba(248,113,113,0.7)", color:"#fff" }}>inactive</span>
          )}
          {layout.showCaption === false && (
            <span style={{ padding:"2px 5px", borderRadius:4, fontSize:8,
              background:"rgba(0,0,0,0.7)", color:"#888" }}>no-caption</span>
          )}
        </div>

        {/* Action buttons on hover */}
        {hov && (
          <div style={{ position:"absolute", bottom:8, right:8, display:"flex", gap:4 }}
            onClick={e => e.stopPropagation()}>
            <button onClick={onDuplicate} title="Duplicate"
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
            <button onClick={e => e.ctrlKey || e.metaKey ? window.open(`/admin/layouts/${layout.id}`, '_blank') : onEdit()}
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
  const [activeTab,     setActiveTab]     = useState("templates");
  const [selected,      setSelected]      = useState(new Set());
  const [filterIntent,  setFilterIntent]  = useState("all");
  const [filterEnergy,  setFilterEnergy]  = useState("all");
  const [filterVis,     setFilterVis]     = useState("all");
  const [filterBeat,    setFilterBeat]    = useState("all");
  const [search,        setSearch]        = useState("");
  const [previewNiche,  setPreviewNiche]  = useState("entertainment");
  const [bulkType,      setBulkType]      = useState("layout");
  const [bulkBeatType,  setBulkBeatType]  = useState("");
  const [bulkWorking,   setBulkWorking]   = useState(false);

  const palette = useMemo(() => {
    const e = nichePaletteRegistry[previewNiche];
    return e ? (e.palettes.find(p => p.energy.includes("high")) ?? e.palettes[0]) : null;
  }, [previewNiche]);

  const load = useCallback(async () => {
    setLoading(true);
    await refreshCache();
    setLayouts(getAllLayouts());
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => layouts.filter(l => {
    // Tab filter
    if (activeTab === "layouts"   && l.type !== "layout")   return false;
    if (activeTab === "templates" && l.type !== "template") return false;
    // Field filters
    if (filterIntent !== "all" && l.intent !== filterIntent) return false;
    if (filterEnergy !== "all" && !l.energy.includes(filterEnergy)) return false;
    if (filterVis === "active"   && !l.isActive)  return false;
    if (filterVis === "inactive" &&  l.isActive)  return false;
    if (filterBeat   !== "all" && l.beatType !== filterBeat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.name?.toLowerCase().includes(q) && !l.label?.toLowerCase().includes(q) &&
          !l.intent?.includes(q)) return false;
    }
    return true;
  }), [layouts, activeTab, filterIntent, filterEnergy, filterVis, filterBeat, search]);

  const handleDuplicate = async (id) => {
    try {
      await serverFetch(`/api/admin/layouts/${id}/duplicate`, { method: "POST" });
      await load();
    } catch (err) { alert("Duplicate failed: " + err.message); }
  };

  const handleDelete = async (id) => {
    try {
      await serverFetch(`/api/admin/layouts/${id}`, { method: "DELETE" });
      await load();
    } catch (err) { alert("Delete failed: " + err.message); }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelected(new Set(filtered.map(l => l.id)));
  const deselectAll = () => setSelected(new Set());

  const handleBulkSetType = async () => {
    if (!selected.size) return;
    const updates = { type: bulkType };
    if (bulkType === "layout" && bulkBeatType) updates.beat_type = bulkBeatType;
    if (bulkType === "template") updates.beat_type = null;
    setBulkWorking(true);
    try {
      await serverFetch("/api/admin/layouts/bulk-update", {
        method: "POST",
        body: JSON.stringify({ ids: [...selected], updates }),
      });
      await load();
    } catch (err) { alert("Bulk update failed: " + err.message); }
    setBulkWorking(false);
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} layout(s)? This cannot be undone.`)) return;
    setBulkWorking(true);
    try {
      await serverFetch("/api/admin/layouts/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids: [...selected] }),
      });
      await load();
    } catch (err) { alert("Bulk delete failed: " + err.message); }
    setBulkWorking(false);
  };

  const isLayoutTab = activeTab === "layouts";
  const tabLayouts  = layouts.filter(l => l.type === "layout").length;
  const tabTemplates = layouts.filter(l => l.type === "template").length;

  return (
    <AdminLayout>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Layout Manager</h1>
          <p style={{ color:"#555", fontSize:13 }}>
            {loading ? "Loading…" : `${layouts.length} total · ${filtered.length} shown`}
          </p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => navigate("/admin/ai-generator")}
            style={{ padding:"8px 18px", background:"#1c1c28", color:"#a78bfa", border:"1px solid rgba(124,92,252,0.3)",
              borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            ✦ Generate Layouts
          </button>
          <button onClick={() => navigate("/admin/layouts/new")}
            style={{ padding:"8px 18px", background:"#7c5cfc", color:"#fff", border:"none",
              borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            + New Layout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        {[
          { key:"templates", label:`Templates`, count:tabTemplates, desc:"Styled · User-facing" },
          { key:"layouts",   label:`Layouts`,   count:tabLayouts,   desc:"Structural · AI pipeline" },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
            style={{
              padding:"10px 20px", background:"none", border:"none", cursor:"pointer",
              borderBottom: activeTab === tab.key ? "2px solid #7c5cfc" : "2px solid transparent",
              color: activeTab === tab.key ? "#e8e8f0" : "#555",
              fontWeight: activeTab === tab.key ? 700 : 400,
              fontSize:13, marginBottom:-1,
              display:"flex", flexDirection:"column", alignItems:"flex-start", gap:1,
            }}>
            <span>{tab.label} <span style={{ fontSize:11, opacity:0.6 }}>({tab.count})</span></span>
            <span style={{ fontSize:9, color:"#444", fontWeight:400 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"10px 14px",
          background:"#1a1a2e", border:"1px solid rgba(124,92,252,0.3)", borderRadius:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"#a78bfa", fontWeight:700 }}>{selected.size} selected</span>
          <button onClick={selectAll} style={{ padding:"4px 10px", background:"#252540", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:5, color:"#9494a8", fontSize:11, cursor:"pointer" }}>Select All ({filtered.length})</button>
          <button onClick={deselectAll} style={{ padding:"4px 10px", background:"#252540", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:5, color:"#9494a8", fontSize:11, cursor:"pointer" }}>Deselect All</button>

          <div style={{ display:"flex", gap:6, alignItems:"center", marginLeft:"auto" }}>
            <span style={{ fontSize:11, color:"#555" }}>Set type:</span>
            <select value={bulkType} onChange={e => setBulkType(e.target.value)}
              style={{ padding:"4px 8px", background:"#111118", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:5, color:"#e8e8f0", fontSize:11 }}>
              <option value="template">template</option>
              <option value="layout">layout</option>
            </select>
            {bulkType === "layout" && (
              <>
                <span style={{ fontSize:11, color:"#555" }}>beatType:</span>
                <select value={bulkBeatType} onChange={e => setBulkBeatType(e.target.value)}
                  style={{ padding:"4px 8px", background:"#111118", border:"1px solid rgba(255,255,255,0.15)",
                    borderRadius:5, color:"#e8e8f0", fontSize:11 }}>
                  <option value="">— none —</option>
                  {BEAT_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </>
            )}
            <button onClick={handleBulkSetType} disabled={bulkWorking}
              style={{ padding:"5px 14px", background:"#7c5cfc", color:"#fff", border:"none",
                borderRadius:5, fontSize:11, fontWeight:700, cursor:"pointer", opacity:bulkWorking?0.6:1 }}>
              {bulkWorking ? "Saving…" : "Apply"}
            </button>
            <button onClick={handleBulkDelete} disabled={bulkWorking}
              style={{ padding:"5px 14px", background:"rgba(220,38,38,0.2)", color:"#f87171",
                border:"1px solid rgba(220,38,38,0.3)", borderRadius:5, fontSize:11, fontWeight:700,
                cursor:"pointer", opacity:bulkWorking?0.6:1 }}>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:6, color:"#e8e8f0", fontSize:12, outline:"none", width:160 }} />

        {isLayoutTab ? (
          <select value={filterBeat} onChange={e => setFilterBeat(e.target.value)}
            style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
            <option value="all">All Beat Types</option>
            {BEAT_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        ) : (
          <select value={filterIntent} onChange={e => setFilterIntent(e.target.value)}
            style={{ padding:"6px 10px", background:"#111118", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6, color:"#aaa", fontSize:12, outline:"none" }}>
            <option value="all">All Intents</option>
            {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        )}

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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
        {filtered.length > 0 && (
          <button onClick={selected.size === filtered.length ? deselectAll : selectAll}
            style={{ padding:"6px 12px", background:"#1c1c28", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:6, color:"#9494a8", fontSize:12, cursor:"pointer" }}>
            {selected.size === filtered.length ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ color:"#444", fontSize:14, textAlign:"center", padding:60 }}>Loading layouts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color:"#444", fontSize:14, textAlign:"center", padding:60 }}>
          {isLayoutTab
            ? <>No structural layouts yet. <a href="#" onClick={e => { e.preventDefault(); navigate("/admin/layouts/new"); }}
                style={{ color:"#7c5cfc" }}>Create one →</a></>
            : <>No templates found. <a href="#" onClick={e => { e.preventDefault(); navigate("/admin/layouts/new"); }}
                style={{ color:"#7c5cfc" }}>Create one →</a></>
          }
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16 }}>
          {filtered.map(l => (
            <LayoutCard
              key={l.id}
              layout={l}
              palette={palette}
              selected={selected.has(l.id)}
              onToggle={() => toggleSelect(l.id)}
              showBeatType={isLayoutTab}
              onEdit={()       => navigate(`/admin/layouts/${l.id}`)}
              onDuplicate={()  => handleDuplicate(l.id)}
              onDelete={()     => handleDelete(l.id)}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
