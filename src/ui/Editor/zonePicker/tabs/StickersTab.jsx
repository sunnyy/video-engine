import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../../lib/supabase";

const PAGE_SIZE = 20;

export default function StickersTab({ onSelect }) {
  const [stickers,    setStickers]    = useState([]);
  const [categories,  setCategories]  = useState(["All"]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("All");
  const [offset,      setOffset]      = useState(0);
  const searchTimer = useRef(null);

  const fetchStickers = async (q, cat, off, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);

    let query = supabase
      .from("stickers")
      .select("id, name, public_url, category, tags")
      .order("category")
      .range(off, off + PAGE_SIZE - 1);

    if (cat !== "All") query = query.eq("category", cat);
    if (q)             query = query.ilike("name", `%${q}%`);

    const { data, error } = await query;
    if (!error && data) {
      setStickers(prev => append ? [...prev, ...data] : data);
      setHasMore(data.length === PAGE_SIZE);
    }

    append ? setLoadingMore(false) : setLoading(false);
  };

  useEffect(() => {
    supabase.from("stickers").select("category").then(({ data }) => {
      if (data) {
        const cats = [...new Set(data.map(s => s.category).filter(Boolean))].sort();
        setCategories(["All", ...cats]);
      }
    });
    fetchStickers("", "All", 0);
  }, []);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setOffset(0);
      fetchStickers(val, category, 0);
    }, 300);
  };

  const handleCategory = (cat) => {
    setCategory(cat);
    setOffset(0);
    fetchStickers(search, cat, 0);
  };

  const handleLoadMore = () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    fetchStickers(search, category, next, true);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "stk-spin 0.8s linear infinite" }} />
        <style>{`@keyframes stk-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <style>{`@keyframes stk-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Search */}
      <input
        value={search}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search stickers…"
        style={{
          background: "#111118", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "#e8e8f0",
          outline: "none", width: "100%", boxSizing: "border-box",
        }}
      />

      {/* Category pills */}
      {categories.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                cursor: "pointer", border: "none", transition: "all 0.15s",
                background: category === cat ? "#7c5cfc" : "rgba(255,255,255,0.06)",
                color:      category === cat ? "#fff"    : "#7070a0",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {stickers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "#55556a" }}>
          {search ? `No stickers match "${search}"` : "No stickers uploaded yet"}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
            {stickers.map(sticker => (
              <button
                key={sticker.id}
                title={sticker.name || sticker.category}
                onClick={() => onSelect({ kind: "asset", asset: { src: sticker.public_url, type: "image", objectFit: "contain" } })}
                style={{
                  aspectRatio: "1", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)",
                  background: "#0e0e1a", cursor: "pointer", padding: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#7c5cfc";
                  e.currentTarget.style.background  = "rgba(124,92,252,0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background  = "#0e0e1a";
                }}
              >
                <img
                  src={sticker.public_url}
                  alt={sticker.name || ""}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                marginTop: 4, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)", color: "#9090b0", fontSize: 13,
                cursor: loadingMore ? "not-allowed" : "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loadingMore
                ? <><div style={{ width: 14, height: 14, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "stk-spin 0.8s linear infinite" }} /> Loading…</>
                : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
