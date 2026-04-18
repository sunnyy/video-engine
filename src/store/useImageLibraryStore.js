import { create } from "zustand";
import { serverFetch } from "../services/serverApi";

const PAGE_SIZE = 20;

export const useImageLibraryStore = create((set, get) => ({
  library:  [],
  total:    0,
  page:     1,
  loading:  false,
  fetched:  false,

  /**
   * Load image library.
   * reset=true  → fetch page 1, replace existing list (used on first load / after generation)
   * reset=false → fetch next page, append (load more)
   */
  loadLibrary: async (reset = false) => {
    const { loading, fetched, page } = get();
    if (loading) return;
    // Already loaded and not a reset → skip
    if (!reset && fetched && page === 1) return;

    const targetPage = reset ? 1 : page;
    const offset = (targetPage - 1) * PAGE_SIZE;

    set({ loading: true });
    try {
      const res  = await serverFetch(`/api/image-generation/library?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      const imgs  = data.images || [];
      const total = data.total  || 0;

      if (reset || targetPage === 1) {
        set({ library: imgs, page: 2, total, loading: false, fetched: true });
      } else {
        set((state) => ({
          library: [...state.library, ...imgs],
          page:    targetPage + 1,
          total,
          loading: false,
          fetched: true,
        }));
      }
    } catch {
      set({ loading: false });
    }
  },

  /** Prepend newly generated images so they appear immediately. */
  prependImages: (imgs) =>
    set((state) => ({
      library: [...imgs, ...state.library],
      total:   state.total + imgs.length,
    })),

  /** Remove a deleted image from the cached list. */
  removeImage: (id) =>
    set((state) => ({
      library: state.library.filter(img => img.id !== id),
      total:   Math.max(0, state.total - 1),
    })),

  /** Force a fresh fetch on next loadLibrary call. */
  invalidate: () => set({ fetched: false, library: [], page: 1, total: 0 }),
}));
