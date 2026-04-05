import { create } from "zustand";
import { supabase } from "../lib/supabase";

function normalizeOrientation(o) {
  if (o === "9:16") return "vertical";
  if (o === "16:9") return "horizontal";
  return o || "any";
}

export const useAssetsStore = create((set, get) => ({

  myAssets: [],
  galleryAssets: [],

  loadedMy: false,
  loadedGallery: false,

  loadMyAssets: async () => {

    if (get().loadedMy) return;

    const { data } = await supabase
      .from("user_assets")
      .select("*")
      .order("created_at", { ascending: false });

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
          orientation: a.orientation || "any",
          source: "user"
        })) || [];

    set({
      myAssets: assets,
      loadedMy: true
    });

  },

  loadGalleryAssets: async (orientation = "9:16") => {
    return false;

    const o = normalizeOrientation(orientation);

    const { data } = await supabase
      .from("assets_library")
      .select("*");

    const assets =
      data
        ?.filter((a) => {

          if (!o) return true;

          return (
            a.orientation === "any" ||
            a.orientation === o
          );

        })
        .map((a) => ({
          id: a.id,
          url: a.url,
          thumbnail_url: a.thumbnail_url,
          type: a.type,
          orientation: a.orientation,
          category: a.category,
          title: a.title,
          tags: a.tags || [],
          source: "library"
        })) || [];

    set({
      galleryAssets: assets,
      loadedGallery: true
    });

  },

  addMyAsset: (asset) => {

    const current = get().myAssets;

    set({
      myAssets: [asset, ...current]
    });

  },

  removeMyAsset: (id) => {

    const current = get().myAssets;

    set({
      myAssets: current.filter((a) => a.id !== id)
    });

  }

}));