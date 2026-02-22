import { create } from "zustand";
import { buildSafeProject } from "../normalize/normalizeProject";
import { calculateTimeline } from "../core/calculateTimeline";

function createRawBeat(order, mode) {
  return {
    beat_type: "default",
    visual_mode: mode === "talking_head" ? "split" : "full",
    duration_sec: 3,
    seekToBeat: null,
    spoken: "",
    visible: true,
    assets: {
      main: null,
      secondary: null,
    },
    caption: {
      show: true,
      style: "clean",
      position: "bottom",
      animation: "fade",
    },
    transition: {
      type: "cut",
      duration: 0.3,
    },
    components: [],
  };
}

export const useProjectStore = create((set, get) => ({
  project: null,
  activeBeatId: null,

  setProject: (rawProject) => {
    const safeProject = buildSafeProject(rawProject);

    set({
      project: safeProject,
      activeBeatId: safeProject.beats[0]?.id || null,
    });
  },

  updateProjectMeta: (updates) => {
    const current = get().project;
    if (!current) return;

    const rebuilt = buildSafeProject({
      ...current,
      ...updates,
    });

    set({ project: rebuilt });
  },

  setActiveBeat: (beatId) => {
    set({ activeBeatId: beatId });
  },

  updateBeat: (beatId, updates) => {
    const current = get().project;
    if (!current) return;

    const updatedBeats = current.beats.map((beat) => (beat.id === beatId ? { ...beat, ...updates } : beat));

    const rebuilt = buildSafeProject({
      ...current,
      beats: updatedBeats,
    });

    set({ project: rebuilt });
  },

  reorderBeats: (newBeats) => {
    const current = get().project;
    if (!current) return;

    const reordered = newBeats.map((beat, index) => ({
      ...beat,
      order: index,
    }));

    const updatedProject = calculateTimeline({
      ...current,
      beats: reordered,
    });

    set({ project: updatedProject });
  },

  addBeat: () => {
    const current = get().project;
    if (!current) return;

    const newBeat = createRawBeat(current.beats.length, current.meta.mode);

    const rebuilt = buildSafeProject({
      ...current,
      beats: [...current.beats, newBeat],
    });

    set({
      project: rebuilt,
      activeBeatId: rebuilt.beats[rebuilt.beats.length - 1].id,
    });
  },

  deleteBeat: (beatId) => {
    const current = get().project;
    if (!current) return;

    const filtered = current.beats.filter((b) => b.id !== beatId);

    if (filtered.length === 0) return;

    const rebuilt = buildSafeProject({
      ...current,
      beats: filtered,
    });

    set({
      project: rebuilt,
      activeBeatId: rebuilt.beats[0].id,
    });
  },
}));
