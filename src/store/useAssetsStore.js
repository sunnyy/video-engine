import { create } from "zustand";
import { supabase } from "../lib/supabase";

export const useAssetsStore = create((set, get) => ({

  myAssets:         [],
  galleryAssets:    [],
  loadedForProject: null,   // project databaseId that was fetched this session
  loadedGallery:    false,

  // Load assets — no-op if already loaded this session for the same projectId.
  loadMyAssets: async (projectId) => {
    if (get().loadedForProject === projectId) return;

    const { data } = await supabase
      .from("user_assets")
      .select("*")
      .order("created_at", { ascending: false });

    const assets = (data || [])
      .filter(a => a.type && a.type !== "avatar" && a.type !== "tts")
      .map(a => ({
        id:          a.id,
        url:         a.url,
        file_path:   a.file_path,
        type:        a.type,
        name:        a.name        || a.url?.split("/").pop() || "asset",
        size:        a.size        || 0,
        scope:       a.scope       || "project",
        project_id:  a.project_id  ?? null,
        orientation: a.orientation || "any",
        source:      "user",
      }));

    set({ myAssets: assets, loadedForProject: projectId });
  },

  // Force a fresh reload for the given project (called after delete/upload if needed).
  reloadMyAssets: async (projectId) => {
    set({ loadedForProject: null });
    await get().loadMyAssets(projectId);
  },

  addMyAsset: (asset) => {
    set({ myAssets: [asset, ...get().myAssets] });
  },

  removeMyAsset: (id) => {
    set({ myAssets: get().myAssets.filter(a => a.id !== id) });
  },

  updateMyAsset: (id, patch) => {
    set({
      myAssets: get().myAssets.map(a => a.id === id ? { ...a, ...patch } : a),
    });
  },

  /* Gallery (currently disabled, kept for future use) */
  loadGalleryAssets: async () => { /* no-op */ },

}));
