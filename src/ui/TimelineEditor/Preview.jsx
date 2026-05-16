import { useEffect, useRef, useState, useCallback } from "react";
import { useTimelineStore } from "../../store/useTimelineStore";
import { interpolateKeyframes } from "./keyframeUtils";

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


function resolveTransform(layer, currentTime) {
  const t = { ...layer.transform };
  const kf = layer.keyframes ?? {};
  for (const prop of ["x", "y", "scale", "rotation", "opacity", "blur"]) {
    if (kf[prop]?.length) {
      const v = interpolateKeyframes(kf[prop], currentTime - layer.start);
      if (v !== null) t[prop] = v;
    }
  }
  return t;
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
      style={{ width: "100%", height: "100%", objectFit: layer.objectFit ?? "cover" }}
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

  return (
    <audio
      ref={ref}
      src={layer.src}
      style={{ display: "none" }}
      muted={layer.muted ?? false}
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

  const onResizeMouseDown = (e, handleId) => {
    if (!activeClip) return;
    e.stopPropagation(); e.preventDefault();
    const cfg = HANDLE_CONFIGS[handleId];
    const startClientX = e.clientX, startClientY = e.clientY;
    const origT = { ...activeClip.transform };
    const compute = (me) => {
      const s = scaleRef.current;
      const dx = (me.clientX - startClientX) / s, dy = (me.clientY - startClientY) / s;
      const newW = cfg.wm !== 0 ? Math.max(MIN_SIZE, origT.width  + cfg.wm * dx) : origT.width;
      const newH = cfg.hm !== 0 ? Math.max(MIN_SIZE, origT.height + cfg.hm * dy) : origT.height;
      return { ...origT, width: newW, height: newH,
               x: origT.x + cfg.xa * (newW - origT.width),
               y: origT.y + cfg.ya * (newH - origT.height) };
    };
    const onMove = (me) => useTimelineStore.getState().updateLayerSilent(activeClip.id, { transform: compute(me) });
    const onUp   = (me) => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
                              useTimelineStore.getState().updateLayer(activeClip.id, { transform: compute(me) }); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onRotateMouseDown = (e) => {
    if (!activeClip) return;
    e.stopPropagation(); e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = (rect.left + rect.right) / 2, centerY = (rect.top + rect.bottom) / 2;
    const origT = { ...activeClip.transform };
    const angleOffset = (origT.rotation ?? 0) - Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const compute = (me) => ({ ...origT, rotation: Math.atan2(me.clientY - centerY, me.clientX - centerX) * (180 / Math.PI) + angleOffset });
    const onMove = (me) => useTimelineStore.getState().updateLayerSilent(activeClip.id, { transform: compute(me) });
    const onUp   = (me) => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
                              useTimelineStore.getState().updateLayer(activeClip.id, { transform: compute(me) }); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        left:   activeClip ? left   : 0,
        top:    activeClip ? top    : 0,
        width:  activeClip ? width  : 0,
        height: activeClip ? height : 0,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "center center",
        opacity: activeClip ? opacity : 0,
        filter: blur ? `blur(${blur}px)` : undefined,
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
          src={clips[0]?.src}
          style={{ width: "100%", height: "100%", objectFit: activeClip?.objectFit ?? "cover" }}
          muted={clips[0]?.muted ?? false}
          loop={false}
          preload="auto"
          playsInline
        />
      </div>

      {isResizable && Object.entries(HANDLE_CONFIGS).map(([id, cfg]) => (
        <div key={id} style={{ position: "absolute", left: cfg.pl, top: cfg.pt,
          width: HANDLE_HIT, height: HANDLE_HIT, transform: "translate(-50%, -50%)",
          cursor: cfg.cursor, pointerEvents: "auto", zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseDown={(e) => onResizeMouseDown(e, id)}>
          <div style={{ width: HANDLE_VIS, height: HANDLE_VIS, background: "#ffffff",
            border: "2px solid #7c5cfc", borderRadius: 3, boxSizing: "border-box", pointerEvents: "none" }} />
        </div>
      ))}

      {isResizable && (
        <div style={{ position: "absolute", left: "50%", top: 0, width: 0, height: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: -1, top: -32, width: 2, height: 32, background: "rgba(124,92,252,0.75)" }} />
          <div style={{ position: "absolute", left: -14, top: -60, width: 28, height: 28,
            background: "#7c5cfc", border: "2px solid #ffffff", borderRadius: "50%",
            boxSizing: "border-box", cursor: "grab", pointerEvents: "auto", zIndex: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#ffffff", userSelect: "none" }}
            onMouseDown={onRotateMouseDown}>↻</div>
        </div>
      )}
    </div>
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
  scaleRef,
  onBodyMouseDown,
}) {
  // Must be unconditional — called before the audio early-return below
  const wrapperRef = useRef(null);

  if (layer.type === "audio") {
    return <AudioLayerEl layer={layer} currentTime={currentTime} isPlaying={isPlaying} />;
  }

  const tr = resolveTransform(layer, currentTime);
  const { x, y, width, height, rotation, scale, opacity, blur } = tr;

  const isDraggable = DRAGGABLE_TYPES.has(layer.type) && !layer.locked;
  const isResizable = isSelected && !layer.locked && DRAGGABLE_TYPES.has(layer.type);

  const left = canvasW / 2 + x - width / 2;
  const top  = canvasH / 2 + y - height / 2;

  // ── Handle resize mousedown ────────────────────────────────────────────────
  const onResizeMouseDown = (e, handleId) => {
    e.stopPropagation();
    e.preventDefault();

    const cfg = HANDLE_CONFIGS[handleId];
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const origT = { ...layer.transform };

    const compute = (me) => {
      const s = scaleRef.current;
      const dx = (me.clientX - startClientX) / s;
      const dy = (me.clientY - startClientY) / s;
      const newW = cfg.wm !== 0 ? Math.max(MIN_SIZE, origT.width  + cfg.wm * dx) : origT.width;
      const newH = cfg.hm !== 0 ? Math.max(MIN_SIZE, origT.height + cfg.hm * dy) : origT.height;
      const dW = newW - origT.width;
      const dH = newH - origT.height;
      return {
        ...origT,
        width:  newW,
        height: newH,
        x: origT.x + cfg.xa * dW,
        y: origT.y + cfg.ya * dH,
      };
    };

    const onMove = (me) => {
      useTimelineStore.getState().updateLayerSilent(layer.id, { transform: compute(me) });
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useTimelineStore.getState().updateLayer(layer.id, { transform: compute(me) });
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

    // Layer center in screen space — valid regardless of rotation because
    // getBoundingClientRect() center always equals the CSS transformOrigin point.
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;

    const origT = { ...layer.transform };
    const origRotation = origT.rotation ?? 0;
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    // Offset so rotation continues from the layer's current value, not jumps to 0
    const angleOffset = origRotation - startAngle;

    const compute = (me) => {
      const angle = Math.atan2(me.clientY - centerY, me.clientX - centerX) * (180 / Math.PI);
      return { ...origT, rotation: angle + angleOffset };
    };

    const onMove = (me) => {
      useTimelineStore.getState().updateLayerSilent(layer.id, { transform: compute(me) });
    };
    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useTimelineStore.getState().updateLayer(layer.id, { transform: compute(me) });
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
        style={{ width: "100%", height: "100%", objectFit: layer.objectFit ?? "cover", display: "block" }}
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
    content = (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center",
        justifyContent: s.textAlign === "left" ? "flex-start" : s.textAlign === "right" ? "flex-end" : "center",
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
      }}>
        {layer.content ?? ""}
      </div>
    );
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
    // Outer wrapper: handles transforms, outline — NO overflow:hidden so handles aren't clipped
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        transform: `rotate(${rotation ?? 0}deg) scale(${scale ?? 1})`,
        transformOrigin: "center center",
        opacity: opacity ?? 1,
        filter: blur ? `blur(${blur}px)` : undefined,
        userSelect: "none",
        // Pointer events off on outer; inner content and handles opt in individually
        pointerEvents: "none",
        // Selection outline on the outer wrapper so it's not clipped by inner overflow:hidden
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
          cursor: isDraggable ? (isDragging ? "grabbing" : "move") : "default",
          pointerEvents: isDraggable ? "auto" : "none",
        }}
        onMouseDown={isDraggable ? (e) => onBodyMouseDown(e, layer) : undefined}
      >
        {content}
      </div>

      {/* Resize handles — rendered outside inner clip, so corners are fully visible */}
      {isResizable &&
        Object.entries(HANDLE_CONFIGS).map(([id, cfg]) => (
          <div
            key={id}
            style={{
              position: "absolute",
              left: cfg.pl,
              top: cfg.pt,
              width: HANDLE_HIT,
              height: HANDLE_HIT,
              transform: "translate(-50%, -50%)",
              cursor: cfg.cursor,
              pointerEvents: "auto",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseDown={(e) => onResizeMouseDown(e, id)}
          >
            <div style={{
              width: HANDLE_VIS,
              height: HANDLE_VIS,
              background: "#ffffff",
              border: "2px solid #7c5cfc",
              borderRadius: 3,
              boxSizing: "border-box",
              pointerEvents: "none",
            }} />
          </div>
        ))}

      {/* Rotation handle — anchor sits at top-center, line + circle go above it */}
      {isResizable && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        >
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              left: -1,
              top: -32,
              width: 2,
              height: 32,
              background: "rgba(124,92,252,0.75)",
            }}
          />
          {/* Rotation circle handle */}
          <div
            style={{
              position: "absolute",
              left: -14,
              top: -60,
              width: 28,
              height: 28,
              background: "#7c5cfc",
              border: "2px solid #ffffff",
              borderRadius: "50%",
              boxSizing: "border-box",
              cursor: "grab",
              pointerEvents: "auto",
              zIndex: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              color: "#ffffff",
              userSelect: "none",
            }}
            onMouseDown={onRotateMouseDown}
          >
            ↻
          </div>
        </div>
      )}
    </div>
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
  const [scale, setScale]     = useState(1);
  const scaleRef              = useRef(1);
  const [draggingLayerId, setDraggingLayerId] = useState(null);

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
    const origT = { ...(layer.transform ?? {}) };

    const onMove = (me) => {
      const s = scaleRef.current;
      useTimelineStore.getState().updateLayerSilent(layer.id, {
        transform: {
          ...origT,
          x: (origT.x ?? 0) + (me.clientX - startClientX) / s,
          y: (origT.y ?? 0) + (me.clientY - startClientY) / s,
        },
      });
    };

    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraggingLayerId(null);
      const s = scaleRef.current;
      useTimelineStore.getState().updateLayer(layer.id, {
        transform: {
          ...origT,
          x: (origT.x ?? 0) + (me.clientX - startClientX) / s,
          y: (origT.y ?? 0) + (me.clientY - startClientY) / s,
        },
      });
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
              scaleRef={scaleRef}
              onBodyMouseDown={handleBodyMouseDown}
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
      </div>
    </div>
  );
}
