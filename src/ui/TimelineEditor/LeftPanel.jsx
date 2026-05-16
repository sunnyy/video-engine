import { useState, useEffect } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import { useAssetsStore } from "../../store/useAssetsStore";
import { supabase } from "../../lib/supabase";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";
import { showToast } from "../Toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "media",    icon: "📁", label: "Media"    },
  { id: "text",     icon: "🔤", label: "Text"     },
  { id: "stickers", icon: "😊", label: "Stickers" },
  { id: "audio",    icon: "🎵", label: "Audio"    },
];

const TEXT_PRESETS = [
  { name: "Big Title", fontSize: 80, fontWeight: 800, color: "#ffffff", textAlign: "center" },
  { name: "Subtitle",  fontSize: 48, fontWeight: 600, color: "#e8e8f0", textAlign: "center" },
  { name: "Caption",   fontSize: 32, fontWeight: 400, color: "#ffffff", textAlign: "center" },
  { name: "Highlight", fontSize: 56, fontWeight: 800, color: "#f5c518", textAlign: "center" },
  { name: "Minimal",   fontSize: 36, fontWeight: 300, color: "#ffffff", textAlign: "left"   },
];

// Module-level sticker cache — persist across tab switches without refetching
let _stickerCache = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => resolve(e.target.files?.[0] ?? null);
    // No oncancel support in all browsers; promise resolves on change only
    input.click();
  });
}

function getFileDuration(file) {
  return new Promise((resolve) => {
    const tag = file.type.startsWith("video") ? "video" : "audio";
    const el = document.createElement(tag);
    el.preload = "metadata";
    const url = URL.createObjectURL(file);
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(isFinite(el.duration) ? el.duration : null); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    el.src = url;
  });
}

