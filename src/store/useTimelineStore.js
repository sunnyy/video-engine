import { create } from "zustand";
import { interpolateKeyframes } from "../ui/TimelineEditor/keyframeUtils";

const MAX_HISTORY = 50;

function pushHistory(history, project) {
  const snap = JSON.parse(JSON.stringify(project));
  const next = [...history, snap];
  if (next.length > MAX_HISTORY) next.shift();
  return next;
}

export const useTimelineStore = create((set, get) => ({
  // Project
  project: null,
  projectId: null,

  // Playback
  currentTime: 0,
  isPlaying: false,
  duration: 30,

  // Selection
  selectedLayerId: null,

  // Timeline UI
  zoom: 1,
  snapEnabled: true,

  // History
  _history: [],
  _future: [],

  // Pending uploads: layerId → File (blob URLs awaiting upload on save)
  pendingFiles: {},

  // ── Project actions ──────────────────────────────────────────
  setProject: (project) => {
    set({
      project,
      duration: project?.format?.duration ?? 30,
      currentTime: 0,
      isPlaying: false,
      selectedLayerId: null,
      _history: [],
      _future: [],
    });
  },

  setProjectId: (id) => set({ projectId: id }),

  // Update root-level project fields (name, format) with history
  updateProject: (patch) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const newProject = { ...project, ...patch };
    if (patch.format?.duration !== undefined) {
      set({ project: newProject, _history: newHistory, _future: [], duration: patch.format.duration });
    } else {
      set({ project: newProject, _history: newHistory, _future: [] });
    }
    return newProject;
  },

  // ── Layer actions ────────────────────────────────────────────
  updateLayer: (layerId, patch) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const newProject = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId ? { ...l, ...patch } : l
      ),
    };
    set({ project: newProject, _history: newHistory, _future: [] });
    return newProject;
  },

  // Silent update (no history) — use during drag
  updateLayerSilent: (layerId, patch) => {
    const { project } = get();
    if (!project) return;
    const newProject = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId ? { ...l, ...patch } : l
      ),
    };
    set({ project: newProject });
    return newProject;
  },

  addLayer: (layer) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    // Ensure every layer belongs to a track (defaults to its own id)
    const l = layer.trackId ? layer : { ...layer, trackId: layer.id };
    const newProject = { ...project, layers: [...project.layers, l] };
    set({
      project: newProject,
      _history: newHistory,
      _future: [],
      selectedLayerId: l.id,
    });
  },

  removeLayer: (layerId) => {
    const { project, _history, selectedLayerId } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const newProject = {
      ...project,
      layers: project.layers.filter((l) => l.id !== layerId),
    };
    set({
      project: newProject,
      _history: newHistory,
      _future: [],
      selectedLayerId: selectedLayerId === layerId ? null : selectedLayerId,
    });
  },

  duplicateLayer: (layerId) => {
    const { project, _history } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newHistory = pushHistory(_history, project);
    const clone = {
      ...JSON.parse(JSON.stringify(layer)),
      id: crypto.randomUUID(),
      name: layer.name + " copy",
    };
    const newProject = { ...project, layers: [...project.layers, clone] };
    set({
      project: newProject,
      _history: newHistory,
      _future: [],
      selectedLayerId: clone.id,
    });
  },

  reorderLayers: (fromIndex, toIndex) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const layers = [...project.layers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    const newLayers = layers.map((l, i) => ({ ...l, zIndex: i + 1 }));
    set({ project: { ...project, layers: newLayers }, _history: newHistory, _future: [] });
  },

  bringForward: (layerId) => {
    const { project, _history } = get();
    if (!project) return;
    const layers = [...project.layers];
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx < 0 || idx >= layers.length - 1) return;
    const newHistory = pushHistory(_history, project);
    [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
    const newLayers = layers.map((l, i) => ({ ...l, zIndex: i + 1 }));
    set({ project: { ...project, layers: newLayers }, _history: newHistory, _future: [] });
  },

  sendBack: (layerId) => {
    const { project, _history } = get();
    if (!project) return;
    const layers = [...project.layers];
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx <= 0) return;
    const newHistory = pushHistory(_history, project);
    [layers[idx], layers[idx - 1]] = [layers[idx - 1], layers[idx]];
    const newLayers = layers.map((l, i) => ({ ...l, zIndex: i + 1 }));
    set({ project: { ...project, layers: newLayers }, _history: newHistory, _future: [] });
  },

  moveClipToTrack: (layerId, targetTrackId) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const newLayers = project.layers.map((l) =>
      l.id === layerId ? { ...l, trackId: targetTrackId } : l
    );
    set({ project: { ...project, layers: newLayers }, _history: newHistory, _future: [] });
  },

  reorderTrackGroups: (orderedTrackIds) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const byTrack = new Map();
    for (const layer of project.layers) {
      const tid = layer.trackId ?? layer.id;
      if (!byTrack.has(tid)) byTrack.set(tid, []);
      byTrack.get(tid).push(layer);
    }
    const newLayers = [];
    for (const tid of orderedTrackIds) {
      const group = byTrack.get(tid);
      if (group) newLayers.push(...group);
    }
    for (const layer of project.layers) {
      if (!newLayers.find((l) => l.id === layer.id)) newLayers.push(layer);
    }
    const withZIndex = newLayers.map((l, i) => ({ ...l, zIndex: i + 1 }));
    set({ project: { ...project, layers: withZIndex }, _history: newHistory, _future: [] });
  },

  // ── Selection ────────────────────────────────────────────────
  selectLayer: (layerId) => set({ selectedLayerId: layerId }),

  // ── Playback ─────────────────────────────────────────────────
  setCurrentTime: (time) => {
    const { duration } = get();
    set({ currentTime: Math.max(0, Math.min(duration, time)) });
  },

  setIsPlaying: (bool) => set({ isPlaying: bool }),

  // ── Timeline UI ──────────────────────────────────────────────
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  setSnapEnabled: (snap) => set({ snapEnabled: snap }),

  // ── History ──────────────────────────────────────────────────
  undo: () => {
    const { project, _history, _future } = get();
    if (!_history.length) return;
    const prev = _history[_history.length - 1];
    const newHist = _history.slice(0, -1);
    const newFut = project
      ? [JSON.parse(JSON.stringify(project)), ..._future]
      : _future;
    set({ project: prev, _history: newHist, _future: newFut });
  },

  redo: () => {
    const { project, _history, _future } = get();
    if (!_future.length) return;
    const next = _future[0];
    const newFut = _future.slice(1);
    const newHist = project
      ? [..._history, JSON.parse(JSON.stringify(project))]
      : _history;
    set({ project: next, _history: newHist, _future: newFut });
  },

  // ── Keyframes ────────────────────────────────────────────────
  addKeyframe: (layerId, property, time, value) => {
    const { project, _history } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newHistory = pushHistory(_history, project);
    const existing = layer.keyframes?.[property] ?? [];
    const dupIdx = existing.findIndex((kf) => Math.abs(kf.time - time) < 0.001);
    const newFrames = dupIdx >= 0
      ? existing.map((kf, i) => i === dupIdx ? { ...kf, value } : kf)
      : [...existing, { time, value }].sort((a, b) => a.time - b.time);
    const newProject = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId
          ? { ...l, keyframes: { ...l.keyframes, [property]: newFrames } }
          : l
      ),
    };
    set({ project: newProject, _history: newHistory, _future: [] });
  },

  removeKeyframe: (layerId, property, index) => {
    const { project, _history, currentTime } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newHistory = pushHistory(_history, project);
    const sorted = [...(layer.keyframes?.[property] ?? [])].sort((a, b) => a.time - b.time);
    sorted.splice(index, 1);

    // When removing the last keyframe for this property, write its resolved value
    // back to the base transform so the layer doesn't jump to a stale/garbage position.
    let transformPatch = {};
    if (sorted.length === 0) {
      const localTime = Math.max(0, currentTime - layer.start);
      const oldArr = [...(layer.keyframes?.[property] ?? [])].sort((a, b) => a.time - b.time);
      const resolved = interpolateKeyframes(oldArr, localTime);
      if (resolved !== null) transformPatch[property] = resolved;
    }

    const newProject = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId
          ? {
              ...l,
              keyframes: { ...l.keyframes, [property]: sorted },
              transform: { ...l.transform, ...transformPatch },
            }
          : l
      ),
    };
    set({ project: newProject, _history: newHistory, _future: [] });
  },

  updateKeyframe: (layerId, property, index, patch) => {
    const { project, _history } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newHistory = pushHistory(_history, project);
    const sorted = [...(layer.keyframes?.[property] ?? [])].sort((a, b) => a.time - b.time);
    sorted[index] = { ...sorted[index], ...patch };
    sorted.sort((a, b) => a.time - b.time);
    const newProject = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId
          ? { ...l, keyframes: { ...l.keyframes, [property]: sorted } }
          : l
      ),
    };
    set({ project: newProject, _history: newHistory, _future: [] });
  },

  // ── Pending file uploads ─────────────────────────────────────
  addPendingFile: (layerId, file) =>
    set((s) => ({ pendingFiles: { ...s.pendingFiles, [layerId]: file } })),

  clearPendingFile: (layerId) =>
    set((s) => {
      const { [layerId]: _, ...rest } = s.pendingFiles;
      return { pendingFiles: rest };
    }),

  // ── Split ────────────────────────────────────────────────────
  splitLayerAtPlayhead: () => {
    const { project, _history, selectedLayerId, currentTime } = get();
    if (!project || !selectedLayerId) return;
    const layer = project.layers.find((l) => l.id === selectedLayerId);
    if (!layer) return;
    if (currentTime <= layer.start || currentTime >= layer.end) return;

    const newHistory = pushHistory(_history, project);
    // Resolve trackId now — if the layer pre-dates the trackId field it will be
    // undefined on the clone, causing each clip to fall back to its own id and
    // land on separate rows. Stamp both parts with the same resolved value.
    const trackId = layer.trackId ?? layer.id;
    const origTrimStart = layer.trimStart ?? 0;
    const origTrimEnd   = layer.trimEnd   ?? layer.end - layer.start;
    // The source position at the cut point (how far into the media file the split happens)
    const splitSourceTime = origTrimStart + (currentTime - layer.start);

    const leftPart = {
      ...JSON.parse(JSON.stringify(layer)),
      end: currentTime,
      trackId,
      trimEnd: splitSourceTime,
    };
    const rightPart = {
      ...JSON.parse(JSON.stringify(layer)),
      id: crypto.randomUUID(),
      trackId,
      start: currentTime,
      trimStart: splitSourceTime,
      trimEnd: origTrimEnd,
    };

    const layers = project.layers.map((l) =>
      l.id === selectedLayerId ? leftPart : l
    );
    layers.splice(
      layers.findIndex((l) => l.id === selectedLayerId) + 1,
      0,
      rightPart
    );

    set({
      project: { ...project, layers },
      _history: newHistory,
      _future: [],
      selectedLayerId: rightPart.id,
    });
  },
}));
