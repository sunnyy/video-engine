import React, { useEffect, useState, useRef } from "react";
import { uploadUserAsset } from "../../services/assets/uploadUserAsset";
import { deleteUserAsset } from "../../services/assets/deleteUserAsset";
import { useAssetsStore } from "../../store/useAssetsStore";

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

const CATEGORY_FILTERS = ["All", "Business", "Finance", "City", "Technology", "People", "Abstract"];
const MY_ASSET_FILTERS = ["All", "Image", "Video"];
const GALLERY_TYPE_FILTERS = ["All", "Image", "Video"];

export default function AssetPicker({ onSelect, orientation, onClose }) {
  const [tab, setTab] = useState("upload");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [category, setCategory] = useState("All");
  const [myType, setMyType] = useState("All");
  const [galleryType, setGalleryType] = useState("All");

  const fileInputRef = useRef();

  const {
    myAssets = [],
    galleryAssets = [],
    loadMyAssets,
    loadGalleryAssets,
    addMyAsset,
    removeMyAsset,
  } = useAssetsStore();

  useEffect(() => {
    loadMyAssets();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

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

        const compressedBlob = await response.blob();

        file = new File([compressedBlob], `${crypto.randomUUID()}.mp4`, {
          type: "video/mp4",
        });
      }

      const asset = await uploadUserAsset(file);

      const newAsset = {
        id: asset.id,
        url: asset.url,
        type: asset.type,
        source: "user",
      };

      addMyAsset(newAsset);

      onSelect({ url: asset.url });
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
    removeMyAsset(asset.id);
    setDeletingId(null);
  };

  const renderPreview = (asset) => {
    const src = asset.thumbnail_url || asset.url;
    if (!src) return null;

    const isVideo = src.toLowerCase().endsWith(".mp4") || src.toLowerCase().endsWith(".webm");

    if (isVideo) {
      return <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
    }

    return <img src={src} alt="" className="h-full w-full object-cover" />;
  };

  const filteredGallery = galleryAssets
    .filter((a) => {
      if (galleryType === "All") return true;
      if (galleryType === "Image") return a.type === "image";
      if (galleryType === "Video") return a.type === "video";
      return true;
    })
    .filter((a) => {
      if (category === "All") return true;
      return a.category && a.category.toLowerCase() === category.toLowerCase();
    });

  const filteredMyAssets = myAssets
    .filter((a) => {
      const url = (a.url || "").toLowerCase();

      if (
        url.endsWith(".mp3") ||
        url.endsWith(".wav") ||
        url.endsWith(".m4a") ||
        url.endsWith(".aac") ||
        url.endsWith(".ogg")
      ) {
        return false;
      }

      return true;
    })
    .filter((a) => {
      if (myType === "All") return true;
      if (myType === "Image") return a.type === "image";
      if (myType === "Video") return a.type === "video";
      return true;
    });

  const activeAssets = tab === "my" ? filteredMyAssets : tab === "gallery" ? filteredGallery : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[85vh] w-[1000px] flex-col rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-semibold">Select Asset</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="mb-4 flex gap-6 pb-2">
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
              className={`px-5 py-1 text-base rounded ${
                tab === t.key ? "font-semibold text-white bg-purple-700" : "text-gray-700 border border-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "gallery" && (
          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-2">
              {GALLERY_TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setGalleryType(f)}
                  className={`px-3 py-1 text-sm rounded border ${
                    galleryType === f ? "bg-purple-700 text-white" : "bg-white text-gray-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 text-sm rounded border ${
                    category === c ? "bg-purple-700 text-white" : "bg-white text-gray-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "my" && (
          <div className="mb-4 flex gap-2">
            {MY_ASSET_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setMyType(f)}
                className={`px-3 py-1 text-sm rounded border ${
                  myType === f ? "bg-purple-700 text-white" : "bg-white text-gray-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {tab === "upload" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              className="rounded bg-indigo-600 px-6 py-3 text-white"
            >
              {uploading ? "Uploading..." : "Choose File"}
            </button>

            <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />
          </div>
        )}

        {tab === "background" && (
          <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto">
            {BACKGROUND_PRESETS.map((bg) => (
              <div
                key={bg.id}
                onClick={() => {
                  onSelect({
                    type: "background",
                    ...bg.value,
                  });
                  onClose();
                }}
                className="aspect-video cursor-pointer rounded border"
                style={bg.value.color ? { background: bg.value.color } : { background: bg.value.gradient }}
              />
            ))}
          </div>
        )}

        {(tab === "my" || tab === "gallery") && (
          <div className="grid grid-cols-3 gap-4 overflow-y-auto content-start">
            {activeAssets.map((asset) => (
              <div
                key={asset.id}
                className="relative cursor-pointer overflow-hidden rounded-xl border hover:border-indigo-500 min-h-[200px]"
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
          </div>
        )}
      </div>
    </div>
  );
}