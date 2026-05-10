/**
 * TemplateModal.jsx
 * Browse and apply layout templates to the current beat.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const BEAT_TYPES = ["hook", "context", "point", "proof", "tension", "reveal", "example", "insight", "visual", "cta"];

const BT_COLOR = {
  hook: "#f97316", context: "#38bdf8", point: "#22c55e", proof: "#fb923c",
  tension: "#f87171", reveal: "#a78bfa", example: "#34d399", insight: "#818cf8",
  visual: "#f472b6", cta: "#f5c518",
};

function LayoutCard({ layout, onSelect }) {
  const [hov, setHov] = useState(false);
  const color = BT_COLOR[layout.beat_type] || "#666";

  return (
    <div
      onClick={() => onSelect(layout)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#252540" : "#1a1a2e",
        border: `1px solid ${hov ? "rgba(124,92,252,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        overflow: "hidden",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        boxShadow: hov ? "0 6px 20px rgba(0,0,0,0.4)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Thumbnail / placeholder */}
      <div style={{ position: "relative", width: "100%", height: 280, background: "#16161f", overflow: "hidden", flexShrink: 0 }}>
        {layout.thumbnail_url ? (
          <img
            src={layout.thumbnail_url}
            alt={layout.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 12px", boxSizing: "border-box",
          }}>
            <span style={{
              fontSize: 11, color: "#444", textAlign: "center",
              fontFamily: "monospace", lineHeight: 1.4, wordBreak: "break-word",
            }}>
              {layout.name}
            </span>
          </div>
        )}

        {/* beat_type badge */}
        {layout.beat_type && (
          <span style={{
            position: "absolute", top: 6, left: 6,
            padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
            background: `${color}cc`, color: "#fff",
          }}>
            {layout.beat_type}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "8px 10px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#e8e8f0", fontFamily: "monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {layout.name}
        </div>
        {layout.beat_type && (
          <div style={{ fontSize: 9, color: "#555", marginTop: 2, fontFamily: "monospace" }}>
            {layout.beat_type}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplateModal({ isOpen, onClose, onSelect }) {
  const [layouts, setLayouts]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");

  const fetchLayouts = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("layouts")
        .select("id, name, beat_type, thumbnail_url, zones, type")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (!error && data) setLayouts(data);
    } catch (e) {
      console.warn("[TemplateModal] fetch error:", e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) fetchLayouts();
  }, [isOpen, fetchLayouts]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = layouts.filter(l => {
    if (filter !== "all" && l.beat_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.name?.toLowerCase().includes(q) && !l.beat_type?.includes(q)) return false;
    }
    return true;
  });

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 780, maxHeight: "85vh",
          background: "#1c1c28", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", margin: 0 }}>
              ⊞ Templates
            </h2>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <input
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "6px 10px", marginBottom: 10,
              background: "#111118", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "#e8e8f0", fontSize: 12, outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...BEAT_TYPES].map(bt => (
              <button
                key={bt}
                onClick={() => setFilter(bt)}
                style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer", transition: "all 0.12s",
                  background: filter === bt
                    ? (bt === "all" ? "rgba(124,92,252,0.25)" : `${BT_COLOR[bt]}22`)
                    : "transparent",
                  borderColor: filter === bt
                    ? (bt === "all" ? "rgba(124,92,252,0.5)" : `${BT_COLOR[bt]}88`)
                    : "rgba(255,255,255,0.1)",
                  color: filter === bt
                    ? (bt === "all" ? "#a78bfa" : BT_COLOR[bt])
                    : "#666",
                }}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading ? (
            <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 40 }}>Loading templates…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 40 }}>No templates found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {filtered.map(l => (
                <LayoutCard
                  key={l.id}
                  layout={l}
                  onSelect={(layout) => { onSelect(layout); onClose(); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#555" }}>
            {filtered.length} template{filtered.length !== 1 ? "s" : ""} · click to apply to selected beat
          </span>
        </div>
      </div>
    </div>
  );
}
