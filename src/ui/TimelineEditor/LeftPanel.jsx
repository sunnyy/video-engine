import { useState } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import { showToast } from "../Toast";

const LAYER_ICONS = {
  video: "▶",
  image: "🖼",
  text: "T",
  audio: "♪",
  captions: "CC",
  sticker: "★",
};

const LAYER_COLORS = {
  video: "#4a9eff",
  image: "#4adf86",
  text: "#f5c518",
  audio: "#ff7eb3",
  captions: "#c87dff",
  sticker: "#ff9f40",
};

function makeDefaultLayer(type, project) {
  const w = project?.format?.width ?? 1080;
  const h = project?.format?.height ?? 1920;
  const id = crypto.randomUUID();
  const base = {
    id,
    trackId: id,
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1) + " Layer",
    visible: true,
    locked: false,
    start: 0,
    end: project?.format?.duration ?? 10,
    zIndex: (project?.layers?.length ?? 0) + 1,
    objectFit: "cover",
    transform: {
      x: 0, y: 0, width: w, height: h,
      rotation: 0, scale: 1, opacity: 1, blur: 0,
    },
    animation: {
      in: { type: "none", duration: 0.3 },
      out: { type: "none", duration: 0.3 },
    },
    keyframes: {},
  };

  if (type === "text") {
    return {
      ...base,
      content: "Text",
      transform: { ...base.transform, width: w, height: 200 },
      style: {
        fontFamily: "Outfit", fontSize: 72, fontWeight: 800,
        color: "#ffffff", textAlign: "center", lineHeight: 1.2,
        letterSpacing: 0, textShadow: null, background: null,
        borderRadius: 0, padding: 0,
      },
    };
  }
  if (type === "audio") {
    return {
      ...base,
      src: null, volume: 1, muted: false, fadeIn: 0, fadeOut: 0,
      audioType: "music", trimStart: 0,
      trimEnd: project?.format?.duration ?? 10,
    };
  }
  if (type === "video") {
    return {
      ...base,
      src: null, trimStart: 0,
      trimEnd: project?.format?.duration ?? 10,
      playbackRate: 1, volume: 1, muted: false, fadeIn: 0, fadeOut: 0,
    };
  }
  if (type === "image") return { ...base, src: null };
  if (type === "sticker") {
    return { ...base, src: null, transform: { ...base.transform, width: 300, height: 300 } };
  }
  if (type === "captions") {
    return {
      ...base,
      segments: [],
      captionStyle: {
        fontFamily: "Outfit", fontSize: 48, fontWeight: 700,
        color: "#ffffff", highlightColor: "#f5c518",
        background: "rgba(0,0,0,0.5)", borderRadius: 8,
        padding: 8, textAlign: "center",
      },
    };
  }
  return base;
}

export default function LeftPanel() {
  const project = useTimelineStore((s) => s.project);
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);
  const selectLayer = useTimelineStore((s) => s.selectLayer);
  const addLayer = useTimelineStore((s) => s.addLayer);
  const updateLayer = useTimelineStore((s) => s.updateLayer);
  const addPendingFile = useTimelineStore((s) => s.addPendingFile);
  const [addOpen, setAddOpen] = useState(false);

  const layers = project
    ? [...project.layers].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
    : [];

  const handleAdd = (type) => {
    setAddOpen(false);

    if (type === "text" || type === "captions") {
      addLayer(makeDefaultLayer(type, project));
      return;
    }

    if (type === "sticker") {
      showToast("Sticker picker coming soon", "info");
      return;
    }

    // video / image / audio — open file picker
    const accept =
      type === "video" ? "video/*" : type === "audio" ? "audio/*" : "image/*";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      const layer = { ...makeDefaultLayer(type, project), src: blobUrl, name: file.name };
      addPendingFile(layer.id, file);
      addLayer(layer);
    };
    input.click();
  };

  const toggleVisibility = (e, layer) => {
    e.stopPropagation();
    updateLayer(layer.id, { visible: !layer.visible });
  };

  return (
    <div
      style={{
        width: 112,
        flexShrink: 0,
        background: "#111118",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "9px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: "#8888a8",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        Layers
      </div>

      {/* Layer list */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {layers.length === 0 && (
          <div
            style={{
              padding: "18px 8px",
              color: "#55556a",
              fontSize: 12,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            No layers yet
          </div>
        )}
        {layers.map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          const color = LAYER_COLORS[layer.type] ?? "#888";
          return (
            <div
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              style={{
                padding: "7px 8px",
                cursor: "pointer",
                background: isSelected ? "rgba(124,92,252,0.2)" : "transparent",
                borderLeft: isSelected ? "2px solid #7c5cfc" : "2px solid transparent",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
              onMouseOver={(e) => {
                if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseOut={(e) => {
                if (!isSelected) e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Icon + eye row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color, fontWeight: 700, minWidth: 16, textAlign: "center" }}>
                  {LAYER_ICONS[layer.type] ?? "?"}
                </span>
                <button
                  onClick={(e) => toggleVisibility(e, layer)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 2, color: layer.visible ? "#8888a8" : "#3a3a50",
                    fontSize: 11, lineHeight: 1, flexShrink: 0,
                  }}
                  title={layer.visible ? "Hide" : "Show"}
                >
                  {layer.visible ? "👁" : "🚫"}
                </button>
              </div>
              {/* Name */}
              <div
                style={{
                  fontSize: 11,
                  color: isSelected ? "#e8e8f0" : "#c0c0d8",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  wordBreak: "break-all",
                  opacity: layer.visible ? 1 : 0.45,
                }}
              >
                {layer.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Layer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
        <button
          onClick={() => setAddOpen((o) => !o)}
          style={{
            width: "100%", background: "none", border: "none",
            color: "#9070f0", cursor: "pointer", padding: "9px 0",
            fontSize: 13, fontWeight: 600, textAlign: "center",
          }}
        >
          + Add Layer
        </button>

        {addOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onClick={() => setAddOpen(false)}
            />
            <div
              style={{
                position: "absolute", bottom: "100%", left: 0, right: 0,
                background: "#1c1c2c",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, overflow: "hidden", zIndex: 100,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {["video", "image", "text", "audio", "sticker", "captions"].map((type) => (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", background: "none", border: "none",
                    color: "#e8e8f0", cursor: "pointer",
                    padding: "9px 12px", fontSize: 13, textAlign: "left",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ color: LAYER_COLORS[type], fontSize: 13, width: 16, textAlign: "center" }}>
                    {LAYER_ICONS[type]}
                  </span>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
