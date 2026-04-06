import { useState } from "react";

const FILTERS = ["All", "Image", "Video"];

function ScopeBadge({ scope }) {
  if (!scope) return null;
  return (
    <span
      className="absolute top-1 left-1 text-[9px] font-bold px-[5px] py-[2px] rounded-[4px] uppercase tracking-wide leading-none"
      style={scope === "global"
        ? { background: "rgba(124,92,252,0.85)", color: "#fff" }
        : { background: "rgba(0,0,0,0.55)", color: "#aaa" }
      }
    >
      {scope === "global" ? "G" : "P"}
    </span>
  );
}

export default function MyAssetsTab({ assets, onSelect, onDelete, deletingId, renderPreview }) {
  const [filter, setFilter] = useState("All");

  const filtered = assets.filter(a => {
    // exclude audio from this tab (audio is only in FilesSection)
    const url = (a.url || "").toLowerCase();
    if (/\.(mp3|wav|m4a|aac|ogg)$/.test(url)) return false;
    if (a.type === "audio") return false;
    if (filter === "All")   return true;
    if (filter === "Image") return a.type === "image";
    if (filter === "Video") return a.type === "video";
    return true;
  });

  return (
    <>
      <div className="mb-4 flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded border ${filter === f ? "bg-purple-700 text-white border-purple-700" : "bg-white text-gray-700"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">No assets yet. Upload one above.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 content-start">
          {filtered.map(asset => (
            <div
              key={asset.id}
              className="relative bg-black cursor-pointer overflow-hidden rounded-xl border border-transparent hover:border-indigo-500 min-h-[120px]"
            >
              <div
                onClick={() => onSelect({ kind: "asset", asset: { type: asset.type, src: asset.url } })}
                className="aspect-video"
              >
                {renderPreview(asset)}
              </div>
              <ScopeBadge scope={asset.scope} />
              <button
                onClick={e => { e.stopPropagation(); onDelete(asset); }}
                className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded"
              >
                {deletingId === asset.id ? "…" : "✕"}
              </button>
              {asset.name && (
                <div className="px-2 py-1 text-[10px] text-gray-400 truncate bg-black/40">
                  {asset.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
