import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTimelineStore } from "../../store/useTimelineStore";
import { interpolateKeyframes, resolveTransform, stepKeyframe } from "./keyframeUtils";

const DRAGGABLE_TYPES = new Set(["video", "image", "text", "sticker"]);
const MIN_SIZE = 20;
const HANDLE_HIT = 36;   // clickable area
const HANDLE_VIS = 28;   // visible square inside

// Each handle: wm/hm = width/height multiplier (how dx/dy affect size),
// xa/ya = fraction of delta applied to center position (always ±0.5 or 0).
// Derivation: the opposite corner/edge stays fixed, so center shifts by half the size change.
const HANDLE_CONFIGS = {
  nw: { wm: -1, hm: -1, xa: -0.5, ya: -0.5, cursor: "nw-resize", pl: "0%",   pt: "0%"   },
  n:  { wm:  0, hm: -1, xa:  0,   ya: -0.5, cursor: "n-resize",  pl: "50%",  pt: "0%"   },
  ne: { wm:  1, hm: -1, xa:  0.5, ya: -0.5, cursor: "ne-resize", pl: "100%", pt: "0%"   },
  e:  { wm:  1, hm:  0, xa:  0.5, ya:  0,   cursor: "e-resize",  pl: "100%", pt: "50%"  },
  se: { wm:  1, hm:  1, xa:  0.5, ya:  0.5, cursor: "se-resize", pl: "100%", pt: "100%" },
  s:  { wm:  0, hm:  1, xa:  0,   ya:  0.5, cursor: "s-resize",  pl: "50%",  pt: "100%" },
  sw: { wm: -1, hm:  1, xa: -0.5, ya:  0.5, cursor: "sw-resize", pl: "0%",   pt: "100%" },
  w:  { wm: -1, hm:  0, xa: -0.5, ya:  0,   cursor: "w-resize",  pl: "0%",   pt: "50%"  },
};


function resolvedObjectFit(layer, currentTime) {
  const localTime = Math.max(0, currentTime - layer.start);
  return stepKeyframe(layer.keyframes?.objectFit ?? [], localTime) ?? layer.objectFit ?? "cover";
}

// ── Transition helpers ────────────────────────────────────────────────────────

function buildTransitionEffect(type, p) {
  // p: 0 = just appeared, 1 = fully visible (entrance progress)
  switch (type) {
    case "fade":        return { opacity: p,     translateX: 0,           addBlur: 0,            scale: 1 };
    case "dissolve":    return { opacity: p,     translateX: 0,           addBlur: (1 - p) * 10, scale: 1 };
    case "slide-left":  return { opacity: 1,     translateX: -(1 - p) * 100, addBlur: 0,         scale: 1 };
    case "slide-right": return { opacity: 1,     translateX:  (1 - p) * 100, addBlur: 0,         scale: 1 };
    case "zoom":        return { opacity: p,     translateX: 0,           addBlur: 0,            scale: 0.5 + p * 0.5 };
    default:            return { opacity: 1,     translateX: 0,           addBlur: 0,            scale: 1 };
  }
}

// Returns { opacity, translateX, addBlur, scale } for a layer at the current playback time.
// Entrance effect only — applied at the start of the layer.
function getTransitionStyle(layer, currentTime) {
  const { type = "none", duration = 0.5 } = layer.transition ?? {};

  if (type === "none" || duration <= 0) return { opacity: 1, translateX: 0, addBlur: 0, scale: 1 };

  const transitionEnd = layer.start + duration;
  if (currentTime >= layer.start && currentTime < transitionEnd) {
    const p = (currentTime - layer.start) / duration;
    return buildTransitionEffect(type, Math.max(0, Math.min(1, p)));
  }

  return { opacity: 1, translateX: 0, addBlur: 0, scale: 1 };
}

// ── Video / Audio helpers ─────────────────────────────────────────────────────

// Seek to `time`, then call play() only after the browser finishes seeking.
// Returns a cleanup fn that removes the pending seeked listener.
function seekAndPlay(el, time, shouldPlay) {
  const handleSeeked = () => {
    el.removeEventListener('seeked', handleSeeked);
    if (shouldPlay) el.play().catch(() => {});
  };
  el.addEventListener('seeked', handleSeeked);
  el.currentTime = time;
  return () => el.removeEventListener('seeked', handleSeeked);
}