function makeLayerAt(type, project, start, duration, opts = {}) {
  const w = project?.format?.width  ?? 1080;
  const h = project?.format?.height ?? 1920;
  const id = crypto.randomUUID();
  const end = Math.min(start + duration, project?.format?.duration ?? 30);

  const base = {
    id, trackId: id, type,
    name: opts.name || (type.charAt(0).toUpperCase() + type.slice(1)),
    visible: true, locked: false, start, end,
    zIndex: (project?.layers?.length ?? 0) + 1,
    objectFit: "cover",
    transform: { x: 0, y: 0, width: w, height: h, rotation: 0, scale: 1, opacity: 1, blur: 0 },
    animation: { in: { type: "none", duration: 0.3 }, out: { type: "none", duration: 0.3 } },
    keyframes: {},
  };

  if (type === "text") {
    const s = opts.style ?? {};
    return {
      ...base,
      content: "Text",
      transform: { ...base.transform, height: 200 },
      style: {
        fontFamily: "Outfit",
        fontSize: s.fontSize ?? 72, fontWeight: s.fontWeight ?? 800,
        color: s.color ?? "#ffffff", textAlign: s.textAlign ?? "center",
        lineHeight: 1.2, letterSpacing: 0,
        textShadow: null, background: null, borderRadius: 0, padding: 0,
      },
    };
  }
  if (type === "audio") {
    return {
      ...base,
      src: opts.src ?? null, volume: 1, muted: false, fadeIn: 0, fadeOut: 0,
      audioType: "music", trimStart: 0, trimEnd: duration,
    };
  }
  if (type === "video") {
    return {
      ...base,
      src: opts.src ?? null, trimStart: 0, trimEnd: duration,
      playbackRate: 1, volume: 1, muted: false,
    };
  }
  if (type === "image") return { ...base, src: opts.src ?? null };
  if (type === "sticker") {
    return { ...base, src: opts.src ?? null, transform: { ...base.transform, width: 300, height: 300 } };
  }
  return base;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const btnPrimary = {
  width: "100%",
  background: "rgba(124,92,252,0.18)",
  border: "1px solid rgba(124,92,252,0.4)",
  borderRadius: 7,
  color: "#c8aaff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "8px 0",
  textAlign: "center",
  marginBottom: 10,
};

// ── Tab contents ──────────────────────────────────────────────────────────────

function MediaTab({ project, currentTime }) {
  const [filter, setFilter] = useState("image");
  const [uploading, setUploading] = useState(false);
  const { myAssets } = useAssetsStore();
  const addLayer = useTimelineStore((s) => s.addLayer);
  const addPendingFile = useTimelineStore((s) => s.addPendingFile);
  const updateLayer = useTimelineStore((s) => s.updateLayer);
  const clearPendingFile = useTimelineStore((s) => s.clearPendingFile);
  const projectId = useTimelineStore((s) => s.projectId);

  const filtered = myAssets.filter((a) => a.type === filter);

  const handleUpload = async () => {
    const accept = filter === "video" ? "video/*" : "image/*";
    const file = await pickFile(accept);
    if (!file) return;

    const type = file.type.startsWith("video") ? "video" : "image";
    const blobUrl = URL.createObjectURL(file);
    let dur = type === "image" ? 5 : 10;
    if (type === "video") { const d = await getFileDuration(file); if (d) dur = d; }

    const layer = makeLayerAt(type, project, currentTime, dur, { src: blobUrl, name: file.name });
    addPendingFile(layer.id, file);
    addLayer(layer);

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
    const type = asset.type === "video" ? "video" : "image";
    const dur = type === "image" ? 5 : 10;
    const layer = makeLayerAt(type, project, currentTime, dur, { src: asset.url, name: asset.name });
    addLayer(layer);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <button style={{ ...btnPrimary, opacity: uploading ? 0.6 : 1 }} onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading…" : "+ Upload"}
      </button>

      {/* Sub-filter */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {["image", "video"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1, padding: "5px 0", fontSize: 12, cursor: "pointer", borderRadius: 5,
              background: filter === f ? "rgba(124,92,252,0.22)" : "rgba(255,255,255,0.05)",
              border: filter === f ? "1px solid rgba(124,92,252,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: filter === f ? "#c8aaff" : "#8888a8",
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f === "image" ? "Images" : "Videos"}
          </button>
        ))}
      </div>

      {/* Asset list */}
      <div className="dark-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <div style={{ color: "#44445a", fontSize: 12, textAlign: "center", paddingTop: 20 }}>
            No {filter === "image" ? "images" : "videos"} yet
          </div>
        )}
        {filtered.map((asset) => (
          <div
            key={asset.id}
            onClick={() => addAssetLayer(asset)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "6px 4px", cursor: "pointer", borderRadius: 6,
              marginBottom: 3, userSelect: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 5, overflow: "hidden", background: "#0d0d1e" }}>
              {asset.type === "image" ? (
                <img src={asset.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>▶</div>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#c0c0d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {asset.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextTab({ project, currentTime }) {
  const addLayer = useTimelineStore((s) => s.addLayer);

  const addText = (style = {}) => {
    const layer = makeLayerAt("text", project, currentTime, 5, { style });
    addLayer(layer);
  };

  return (
    <div>
      <button style={btnPrimary} onClick={() => addText()}>+ Add Text</button>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TEXT_PRESETS.map((preset) => (
          <div
            key={preset.name}
            onClick={() => addText({ fontSize: preset.fontSize, fontWeight: preset.fontWeight, color: preset.color, textAlign: preset.textAlign })}
            style={{
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 7,
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.12)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            {/* Preview label */}
            <div style={{ fontSize: 9, color: "#55557a", marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {preset.name}
            </div>
            {/* Scaled preview */}
            <div style={{ overflow: "hidden", height: 28, display: "flex", alignItems: "center" }}>
              <span style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: Math.round(preset.fontSize * 0.28),
                fontWeight: preset.fontWeight,
                color: preset.color,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}>
                Sample Text
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickersTab({ project, currentTime }) {
  const [stickers, setStickers] = useState(_stickerCache ?? []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!_stickerCache);
  const addLayer = useTimelineStore((s) => s.addLayer);

  useEffect(() => {
    if (_stickerCache) return;
    if (!supabase) { setLoading(false); return; }
    supabase.from("stickers").select("*").then(({ data }) => {
      const list = data ?? [];
      _stickerCache = list;
      setStickers(list);
      setLoading(false);
    });
  }, []);

  const filtered = search
    ? stickers.filter((s) => (s.name ?? s.tags ?? "").toLowerCase().includes(search.toLowerCase()))
    : stickers;

  const addStickerLayer = (sticker) => {
    const src = sticker.public_url || sticker.url;
    const layer = makeLayerAt("sticker", project, currentTime, 3, { src, name: sticker.name ?? "Sticker" });
    addLayer(layer);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search stickers…"
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 10,
          background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, color: "#e8e8f0", fontSize: 12, padding: "7px 10px", outline: "none",
        }}
      />

      {loading && <div style={{ color: "#44445a", fontSize: 12, textAlign: "center", paddingTop: 16 }}>Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ color: "#44445a", fontSize: 12, textAlign: "center", paddingTop: 16 }}>No stickers found</div>
      )}

      <div className="dark-scroll" style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {filtered.map((sticker) => {
            const src = sticker.public_url || sticker.url;
            return (
              <div
                key={sticker.id}
                onClick={() => addStickerLayer(sticker)}
                title={sticker.name}
                style={{
                  aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(124,92,252,0.15)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              >
                <img src={src} style={{ width: "80%", height: "80%", objectFit: "contain" }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AudioTab({ project, currentTime }) {
  const [uploading, setUploading] = useState(false);
  const { myAssets } = useAssetsStore();
  const addLayer = useTimelineStore((s) => s.addLayer);
  const addPendingFile = useTimelineStore((s) => s.addPendingFile);
  const clearPendingFile = useTimelineStore((s) => s.clearPendingFile);
  const projectId = useTimelineStore((s) => s.projectId);

  const audioAssets = myAssets.filter((a) => a.type === "audio");

  const handleUpload = async () => {
    const file = await pickFile("audio/*");
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    let dur = 10;
    const d = await getFileDuration(file);
    if (d) dur = d;

    const layer = makeLayerAt("audio", project, currentTime, dur, { src: blobUrl, name: file.name });
    addPendingFile(layer.id, file);
    addLayer(layer);

    setUploading(true);
    try {
      const asset = await uploadUserAsset(file, "audio", null, "project", projectId);
      useTimelineStore.getState().updateLayer(layer.id, { src: asset.url });
      useAssetsStore.getState().addMyAsset({
        id: asset.id, url: asset.url, file_path: asset.file_path,
        type: "audio", name: asset.name, size: asset.size ?? 0,
        scope: asset.scope ?? "project", project_id: asset.project_id ?? null,
        orientation: "any", source: "user",
      });
      clearPendingFile(layer.id);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const addAudioLayer = (asset) => {
    const layer = makeLayerAt("audio", project, currentTime, 10, { src: asset.url, name: asset.name });
    addLayer(layer);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <button style={{ ...btnPrimary, opacity: uploading ? 0.6 : 1 }} onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading…" : "+ Upload Audio"}
      </button>

      <div className="dark-scroll" style={{ flex: 1, overflowY: "auto" }}>
        {audioAssets.length === 0 && (
          <div style={{ color: "#44445a", fontSize: 12, textAlign: "center", paddingTop: 20 }}>
            No audio yet
          </div>
        )}
        {audioAssets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => addAudioLayer(asset)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "7px 4px", cursor: "pointer", borderRadius: 6, marginBottom: 3,
              userSelect: "none",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: 5,
              background: "rgba(255,126,179,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#ff7eb3",
            }}>♪</div>
            <span style={{ fontSize: 11, color: "#c0c0d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {asset.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main LeftPanel ─────────────────────────────────────────────────────────────

export default function LeftPanel() {
  const [activeTab, setActiveTab] = useState("media");
  const project = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const projectId = useTimelineStore((s) => s.projectId);
  const loadMyAssets = useAssetsStore((s) => s.loadMyAssets);

  useEffect(() => {
    if (projectId) loadMyAssets(projectId);
  }, [projectId]);

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "#111118",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                background: active ? "rgba(124,92,252,0.15)" : "transparent",
                borderBottom: active ? "2px solid #7c5cfc" : "2px solid transparent",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <span style={{ fontSize: 9, color: active ? "#c8aaff" : "#55556a", fontWeight: active ? 700 : 400, letterSpacing: "0.04em" }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="dark-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {activeTab === "media"    && <MediaTab    project={project} currentTime={currentTime} />}
        {activeTab === "text"     && <TextTab     project={project} currentTime={currentTime} />}
        {activeTab === "stickers" && <StickersTab project={project} currentTime={currentTime} />}
        {activeTab === "audio"    && <AudioTab    project={project} currentTime={currentTime} />}
      </div>
    </div>
  );
}
