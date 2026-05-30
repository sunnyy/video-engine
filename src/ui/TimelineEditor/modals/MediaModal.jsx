import { useState, useEffect, useRef } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import { useAssetsStore } from "../../../store/useAssetsStore";
import { uploadUserAsset } from "../../../services/assets/uploadUserAsset";
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

function VideoCard({ asset, onClick }) {
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

export default function MediaModal({ onClose, onReplace }) {
  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const projectId   = useTimelineStore((s) => s.projectId);
  const addLayer    = useTimelineStore((s) => s.addLayer);
  const addPendingFile  = useTimelineStore((s) => s.addPendingFile);
  const clearPendingFile = useTimelineStore((s) => s.clearPendingFile);

  const { myAssets, loadMyAssets } = useAssetsStore();

  const [filter, setFilter]       = useState("image");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (projectId) loadMyAssets(projectId); }, [projectId]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const filtered = myAssets
    .filter((a) => a.type === filter)
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

        <div style={{ display: "flex", gap: 5 }}>
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

      {/* Grid */}
      {paged.length === 0 ? (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          No {filter === "image" ? "images" : "videos"} yet
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
          {paged.map((asset) =>
            asset.type === "video" ? (
              <VideoCard key={asset.id} asset={asset} onClick={() => addAssetLayer(asset)} />
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
              </div>
            )
          )}
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
