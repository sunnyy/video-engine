/**
 * ImageLibrary.jsx
 * Two tabs: User Uploads (user_assets) + AI Generated (ai_image_library).
 */
import { useEffect, useRef, useState } from "react";
import { showToast } from "../../ui/Toast";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

const PAGE_SIZE = 48;

async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

/* ─── User Uploads tab ─── */
const UPLOAD_TYPES = [
  { value: "all",   label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
];

function UserUploads() {
  const [assets,   setAssets]   = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(0);
  const [type,     setType]     = useState("all");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [preview,  setPreview]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const cache = useRef({});

  async function load(p = page, t = type) {
    const key = `${t}-${p}`;
    if (cache.current[key]) {
      const hit = cache.current[key];
      setAssets(hit.assets); setTotal(hit.total);
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await serverFetch(`/api/admin/user-assets?page=${p}&type=${t}`);
      const d   = await safeJson(res);
      const assets = d.assets || [], total = d.total ?? 0;
      cache.current[key] = { assets, total };
      setAssets(assets); setTotal(total);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(page, type); }, [page, type]);

  function changeType(t) { setType(t); setPage(0); }

  async function handleDelete(a) {
    if (!confirm(`Delete asset?\n${a.name || a.url}`)) return;
    setDeleting(a.id);
    try {
      await safeJson(await serverFetch(`/api/admin/user-assets/${a.id}`, { method: "DELETE" }));
      cache.current = {};
      setAssets(p => p.filter(x => x.id !== a.id));
      setTotal(t => t - 1);
      if (preview?.id === a.id) setPreview(null);
    } catch (e) { showToast("Delete failed: " + e.message); }
    finally { setDeleting(null); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isImage = a => a.type === "image";
  const isVideo = a => a.type === "video";

  return (
    <>
      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-5">{error}</div>}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1">
          {UPLOAD_TYPES.map(f => (
            <button key={f.value} onClick={() => changeType(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border transition-colors
                ${type === f.value ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/40 text-[#a78bfa]" : "bg-transparent border-white/[0.07] text-[#555] hover:text-[#aaa]"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-[#555] ml-auto">{total.toLocaleString()} assets · page {page + 1}/{totalPages}</span>
      </div>

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="text-[#444] text-base py-16 text-center">No assets found.</div>
      ) : (
        <>
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {assets.map(a => (
              <div key={a.id} className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden group relative cursor-pointer"
                onClick={() => setPreview(a)}>
                {isImage(a) ? (
                  <img src={a.url} alt="" className="w-full aspect-square object-cover block" loading="lazy" />
                ) : isVideo(a) ? (
                  <div className="w-full aspect-square bg-[#1a1a26] flex items-center justify-center text-3xl text-[#666]">▶</div>
                ) : (
                  <div className="w-full aspect-square bg-[#1a1a26] flex items-center justify-center text-3xl text-[#666]">♫</div>
                )}
                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={e => { e.stopPropagation(); setPreview(a); }}
                    className="px-2.5 py-1.5 bg-white/10 rounded-lg text-white text-xs cursor-pointer hover:bg-white/20">View</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(a); }} disabled={deleting === a.id}
                    className="px-2.5 py-1.5 bg-[#f97316]/20 border border-[#f97316]/40 rounded-lg text-[#f97316] text-xs cursor-pointer hover:bg-[#f97316]/30 disabled:opacity-50">
                    {deleting === a.id ? "…" : "Delete"}
                  </button>
                </div>
                <div className="px-2.5 py-2">
                  <div className="text-xs text-[#666] font-mono truncate">{a.user_id?.slice(0, 8)}…</div>
                  <div className="text-xs text-[#444]">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </>
      )}

      {preview && (
        <AssetPreviewModal asset={preview} onClose={() => setPreview(null)}
          onDelete={() => handleDelete(preview)} deleting={deleting === preview?.id}
          renderMedia={() => isImage(preview) ? (
            <img src={preview.url} alt="" className="max-w-full max-h-[55vh] object-contain rounded-lg" />
          ) : isVideo(preview) ? (
            <video src={preview.url} controls className="max-w-full max-h-[55vh] rounded-lg" />
          ) : (
            <audio src={preview.url} controls className="w-full" />
          )}
          details={[
            preview.name && ["Name", preview.name],
            preview.type && ["Type", preview.type],
            preview.size && ["Size", `${(preview.size / 1024).toFixed(1)} KB`],
            preview.user_id && ["User", preview.user_id],
            ["Created", new Date(preview.created_at).toLocaleString()],
          ].filter(Boolean)}
        />
      )}
    </>
  );
}

/* ─── AI Generated tab ─── */
function AIImages() {
  const [images,     setImages]     = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(0);
  const [filters,    setFilters]    = useState({ niches: [], visualTypes: [], orientations: [] });
  const [niche,      setNiche]      = useState("all");
  const [visualType, setVisualType] = useState("all");
  const [orient,     setOrient]     = useState("all");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [preview,    setPreview]    = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const cache = useRef({});

  useEffect(() => {
    serverFetch("/api/admin/ai-images/filters")
      .then(r => safeJson(r)).then(d => setFilters(d)).catch(() => {});
  }, []);

  async function load(p = page, n = niche, v = visualType, o = orient) {
    const key = `${n}-${v}-${o}-${p}`;
    if (cache.current[key]) {
      const hit = cache.current[key];
      setImages(hit.images); setTotal(hit.total);
      return;
    }
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: p, niche: n, visual_type: v, orientation: o });
      const res = await serverFetch(`/api/admin/ai-images?${params}`);
      const d   = await safeJson(res);
      const images = d.images || [], total = d.total ?? 0;
      cache.current[key] = { images, total };
      setImages(images); setTotal(total);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(page, niche, visualType, orient); }, [page, niche, visualType, orient]);

  function set(key, val) {
    setPage(0);
    if (key === "niche")      setNiche(val);
    if (key === "visualType") setVisualType(val);
    if (key === "orient")     setOrient(val);
  }

  async function handleDelete(img) {
    if (!confirm(`Delete image?\n${img.subject || img.prompt?.slice(0, 60)}`)) return;
    setDeleting(img.id);
    try {
      await safeJson(await serverFetch(`/api/admin/ai-images/${img.id}`, { method: "DELETE" }));
      cache.current = {};
      setImages(p => p.filter(x => x.id !== img.id));
      setTotal(t => t - 1);
      if (preview?.id === img.id) setPreview(null);
    } catch (e) { showToast("Delete failed: " + e.message); }
    finally { setDeleting(null); }
  }

  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const energyColor = e => e === "high" ? "#f97316" : e === "low" ? "#3b9eff" : "#888";
  const anyFilter   = niche !== "all" || visualType !== "all" || orient !== "all";

  return (
    <>
      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-3 text-[#f97316] text-sm mb-5">{error}</div>}

      <div className="flex gap-4 mb-5 flex-wrap items-end">
        {[
          { label: "Niche",       opts: filters.niches,       val: niche,      key: "niche" },
          { label: "Visual Type", opts: filters.visualTypes,  val: visualType, key: "visualType" },
          { label: "Orientation", opts: filters.orientations, val: orient,     key: "orient" },
        ].map(f => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <div className="text-xs text-[#555] uppercase tracking-wider">{f.label}</div>
            <select value={f.val} onChange={e => set(f.key, e.target.value)}
              className="px-3 py-2 bg-[#111118] border border-white/[0.08] rounded-lg text-sm text-white outline-none focus:border-[#7c5cfc] cursor-pointer">
              <option value="all">All</option>
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {anyFilter && (
          <button onClick={() => { setNiche("all"); setVisualType("all"); setOrient("all"); setPage(0); }}
            className="px-3 py-2 text-xs text-[#888] border border-white/[0.08] rounded-lg cursor-pointer hover:text-white transition-colors">
            Clear ✕
          </button>
        )}
        <span className="text-sm text-[#555] ml-auto">{total.toLocaleString()} images · page {page + 1}/{totalPages}</span>
      </div>

      {loading ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : images.length === 0 ? (
        <div className="text-[#444] text-base py-16 text-center">
          No AI images yet.{!anyFilter && " They will appear here after generating a project."}
        </div>
      ) : (
        <>
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {images.map(img => (
              <div key={img.id} className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden group relative cursor-pointer"
                onClick={() => setPreview(img)}>
                <img src={img.src} alt={img.subject || ""} loading="lazy" className="w-full aspect-square object-cover block" />
                {img.reuse_count > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-[#22c55e] text-[10px] font-bold px-1.5 py-0.5 rounded-full">×{img.reuse_count}</div>
                )}
                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={e => { e.stopPropagation(); setPreview(img); }}
                    className="px-2.5 py-1.5 bg-white/10 rounded-lg text-white text-xs cursor-pointer hover:bg-white/20">View</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(img); }} disabled={deleting === img.id}
                    className="px-2.5 py-1.5 bg-[#f97316]/20 border border-[#f97316]/40 rounded-lg text-[#f97316] text-xs cursor-pointer hover:bg-[#f97316]/30 disabled:opacity-50">
                    {deleting === img.id ? "…" : "Delete"}
                  </button>
                </div>
                <div className="px-2.5 py-2 flex flex-col gap-1">
                  <div className="text-xs text-[#ccc] font-medium truncate">{img.subject || "—"}</div>
                  {img.niche && <div className="text-[10px] text-[#555] truncate">{img.niche} {img.orientation ? `· ${img.orientation}` : ""}</div>}
                  <div className="flex gap-1 flex-wrap">
                    {img.visual_type && <span className="text-[10px] text-[#7c5cfc] bg-[#7c5cfc]/10 px-1.5 py-0.5 rounded-full">{img.visual_type}</span>}
                    {img.energy && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: energyColor(img.energy), background: energyColor(img.energy) + "22" }}>{img.energy}</span>}
                  </div>
                  {img.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {img.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] text-[#555] bg-white/[0.04] px-1.5 py-px rounded-full">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </>
      )}

      {preview && (
        <AssetPreviewModal asset={preview} onClose={() => setPreview(null)}
          onDelete={() => handleDelete(preview)} deleting={deleting === preview?.id}
          renderMedia={() => <img src={preview.src} alt="" className="max-w-full max-h-[50vh] object-contain rounded-lg" />}
          details={[
            preview.subject      && ["Subject",      preview.subject],
            preview.niche        && ["Niche",        preview.niche],
            preview.orientation  && ["Orientation",  preview.orientation],
            preview.visual_type  && ["Visual type",  preview.visual_type],
            preview.mood         && ["Mood",         preview.mood],
            preview.energy       && ["Energy",       preview.energy],
            preview.search_query && ["Search query", preview.search_query],
            preview.context      && ["Context",      preview.context],
            preview.width        && ["Size",         `${preview.width}×${preview.height}`],
            preview.generator    && ["Generator",    preview.generator],
            preview.reuse_count != null && ["Reused", `×${preview.reuse_count}`],
            ["Created", new Date(preview.created_at).toLocaleString()],
          ].filter(Boolean)}
          extraContent={
            <>
              {preview.prompt && (
                <div className="mb-3">
                  <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Prompt</div>
                  <div className="text-sm text-[#bbb] leading-relaxed">{preview.prompt}</div>
                </div>
              )}
              {preview.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {preview.tags.map(t => <span key={t} className="text-[10px] bg-white/[0.05] text-[#999] px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
              )}
            </>
          }
        />
      )}
    </>
  );
}

/* ─── Shared components ─── */
function Pagination({ page, totalPages, total, onPage }) {
  return (
    <div className="flex gap-3 items-center flex-wrap">
      <button onClick={() => onPage(0)} disabled={page === 0}
        className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm disabled:text-[#333] text-[#aaa] cursor-pointer hover:bg-white/10 transition-colors">«</button>
      <button onClick={() => onPage(p => p - 1)} disabled={page === 0}
        className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm disabled:text-[#333] text-[#aaa] cursor-pointer hover:bg-white/10 transition-colors">← Prev</button>
      <span className="text-[#555] text-sm">{page + 1} / {totalPages} · {total.toLocaleString()} total</span>
      <button onClick={() => onPage(p => p + 1)} disabled={page >= totalPages - 1}
        className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm disabled:text-[#333] text-[#aaa] cursor-pointer hover:bg-white/10 transition-colors">Next →</button>
      <button onClick={() => onPage(totalPages - 1)} disabled={page >= totalPages - 1}
        className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm disabled:text-[#333] text-[#aaa] cursor-pointer hover:bg-white/10 transition-colors">»</button>
    </div>
  );
}

function AssetPreviewModal({ asset, onClose, onDelete, deleting, renderMedia, details, extraContent }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] p-6"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#16161f] border border-white/10 rounded-2xl overflow-hidden max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="text-base font-semibold text-white truncate">{asset.name || asset.subject || asset.niche || "Asset"}</div>
          <button onClick={onClose} className="text-[#555] hover:text-white text-xl cursor-pointer ml-3 shrink-0">✕</button>
        </div>
        <div className="bg-[#0d0d14] flex items-center justify-center p-4" style={{ minHeight: 240 }}>
          {renderMedia()}
        </div>
        <div className="px-5 py-4 border-t border-white/[0.06] overflow-y-auto" style={{ maxHeight: 200 }}>
          {extraContent}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#888]">
            {details.map(([label, val]) => (
              <div key={label}>{label}: <span className="text-[#ccc]">{val}</span></div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 flex justify-between gap-3 border-t border-white/[0.06] shrink-0">
          <a href={asset.url || asset.src} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-[#aaa] text-sm hover:text-white transition-colors">
            Open ↗
          </a>
          <button onClick={onDelete} disabled={deleting}
            className="px-4 py-2 bg-[#f97316]/15 border border-[#f97316]/30 rounded-lg text-[#f97316] text-sm cursor-pointer hover:bg-[#f97316]/25 transition-colors disabled:opacity-50">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function ImageLibrary() {
  const [tab, setTab] = useState("uploads");

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-1">Image Library</h1>
      <p className="text-[#888] text-lg mb-6">User uploads and AI-generated images.</p>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-px">
        {[
          { id: "uploads", label: "User Uploads" },
          { id: "ai",      label: "AI Generated" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium cursor-pointer border-b-2 bg-black text-[#aaa] transition-colors -mb-px
              ${tab === t.id
                ? "border-[#7c5cfc] text-white"
                : "border-transparent text-[#555] hover:text-[#aaa]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: tab === "uploads" ? "block" : "none" }}><UserUploads /></div>
      <div style={{ display: tab === "ai"      ? "block" : "none" }}><AIImages /></div>
    </AdminLayout>
  );
}
