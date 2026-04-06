/**
 * GalleryTab.jsx
 * Pixabay stock search — images and videos.
 * Replaces static Supabase gallery.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

const API_KEY  = import.meta.env.VITE_PIXABAY_API_KEY;
const PER_PAGE = 18;

const TYPE_FILTERS = [
  { key: "all",   label: "All"    },
  { key: "photo", label: "Images" },
  { key: "video", label: "Videos" },
];

const QUICK_SEARCHES = [
  "nature", "business", "city", "technology",
  "people", "abstract", "food", "travel", "sport", "fashion",
];

async function searchPixabay(query, mediaType, page) {
  const isVideo = mediaType === "video";
  const base    = isVideo
    ? "https://pixabay.com/api/videos/"
    : "https://pixabay.com/api/";

  const params = new URLSearchParams({
    key:      API_KEY,
    q:        encodeURIComponent(query),
    per_page: PER_PAGE,
    page,
    safesearch: true,
    ...(isVideo ? {} : { image_type: "photo", orientation: "vertical" }),
  });

  const res  = await fetch(`${base}?${params}`);
  const data = await res.json();

  if (!data.hits) return [];

  return data.hits.map(hit => {
    if (isVideo) {
      // Pick medium quality video
      const video = hit.videos?.medium || hit.videos?.small || hit.videos?.large;
      return {
        id:        hit.id,
        type:      "video",
        src:       video?.url,
        thumb:     hit.picture_id
          ? `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg`
          : null,
        width:     video?.width,
        height:    video?.height,
      };
    } else {
      return {
        id:        hit.id,
        type:      "image",
        src:       hit.largeImageURL || hit.webformatURL,
        thumb:     hit.previewURL,
        width:     hit.imageWidth,
        height:    hit.imageHeight,
      };
    }
  }).filter(a => a.src);
}

export default function GalleryTab({ onSelect }) {
  const [query,      setQuery]      = useState("");
  const [inputVal,   setInputVal]   = useState("");
  const [mediaType,  setMediaType]  = useState("all");
  const [results,    setResults]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);
  const [error,      setError]      = useState(null);
  const searchTimeout = useRef(null);

  const doSearch = useCallback(async (q, type, pg) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const types = type === "all" ? ["photo", "video"] : [type];
      const all   = await Promise.all(types.map(t => searchPixabay(q, t, pg)));
      const flat  = all.flat();
      // Interleave if both types
      const merged = type === "all"
        ? flat.sort(() => Math.random() - 0.5)
        : flat;
      if (pg === 1) setResults(merged);
      else setResults(prev => [...prev, ...merged]);
      setHasMore(merged.length >= PER_PAGE * types.length * 0.5);
    } catch (e) {
      setError("Search failed. Check your API key.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on input change
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (!inputVal.trim()) return;
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      setQuery(inputVal);
    }, 500);
    return () => clearTimeout(searchTimeout.current);
  }, [inputVal]);

  useEffect(() => {
    if (query) doSearch(query, mediaType, page);
  }, [query, mediaType, page]);

  const handleQuick = (q) => {
    setInputVal(q);
    setPage(1);
    setQuery(q);
  };

  const handleTypeChange = (t) => {
    setMediaType(t);
    setPage(1);
    if (query) doSearch(query, t, 1);
  };

  const handleSelect = (asset) => {
    onSelect({
      kind:  "asset",
      asset: {
        src:      asset.src,
        type:     asset.type,
        objectFit: "cover",
      },
    });
  };

  return (
    <div className="flex flex-col h-full gap-3">

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { setPage(1); setQuery(inputVal); } }}
          placeholder="Search images and videos..."
          className="flex-1 bg-[#0e0e1a] border border-[rgba(255,255,255,0.1)] rounded-[8px] px-3 py-[12px] text-[15px] text-[#e8e8f0] placeholder-[#55556a] focus:border-[#7c5cfc] focus:outline-none"
        />
        <button
          onClick={() => { setPage(1); setQuery(inputVal); }}
          className="px-4 py-[8px] bg-[#7c5cfc] text-white rounded-[8px] text-[13px] font-bold border-0 cursor-pointer hover:bg-[#6a4de0] transition-colors"
        >
          Search
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {TYPE_FILTERS.map(f => (
          <button key={f.key} onClick={() => handleTypeChange(f.key)}
            className="px-3 py-[5px] rounded-[6px] text-[12px] font-bold border-0 cursor-pointer transition-colors"
            style={{
              background: mediaType === f.key ? "#7c5cfc" : "rgba(255,255,255,0.06)",
              color:      mediaType === f.key ? "#fff" : "#9494a8",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Quick search pills */}
      {!query && (
        <div className="flex flex-wrap gap-2">
          {QUICK_SEARCHES.map(q => (
            <button key={q} onClick={() => handleQuick(q)}
              className="px-3 py-[4px] rounded-full text-[11px] font-medium border border-[rgba(255,255,255,0.1)] text-[#9494a8] hover:text-white hover:border-[#7c5cfc] bg-transparent cursor-pointer transition-colors capitalize">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <div className="text-[#f87171] text-[12px]">{error}</div>}

      {/* Results grid */}
      <div className="flex-1 overflow-y-auto">
        {!query && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <span className="text-[40px]">🔍</span>
            <span className="text-[13px] text-[#9494a8]">Search for images and videos</span>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-6 gap-3 content-start">
              {results.map(asset => (
                <div key={`${asset.type}_${asset.id}`}
                  onClick={() => handleSelect(asset)}
                  className="cursor-pointer rounded-[10px] overflow-hidden border border-[rgba(255,255,255,0.06)] hover:border-[#7c5cfc] transition-colors relative group"
                  style={{ aspectRatio: "9/16", background: "#0e0e1a" }}
                >
                  {asset.type === "video" ? (
                    <video
                      src={asset.src}
                      muted playsInline preload="none"
                      className="w-full h-full object-cover"
                      onMouseEnter={e => e.target.play()}
                      onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                  ) : (
                    <img src={asset.thumb || asset.src} className="w-full h-full object-cover" />
                  )}
                  {/* Type badge */}
                  <div className="absolute top-2 left-2 px-[5px] py-[2px] rounded-[4px] text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: asset.type === "video" ? "#f59e0b" : "#7c5cfc" }}>
                    {asset.type === "video" ? "▶ VIDEO" : "IMG"}
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="px-6 py-[8px] rounded-[8px] text-[12px] font-bold text-white border-0 cursor-pointer transition-colors"
                  style={{ background: loading ? "#2a2a40" : "#7c5cfc" }}>
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}

        {loading && results.length === 0 && (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-50">
            <span className="text-[13px] text-[#9494a8]">No results for "{query}"</span>
          </div>
        )}
      </div>

      {/* Pixabay attribution */}
      <div className="text-[9px] text-[#35355a] text-center">
        Powered by Pixabay
      </div>
    </div>
  );
}