function VideoLayerEl({ layer, currentTime, isPlaying }) {
  const ref = useRef(null);
  const playing = useRef(false);
  const sourceTime = (layer.trimStart ?? 0) + (currentTime - layer.start);

  // Play/pause toggle
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isPlaying) {
      el.pause();
      el.currentTime = sourceTime;
      playing.current = false;
      return;
    }
    if (!playing.current) {
      playing.current = true;
      return seekAndPlay(el, sourceTime, true);
    }
  }, [isPlaying]);

  // Scrub to exact position while paused
  useEffect(() => {
    const el = ref.current;
    if (!el || isPlaying) return;
    el.currentTime = sourceTime;
  }, [currentTime]);

  // Mount: seek to correct position; if already playing, start after seek completes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isPlaying) playing.current = true;
    return seekAndPlay(el, sourceTime, isPlaying);
  }, []);

  return (
    <video
      ref={ref}
      src={layer.src}
      style={{ width: "100%", height: "100%", objectFit: resolvedObjectFit(layer, currentTime), pointerEvents: "none" }}
      muted={layer.muted ?? false}
      loop={false}
      preload="auto"
      playsInline
    />
  );
}

function AudioLayerEl({ layer, currentTime, isPlaying }) {
  const ref = useRef(null);
  const playing = useRef(false);
  const sourceTime = (layer.trimStart ?? 0) + (currentTime - layer.start);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isPlaying) {
      el.pause();
      el.currentTime = sourceTime;
      playing.current = false;
    } else if (!playing.current) {
      el.currentTime = sourceTime;
      el.play().catch(() => {});
      playing.current = true;
    }
  }, [isPlaying]);

  useEffect(() => {
    const el = ref.current;
    if (!el || isPlaying) return;
    el.currentTime = sourceTime;
  }, [currentTime]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, layer.volume ?? 1));
  }, [layer.volume]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = layer.muted ?? false;
  }, [layer.muted]);

  return (
    <audio
      ref={ref}
      src={layer.src}
      style={{ display: "none" }}
      preload="auto"
    />
  );
}

// ── Persistent video track ───────────────────────────────────────────────────
// One mounted <video> element per track group — never unmounts between clips.
// Clip transitions = just updating currentTime on the same element → no gap.

