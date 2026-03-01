import { create } from "zustand";
import { buildSafeProject } from "../normalize/normalizeProject";
import { calculateTimeline } from "../core/calculateTimeline";
import { getPacingProfile } from "../core/pacingProfiles";
import { generateCaptionSegments } from "../core/captionTimingEngine";
import { updateProject } from "../services/projects/projectService";

function createRawBeat(order, mode) {
  return {
    id: crypto.randomUUID(),
    beat_type: "content",
    visual_mode: mode === "talking_head" ? "split" : "full",
    duration_sec: 3,
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
      segments: [],
    },
    transition: {
      type: "cut",
      duration: 0.3,
    },
    components: [],
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
      segments: generateCaptionSegments(beat.spoken || "", duration),
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

  updateBeat: async (beatId, updates) => {
    const current = get().project;
    const databaseId = get().databaseId;

    if (!current || !databaseId) return;

    const pacingProfile = getPacingProfile("normal");

    const updatedBeats = current.beats.map((beat) => {
      if (beat.id !== beatId) return beat;

      let updated = { ...beat, ...updates };

      if (updates.spoken !== undefined) {
        updated = recalcBeatTiming(updated, pacingProfile);
      }

      if (updates.assetAttach) {
        updated = {
          ...updated,
          assets: {
            ...updated.assets,
            [updates.zone || "main"]: {
              id: updates.assetAttach.id,
              source: updates.assetAttach.source,
              url: updates.assetAttach.url,
              type: updates.assetAttach.type,
            },
          },
        };
      }

      return updated;
    });

    const updatedProject = calculateTimeline({
      ...current,
      beats: updatedBeats,
    });

    set({ project: updatedProject });

    // 🔥 Persist to DB
    await updateProject(databaseId, updatedProject);
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

    const updatedProject = calculateTimeline({
      ...current,
      beats: [...current.beats, newBeat],
    });

    set({
      project: updatedProject,
      activeBeatId: newBeat.id,
    });
  },

  deleteBeat: (beatId) => {
    const current = get().project;
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
  },
}));
