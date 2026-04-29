import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverFetch } from "../services/serverApi";
import AppLayout from "../ui/AppLayout";

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d    = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return d.toLocaleDateString();
}

function ThumbnailCard({ thumb, onDelete }) {
  const [hov,       setHov]       = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleDelete(e) {
    e.stopPropagation();
    if (confirming) { onDelete(thumb); }
    else { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }
  }

  const createdAt = thumb.name
    ? timeLabel(new Date(parseInt(thumb.name.replace("thumb-", "").split(".")[0]) || Date.now()).toISOString())
    : "";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirming(false); }}
      style={{
        background:   "#111118",
        border:       `1px solid ${hov ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14,
        overflow:     "hidden",
        transition:   "all 0.2s",
        transform:    hov ? "translateY(-2px)" : "none",
        boxShadow:    hov ? "0 8px 32px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b0b10", overflow: "hidden" }}>
        <img src={thumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

        {/* Hover overlay */}
        {hov && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <a
              href={thumb.url}
              download={`thumbnail-${Date.now()}.jpg`}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                padding: "7px 16px", background: "#f5c518", color: "#000",
                borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none",
              }}
            >
              ↓ Download
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#55556a", fontFamily: "'JetBrains Mono',monospace" }}>
          {createdAt}
        </span>
        <button
          onClick={handleDelete}
          style={{
            background: confirming ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
            border: "none", borderRadius: 5, cursor: "pointer",
            color: confirming ? "#f87171" : "#55556a",
            fontSize: 11, padding: "3px 8px",
            opacity: hov ? 1 : 0, transition: "opacity 0.15s",
          }}
          title={confirming ? "Click again to confirm" : "Delete"}
        >
          {confirming ? "Confirm delete" : "✕"}
        </button>
      </div>
    </div>
  );
}

export default function Thumbnails() {
  const navigate = useNavigate();
  const [thumbnails, setThumbnails] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    serverFetch("/api/thumbnail/list")
      .then(r => r.json())
      .then(d => setThumbnails(d.thumbnails || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(thumb) {
    try {
      await serverFetch("/api/thumbnail/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ storageKey: thumb.storageKey }),
      });
      setThumbnails(prev => prev.filter(t => t.storageKey !== thumb.storageKey));
    } catch (_) {}
  }

  return (
    <AppLayout>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0d0d14", flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#e8e8f0", fontFamily: "'Syne',sans-serif" }}>
          Thumbnails
          {!loading && thumbnails.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 15, fontWeight: 400, color: "#77777f" }}>
              ({thumbnails.length})
            </span>
          )}
        </h1>
        <button
          onClick={() => navigate("/thumbnail/new")}
          style={{ padding: "7px 16px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
        >
          + New Thumbnail
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {!loading && thumbnails.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 16, textAlign: "center" }}>
            <div style={{ fontSize: 48 }}>🖼</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e8f0" }}>No thumbnails yet</div>
            <div style={{ fontSize: 15, color: "#77777f" }}>Generate clickbait-style thumbnails for YouTube, Reels, and Shorts</div>
            <button
              onClick={() => navigate("/thumbnail/new")}
              style={{ marginTop: 8, padding: "10px 24px", background: "#f5c518", color: "#0b0b10", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer" }}
            >
              + Create First Thumbnail
            </button>
          </div>
        )}

        {!loading && thumbnails.length > 0 && (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {thumbnails.map((thumb, i) => (
              <ThumbnailCard key={i} thumb={thumb} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