function PersistentVideoTrack({
  clips,
  currentTime,
  isPlaying,
  canvasW,
  canvasH,
  selectedLayerId,
  draggingLayerId,
  scaleRef,
  onBodyMouseDown,
  handlesEl,
}) {
  const videoRef  = useRef(null);
  const wrapperRef = useRef(null);
  const playing   = useRef(false);

  const activeClip  = clips.find((c) => currentTime >= c.start && currentTime < c.end) ?? null;
  const activeClipId = activeClip?.id ?? null;
  const sourceTime  = activeClip
    ? (activeClip.trimStart ?? 0) + (currentTime - activeClip.start)
    : 0;

  // Mount once: seek to starting position, auto-play if already in playback
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !activeClip) return;
    if (isPlaying) playing.current = true;
    return seekAndPlay(el, sourceTime, isPlaying);
  }, []);

  // Clip transition: active clip id changed → seek the SAME element to new position
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!activeClip) { el.pause(); playing.current = false; return; }
    playing.current = false;
    return seekAndPlay(el, sourceTime, isPlaying);
  }, [activeClipId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play / pause toggle
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !activeClip) return;
    if (!isPlaying) {
      el.pause();
      el.currentTime = sourceTime;
      playing.current = false;
      return;
    }
    if (!playing.current) {
      playing.current = true;
      return seekAndPlay(el, sourceTime, true);
    }
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrub while paused
  useEffect(() => {
    const el = videoRef.current;
    if (!el || isPlaying || !activeClip) return;
    el.currentTime = sourceTime;
  }, [currentTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const tr = activeClip ? resolveTransform(activeClip, currentTime) : null;
  const { x = 0, y = 0, width = canvasW, height = canvasH,
          rotation = 0, scale = 1, opacity = 1, blur = 0 } = tr ?? {};

  const isSelected  = activeClip?.id === selectedLayerId;
  const isDragging  = activeClip?.id === draggingLayerId;
  const isDraggable = !!(activeClip && !activeClip.locked);
  const isResizable = isSelected && isDraggable;

  const left = canvasW / 2 + x - width / 2;
  const top  = canvasH / 2 + y - height / 2;

  const { opacity: tOpacity = 1, translateX: tX = 0, addBlur: tBlur = 0, scale: tScale = 1 } =
    activeClip ? getTransitionStyle(activeClip, currentTime) : {};

  const onResizeMouseDown = (e, handleId) => {
    if (!activeClip) return;
    e.stopPropagation(); e.preventDefault();
    const cfg = HANDLE_CONFIGS[handleId];
    const startClientX = e.clientX, startClientY = e.clientY;

    const storeState = useTimelineStore.getState();
    const preDragProject = JSON.parse(JSON.stringify(storeState.project));
    const ct = storeState.currentTime;
    const freshClip = storeState.project?.layers?.find((l) => l.id === activeClip.id) ?? activeClip;
    const localTime = Math.max(0, ct - freshClip.start);
    const hasXKF = (freshClip.keyframes?.x?.length ?? 0) > 0;
    const hasYKF = (freshClip.keyframes?.y?.length ?? 0) > 0;
    const hasWKF = (freshClip.keyframes?.width?.length ?? 0) > 0;
    const hasHKF = (freshClip.keyframes?.height?.length ?? 0) > 0;
    const resolved = resolveTransform(freshClip, ct);
    const origT = {
      ...freshClip.transform,
      x: resolved.x ?? 0, y: resolved.y ?? 0,
      width: resolved.width ?? freshClip.transform.width,
      height: resolved.height ?? freshClip.transform.height,
    };
    const origKF = JSON.parse(JSON.stringify(freshClip.keyframes ?? {}));

    const buildPatch = (me) => {
      const s = scaleRef.current;
      const dx = (me.clientX - startClientX) / s, dy = (me.clientY - startClientY) / s;
      const newW = cfg.wm !== 0 ? Math.max(MIN_SIZE, origT.width + cfg.wm * dx) : origT.width;
      const newH = cfg.hm !== 0 ? Math.max(MIN_SIZE, origT.height + cfg.hm * dy) : origT.height;
      const newX = origT.x + cfg.xa * (newW - origT.width);
      const newY = origT.y + cfg.ya * (newH - origT.height);

      const transformPatch = { ...freshClip.transform };
      if (!hasXKF) transformPatch.x = newX;
      if (!hasYKF) transformPatch.y = newY;
      if (!hasWKF) transformPatch.width = newW;
      if (!hasHKF) transformPatch.height = newH;

      if (hasXKF || hasYKF || hasWKF || hasHKF) {
        const kf = JSON.parse(JSON.stringify(origKF));
        const upsert = (arr, time, val) => {
          const idx = arr.findIndex((k) => Math.abs(k.time - time) < 0.001);
          if (idx >= 0) arr[idx] = { ...arr[idx], value: val };
          else { arr.push({ time, value: val }); arr.sort((a, b) => a.time - b.time); }
          return arr;
        };
        if (hasXKF) kf.x = upsert(kf.x ?? [], localTime, newX);
        if (hasYKF) kf.y = upsert(kf.y ?? [], localTime, newY);
        if (hasWKF) kf.width = upsert(kf.width ?? [], localTime, newW);
        if (hasHKF) kf.height = upsert(kf.height ?? [], localTime, newH);
        return { transform: transformPatch, keyframes: kf };
      }
      return { transform: { ...freshClip.transform, width: newW, height: newH, x: newX, y: newY } };
    };

    const onMove = (me) => useTimelineStore.getState().updateLayerSilent(activeClip.id, buildPatch(me));
    const onUp   = (me) => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
                              useTimelineStore.getState().commitDrag(activeClip.id, buildPatch(me), preDragProject); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onRotateMouseDown = (e) => {
    if (!activeClip) return;
    e.stopPropagation(); e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = (rect.left + rect.right) / 2, centerY = (rect.top + rect.bottom) / 2;

    const storeState = useTimelineStore.getState();
    const preDragProject = JSON.parse(JSON.stringify(storeState.project));
    const ct = storeState.currentTime;
    const freshClip = storeState.project?.layers?.find((l) => l.id === activeClip.id) ?? activeClip;
    const localTime = Math.max(0, ct - freshClip.start);
    const hasRotKF = (freshClip.keyframes?.rotation?.length ?? 0) > 0;
    const origRotation = resolveTransform(freshClip, ct).rotation ?? 0;
    const origT = { ...freshClip.transform };
    const origKF = JSON.parse(JSON.stringify(freshClip.keyframes ?? {}));

    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const angleOffset = origRotation - startAngle;

    const buildPatch = (me) => {
      const newRotation = Math.atan2(me.clientY - centerY, me.clientX - centerX) * (180 / Math.PI) + angleOffset;
      if (hasRotKF) {
        const kf = JSON.parse(JSON.stringify(origKF));
        kf.rotation = kf.rotation ?? [];
        const idx = kf.rotation.findIndex((k) => Math.abs(k.time - localTime) < 0.001);
        if (idx >= 0) kf.rotation[idx] = { ...kf.rotation[idx], value: newRotation };
        else { kf.rotation.push({ time: localTime, value: newRotation }); kf.rotation.sort((a, b) => a.time - b.time); }
        return { keyframes: kf };
      }
      return { transform: { ...origT, rotation: newRotation } };
    };

    const onMove = (me) => useTimelineStore.getState().updateLayerSilent(activeClip.id, buildPatch(me));
    const onUp   = (me) => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
                              useTimelineStore.getState().commitDrag(activeClip.id, buildPatch(me), preDragProject); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <>
      <div
        ref={wrapperRef}
        style={{
          position: "absolute",
          left:   activeClip ? left   : 0,
          top:    activeClip ? top    : 0,
          width:  activeClip ? width  : 0,
          height: activeClip ? height : 0,
          transform: `${tX ? `translateX(${tX}%) ` : ""}rotate(${rotation}deg) scale(${scale * tScale})`,
          transformOrigin: "center center",
          opacity: activeClip ? opacity * tOpacity : 0,
          filter: (blur || tBlur) ? `blur(${blur + tBlur}px)` : undefined,
          userSelect: "none",
          pointerEvents: "none",
          outline: activeClip && isSelected
            ? isDragging ? "2px solid rgba(124,92,252,0.9)" : "2px dashed rgba(124,92,252,0.55)"
            : "none",
          outlineOffset: 1,
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            cursor: isDraggable ? (isDragging ? "grabbing" : "move") : "default",
            pointerEvents: isDraggable ? "auto" : "none",
          }}
          onMouseDown={isDraggable ? (e) => onBodyMouseDown(e, activeClip) : undefined}
        >
          <video
            ref={videoRef}
            src={activeClip?.src ?? clips[0]?.src}
            style={{ width: "100%", height: "100%", objectFit: activeClip ? resolvedObjectFit(activeClip, currentTime) : "cover", pointerEvents: "none" }}
            muted={activeClip?.muted ?? clips[0]?.muted ?? false}
            loop={false}
            preload="auto"
            playsInline
          />
        </div>
      </div>

      {/* Resize + rotate handles — portaled outside clipped canvas so they're never cropped */}
      {handlesEl && isResizable && createPortal(
        <div style={{
          position: "absolute", left, top, width, height, pointerEvents: "none",
          transform: `${tX ? `translateX(${tX}%) ` : ""}rotate(${rotation}deg) scale(${scale * tScale})`,
          transformOrigin: "center center",
        }}>
          {Object.entries(HANDLE_CONFIGS).map(([id, cfg]) => (
            <div key={id} style={{ position: "absolute", left: cfg.pl, top: cfg.pt,
              width: HANDLE_HIT, height: HANDLE_HIT, transform: "translate(-50%, -50%)",
              cursor: cfg.cursor, pointerEvents: "auto", zIndex: 10,
              display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseDown={(e) => onResizeMouseDown(e, id)}>
              <div style={{ width: HANDLE_VIS, height: HANDLE_VIS, background: "#ffffff",
                border: "2px solid #7c5cfc", borderRadius: 3, boxSizing: "border-box", pointerEvents: "none" }} />
            </div>
          ))}
          <div style={{ position: "absolute", left: "50%", top: 0, width: 0, height: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -1, top: -32, width: 2, height: 32, background: "rgba(124,92,252,0.75)" }} />
            <div style={{ position: "absolute", left: -14, top: -60, width: 28, height: 28,
              background: "#7c5cfc", border: "2px solid #ffffff", borderRadius: "50%",
              boxSizing: "border-box", cursor: "grab", pointerEvents: "auto", zIndex: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#ffffff", userSelect: "none" }}
              onMouseDown={onRotateMouseDown}>↻</div>
          </div>
        </div>,
        handlesEl
      )}
    </>
  );
}

// ── Layer element ─────────────────────────────────────────────────────────────

function LayerElement({
  layer,
  currentTime,
  isPlaying,
  canvasW,
  canvasH,
  isSelected,
  isDragging,
  isEditing,
  scaleRef,
  onBodyMouseDown,
  onStartEdit,
  onEndEdit,
  transitionStyle,
  handlesEl,
}) {
  // Must be unconditional — called before the audio early-return below
  const wrapperRef  = useRef(null);
  const textEditRef = useRef(null);

  // When entering edit mode, set content and move cursor to end
  useEffect(() => {
    if (!isEditing || !textEditRef.current) return;
    const el = textEditRef.current;
    el.innerText = layer.content ?? ""; // eslint-disable-line react-hooks/exhaustive-deps
    el.focus();
    const range = document.createRange();
    const sel   = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [isEditing]); // intentionally omits layer.content — set once on entry

  if (layer.type === "audio") {
    return <AudioLayerEl layer={layer} currentTime={currentTime} isPlaying={isPlaying} />;
  }

  const tr = resolveTransform(layer, currentTime);
  const { x, y, width, height, rotation, scale, opacity, blur } = tr;

  const { opacity: tOpacity = 1, translateX: tX = 0, addBlur: tBlur = 0, scale: tScale = 1 } = transitionStyle ?? {};

  const isDraggable = DRAGGABLE_TYPES.has(layer.type) && !layer.locked && !isEditing;
  const isResizable = isSelected && !layer.locked && DRAGGABLE_TYPES.has(layer.type) && !isEditing;

  const left = canvasW / 2 + x - width / 2;
  const top  = canvasH / 2 + y - height / 2;

  // ── Handle resize mousedown ────────────────────────────────────────────────
  const onResizeMouseDown = (e, handleId) => {
    e.stopPropagation();
    e.preventDefault();

    const cfg = HANDLE_CONFIGS[handleId];
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const storeState = useTimelineStore.getState();
    const preDragProject = JSON.parse(JSON.stringify(storeState.project));
    const ct = storeState.currentTime;
    const freshLayer = storeState.project?.layers?.find((l) => l.id === layer.id) ?? layer;
    const localTime = Math.max(0, ct - freshLayer.start);
    const hasXKF = (freshLayer.keyframes?.x?.length ?? 0) > 0;
    const hasYKF = (freshLayer.keyframes?.y?.length ?? 0) > 0;
    const hasWKF = (freshLayer.keyframes?.width?.length ?? 0) > 0;
    const hasHKF = (freshLayer.keyframes?.height?.length ?? 0) > 0;
    const resolved = resolveTransform(freshLayer, ct);
    const origT = {
      ...freshLayer.transform,
      x: resolved.x ?? 0, y: resolved.y ?? 0,
      width: resolved.width ?? freshLayer.transform.width,
      height: resolved.height ?? freshLayer.transform.height,
    };
    const origKF = JSON.parse(JSON.stringify(freshLayer.keyframes ?? {}));

    const buildPatch = (me) => {
      const s = scaleRef.current;
      const dx = (me.clientX - startClientX) / s;
      const dy = (me.clientY - startClientY) / s;
      const newW = cfg.wm !== 0 ? Math.max(MIN_SIZE, origT.width + cfg.wm * dx) : origT.width;
      const newH = cfg.hm !== 0 ? Math.max(MIN_SIZE, origT.height + cfg.hm * dy) : origT.height;
      const newX = origT.x + cfg.xa * (newW - origT.width);
      const newY = origT.y + cfg.ya * (newH - origT.height);

      const transformPatch = { ...freshLayer.transform };
      if (!hasXKF) transformPatch.x = newX;
      if (!hasYKF) transformPatch.y = newY;
      if (!hasWKF) transformPatch.width = newW;
      if (!hasHKF) transformPatch.height = newH;

      if (hasXKF || hasYKF || hasWKF || hasHKF) {
        const kf = JSON.parse(JSON.stringify(origKF));
        const upsert = (arr, time, val) => {
          const idx = arr.findIndex((k) => Math.abs(k.time - time) < 0.001);
          if (idx >= 0) arr[idx] = { ...arr[idx], value: val };
          else { arr.push({ time, value: val }); arr.sort((a, b) => a.time - b.time); }
          return arr;
        };
        if (hasXKF) kf.x = upsert(kf.x ?? [], localTime, newX);
        if (hasYKF) kf.y = upsert(kf.y ?? [], localTime, newY);
        if (hasWKF) kf.width = upsert(kf.width ?? [], localTime, newW);
        if (hasHKF) kf.height = upsert(kf.height ?? [], localTime, newH);
        return { transform: transformPatch, keyframes: kf };
      }
      return { transform: { ...freshLayer.transform, width: newW, height: newH, x: newX, y: newY } };
    };

    const onMove = (me) => {
      useTimelineStore.getState().updateLayerSilent(layer.id, buildPatch(me));
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useTimelineStore.getState().commitDrag(layer.id, buildPatch(me), preDragProject);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Handle rotation mousedown ──────────────────────────────────────────────
  const onRotateMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;

    const storeState = useTimelineStore.getState();
    const preDragProject = JSON.parse(JSON.stringify(storeState.project));
    const ct = storeState.currentTime;
    const freshLayer = storeState.project?.layers?.find((l) => l.id === layer.id) ?? layer;
    const localTime = Math.max(0, ct - freshLayer.start);
    const hasRotKF = (freshLayer.keyframes?.rotation?.length ?? 0) > 0;
    const origRotation = resolveTransform(freshLayer, ct).rotation ?? 0;
    const origT = { ...freshLayer.transform };
    const origKF = JSON.parse(JSON.stringify(freshLayer.keyframes ?? {}));

    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const angleOffset = origRotation - startAngle;

    const buildPatch = (me) => {
      const newRotation = Math.atan2(me.clientY - centerY, me.clientX - centerX) * (180 / Math.PI) + angleOffset;
      if (hasRotKF) {
        const kf = JSON.parse(JSON.stringify(origKF));
        kf.rotation = kf.rotation ?? [];
        const idx = kf.rotation.findIndex((k) => Math.abs(k.time - localTime) < 0.001);
        if (idx >= 0) kf.rotation[idx] = { ...kf.rotation[idx], value: newRotation };
        else { kf.rotation.push({ time: localTime, value: newRotation }); kf.rotation.sort((a, b) => a.time - b.time); }
        return { keyframes: kf };
      }
      return { transform: { ...origT, rotation: newRotation } };
    };

    const onMove = (me) => {
      useTimelineStore.getState().updateLayerSilent(layer.id, buildPatch(me));
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useTimelineStore.getState().commitDrag(layer.id, buildPatch(me), preDragProject);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ── Content ────────────────────────────────────────────────────────────────
  let content = null;

  if (layer.type === "video") {
    content = <VideoLayerEl layer={layer} currentTime={currentTime} isPlaying={isPlaying} />;
  } else if (layer.type === "image" || layer.type === "sticker") {
    content = layer.src ? (
      <img
        src={layer.src}
        style={{ width: "100%", height: "100%", objectFit: resolvedObjectFit(layer, currentTime), display: "block", pointerEvents: "none" }}
        draggable={false}
      />
    ) : (
      <div style={{
        width: "100%", height: "100%",
        background: "rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#55556a", fontSize: 12,
      }}>
        No source
      </div>
    );
  } else if (layer.type === "text") {
    const s = layer.style ?? {};
    const baseTextStyle = {
      width: "100%", height: "100%",
      fontFamily: s.fontFamily ?? "Outfit, sans-serif",
      fontSize: s.fontSize ?? 72,
      fontWeight: s.fontWeight ?? 800,
      color: s.color ?? "#ffffff",
      textAlign: s.textAlign ?? "center",
      lineHeight: s.lineHeight ?? 1.2,
      letterSpacing: s.letterSpacing ?? 0,
      textShadow: s.textShadow ?? undefined,
      background: s.background ?? undefined,
      borderRadius: s.borderRadius ?? 0,
      padding: s.padding ?? 0,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      boxSizing: "border-box",
    };

    if (isEditing) {
      const saveAndExit = (el) => {
        useTimelineStore.getState().updateLayer(layer.id, { content: el.innerText });
        onEndEdit?.();
      };
      content = (
        <div
          ref={textEditRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            ...baseTextStyle,
            outline: "2px solid rgba(124,92,252,0.7)",
            outlineOffset: 4,
            cursor: "text",
            overflowY: "auto",
          }}
          onBlur={(e) => saveAndExit(e.currentTarget)}
          onKeyDown={(e) => {
            e.stopPropagation(); // suppress space / shortcut keys while typing
            if (e.key === "Escape") {
              e.currentTarget.blur();
            } else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      );
    } else {
      content = (
        <div
          style={{
            ...baseTextStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: s.textAlign === "left" ? "flex-start" : s.textAlign === "right" ? "flex-end" : "center",
            cursor: isDraggable ? "move" : "default",
          }}
          onDoubleClick={(e) => { e.stopPropagation(); onStartEdit?.(); }}
        >
          {layer.content ?? ""}
        </div>
      );
    }
  } else if (layer.type === "captions") {
    const seg = layer.segments?.find((s) => currentTime >= s.start && currentTime < s.end);
    const cs = layer.captionStyle ?? {};
    content = seg ? (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          fontFamily: cs.fontFamily ?? "Outfit, sans-serif",
          fontSize: cs.fontSize ?? 48,
          fontWeight: cs.fontWeight ?? 700,
          color: cs.color ?? "#ffffff",
          background: cs.background ?? "rgba(0,0,0,0.5)",
          borderRadius: cs.borderRadius ?? 8,
          padding: cs.padding ?? 8,
          textAlign: cs.textAlign ?? "center",
          maxWidth: "90%",
          wordBreak: "break-word",
        }}>
          {seg.text}
        </div>
      </div>
    ) : null;
  }

  return (
    <>
      <div
        ref={wrapperRef}
        style={{
          position: "absolute",
          left,
          top,
          width,
          height,
          transform: `${tX ? `translateX(${tX}%) ` : ""}rotate(${rotation ?? 0}deg) scale(${(scale ?? 1) * tScale})`,
          transformOrigin: "center center",
          opacity: (opacity ?? 1) * tOpacity,
          filter: (blur || tBlur) ? `blur(${(blur ?? 0) + tBlur}px)` : undefined,
          userSelect: "none",
          pointerEvents: "none",
          outline: isSelected
            ? isDragging
              ? "2px solid rgba(124,92,252,0.9)"
              : "2px dashed rgba(124,92,252,0.55)"
            : "none",
          outlineOffset: 1,
        }}
      >
        {/* Inner content — overflow clipped here, drag events here */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            cursor: isEditing ? "text" : isDraggable ? (isDragging ? "grabbing" : "move") : "default",
            pointerEvents: isDraggable || isEditing ? "auto" : "none",
          }}
          onMouseDown={isDraggable ? (e) => onBodyMouseDown(e, layer) : undefined}
        >
          {content}
        </div>
      </div>

      {/* Resize + rotate handles — portaled outside clipped canvas so they're never cropped */}
      {handlesEl && isResizable && createPortal(
        <div style={{
          position: "absolute", left, top, width, height, pointerEvents: "none",
          transform: `${tX ? `translateX(${tX}%) ` : ""}rotate(${rotation ?? 0}deg) scale(${(scale ?? 1) * tScale})`,
          transformOrigin: "center center",
        }}>
          {Object.entries(HANDLE_CONFIGS).map(([id, cfg]) => (
            <div key={id} style={{
              position: "absolute", left: cfg.pl, top: cfg.pt,
              width: HANDLE_HIT, height: HANDLE_HIT, transform: "translate(-50%, -50%)",
              cursor: cfg.cursor, pointerEvents: "auto", zIndex: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
            }} onMouseDown={(e) => onResizeMouseDown(e, id)}>
              <div style={{ width: HANDLE_VIS, height: HANDLE_VIS, background: "#ffffff",
                border: "2px solid #7c5cfc", borderRadius: 3, boxSizing: "border-box", pointerEvents: "none" }} />
            </div>
          ))}
          <div style={{ position: "absolute", left: "50%", top: 0, width: 0, height: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -1, top: -32, width: 2, height: 32, background: "rgba(124,92,252,0.75)" }} />
            <div style={{ position: "absolute", left: -14, top: -60, width: 28, height: 28,
              background: "#7c5cfc", border: "2px solid #ffffff", borderRadius: "50%",
              boxSizing: "border-box", cursor: "grab", pointerEvents: "auto", zIndex: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "#ffffff", userSelect: "none" }}
              onMouseDown={onRotateMouseDown}>↻</div>
          </div>
        </div>,
        handlesEl
      )}
    </>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────

export default function Preview() {
  const project        = useTimelineStore((s) => s.project);
  const currentTime    = useTimelineStore((s) => s.currentTime);
  const isPlaying      = useTimelineStore((s) => s.isPlaying);
  const selectedLayerId = useTimelineStore((s) => s.selectedLayerId);
  const selectLayer    = useTimelineStore((s) => s.selectLayer);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setIsPlaying   = useTimelineStore((s) => s.setIsPlaying);

  const containerRef = useRef(null);
  const [scale, setScale]           = useState(1);
  const scaleRef                    = useRef(1);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [editingLayerId,  setEditingLayerId]  = useState(null);
  const [handlesEl, setHandlesEl] = useState(null);

  const canvasW = project?.format?.width  ?? 1080;
  const canvasH = project?.format?.height ?? 1920;

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const computeScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 24;
    const s = Math.max(0.05, Math.min((width - pad) / canvasW, (height - pad) / canvasH));
    setScale(s);
    scaleRef.current = s;
  }, [canvasW, canvasH]);

  useEffect(() => {
    computeScale();
    const ro = new ResizeObserver(computeScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeScale]);

  // RAF playback loop
  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    let rafId;
    const tick = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const store = useTimelineStore.getState();
      const next = store.currentTime + delta;
      if (next >= store.duration) {
        setIsPlaying(false);
        setCurrentTime(0);
      } else {
        setCurrentTime(next);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // ── Layer drag (body) ───────────────────────────────────────────────────────
  const handleBodyMouseDown = useCallback((e, layer) => {
    if (e.button !== 0 || layer.locked) return;
    e.stopPropagation();

    selectLayer(layer.id);
    setDraggingLayerId(layer.id);

    const startClientX = e.clientX;
    const startClientY = e.clientY;

    // Get fresh layer and currentTime from store at the moment of mousedown
    const storeState = useTimelineStore.getState();
    const preDragProject = JSON.parse(JSON.stringify(storeState.project));
    const ct = storeState.currentTime;
    const freshLayer = storeState.project?.layers?.find((l) => l.id === layer.id) ?? layer;
    const origT = { ...(freshLayer.transform ?? {}) };

    // If keyframes drive x/y, we must drag in keyframe space; otherwise base transform
    const resolvedT = resolveTransform(freshLayer, ct);
    const origX = resolvedT.x ?? 0;
    const origY = resolvedT.y ?? 0;
    const localTime = Math.max(0, ct - freshLayer.start);
    const hasXKF = (freshLayer.keyframes?.x?.length ?? 0) > 0;
    const hasYKF = (freshLayer.keyframes?.y?.length ?? 0) > 0;
    const origKF = JSON.parse(JSON.stringify(freshLayer.keyframes ?? {}));

    const buildPatch = (clientX, clientY) => {
      const s = scaleRef.current;
      const newX = origX + (clientX - startClientX) / s;
      const newY = origY + (clientY - startClientY) / s;

      if (hasXKF || hasYKF) {
        const kf = JSON.parse(JSON.stringify(origKF));
        const upsert = (arr, time, value) => {
          const idx = arr.findIndex((k) => Math.abs(k.time - time) < 0.001);
          if (idx >= 0) arr[idx] = { ...arr[idx], value };
          else { arr.push({ time, value }); arr.sort((a, b) => a.time - b.time); }
          return arr;
        };
        if (hasXKF) kf.x = upsert(kf.x ?? [], localTime, newX);
        if (hasYKF) kf.y = upsert(kf.y ?? [], localTime, newY);
        // Also update base transform for non-keyframed axis
        const transform = { ...origT };
        if (!hasXKF) transform.x = newX;
        if (!hasYKF) transform.y = newY;
        return { keyframes: kf, transform };
      }

      return { transform: { ...origT, x: newX, y: newY } };
    };

    const onMove = (me) => {
      useTimelineStore.getState().updateLayerSilent(layer.id, buildPatch(me.clientX, me.clientY));
    };

    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraggingLayerId(null);
      useTimelineStore.getState().commitDrag(layer.id, buildPatch(me.clientX, me.clientY), preDragProject);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [selectLayer]);

  const layers = project?.layers ?? [];

  // Video layers grouped by trackId — one persistent element per track
  const videoTracks = (() => {
    const map = new Map();
    for (const l of layers) {
      if (l.type !== "video" || l.visible === false) continue;
      const tid = l.trackId ?? l.id;
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid).push(l);
    }
    return [...map.values()];
  })();

  // Non-video visible layers (image, text, sticker, captions) — mount/unmount is fine
  const visibleLayers = layers
    .filter(
      (l) =>
        l.visible !== false &&
        l.type !== "audio" &&
        l.type !== "video" &&
        currentTime >= l.start &&
        currentTime < l.end
    )
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  const audioLayers = layers.filter(
    (l) =>
      l.type === "audio" &&
      l.visible !== false &&
      currentTime >= l.start &&
      currentTime < l.end
  );

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a14",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {audioLayers.map((layer) => (
        <AudioLayerEl
          key={layer.id}
          layer={layer}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
      ))}


      {/* Canvas wrapper — sized to scaled dimensions */}
      <div
        style={{
          position: "relative",
          width: canvasW * scale,
          height: canvasH * scale,
          flexShrink: 0,
        }}
      >
        {/* Full-size canvas, scaled from top-left */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: canvasW,
            height: canvasH,
            background: "#000",
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            overflow: "hidden",
          }}
          onMouseDown={() => selectLayer(null)}
        >
          {/* Persistent video tracks — one element per track, never unmounts */}
          {videoTracks.map((clips) => (
            <PersistentVideoTrack
              key={clips[0].trackId ?? clips[0].id}
              clips={clips}
              currentTime={currentTime}
              isPlaying={isPlaying}
              canvasW={canvasW}
              canvasH={canvasH}
              selectedLayerId={selectedLayerId}
              draggingLayerId={draggingLayerId}
              scaleRef={scaleRef}
              onBodyMouseDown={handleBodyMouseDown}
              handlesEl={handlesEl}
            />
          ))}

          {/* Non-video layers — safe to mount/unmount each frame */}
          {visibleLayers.map((layer) => (
            <LayerElement
              key={layer.id}
              layer={layer}
              currentTime={currentTime}
              isPlaying={isPlaying}
              canvasW={canvasW}
              canvasH={canvasH}
              isSelected={layer.id === selectedLayerId}
              isDragging={layer.id === draggingLayerId}
              isEditing={layer.id === editingLayerId}
              scaleRef={scaleRef}
              onBodyMouseDown={handleBodyMouseDown}
              onStartEdit={() => setEditingLayerId(layer.id)}
              onEndEdit={() => setEditingLayerId(null)}
              transitionStyle={getTransitionStyle(layer, currentTime)}
              handlesEl={handlesEl}
            />
          ))}

          {layers.length === 0 && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#2a2a3a",
              fontSize: Math.max(14, 24 * scale),
              textAlign: "center",
              padding: 24,
            }}>
              Add a layer to get started
            </div>
          )}
        </div>

        {/* Handles overlay — same transform as canvas but overflow:visible, so handles show outside canvas bounds */}
        <div
          ref={(el) => { if (el && el !== handlesEl) setHandlesEl(el); }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: canvasW,
            height: canvasH,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            overflow: "visible",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
