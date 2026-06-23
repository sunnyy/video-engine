import { useState, useEffect, useRef } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import { useAssetsStore } from "../../../store/useAssetsStore";
import { uploadUserAsset } from "../../../services/assets/uploadUserAsset";
import { serverFetch } from "../../../services/serverApi";
import { showToast } from "../../Toast";
import EditorModal from "./EditorModal";
import { pickFile, getFileDuration, makeLayerAt } from "./helpers";

const PAGE_SIZE = 20;

function fmtDur(s) {
  if (!s || isNaN(s)) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function VideoCard({ asset, onClick, onDelete }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(null);
  const [hovered, setHovered] = useState(false);

  const handleMeta = (e) => {
    const v = e.target;
    setDuration(v.duration);
    v.currentTime = Math.min(1, (v.duration || 0) * 0.1);
  };

  const onEnter = () => {
    setHovered(true);
    videoRef.current?.play().catch(() => {});
  };

  const onLeave = () => {
    setHovered(false);
    const v = videoRef.current;
    if (v) { v.pause(); v.currentTime = Math.min(1, (v.duration || 0) * 0.1); }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      title={asset.name}
      style={{
        aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer",
        background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        transition: "border-color 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(124,92,252,0.6)")}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
    >
      <video
        ref={videoRef}
        src={asset.url}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        preload="metadata"
        muted
        playsInline
        loop
        onLoadedMetadata={handleMeta}
      />
      {/* Play overlay when not hovering */}
      {!hovered && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.28)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", border: "1.5px solid rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "#fff", paddingLeft: 2,
          }}>▶</div>
        </div>
      )}
      {/* Delete (library only) */}
      {onDelete && hovered && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(asset); }} title="Remove"
          style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 5, background: "rgba(0,0,0,0.6)", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>✕</button>
      )}
      {/* Duration badge */}
      {duration && (
        <div style={{
          position: "absolute", bottom: 22, right: 4,
          background: "rgba(0,0,0,0.7)", color: "#fff",
          fontSize: 10, padding: "1px 5px", borderRadius: 3, fontFamily: "monospace",
          pointerEvents: "none",
        }}>{fmtDur(duration)}</div>
      )}
      {/* Filename */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
        padding: "8px 6px 4px",
        fontSize: 10, color: "#ccc",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        pointerEvents: "none",
      }}>{asset.name}</div>
    </div>
  );
}

