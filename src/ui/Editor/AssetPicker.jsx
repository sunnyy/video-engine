import React, { useEffect, useState, useRef } from "react";
import { getAssets } from "../../services/assets/getAssets";

const BACKGROUND_PRESETS = [
  { id: "bg_white", type: "background", value: { color: "#ffffff" } },
  { id: "bg_black", type: "background", value: { color: "#000000" } },
  { id: "bg_gray", type: "background", value: { color: "#f3f4f6" } },
  {
    id: "bg_gradient_1",
    type: "background",
    value: {
      gradient: "linear-gradient(135deg, #667eea, #764ba2)",
    },
  },
  {
    id: "bg_gradient_2",
    type: "background",
    value: {
      gradient: "linear-gradient(135deg, #ff9a9e, #fad0c4)",
    },
  },
];

export default function AssetPicker({
  onSelect,
  orientation,
  onClose,
}) {
  const [tab, setTab] = useState("gallery");
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const observerRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    if (tab !== "gallery") return;
    loadAssets(1, true);
  }, [search, orientation, tab]);

  const loadAssets = async (pageNumber, reset = false) => {
    if (loading) return;

    setLoading(true);

    const result = await getAssets({
      search,
      orientation,
      page: pageNumber,
      limit: 18,
    });

    setAssets((prev) =>
      reset ? result.data : [...prev, ...result.data]
    );

    setHasMore(result.hasMore);
    setPage(pageNumber);
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== "gallery") return;
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadAssets(page + 1);
        }
      },
      { threshold: 1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, tab]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    onSelect({
      id: crypto.randomUUID(),
      type: "upload",
      src: url,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-[900px] flex-col rounded-lg bg-white p-6">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-semibold">
            Select Asset
          </h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-6 border-b pb-2">
          {["gallery", "upload", "background"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "font-semibold text-indigo-600"
                  : "text-gray-500"
              }
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Upload */}
        {tab === "upload" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <button
              onClick={() => fileInputRef.current.click()}
              className="rounded bg-indigo-600 px-6 py-3 text-white"
            >
              Choose File
            </button>

            <input
              type="file"
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Background */}
        {tab === "background" && (
          <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto">
            {BACKGROUND_PRESETS.map((bg) => (
              <div
                key={bg.id}
                onClick={() => {
                  onSelect(bg);
                  onClose();
                }}
                className="h-40 cursor-pointer rounded border"
                style={
                  bg.value.color
                    ? { background: bg.value.color }
                    : { background: bg.value.gradient }
                }
              />
            ))}
          </div>
        )}

        {/* Gallery */}
        {tab === "gallery" && (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="mb-4 w-full rounded border px-3 py-2"
            />

            <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    onSelect({
                      ...asset,
                      type: "library",
                    });
                    onClose();
                  }}
                  className="cursor-pointer overflow-hidden rounded border hover:border-indigo-500"
                >
                  <img
                    src={asset.src}
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-2 text-sm">
                    {asset.category}
                  </div>
                </div>
              ))}

              <div ref={observerRef} />
            </div>

            {loading && (
              <div className="mt-2 text-center text-sm text-gray-500">
                Loading...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}