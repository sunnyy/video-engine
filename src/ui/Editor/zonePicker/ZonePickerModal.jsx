import React, { useState, useEffect, useRef, useMemo } from "react";
import { uploadUserAsset } from "../../../services/assets/uploadUserAsset";
import { deleteUserAsset } from "../../../services/assets/deleteUserAsset";
import { useAssetsStore } from "../../../store/useAssetsStore";

import MyAssetsTab from "./tabs/MyAssetsTab";
import GalleryTab from "./tabs/GalleryTab";
import BlocksTab from "./tabs/BlocksTab";
import ColorsTab from "./tabs/ColorsTab";

export default function ZonePickerModal({
  onSelect,
  onClose,
  orientation,
  mode,
  allowedTabs
}) {

  const normalizeAsset = (a) => {

    if (!a) return;

    if (a.url) {
      onSelect({ url:a.url });
      return;
    }

    if (a.asset?.src) {
      onSelect({ url:a.asset.src });
      return;
    }

    if (a.src) {
      onSelect({ url:a.src });
      return;
    }

  };

  const defaultTabs = ["assets","gallery","blocks","colors"];
  const activeTabs = allowedTabs || defaultTabs;

  const tabKeyMap = {
    assets:"my",
    gallery:"gallery",
    blocks:"blocks",
    colors:"colors"
  };

  const initialTab = tabKeyMap[activeTabs[0]] || "my";

  const [tab,setTab] = useState(initialTab);
  const [category,setCategory] = useState("All");
  const [myType,setMyType] = useState("All");
  const [galleryType,setGalleryType] = useState("All");
  const [deletingId,setDeletingId] = useState(null);

  const fileInputRef = useRef();

  const {
    myAssets=[],
    galleryAssets=[],
    loadMyAssets,
    loadGalleryAssets,
    addMyAsset,
    removeMyAsset
  } = useAssetsStore();

  useEffect(()=>{ loadMyAssets(); },[]);

  const renderPreview = (asset) => {

    const src = asset.thumbnail_url || asset.url;
    if (!src) return null;

    const isVideo =
      src.toLowerCase().endsWith(".mp4") ||
      src.toLowerCase().endsWith(".webm");

    if (isVideo) {
      return (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      );
    }

    return (
      <img
        src={src}
        className="h-full w-full object-cover"
      />
    );

  };

  const handleDelete = async (asset) => {

    setDeletingId(asset.id);
    await deleteUserAsset(asset);
    removeMyAsset(asset.id);
    setDeletingId(null);

  };

  const handleUpload = async (e) => {

    let file = e.target.files[0];
    if (!file) return;

    const asset = await uploadUserAsset(file);

    addMyAsset({
      id:asset.id,
      url:asset.url,
      type:asset.type,
      source:"user"
    });

    normalizeAsset({ url:asset.url });
    onClose();

  };

  const tabs = useMemo(()=>{

    const all = [
      { key:"my", label:"My Assets", type:"assets" },
      { key:"gallery", label:"Gallery", type:"gallery" },
      { key:"blocks", label:"Elements", type:"blocks" },
      { key:"colors", label:"Colors", type:"colors" }
    ];

    return all.filter(t => {

      if (t.key==="blocks" && mode!=="content") return false;

      return activeTabs.includes(t.type);

    });

  },[activeTabs,mode]);

  const renderTab = () => {

    if (tab==="my") {

      return (
        <MyAssetsTab
          assets={myAssets}
          myType={myType}
          setMyType={setMyType}
          onSelect={(a)=>{

            normalizeAsset(a);
            onClose();

          }}
          onDelete={handleDelete}
          deletingId={deletingId}
          renderPreview={renderPreview}
        />
      );

    }

    if (tab==="gallery") {

      return (
        <GalleryTab
          assets={galleryAssets}
          category={category}
          setCategory={setCategory}
          galleryType={galleryType}
          setGalleryType={setGalleryType}
          onSelect={(a)=>{

            normalizeAsset(a);
            onClose();

          }}
          renderPreview={renderPreview}
        />
      );

    }

    if (tab==="blocks") {

      return (
        <BlocksTab
          onSelect={onSelect}
          onClose={onClose}
        />
      );

    }

    if (tab==="colors") {

      return (
        <ColorsTab
          onSelect={onSelect}
          onClose={onClose}
        />
      );

    }

  };

  return (

    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >

      <div
        className="bg-white w-[1000px] h-[85vh] rounded-lg p-6 flex flex-col"
        onClick={(e)=>e.stopPropagation()}
      >

        <div className="flex justify-between mb-4">

          <h3 className="text-lg font-semibold">
            Select Content
          </h3>

          <div className="flex gap-3">

            {activeTabs.includes("assets") && (
              <button
                onClick={()=>fileInputRef.current.click()}
                className="px-4 py-1 bg-indigo-600 text-white rounded text-sm"
              >
                + Add Asset
              </button>
            )}

            <button onClick={onClose}>✕</button>

          </div>

        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="flex gap-4 mb-4">

          {tabs.map((t)=>(
            <button
              key={t.key}
              onClick={()=>{

                setTab(t.key);

                if (t.key==="gallery") loadGalleryAssets();

              }}
              className={`px-4 py-1 rounded ${
                tab===t.key
                  ? "bg-purple-700 text-white"
                  : "border"
              }`}
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