export default function MediaModal({ onClose, onReplace, initialFilter }) {
  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const projectId   = useTimelineStore((s) => s.projectId);
  const addLayer    = useTimelineStore((s) => s.addLayer);
  const addPendingFile  = useTimelineStore((s) => s.addPendingFile);
  const clearPendingFile = useTimelineStore((s) => s.clearPendingFile);

  const { myAssets, loadMyAssets } = useAssetsStore();

  const [filter, setFilter]       = useState(initialFilter ?? "image");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [uploading, setUploading] = useState(false);
  const [source, setSource]       = useState("uploads"); // "uploads" | "generations"
  const [gens, setGens]           = useState(null);       // cross-service generations (lazy)
  const [gensLoading, setGensLoading] = useState(false);
  const [confirmAsset, setConfirmAsset] = useState(null); // { asset, usage }
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => { if (projectId) loadMyAssets(projectId); }, [projectId]);
  useEffect(() => { setPage(1); }, [filter, search, source]);

  // Lazy-load the user's generations from every service the first time the tab opens.
  useEffect(() => {
    if (source !== "generations" || gens !== null) return;
    setGensLoading(true);
    serverFetch("/api/assets/my-generations?type=image")
      .then((r) => r.json())
      .then((d) => setGens(d.generations || []))
      .catch(() => setGens([]))
      .finally(() => setGensLoading(false));
  }, [source, gens]);

  const askDelete = async (asset) => {
    try {
      const d = await serverFetch(`/api/assets/${asset.id}/usage`).then((r) => r.json());
      setConfirmAsset({ asset, usage: d.usage ?? 0 });
    } catch { setConfirmAsset({ asset, usage: 0 }); }
  };
  const doDelete = async (hard) => {
    if (!confirmAsset) return;
    setDeleting(true);
    try {
      const res = await serverFetch(`/api/assets/${confirmAsset.asset.id}${hard ? "?hard=1" : ""}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Delete failed");
      useAssetsStore.getState().removeMyAsset(confirmAsset.asset.id);
      showToast(hard ? "Asset deleted" : "Removed from library", "success");
      setConfirmAsset(null);
    } catch (e) { showToast(e.message || "Delete failed"); }
    finally { setDeleting(false); }
  };

  const baseList = source === "generations"
    ? (gens || []).map((g) => ({ ...g, source: g.source }))
    : myAssets.filter((a) => a.type === filter);
  const filtered = baseList
    .filter((a) => !search || (a.name ?? "").toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleUpload = async () => {
    const accept = "image/*,video/*";
    const file = await pickFile(accept);
    if (!file) return;

    const type = file.type.startsWith("video") ? "video" : "image";
    const blobUrl = URL.createObjectURL(file);
    let dur = type === "image" ? 5 : 10;
    if (type === "video") { const d = await getFileDuration(file); if (d) dur = d; }

    if (onReplace) {
      onReplace(blobUrl, type);
      onClose();
      setUploading(true);
      try {
        const asset = await uploadUserAsset(file, type, null, "project", projectId);
        onReplace(asset.url, type);
        URL.revokeObjectURL(blobUrl);
      } catch (err) { showToast("Upload failed: " + err.message, "error"); }
      finally { setUploading(false); }
      return;
    }

    const layer = makeLayerAt(type, project, currentTime, dur, { src: blobUrl, name: file.name });
    addPendingFile(layer.id, file);
    addLayer(layer);
    onClose();

    setUploading(true);
    try {
      const asset = await uploadUserAsset(file, type, null, "project", projectId);
      useTimelineStore.getState().updateLayer(layer.id, { src: asset.url });
      useAssetsStore.getState().addMyAsset({
        id: asset.id, url: asset.url, file_path: asset.file_path,
        type: asset.type, name: asset.name, size: asset.size ?? 0,
        scope: asset.scope ?? "project", project_id: asset.project_id ?? null,
        orientation: asset.orientation ?? "any", source: "user",
      });
      clearPendingFile(layer.id);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const addAssetLayer = (asset) => {
    if (onReplace) { onReplace(asset.url, asset.type); onClose(); return; }
    const type = asset.type === "video" ? "video" : "image";
    const dur = type === "image" ? 5 : 10;
    const layer = makeLayerAt(type, project, currentTime, dur, { src: asset.url, name: asset.name });
    addLayer(layer);
    onClose();
  };

  return (
    <EditorModal title="Media" onClose={onClose}>
      {/* Toolbar row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            background: "rgba(124,92,252,0.18)", border: "1px solid rgba(124,92,252,0.4)",
            borderRadius: 7, color: "#c8aaff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", padding: "7px 16px", opacity: uploading ? 0.6 : 1, flexShrink: 0,
          }}
        >
          {uploading ? "Uploading…" : "+ Upload"}
        </button>

        {/* Source: my uploads vs my generations from every service */}
        <div style={{ display: "flex", gap: 5 }}>
          {[["uploads", "Uploads"], ["generations", "My Generations"]].map(([s, lbl]) => (
            <button key={s} onClick={() => setSource(s)} style={{
              padding: "6px 14px", fontSize: 12, cursor: "pointer", borderRadius: 5,
              background: source === s ? "rgba(124,92,252,0.22)" : "rgba(255,255,255,0.05)",
              border: source === s ? "1px solid rgba(124,92,252,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: source === s ? "#c8aaff" : "#8888a8", fontWeight: source === s ? 600 : 400,
            }}>{lbl}</button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{
            flex: 1, background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, color: "#e8e8f0", fontSize: 12, padding: "7px 10px", outline: "none",
          }}
        />
      </div>

      {/* Image / Video filter — own row, uploads only */}
      {source === "uploads" && (
        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {["image", "video"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", fontSize: 12, cursor: "pointer", borderRadius: 5,
              background: filter === f ? "rgba(124,92,252,0.22)" : "rgba(255,255,255,0.05)",
              border: filter === f ? "1px solid rgba(124,92,252,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: filter === f ? "#c8aaff" : "#8888a8",
              fontWeight: filter === f ? 600 : 400,
            }}>
              {f === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {gensLoading && source === "generations" ? (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Loading your generations…</div>
      ) : paged.length === 0 ? (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          {source === "generations" ? "No generations from other services yet" : `No ${filter === "image" ? "images" : "videos"} yet`}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {paged.map((asset) =>
            asset.type === "video" ? (
              <VideoCard key={asset.id} asset={asset} onClick={() => addAssetLayer(asset)}
                onDelete={source === "uploads" ? askDelete : undefined} />
            ) : (
              <div
                key={asset.id}
                onClick={() => addAssetLayer(asset)}
                title={asset.name}
                style={{
                  aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer",
                  background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.07)",
                  position: "relative",
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(124,92,252,0.6)")}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              >
                <img src={asset.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {source === "generations" && asset.source && (
                  <div style={{ position: "absolute", left: 4, top: 4, background: "rgba(0,0,0,0.6)", color: "#cbd5e1", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, pointerEvents: "none" }}>{asset.source}</div>
                )}
                {source === "uploads" && (
                  <button onClick={(e) => { e.stopPropagation(); askDelete(asset); }} title="Remove"
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 5, background: "rgba(0,0,0,0.55)", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", opacity: 0.85 }}>✕</button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Delete confirm — soft-delete keeps the file so existing projects don't break */}
      {confirmAsset && (
        <div onClick={() => !deleting && setConfirmAsset(null)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: 380, maxWidth: "100%", background: "#14141e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Outfit',sans-serif", marginBottom: 8 }}>Remove asset</div>
            <div style={{ fontSize: 13, color: "#9aa0b0", lineHeight: 1.55, marginBottom: 18 }}>
              {confirmAsset.usage > 0
                ? `Used in ${confirmAsset.usage} project${confirmAsset.usage === 1 ? "" : "s"}. Removing it from your library keeps the underlying file, so those projects keep working.`
                : "This asset isn't used in any project. You can remove it from your library, or permanently delete the file."}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setConfirmAsset(null)} disabled={deleting}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#c0c0d8", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => doDelete(false)} disabled={deleting}
                style={{ background: "rgba(124,92,252,0.18)", border: "1px solid rgba(124,92,252,0.4)", color: "#c8aaff", fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>Remove from library</button>
              {confirmAsset.usage === 0 && (
                <button onClick={() => doDelete(true)} disabled={deleting}
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>Delete file</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>‹</button>
          <span style={{ fontSize: 12, color: "#8888a8" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn}>›</button>
        </div>
      )}
    </EditorModal>
  );
}

const pageBtn = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 5, color: "#c0c0d8", cursor: "pointer", padding: "4px 12px", fontSize: 16,
};
