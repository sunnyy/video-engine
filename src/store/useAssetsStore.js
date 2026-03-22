import { create } from "zustand";
import { supabase } from "../lib/supabase";

export const useAssetsStore = create((set, get) => ({
  myAssets: [],
  galleryAssets: [],

  loadedMy: false,
  loadedGallery: false,

  loadMyAssets: async () => {
    if (get().loadedMy) return;

    const { data } = await supabase.from("user_assets").select("*").order("created_at", { ascending: false });

    const assets =
      data
        ?.filter((a) => {
          if (!a.type) return false;

          if (a.type === "audio") return false;
          if (a.type === "avatar") return false;
          if (a.type === "tts") return false;

          return true;
        })
        .map((a) => ({
          id: a.id,
          url: a.url,
          type: a.type,
          source: "user",
        })) || [];

    set({
      myAssets: assets,
      loadedMy: true,
    });
  },

  loadGalleryAssets: async (orientation = "9:16") => {
    const { data } = await supabase.from("assets_library").select("*");

    const assets =
      data?.map((a) => ({
        id: a.id,
        url: a.url,
        thumbnail_url: a.thumbnail_url,
        type: a.type,
        category: a.category,
        title: a.title,
        source: "library",
      })) || [];

    set({
      galleryAssets: assets,
      loadedGallery: true,
    });
  },

  addMyAsset: (asset) => {
    const current = get().myAssets;

    set({
      myAssets: [asset, ...current],
    });
  },

  removeMyAsset: (id) => {
    const current = get().myAssets;

    set({
      myAssets: current.filter((a) => a.id !== id),
    });
  },
}));
