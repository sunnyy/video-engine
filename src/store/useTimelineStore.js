import { create } from "zustand";
import { interpolateKeyframes } from "../ui/TimelineEditor/keyframeUtils";

const MAX_HISTORY = 50;

function recalcDuration(layers) {
  const furthest = layers.reduce((max, l) => Math.max(max, l.end || 0), 0);
  return Math.max(5, furthest);
}

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
  selectedLayerIds: [],

  // Timeline UI
  zoom: 1,
  snapEnabled: true,
  playbackSpeed: 1,

  // History
  _history: [],
  _future: [],
  // Keyframe coalescing: consecutive addKeyframe calls on the same layer within
  // 800ms share one history entry so a single Ctrl+Z undoes the whole batch.
  _kfCoalesceLayerId: null,
  _kfCoalesceTs: 0,

  // Pending uploads: layerId → File (blob URLs awaiting upload on save)
  pendingFiles: {},

  // ── Project actions ──────────────────────────────────────────
  setProject: (project) => {
    // Migrate old typography video layers that have stackLayout:true
    const migratedLayers = (project?.layers ?? []).map((l) => {
      if (!l.stackLayout || l.type !== "text") return l;
      const fontSize  = l.style?.fontSize ?? 120;
      const charCount = (l.content || "").replace(/\s+/g, "").length || 1;
      const layerW    = Math.min(960, Math.round(fontSize * charCount * 0.58));
      const layerH    = Math.round(fontSize * 1.4);
      const { stackLayout: _dropped, ...rest } = l;
      return { ...rest, transform: { ...rest.transform, x: 0, y: 0, width: layerW, height: layerH } };
    });
    const migratedProject = project ? { ...project, layers: migratedLayers } : project;

    const layers = migratedProject?.layers ?? [];
    const newDuration = layers.length > 0
      ? recalcDuration(layers)
      : (project?.format?.duration ?? 30);
    const newProject = migratedProject
      ? { ...migratedProject, format: { ...migratedProject.format, duration: newDuration } }
      : migratedProject;
    set({
      project: newProject,
      duration: newDuration,
      currentTime: 0,
      isPlaying: false,
      selectedLayerId: null,
      selectedLayerIds: [],
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
    const newLayers = project.layers.map((l) => l.id === layerId ? { ...l, ...patch } : l);
    const newDuration = recalcDuration(newLayers);
    const newProject = {
      ...project,
      layers: newLayers,
      format: { ...project.format, duration: newDuration },
    };
    set({ project: newProject, _history: newHistory, _future: [], duration: newDuration });
    return newProject;
  },

  // Commit a drag: pushes preDragProject as the undo point, applies patch to current project.
  // Prevents the double-undo problem where updateLayer would push the already-dragged state.
  commitDrag: (layerId, patch, preDragProject) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, preDragProject);
    const newLayers = project.layers.map((l) => l.id === layerId ? { ...l, ...patch } : l);
    const newDuration = recalcDuration(newLayers);
    const newProject = {
      ...project,
      layers: newLayers,
      format: { ...project.format, duration: newDuration },
    };
    set({ project: newProject, _history: newHistory, _future: [], duration: newDuration });
    return newProject;
  },

  // Silent update (no history) — use during drag
  updateLayerSilent: (layerId, patch) => {
    const { project } = get();
    if (!project) return;
    const newLayers = project.layers.map((l) => l.id === layerId ? { ...l, ...patch } : l);
    const newDuration = recalcDuration(newLayers);
    const newProject = {
      ...project,
      layers: newLayers,
      format: { ...project.format, duration: newDuration },
    };
    set({ project: newProject, duration: newDuration });
    return newProject;
  },

  addLayer: (layer) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const l = layer.trackId ? layer : { ...layer, trackId: layer.id };
    const newLayers = [...project.layers, l];
    const newDuration = recalcDuration(newLayers);
    const newProject = {
      ...project,
      layers: newLayers,
      format: { ...project.format, duration: newDuration },
    };
    set({ project: newProject, _history: newHistory, _future: [], selectedLayerId: l.id, duration: newDuration });
  },

  removeLayer: (layerId) => {
    const { project, _history, selectedLayerId } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const newLayers = project.layers.filter((l) => l.id !== layerId);
    const newDuration = recalcDuration(newLayers);
    const newProject = {
      ...project,
      layers: newLayers,
      format: { ...project.format, duration: newDuration },
    };
    set({
      project: newProject,
      _history: newHistory,
      _future: [],
      selectedLayerId: selectedLayerId === layerId ? null : selectedLayerId,
      duration: newDuration,
    });
  },

  duplicateLayer: (layerId) => {
    const { project, _history } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newHistory = pushHistory(_history, project);
    const newId = crypto.randomUUID();
    const duration = layer.end - layer.start;
    const clone = {
      ...JSON.parse(JSON.stringify(layer)),
      id: newId,
      trackId: newId,
      start: layer.end,
      end: layer.end + duration,
      name: layer.name + " copy",
    };
    const newLayers = [...project.layers, clone];
    const newDuration = recalcDuration(newLayers);
    const newProject = {
      ...project,
      layers: newLayers,
      format: { ...project.format, duration: newDuration },
    };
    set({ project: newProject, _history: newHistory, _future: [], selectedLayerId: clone.id, duration: newDuration });
  },

  reorderLayers: (fromIndex, toIndex) => {
    const { project, _history } = get();
    if (!project) return;
    const newHistory = pushHistory(_history, project);
    const layers = [...project.layers];
    const [moved] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, moved);
    const newLayers = layers.map((l, i) => ({ ...l, zIndex: i + 1 }));
    const newDuration = recalcDuration(newLayers);
    const newProject = { ...project, layers: newLayers, format: { ...project.format, duration: newDuration } };
    set({ project: newProject, _history: newHistory, _future: [], duration: newDuration });
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
    const newDuration = recalcDuration(newLayers);
    const newProject = { ...project, layers: newLayers, format: { ...project.format, duration: newDuration } };
    set({ project: newProject, _history: newHistory, _future: [], duration: newDuration });
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
    const withZIndex = newLayers.map((l, i) => ({ ...l, zIndex: newLayers.length - i }));
    set({ project: { ...project, layers: withZIndex }, _history: newHistory, _future: [] });
  },

  // ── Selection ────────────────────────────────────────────────
  selectLayer: (layerId) => set({ selectedLayerId: layerId, selectedLayerIds: [] }),

  toggleLayerSelection: (layerId) => {
    const { selectedLayerIds, selectedLayerId } = get();
    // Start multi-select from the primary selected layer if needed
    const base = selectedLayerId && !selectedLayerIds.includes(selectedLayerId)
      ? [selectedLayerId]
      : [...selectedLayerIds];
    const next = base.includes(layerId)
      ? base.filter((id) => id !== layerId)
      : [...base, layerId];
    set({ selectedLayerIds: next });
  },

  alignSelectedLayers: (type) => {
    const { project, _history, selectedLayerIds } = get();
    if (!project || selectedLayerIds.length < 2) return;
    const canvasW = project.format?.width ?? 1080;
    const canvasH = project.format?.height ?? 1920;
    const layers = project.layers.filter((l) => selectedLayerIds.includes(l.id));

    const leftEdge  = (l) => canvasW / 2 + (l.transform?.x ?? 0) - (l.transform?.width ?? 100) / 2;
    const rightEdge = (l) => canvasW / 2 + (l.transform?.x ?? 0) + (l.transform?.width ?? 100) / 2;
    const topEdge   = (l) => canvasH / 2 + (l.transform?.y ?? 0) - (l.transform?.height ?? 100) / 2;
    const botEdge   = (l) => canvasH / 2 + (l.transform?.y ?? 0) + (l.transform?.height ?? 100) / 2;

    const minLeft   = Math.min(...layers.map(leftEdge));
    const maxRight  = Math.max(...layers.map(rightEdge));
    const minTop    = Math.min(...layers.map(topEdge));
    const maxBot    = Math.max(...layers.map(botEdge));
    const centerX   = (minLeft + maxRight) / 2;
    const centerY   = (minTop + maxBot) / 2;

    const getNewTransform = (l) => {
      const w = l.transform?.width ?? 100;
      const h = l.transform?.height ?? 100;
      switch (type) {
        case "left":     return { x: minLeft  - canvasW / 2 + w / 2 };
        case "right":    return { x: maxRight - canvasW / 2 - w / 2 };
        case "centerH":  return { x: centerX  - canvasW / 2 };
        case "top":      return { y: minTop   - canvasH / 2 + h / 2 };
        case "bottom":   return { y: maxBot   - canvasH / 2 - h / 2 };
        case "centerV":  return { y: centerY  - canvasH / 2 };
        default: return {};
      }
    };

    const newHistory = pushHistory(_history, project);
    const newLayers = project.layers.map((l) => {
      if (!selectedLayerIds.includes(l.id)) return l;
      return { ...l, transform: { ...l.transform, ...getNewTransform(l) } };
    });
    set({ project: { ...project, layers: newLayers }, _history: newHistory, _future: [] });
  },

  // ── Playback ─────────────────────────────────────────────────
  setCurrentTime: (time) => {
    const { duration } = get();
    set({ currentTime: Math.max(0, Math.min(duration, time)) });
  },

  setIsPlaying: (bool) => set({ isPlaying: bool }),

  // ── Timeline UI ──────────────────────────────────────────────
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  setSnapEnabled: (snap) => set({ snapEnabled: snap }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  // ── History ──────────────────────────────────────────────────
  undo: () => {
    const { project, _history, _future } = get();
    if (!_history.length) return;
    const prev = _history[_history.length - 1];
    const newHist = _history.slice(0, -1);
    const newFut = project
      ? [JSON.parse(JSON.stringify(project)), ..._future]
      : _future;
    const prevDuration = recalcDuration(prev?.layers ?? []);
    set({ project: prev, _history: newHist, _future: newFut, _kfCoalesceLayerId: null, _kfCoalesceTs: 0, duration: prevDuration });
  },

  redo: () => {
    const { project, _history, _future } = get();
    if (!_future.length) return;
    const next = _future[0];
    const newFut = _future.slice(1);
    const newHist = project
      ? [..._history, JSON.parse(JSON.stringify(project))]
      : _history;
    const nextDuration = recalcDuration(next?.layers ?? []);
    set({ project: next, _history: newHist, _future: newFut, _kfCoalesceLayerId: null, _kfCoalesceTs: 0, duration: nextDuration });
  },

  // ── Keyframes ────────────────────────────────────────────────
  addKeyframe: (layerId, property, time, value) => {
    const { project, _history, _kfCoalesceLayerId, _kfCoalesceTs } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const now = Date.now();
    const coalesce = _kfCoalesceLayerId === layerId && (now - _kfCoalesceTs) < 800;
    const newHistory = coalesce ? _history : pushHistory(_history, project);
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
    set({ project: newProject, _history: newHistory, _future: [], _kfCoalesceLayerId: layerId, _kfCoalesceTs: now });
  },

  removeKeyframesAtTime: (layerId, time) => {
    const { project, _history } = get();
    if (!project) return;
    const layer = project.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const newHistory = pushHistory(_history, project);
    const newKeyframes = {};
    for (const [prop, arr] of Object.entries(layer.keyframes ?? {})) {
      newKeyframes[prop] = (arr ?? []).filter((kf) => Math.abs(kf.time - time) >= 0.001);
    }
    const newProject = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === layerId ? { ...l, keyframes: newKeyframes } : l
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

    const newDuration = recalcDuration(layers);
    set({
      project: { ...project, layers, format: { ...project.format, duration: newDuration } },
      _history: newHistory,
      _future: [],
      selectedLayerId: rightPart.id,
      duration: newDuration,
    });
  },
}));
