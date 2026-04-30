/**
 * FilesSection.jsx
 * src/ui/Editor/FilesSection.jsx
 *
 * File manager panel: Global assets (cross-project) + Project-specific assets.
 * Upload, preview, delete. Audio shown as list rows, images/videos as grid.
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useAssetsStore }   from "../../store/useAssetsStore";
import { useProjectStore }  from "../../store/useProjectStore";
import { uploadUserAsset }  from "../../services/assets/uploadUserAsset";
import { deleteUserAsset }  from "../../services/assets/deleteUserAsset";

const TYPE_FILTERS = ["All", "Image", "Video", "Audio"];

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AudioRow({ asset, onDelete, deleting }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
  };

  const handleLoaded = () => {
    const el = audioRef.current;
    if (el?.duration) setDuration(el.duration);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const handleScrub = (e) => {
    const el = audioRef.current;
    if (!el?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
    setProgress(pct * 100);
  };

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-[8px] bg-[#111118] border border-[rgba(255,255,255,0.07)]">
      <audio
        ref={audioRef}
        src={asset.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoaded}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-80 border-0"
          style={{ background: playing ? "#7c5cfc" : "#1e1e2e" }}
        >
          {playing
            ? <span className="text-white text-[13px]">⏸</span>
            : <span className="text-[#a78bfa] text-[13px] ml-[1px]">▶</span>
          }
        </button>

        {/* Name + size */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-[#e8e8f0] truncate">{asset.name || "audio"}</div>
          <div className="text-[11px] text-[#55556a]">
            {fmtTime(duration)}
            {asset.size > 0 && <span className="ml-1">· {formatSize(asset.size)}</span>}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(asset)}
          disabled={deleting}
          className="text-[12px] px-3 py-[5px] rounded-[6px] bg-transparent border border-[rgba(255,255,255,0.1)] text-[#55556a] hover:text-[#f87171] hover:border-[#f87171] transition-colors shrink-0 disabled:opacity-40"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>

      {/* Progress bar (scrubable) */}
      <div
        className="h-[4px] rounded-full bg-[#1e1e2e] cursor-pointer overflow-hidden"
        onClick={handleScrub}
      >
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${progress}%`, background: playing ? "#7c5cfc" : "#3a3a5c" }}
        />
      </div>
    </div>
  );
}

function AssetCard({ asset, onDelete, deleting }) {
  const isVideo = asset.type === "video";
  return (
    <div className="relative group rounded-[8px] overflow-hidden border border-[rgba(255,255,255,0.07)] bg-[#111118]">
      <div className="aspect-video w-full bg-black">
        {isVideo ? (
          <video src={asset.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
        ) : (
          <img src={asset.url} className="w-full h-full object-contain" />
        )}
      </div>
      {/* scope badge */}
      <div
        className="absolute top-[6px] left-[6px] text-[9px] font-bold px-[5px] py-[2px] rounded-[4px] uppercase leading-none"
        style={asset.scope === "global"
          ? { background: "rgba(124,92,252,0.9)", color: "#fff" }
          : { background: "rgba(0,0,0,0.6)", color: "#9494a8" }
        }
      >
        {asset.scope === "global" ? "Global" : "Project"}
      </div>
      {/* delete button */}
      <button
        onClick={() => onDelete(asset)}
        disabled={deleting}
        className="absolute top-[6px] right-[6px] w-[22px] h-[22px] rounded-full bg-black/70 text-white text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
      >
        {deleting ? "…" : "✕"}
      </button>
      {/* filename */}
      <div className="px-2 py-[6px] text-[11px] text-[#7070a0] truncate">
        {asset.name || asset.url?.split("/").pop()}
        {asset.size > 0 && <span className="ml-1 text-[#55556a]">· {formatSize(asset.size)}</span>}
      </div>
    </div>
  );
}

export default function FilesSection() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [uploading,  setUploading]  = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef();

  const databaseId = useProjectStore(s => s.databaseId);
  const project    = useProjectStore(s => s.project);
  const { myAssets, loadMyAssets, addMyAsset, removeMyAsset } = useAssetsStore();

  useEffect(() => {
    if (databaseId) loadMyAssets(databaseId);
  }, [databaseId]);

  // Extract assets directly from beat zones as fallback for projects
  // where clips were uploaded before the project was created (project_id: null)
  const beatAssets = useMemo(() => {
    if (!project?.beats) return [];
    const seen = new Set();
    const assets = [];
    project.beats.forEach((beat, i) => {
      Object.values(beat.zones || {}).forEach(zone => {
        const src  = zone?.content?.asset?.src || zone?.asset?.src;
        const type = zone?.content?.asset?.type || zone?.asset?.type || "video";
        if (src && !seen.has(src) && (type === "video" || type === "image")) {
          seen.add(src);
          assets.push({
            id:         `beat-${i}-${src.slice(-8)}`,
            url:        src,
            type,
            name:       `Scene ${i + 1}`,
            size:       0,
            project_id: databaseId,
            scope:      "project",
            source:     "beat",
          });
        }
      });
    });
    return assets;
  }, [project, databaseId]);

  const allAssets = useMemo(() => {
    const dbUrls  = new Set(myAssets.map(a => a.url));
    const beatOnly = beatAssets.filter(a => !dbUrls.has(a.url));
    return [...myAssets.filter(a => a.project_id === databaseId), ...beatOnly];
  }, [myAssets, beatAssets, databaseId]);

  const filtered = allAssets.filter(a => {
    if (typeFilter === "Image") return a.type === "image";
    if (typeFilter === "Video") return a.type === "video";
    if (typeFilter === "Audio") return a.type === "audio";
    return true;
  });

  const audioAssets  = filtered.filter(a => a.type === "audio");
  const mediaAssets  = filtered.filter(a => a.type !== "audio");

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadUserAsset(
        file, null, null,
        "project",
        databaseId,
      );
      addMyAsset({
        id:         asset.id,
        url:        asset.url,
        file_path:  asset.file_path,
        type:       asset.type,
        name:       asset.name || file.name,
        size:       asset.size || file.size,
        scope:      asset.scope || scope,
        project_id: asset.project_id || null,
        source:     "user",
      });
    } catch (err) {
      console.error("[FilesSection upload]", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (asset) => {
    setDeletingId(asset.id);
    try {
      await deleteUserAsset(asset);
      removeMyAsset(asset.id);
    } catch (err) {
      console.error("[FilesSection delete]", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#0d0d18] px-6 py-6 gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[22px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Files
          </h2>
          <p className="text-[13px] text-[#7070a0] mt-[2px]">
            Project assets — images, video clips, and audio
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded-[8px] text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 border-0"
          style={{ background: "#7c5cfc" }}
        >
          {uploading ? "Uploading…" : "↑ Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Type filters */}
      <div className="flex gap-[6px] flex-wrap">
        {TYPE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className="px-3 py-[5px] rounded-[6px] text-[12px] font-bold transition-colors border"
            style={typeFilter === f
              ? { background: "rgba(124,92,252,0.15)", borderColor: "#7c5cfc", color: "#a78bfa" }
              : { background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#55556a" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="text-[32px]">📁</div>
          <p className="text-[13px] text-[#55556a] text-center">
            No files in this project yet. Upload images, videos, or audio to use in your beats.
          </p>
        </div>
      )}

      {/* Media grid */}
      {mediaAssets.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {mediaAssets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onDelete={handleDelete}
              deleting={deletingId === asset.id}
            />
          ))}
        </div>
      )}

      {/* Audio list */}
      {audioAssets.length > 0 && (
        <div className="flex flex-col gap-2">
          {(typeFilter === "All" || typeFilter === "Audio") && mediaAssets.length > 0 && (
            <div className="text-[11px] font-bold text-[#55556a] uppercase tracking-wider">Audio</div>
          )}
          {audioAssets.map(asset => (
            <AudioRow
              key={asset.id}
              asset={asset}
              onDelete={handleDelete}
              deleting={deletingId === asset.id}
            />
          ))}
        </div>
      )}

    </div>
  );
}
