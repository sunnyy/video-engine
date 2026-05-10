import { create } from "zustand";
import { getUserProjects } from "../services/projects/projectService";

export const useProjectsStore = create((set, get) => ({
  projects: [],
  loading:  false,
  fetched:  false,

  /** Fetch from server only if not already loaded. Pass force=true to bypass the guard. */
  fetchProjects: async (force = false) => {
    if (!force && get().fetched) return;
    set({ loading: true });
    try {
      const projects = await getUserProjects();
      set({ projects, loading: false, fetched: true });
    } catch {
      set({ loading: false });
    }
  },

  /** Optimistically remove a project from the list after deletion. */
  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter(p => p.id !== id) })),

  /** Force a fresh fetch on next call to fetchProjects. */
  invalidate: () => set({ fetched: false }),
}));
