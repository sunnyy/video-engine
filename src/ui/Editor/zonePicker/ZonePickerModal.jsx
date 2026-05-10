/**
 * ZonePickerModal.jsx
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { uploadUserAsset }   from "../../../services/assets/uploadUserAsset";
import { deleteUserAsset }   from "../../../services/assets/deleteUserAsset";
import { useAssetsStore }    from "../../../store/useAssetsStore";
import { useProjectStore }   from "../../../store/useProjectStore";

import MyAssetsTab    from "./tabs/MyAssetsTab";
import GalleryTab     from "./tabs/GalleryTab";
import BlocksTab      from "./tabs/BlocksTab";
import ColorsTab      from "./tabs/ColorsTab";
import TextTab        from "./tabs/TextTab";
import IconsTab       from "./tabs/IconsTab";
import DecorativesTab from "./tabs/DecorativesTab";
import StickersTab    from "./tabs/StickersTab";

export default function ZonePickerModal({
  onSelect,
  onClose,
  orientation,
  mode,
  allowedTabs,
}) {
  const databaseId = useProjectStore(s => s.databaseId);

  const normalizeAsset = (a) => {
    if (!a) return;
    if (a.kind === "text" || a.kind === "block" || a.kind === "color") { onSelect(a); return; }
    if (a.kind === "asset") { onSelect(a); return; }
    if (a.url)       { onSelect({ url: a.url });       return; }
    if (a.asset?.src){ onSelect({ url: a.asset.src }); return; }
    if (a.src)       { onSelect({ url: a.src });       return; }
  };

  const defaultTabs  = ["assets", "gallery", "blocks", "colors", "icons", "decoratives", "stickers"];
  const activeTabs   = allowedTabs || defaultTabs;
  const tabKeyMap    = { assets: "my", gallery: "gallery", blocks: "blocks", colors: "colors", icons: "icons", decoratives: "decoratives", stickers: "stickers" };
  const initialTab   = tabKeyMap[activeTabs[0]] || "my";

  const [tab,        setTab]        = useState(initialTab);
  const [uploading,  setUploading]  = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef();

  const { myAssets = [], loadMyAssets, addMyAsset, removeMyAsset } = useAssetsStore();

  useEffect(() => { loadMyAssets(databaseId); }, [databaseId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const renderPreview = (asset) => {
    const src = asset.thumbnail_url || asset.url;
    if (!src) return null;
    const isVideo = /\.(mp4|webm)$/i.test(src);
    if (isVideo) {
      return <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
    }
    return <img src={src} className="h-full w-full object-contain" />;
  };

  const handleDelete = async (asset) => {
    setDeletingId(asset.id);
    await deleteUserAsset(asset);
    removeMyAsset(asset.id);
    setDeletingId(null);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadUserAsset(file, null, null, "project", databaseId);
      addMyAsset({
        id:         asset.id,
        url:        asset.url,
        file_path:  asset.file_path,
        type:       asset.type,
        name:       asset.name || file.name,
        size:       asset.size || file.size,
        scope:      "project",
        project_id: databaseId,
        source:     "user",
      });
      normalizeAsset({ url: asset.url });
      onClose();
    } catch (err) {
      console.error("[upload]", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const tabs = useMemo(() => {
    const all = [
      { key: "my",          label: "My Assets",   type: "assets"      },
      { key: "gallery",     label: "Free Stock",  type: "gallery"     },
      { key: "text",        label: "Text",        type: "text"        },
      { key: "blocks",      label: "Elements",    type: "blocks"      },
      { key: "colors",      label: "Colors",      type: "colors"      },
      { key: "icons",       label: "Icons",       type: "icons"       },
      { key: "decoratives", label: "Decoratives", type: "decoratives" },
      { key: "stickers",    label: "Stickers",    type: "stickers"    },
    ];
    return all.filter(t => activeTabs.includes(t.type));
  }, [activeTabs]);

  const renderTab = () => {
    if (tab === "my") {
      return (
        <MyAssetsTab
          assets={myAssets}
          onSelect={(a) => { normalizeAsset(a); onClose(); }}
          onDelete={handleDelete}
          deletingId={deletingId}
          renderPreview={renderPreview}
        />
      );
    }
    if (tab === "text")    return <TextTab    onSelect={(a) => { onSelect(a); onClose(); }} />;
    if (tab === "gallery") return <GalleryTab onSelect={(a) => { onSelect(a); onClose(); }} />;
    if (tab === "blocks")  return <BlocksTab  onSelect={onSelect} onClose={onClose} />;
    if (tab === "colors")  return <ColorsTab  onSelect={onSelect} onClose={onClose} />;
    if (tab === "icons")       return <IconsTab       onSelect={(a) => { onSelect(a); onClose(); }} />;
    if (tab === "decoratives") return <DecorativesTab onSelect={(a) => { onSelect(a); onClose(); }} />;
    if (tab === "stickers")    return <StickersTab    onSelect={(a) => { onSelect(a); onClose(); }} />;
  };

  return (
    <div data-modal className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-[#1c1c28] w-[1000px] h-[85vh] rounded-lg p-6 flex flex-col" onClick={e => e.stopPropagation()}>

        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold">Select Content</h3>
          <div className="flex gap-3">
            {activeTabs.includes("assets") && (
              <button
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                className="px-4 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Add Asset"}
              </button>
            )}
            <button onClick={onClose}>✕</button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" onChange={handleUpload} className="hidden" />

        <div className="flex gap-4 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1 rounded text-base ${tab === t.key ? "bg-purple-700 text-white" : "border"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>

      </div>
    </div>
  );
}
