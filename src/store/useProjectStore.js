import { create } from "zustand";
import { buildSafeProject } from "../normalize/normalizeProject";
import { calculateTimeline } from "../core/calculateTimeline";
import { getPacingProfile } from "../core/pacingProfiles";
import { updateProject } from "../services/projects/projectService";

function createRawBeat(order, mode) {
  return {
    id: crypto.randomUUID(),
    order,
    layout: "FullZone",

    zones: {
      z1: {
        type: mode === "talking_head" ? "avatar" : "asset",
        src: null,
        objectFit: "cover",
      },
    },

    asset_settings: {},

    heading: null,
    text: null,

    components: {},

    overlays: [],

    caption: {
      text: "",
      style: "wordBlaze",
      animation: "fade",
      position: "bottom",
    },

    transition: {
      type: "cut",
      duration: 0.3,
    },

    spoken: "",
    duration_sec: 3,
    start_sec: 0,
    end_sec: 0,
  };
}

function recalcBeatTiming(beat, pacingProfile) {
  const words = beat.spoken?.trim().split(/\s+/).filter(Boolean).length || 0;

  const duration = Math.max(
    pacingProfile.min_duration,
    Math.min(pacingProfile.max_duration, words / pacingProfile.words_per_second || pacingProfile.min_duration),
  );

  return {
    ...beat,
    duration_sec: duration,
    caption: {
      ...beat.caption,
      text: beat.spoken || "",
    },
  };
}

export const useProjectStore = create((set, get) => ({
  project: null,
  activeBeatId: null,
  databaseId: null,

  setDatabaseId: (id) => set({ databaseId: id }),

  setProject: (rawProject) => {
    const safeProject = buildSafeProject(rawProject);

    set({
      project: safeProject,
      activeBeatId: safeProject.beats?.[0]?.id || null,
    });
  },

  updateProjectMeta: async (updates) => {
    const current = get().project;
    const databaseId = get().databaseId;

    if (!current) return;

    let newMeta = current.meta;

    if (updates.meta) {
      newMeta = {
        ...current.meta,
        ...updates.meta,
      };
    }

    const rebuilt = {
      ...current,
      ...updates,
      meta: newMeta,
    };

    if (updates.meta?.mode) {
      const mode = updates.meta.mode;

      rebuilt.beats = current.beats.map((beat) => ({
        ...beat,
        zones: {
          ...beat.zones,
          z1: {
            ...beat.zones.z1,
            type: mode === "talking_head" ? "avatar" : "asset",
          },
        },
      }));
    }

    const safeProject = buildSafeProject(rebuilt);

    set({ project: safeProject });

    if (databaseId) {
      await updateProject(databaseId, safeProject);
    }
  },

  setActiveBeat: (beatId) => set({ activeBeatId: beatId }),

  updateBeat: async (beatId, updates) => {
    const current = get().project;
    const databaseId = get().databaseId;

    if (!current) return;

    const pacingProfile = getPacingProfile("normal");

    const updatedBeats = current.beats.map((beat) => {
      if (beat.id !== beatId) return beat;

      let updated = { ...beat, ...updates };

      if (updates.spoken !== undefined) {
        updated = recalcBeatTiming(updated, pacingProfile);
      }

      return updated;
    });

    const updatedProject = calculateTimeline({
      ...current,
      beats: updatedBeats,
    });

    set({ project: updatedProject });

    if (databaseId) {
      await updateProject(databaseId, updatedProject);
    }
  },

  addBeat: () => {
    const current = get().project;
    if (!current) return;

    const newBeat = createRawBeat(current.beats.length, current.meta.mode);

    const updatedProject = calculateTimeline({
      ...current,
      beats: [...current.beats, newBeat],
    });

    set({
      project: updatedProject,
      activeBeatId: newBeat.id,
    });
  },

  duplicateBeat: async (beatId) => {
    const current = get().project;
    const databaseId = get().databaseId;

    if (!current) return;

    const index = current.beats.findIndex((b) => b.id === beatId);
    if (index === -1) return;

    const original = current.beats[index];

    const cloned = JSON.parse(JSON.stringify(original));
    cloned.id = crypto.randomUUID();

    const newBeats = [...current.beats];
    newBeats.splice(index + 1, 0, cloned);

    const updatedProject = calculateTimeline({
      ...current,
      beats: newBeats,
    });

    set({
      project: updatedProject,
      activeBeatId: cloned.id,
    });

    if (databaseId) {
      await updateProject(databaseId, updatedProject);
    }
  },

  reorderBeats: async (newBeats) => {
    const current = get().project;
    const databaseId = get().databaseId;

    if (!current) return;

    const updatedProject = calculateTimeline({
      ...current,
      beats: newBeats,
    });

    set({
      project: updatedProject,
    });

    if (databaseId) {
      await updateProject(databaseId, updatedProject);
    }
  },

  deleteBeat: async (beatId) => {
    const current = get().project;
    const databaseId = get().databaseId;

    if (!current) return;

    const filtered = current.beats.filter((b) => b.id !== beatId);

    if (!filtered.length) return;

    const updatedProject = calculateTimeline({
      ...current,
      beats: filtered,
    });

    set({
      project: updatedProject,
      activeBeatId: filtered[0].id,
    });

    if (databaseId) {
      await updateProject(databaseId, updatedProject);
    }
  },
}));
