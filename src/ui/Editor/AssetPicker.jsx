import React, { useEffect, useState, useRef } from "react";
import { getAssets } from "../../services/assets/getAssets";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";
import { deleteUserAsset } from "../../services/assets/deleteUserAsset";
import { supabase } from "../../lib/supabase";

const BACKGROUND_PRESETS = [
  { id: "bg_white", type: "background", value: { color: "#f6f6f6" } },
  { id: "bg_black", type: "background", value: { color: "#000000" } },
  { id: "bg_gray", type: "background", value: { color: "#333333" } },
  {
    id: "bg_gradient_1",
    type: "background",
    value: { gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
  },
  {
    id: "bg_gradient_2",
    type: "background",
    value: { gradient: "linear-gradient(135deg, #ff9a9e, #fad0c4)" },
  },
];

export default function AssetPicker({ onSelect, orientation, onClose }) {
  const [tab, setTab] = useState("upload");
  const [search, setSearch] = useState("");

  const [myAssets, setMyAssets] = useState([]);
  const [galleryAssets, setGalleryAssets] = useState([]);

  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fileInputRef = useRef();

  // 🔥 Load My Assets once
  useEffect(() => {
    loadMyAssets();
  }, []);

  const loadMyAssets = async () => {
    setLoadingMy(true);
    const { data } = await supabase.from("user_assets").select("*").order("created_at", { ascending: false });

    setMyAssets(
      data?.map((a) => ({
        id: a.id,
        url: a.url,
        type: a.type,
        source: "user",
        file_path: a.file_path,
      })) || [],
    );
    setLoadingMy(false);
  };

  const loadGalleryAssets = async () => {
    if (galleryAssets.length > 0) return;

    setLoadingGallery(true);
    const result = await getAssets({
      search,
      orientation,
      page: 1,
      limit: 100,
    });
    setGalleryAssets(result.data || []);
    setLoadingGallery(false);
  };

  const handleUpload = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      if (file.type.startsWith("video") && file.size > 45 * 1024 * 1024) {
        const formData = new FormData();
        formData.append("video", file);

        const response = await fetch("http://localhost:5000/api/compress", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Compression failed");
        }

        const compressedBlob = await response.blob();

        file = new File([compressedBlob], `${crypto.randomUUID()}.mp4`, { type: "video/mp4" });
      }

      const asset = await uploadUserAsset(file);

      const newAsset = {
        id: asset.id,
        url: asset.url,
        type: asset.type,
        source: "user",
      };

      setMyAssets((prev) => [newAsset, ...prev]);

      onSelect(newAsset);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setUploading(false);
  };

  const handleDelete = async (asset) => {
    setDeletingId(asset.id);
    await deleteUserAsset(asset);
    setMyAssets((prev) => prev.filter((a) => a.id !== asset.id));
    setDeletingId(null);
  };

  const renderPreview = (asset) => {
    const src = asset.thumbnail_url || asset.url;
    if (!src) return null;

    const isVideo = src.toLowerCase().endsWith(".mp4") || src.toLowerCase().endsWith(".webm");

    if (isVideo) {
      return (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onLoadedData={(e) => {
            e.currentTarget.currentTime = 0.1;
          }}
        />
      );
    }

    return <img src={src} alt="" className="h-full w-full object-cover" />;
  };

  const activeAssets = tab === "my" ? myAssets : galleryAssets;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[85vh] w-[1000px] flex-col rounded-lg bg-white p-6">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-semibold">Select Asset</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-6 border-b pb-2">
          {[
            { key: "upload", label: "Upload" },
            { key: "my", label: "My Assets" },
            { key: "gallery", label: "Gallery" },
            { key: "background", label: "Background" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === "gallery") loadGalleryAssets();
              }}
              className={tab === t.key ? "font-semibold text-indigo-600" : "text-gray-500"}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Upload */}
        {tab === "upload" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              className="rounded bg-indigo-600 px-6 py-3 text-white"
            >
              {uploading ? "Uploading..." : "Choose File"}
            </button>

            <input
              type="file"
              accept="image/*,video/*,audio/*"
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
                className="aspect-video cursor-pointer rounded border"
                style={bg.value.color ? { background: bg.value.color } : { background: bg.value.gradient }}
              />
            ))}
          </div>
        )}

        {/* My + Gallery */}
        {(tab === "my" || tab === "gallery") && (
          <div className="grid grid-cols-3 gap-4 overflow-y-auto content-start">
            {activeAssets.map((asset) => (
              <div
                key={asset.id}
                className="relative cursor-pointer overflow-hidden rounded-xl border hover:border-indigo-500"
              >
                <div
                  onClick={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  className="aspect-video"
                >
                  {renderPreview(asset)}
                </div>

                {tab === "my" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset);
                    }}
                    className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded"
                  >
                    {deletingId === asset.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            ))}

            {(loadingMy || loadingGallery) && (
              <div className="col-span-3 text-center text-sm text-gray-500">Loading...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
