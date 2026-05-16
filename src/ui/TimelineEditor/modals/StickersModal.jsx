import { useState, useEffect } from "react";
import { useTimelineStore } from "../../../store/useTimelineStore";
import { supabase } from "../../../lib/supabase";
import EditorModal from "./EditorModal";
import { makeLayerAt } from "./helpers";

const PAGE_SIZE = 30;
let _stickerCache = null;

export default function StickersModal({ onClose }) {
  const project     = useTimelineStore((s) => s.project);
  const currentTime = useTimelineStore((s) => s.currentTime);
  const addLayer    = useTimelineStore((s) => s.addLayer);

  const [stickers, setStickers] = useState(_stickerCache ?? []);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(!_stickerCache);
  const [page, setPage]         = useState(1);

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

  useEffect(() => { setPage(1); }, [search]);

  const filtered = search
    ? stickers.filter((s) => (s.name ?? s.tags ?? "").toLowerCase().includes(search.toLowerCase()))
    : stickers;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addStickerLayer = (sticker) => {
    const src = sticker.public_url || sticker.url;
    const layer = makeLayerAt("sticker", project, currentTime, 3, { src, name: sticker.name ?? "Sticker" });
    addLayer(layer);
    onClose();
  };

  return (
    <EditorModal title="Stickers" onClose={onClose}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search stickers…"
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 14,
          background: "#0d0d1e", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, color: "#e8e8f0", fontSize: 12, padding: "8px 12px", outline: "none",
        }}
      />

      {loading && (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Loading…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ color: "#44445a", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No stickers found</div>
      )}

      {!loading && paged.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
          {paged.map((sticker) => {
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
      )}

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
