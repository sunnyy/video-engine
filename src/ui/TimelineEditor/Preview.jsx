import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTimelineStore } from "../../store/useTimelineStore";
import { interpolateKeyframes, resolveTransform, stepKeyframe } from "./keyframeUtils";
import { SFX_LIBRARY, getSFXPreviewUrl } from "../../core/registries/sfxRegistry";
import { shapeRegistry, renderDecorativeSVG } from "../../core/registries/shapeRegistry";
import { decorativeById } from "../../core/registries/decorativeRegistry";
import { cinematicById } from "../../core/registries/cinematicRegistry";
import {
  Package, Star, ShieldCheck, Truck, Heart, CheckCircle, Lightning, Leaf, Drop, Fire,
  SealCheck, Sparkle, ArrowRight, Tag, Certificate,
  ArrowLeft, ArrowUp, ArrowDown, Bell, Bookmark, Camera, Car, ChatCircle, Clock, Cloud,
  Coffee, CreditCard, Crown, Cube, Diamond, Download, Envelope, Eye, Fingerprint, Flag,
  Flower, Gear, Gift, Globe, Headphones, House, Image, Info, Infinity, Key, Laptop,
  Lightbulb, Link, Lock, MagicWand, MapPin, Medal, Megaphone, Moon, MusicNote,
  PaperPlaneTilt, Pencil, Phone, Plant, Plus, Question, Rainbow, Rocket, MagnifyingGlass,
  ShareNetwork, Shield, ShoppingBag, Smiley, Stack, Sun, Target, ThumbsUp, Timer,
  Trash, Trophy, TShirt, Umbrella, Upload, User, Video, Wallet, Warning, WifiHigh, Wind,
} from "@phosphor-icons/react";

const PHOSPHOR_ICONS = {
  Package, Star, ShieldCheck, Truck, Heart, CheckCircle, Lightning, Leaf, Drop, Fire,
  SealCheck, Sparkle, ArrowRight, Tag, Certificate,
  ArrowLeft, ArrowUp, ArrowDown, Bell, Bookmark, Camera, Car, ChatCircle, Clock, Cloud,
  Coffee, CreditCard, Crown, Cube, Diamond, Download, Envelope, Eye, Fingerprint, Flag,
  Flower, Gear, Gift, Globe, Headphones, House, Image, Info, Infinity, Key, Laptop,
  Lightbulb, Link, Lock, MagicWand, MapPin, Medal, Megaphone, Moon, MusicNote,
  PaperPlaneTilt, Pencil, Phone, Plant, Plus, Question, Rainbow, Rocket, MagnifyingGlass,
  ShareNetwork, Shield, ShoppingBag, Smiley, Stack, Sun, Target, ThumbsUp, Timer,
  Trash, Trophy, TShirt, Umbrella, Upload, User, Video, Wallet, Warning, WifiHigh, Wind,
};

const DRAGGABLE_TYPES = new Set(["video", "image", "text", "sticker", "gradient", "shape", "icon"]);
const SNAP_T = 12; // canvas-space pixels

// Snap layer center (x,y) to canvas edges and center during body drag
function snapBody(x, y, w, h, cW, cH) {
  let sx = x, sy = y;
  const lEdge = cW / 2 + x - w / 2, rEdge = cW / 2 + x + w / 2;
  if      (Math.abs(lEdge)       < SNAP_T) sx = -cW / 2 + w / 2;
  else if (Math.abs(rEdge - cW)  < SNAP_T) sx =  cW / 2 - w / 2;
  else if (Math.abs(x)           < SNAP_T) sx = 0;
  const tEdge = cH / 2 + y - h / 2, bEdge = cH / 2 + y + h / 2;
  if      (Math.abs(tEdge)       < SNAP_T) sy = -cH / 2 + h / 2;
  else if (Math.abs(bEdge - cH)  < SNAP_T) sy =  cH / 2 - h / 2;
  else if (Math.abs(y)           < SNAP_T) sy = 0;
  return { x: sx, y: sy };
}

// Snap the moving edge of a resize handle to the canvas boundary
function snapResize(newX, newY, newW, newH, cfg, origT, cW, cH) {
  let x = newX, y = newY, w = newW, h = newH;
  const origR = cW / 2 + origT.x + origT.width  / 2;
  const origL = cW / 2 + origT.x - origT.width  / 2;
  const origB = cH / 2 + origT.y + origT.height / 2;
  const origTo = cH / 2 + origT.y - origT.height / 2;
  if (cfg.wm !== 0) {
    const lEdge = cW / 2 + x - w / 2, rEdge = cW / 2 + x + w / 2;
    if (cfg.xa < 0 && Math.abs(lEdge) < SNAP_T) {
      w = origR; x = origR / 2 - cW / 2;
    } else if (cfg.xa > 0 && Math.abs(rEdge - cW) < SNAP_T) {
      w = cW - origL; x = (origL + cW) / 2 - cW / 2;
    }
  }
  if (cfg.hm !== 0) {
    const tEdge = cH / 2 + y - h / 2, bEdge = cH / 2 + y + h / 2;
    if (cfg.ya < 0 && Math.abs(tEdge) < SNAP_T) {
      h = origB; y = origB / 2 - cH / 2;
    } else if (cfg.ya > 0 && Math.abs(bEdge - cH) < SNAP_T) {
      h = cH - origTo; y = (origTo + cH) / 2 - cH / 2;
    }
  }
  return { x, y, w, h };
}
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
  const rate = layer.playbackRate || 1;
  const sourceTime = (layer.trimStart ?? 0) + (currentTime - layer.start) * rate;

  // Apply playbackRate whenever it changes
  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const el = ref.current;
    if (el) el.volume = Math.max(0, Math.min(1, layer.volume ?? 1));
  }, [layer.volume]);

  useEffect(() => {
    const el = ref.current;
    if (el) el.muted = layer.muted ?? false;
  }, [layer.muted]);

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
    el.playbackRate = rate;
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

function SfxLayerEl({ layer, currentTime, isPlaying }) {
  const audioRef = useRef(null);
  const timeoutRef = useRef(null);
  const sfx = layer.sfx;
  const triggerTime = layer.start + (sfx?.delay ?? 0);
  const sfxDur = sfx?.key ? (SFX_LIBRARY[sfx.key]?.duration ?? 3) : 0;

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !sfx?.key) return;
    el.volume = Math.max(0, Math.min(1, sfx.volume ?? 1));
  }, [sfx?.volume, sfx?.key]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !sfx?.key) return;
    clearTimeout(timeoutRef.current);
    if (!isPlaying) { el.pause(); return; }
    const ahead = triggerTime - currentTime;
    if (ahead < 0) {
      if (-ahead < sfxDur) { el.currentTime = -ahead; el.play().catch(() => {}); }
    } else {
      timeoutRef.current = setTimeout(() => { el.currentTime = 0; el.play().catch(() => {}); }, ahead * 1000);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [isPlaying]);

  if (!sfx?.key) return null;
  return <audio ref={audioRef} src={getSFXPreviewUrl(sfx.key)} preload="auto" style={{ display: "none" }} />;
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
  const rate = activeClip?.playbackRate || 1;
  const sourceTime  = activeClip
    ? (activeClip.trimStart ?? 0) + (currentTime - activeClip.start) * rate
    : 0;

  // Apply playbackRate whenever the active clip or its rate changes
  useEffect(() => {
    const el = videoRef.current;
    if (el) el.playbackRate = rate;
  }, [rate, activeClipId]);

  const activeVolume = activeClip?.volume;
  const activeMuted  = activeClip?.muted;

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.volume = Math.max(0, Math.min(1, activeVolume ?? 1));
  }, [activeVolume]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = activeMuted ?? false;
  }, [activeMuted]);

  // Mount once: seek to starting position, auto-play if already in playback
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !activeClip) return;
    el.playbackRate = rate;
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
    const aspectRatio = origT.width / (origT.height || 1);

    const buildPatch = (me) => {
      const s = scaleRef.current;
      const dx = (me.clientX - startClientX) / s, dy = (me.clientY - startClientY) / s;
      let newW = cfg.wm !== 0 ? Math.max(MIN_SIZE, origT.width + cfg.wm * dx) : origT.width;
      let newH = cfg.hm !== 0 ? Math.max(MIN_SIZE, origT.height + cfg.hm * dy) : origT.height;
      if (me.shiftKey) {
        if (cfg.wm !== 0 && cfg.hm !== 0) {
          Math.abs(cfg.wm * dx) >= Math.abs(cfg.hm * dy)
            ? (newH = Math.max(MIN_SIZE, newW / aspectRatio))
            : (newW = Math.max(MIN_SIZE, newH * aspectRatio));
        } else if (cfg.wm !== 0) {
          newH = Math.max(MIN_SIZE, newW / aspectRatio);
        } else if (cfg.hm !== 0) {
          newW = Math.max(MIN_SIZE, newH * aspectRatio);
        }
      }
      let newX = origT.x + cfg.xa * (newW - origT.width);
      let newY = origT.y + cfg.ya * (newH - origT.height);
      ({ x: newX, y: newY, w: newW, h: newH } = snapResize(newX, newY, newW, newH, cfg, origT, canvasW, canvasH));

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
          transform: `${tX ? `translateX(${tX}%) ` : ""}${activeClip?.flipX ? "scaleX(-1) " : ""}${activeClip?.flipY ? "scaleY(-1) " : ""}rotate(${rotation}deg) scale(${scale * tScale})`,
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
            borderRadius: (activeClip?.transform?.borderRadius ?? activeClip?.borderRadius) ? `${activeClip?.transform?.borderRadius ?? activeClip?.borderRadius}px` : undefined,
            border: activeClip?.borderWidth ? `${activeClip.borderWidth}px solid ${activeClip.borderColor ?? "#ffffff"}` : undefined,
            backgroundColor: activeClip?.backgroundColor ?? undefined,
            boxShadow: activeClip?.boxShadow ?? undefined,
            padding: activeClip?.padding ? `${activeClip.padding}px` : undefined,
            boxSizing: activeClip?.padding ? "border-box" : undefined,
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
    const aspectRatio = origT.width / (origT.height || 1);

    const buildPatch = (me) => {
      const s = scaleRef.current;
      const dx = (me.clientX - startClientX) / s;
      const dy = (me.clientY - startClientY) / s;
      let newW = cfg.wm !== 0 ? Math.max(MIN_SIZE, origT.width + cfg.wm * dx) : origT.width;
      let newH = cfg.hm !== 0 ? Math.max(MIN_SIZE, origT.height + cfg.hm * dy) : origT.height;
      if (me.shiftKey) {
        if (cfg.wm !== 0 && cfg.hm !== 0) {
          Math.abs(cfg.wm * dx) >= Math.abs(cfg.hm * dy)
            ? (newH = Math.max(MIN_SIZE, newW / aspectRatio))
            : (newW = Math.max(MIN_SIZE, newH * aspectRatio));
        } else if (cfg.wm !== 0) {
          newH = Math.max(MIN_SIZE, newW / aspectRatio);
        } else if (cfg.hm !== 0) {
          newW = Math.max(MIN_SIZE, newH * aspectRatio);
        }
      }
      let newX = origT.x + cfg.xa * (newW - origT.width);
      let newY = origT.y + cfg.ya * (newH - origT.height);
      ({ x: newX, y: newY, w: newW, h: newH } = snapResize(newX, newY, newW, newH, cfg, origT, canvasW, canvasH));

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

  if (layer.type === "icon") {
    const IconComponent = PHOSPHOR_ICONS[layer.iconName];
    console.log("[icon layer]", layer.iconName, "→ component found:", !!IconComponent, "size:", width, height);
    content = IconComponent ? (
      <IconComponent
        size={Math.min(width, height)}
        color={layer.style?.color || "#ffffff"}
        weight={layer.style?.weight || "regular"}
        style={{ display: "block" }}
      />
    ) : null;
  } else if (layer.type === "video") {
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
          {layer.content || layer.text || ""}
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
  } else if (layer.type === "gradient") {
    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: layer.gradient ?? "linear-gradient(135deg, #000000, #ffffff)",
          pointerEvents: "none",
        }}
      />
    );
  } else if (layer.type === "shape") {
    const registry = layer.registry ?? "decorative";
    const color = layer.color ?? "#ffffff";
    const shapeOpacity = layer.shapeOpacity ?? 1;

    if (registry === "shape") {
      const rendered = renderDecorativeSVG(layer.shapeId, { color, filled: layer.filled ?? true, strokeWidth: layer.strokeWidth ?? 0, opacity: shapeOpacity });
      if (rendered) {
        let svgHtml = rendered.content;
        const isFilled = layer.filled !== false;
        const gradVal = layer.gradient || layer.gradientRaw;
        if (gradVal) {
          const gradColors = gradVal.match(/#[0-9a-fA-F]{3,6}|rgb[^)]+\)|rgba[^)]+\)/g);
          const gradAngle = parseInt(gradVal.match(/(\d+)deg/)?.[1] ?? 135);
          const gc1 = gradColors?.[0] ?? color;
          const gc2 = gradColors?.[1] ?? color;
          const gRad = (gradAngle * Math.PI) / 180;
          const gx2 = (50 + Math.cos(gRad) * 50).toFixed(0);
          const gy2 = (50 + Math.sin(gRad) * 50).toFixed(0);
          const gradDef = `<defs><linearGradient id="lg_${layer.id}" x1="50%" y1="50%" x2="${gx2}%" y2="${gy2}%"><stop offset="0%" stop-color="${gc1}"/><stop offset="100%" stop-color="${gc2}"/></linearGradient></defs>`;
          if (isFilled) {
            svgHtml = gradDef + svgHtml.replace(/fill="(?!none)[^"]+"/g, `fill="url(#lg_${layer.id})"`);
          } else {
            svgHtml = gradDef + svgHtml.replace(/stroke="[^"]*"/g, `stroke="url(#lg_${layer.id})"`);
          }
        }
        content = (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg
              viewBox={rendered.viewBox}
              style={{ width: "100%", height: "100%", overflow: "visible" }}
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          </div>
        );
      } else {
        content = null;
      }
    } else if (registry === "cinematic") {
      const entry = cinematicById[layer.shapeId];
      if (!entry) { content = null; }
      else {
        const colorMode = entry.colorMode ?? "fill";
        const solidColor = layer.color ?? "#ffffff";
        const gradientVal = layer.gradient || layer.gradientRaw;
        const opacity = layer.shapeOpacity ?? 1;
        const filterStyle = entry.render === "svg_filter" ? `drop-shadow(0 0 8px ${solidColor})` : undefined;
        let svgContent = entry.svg;
        if (svgContent && gradientVal) {
          const colorMatches = gradientVal.match(/#[0-9a-fA-F]{3,6}|rgb[^)]+\)|rgba[^)]+\)/g);
          const angleMatch = gradientVal.match(/(\d+)deg/);
          const c1 = colorMatches?.[0] ?? solidColor;
          const c2 = colorMatches?.[1] ?? solidColor;
          const angle = angleMatch ? parseInt(angleMatch[1]) : 135;
          const rad = (angle * Math.PI) / 180;
          const x2 = (50 + Math.cos(rad) * 50).toFixed(0);
          const y2 = (50 + Math.sin(rad) * 50).toFixed(0);
          const gradientDef = `<linearGradient id="lg_${layer.id}" x1="50%" y1="50%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
          if (svgContent.includes("<defs>")) {
            svgContent = svgContent.replace("<defs>", `<defs>${gradientDef}`);
          } else {
            svgContent = svgContent.replace(/<svg([^>]*)>/, `<svg$1><defs>${gradientDef}</defs>`);
          }
          if (colorMode === "stroke") {
            svgContent = svgContent.replace(/stroke="currentColor"/g, `stroke="url(#lg_${layer.id})"`);
          } else if (colorMode === "mixed") {
            svgContent = svgContent
              .replace(/fill="currentColor"/g, `fill="url(#lg_${layer.id})"`)
              .replace(/stroke="currentColor"/g, `stroke="${layer.strokeColor ?? c1}"`);
          } else {
            svgContent = svgContent
              .replace(/fill="currentColor"/g, `fill="url(#lg_${layer.id})"`)
              .replace(/stroke="currentColor"/g, `stroke="url(#lg_${layer.id})"`);
          }
        }
        if (entry.render === "css_repeat" && entry.css) {
          content = (
            <div style={{ width: "100%", height: "100%", color: solidColor, opacity, background: colorMode !== "stroke" && gradientVal ? gradientVal : undefined, ...entry.css }} />
          );
        } else {
          content = (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: solidColor, opacity, filter: filterStyle }} dangerouslySetInnerHTML={{ __html: svgContent }} />
          );
        }
      }
    } else {
      const entry = decorativeById[layer.shapeId];
      if (!entry) { content = null; }
      else {
        let svgContent = entry.svg ?? "";
        const gradVal = layer.gradient || layer.gradientRaw;

        if (gradVal && entry.render === "svg") {
          const colors = gradVal.match(/#[0-9a-fA-F]{3,6}|rgb[^)]+\)|rgba[^)]+\)/g);
          const angle = parseInt(gradVal.match(/(\d+)deg/)?.[1] ?? 135);
          const rad = (angle * Math.PI) / 180;
          const x2 = (50 + Math.cos(rad) * 50).toFixed(0);
          const y2 = (50 + Math.sin(rad) * 50).toFixed(0);
          const c1 = colors?.[0] ?? color;
          const c2 = colors?.[1] ?? color;
          const gradDef = `<linearGradient id="lg_${layer.id}" x1="50%" y1="50%" x2="${x2}%" y2="${y2}%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
          svgContent = svgContent.replace(/fill="currentColor"/g, `fill="url(#lg_${layer.id})"`);
          if (svgContent.includes("<defs>")) {
            svgContent = svgContent.replace("<defs>", `<defs>${gradDef}`);
          } else {
            svgContent = svgContent.replace(/<svg([^>]*)>/, `<svg$1><defs>${gradDef}</defs>`);
          }
        }

        if (entry.render === "svg") {
          content = (
            <div
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          );
        } else if (entry.render === "css_repeat") {
          content = (
            <div
              style={{
                width: "100%", height: "100%",
                color,
                opacity: shapeOpacity,
                background: gradVal ?? undefined,
                ...entry.css,
              }}
            />
          );
        }
      }
    }
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
          transform: `${tX ? `translateX(${tX}%) ` : ""}${layer.flipX ? "scaleX(-1) " : ""}${layer.flipY ? "scaleY(-1) " : ""}rotate(${rotation ?? 0}deg) scale(${(scale ?? 1) * tScale})`,
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
            borderRadius: (layer.transform?.borderRadius ?? layer.borderRadius) ? `${layer.transform?.borderRadius ?? layer.borderRadius}px` : undefined,
            border: layer.borderWidth ? `${layer.borderWidth}px solid ${layer.borderColor ?? "#ffffff"}` : undefined,
            backgroundColor: layer.backgroundColor ?? undefined,
            boxShadow: layer.boxShadow ?? undefined,
            padding: layer.padding ? `${layer.padding}px` : undefined,
            boxSizing: layer.padding ? "border-box" : undefined,
            mixBlendMode: layer.blendMode ?? undefined,
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
  const selectedLayerId      = useTimelineStore((s) => s.selectedLayerId);
  const selectedLayerIds     = useTimelineStore((s) => s.selectedLayerIds);
  const selectLayer          = useTimelineStore((s) => s.selectLayer);
  const toggleLayerSelection = useTimelineStore((s) => s.toggleLayerSelection);
  const setCurrentTime = useTimelineStore((s) => s.setCurrentTime);
  const setIsPlaying   = useTimelineStore((s) => s.setIsPlaying);

  const containerRef = useRef(null);
  const [scale, setScale]           = useState(1);
  const scaleRef                    = useRef(1);
  const [userZoom, setUserZoom]     = useState(1);
  const userZoomRef                 = useRef(1);
  const [panOffset, setPanOffset]   = useState({ x: 0, y: 0 });
  const panOffsetRef                = useRef({ x: 0, y: 0 });
  const [isHandMode, setIsHandMode] = useState(false);
  const isHandModeRef               = useRef(false);
  const [draggingLayerId, setDraggingLayerId] = useState(null);
  const [editingLayerId,  setEditingLayerId]  = useState(null);
  const [handlesEl, setHandlesEl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showShortcuts, setShowShortcuts] = useState(false);

  const ZOOM_STEP = 0.2;
  const clampZoom = (z) => Math.max(0.15, Math.min(6, z));
  const effectiveScale = scale * userZoom;
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ── Keyboard shortcuts (zoom, hand tool, fullscreen) ─────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select"
        || document.activeElement?.isContentEditable;
      if (isTyping) return;

      // H — hold for hand (pan) mode
      if (e.code === "KeyH" && !e.repeat) {
        isHandModeRef.current = true;
        setIsHandMode(true);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.code === "Equal" || e.code === "NumpadAdd") {
          e.preventDefault();
          setUserZoom((z) => clampZoom(z + ZOOM_STEP));
          return;
        }
        if (e.code === "Minus" || e.code === "NumpadSubtract") {
          e.preventDefault();
          setUserZoom((z) => clampZoom(z - ZOOM_STEP));
          return;
        }
        if (e.code === "Digit0" || e.code === "Numpad0") {
          e.preventDefault();
          setUserZoom(1);
          setPanOffset({ x: 0, y: 0 });
          panOffsetRef.current = { x: 0, y: 0 };
          return;
        }
      }

      if (e.code === "KeyF") {
        toggleFullscreen();
        return;
      }
    };

    const onKeyUp = (e) => {
      if (e.code === "KeyH") {
        isHandModeRef.current = false;
        setIsHandMode(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── Ctrl+wheel zoom, plain wheel pan ───────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setUserZoom((z) => clampZoom(z + delta));
      } else {
        e.preventDefault();
        setPanOffset((p) => {
          const next = { x: p.x - e.deltaX, y: p.y - e.deltaY };
          panOffsetRef.current = next;
          return next;
        });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── H + drag pan ───────────────────────────────────────────────────────────
  const handleContainerMouseDown = useCallback((e) => {
    if (!isHandModeRef.current) {
      if (e.target === e.currentTarget) selectLayer(null);
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHandMode(true); // force grab cursor during drag
    const startX = e.clientX;
    const startY = e.clientY;
    const origPan = { ...panOffsetRef.current };
    const onMove = (me) => {
      const next = { x: origPan.x + me.clientX - startX, y: origPan.y + me.clientY - startY };
      panOffsetRef.current = next;
      setPanOffset(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const canvasW = project?.format?.width  ?? 1080;
  const canvasH = project?.format?.height ?? 1920;

  useEffect(() => {
    const es = scale * userZoomRef.current;
    scaleRef.current = es;
  }, [scale]);
  useEffect(() => {
    userZoomRef.current = userZoom;
    scaleRef.current = scale * userZoom;
  }, [userZoom, scale]);

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

  // Auto-seek when a layer is selected that's outside the current time window
  useEffect(() => {
    if (!selectedLayerId) return;
    const layer = useTimelineStore.getState().project?.layers?.find(l => l.id === selectedLayerId);
    if (!layer) return;
    const ct = useTimelineStore.getState().currentTime;
    if (ct < layer.start || ct >= layer.end) {
      setCurrentTime(layer.start + 0.01);
    }
  }, [selectedLayerId]);

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

    if (e.shiftKey) { toggleLayerSelection(layer.id); return; }

    const { selectedLayerIds: currentMultiIds } = useTimelineStore.getState();
    const isInMultiSelect = currentMultiIds.length > 1 && currentMultiIds.includes(layer.id);

    if (!isInMultiSelect) selectLayer(layer.id);
    setDraggingLayerId(layer.id);

    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const storeState = useTimelineStore.getState();
    const preDragProject = JSON.parse(JSON.stringify(storeState.project));
    const ct = storeState.currentTime;

    // Drag all selected layers together, or just this one
    const dragIds = isInMultiSelect ? currentMultiIds : [layer.id];

    const layerStates = dragIds.map(id => {
      const fl = storeState.project?.layers?.find((l) => l.id === id);
      if (!fl) return null;
      const resolved = resolveTransform(fl, ct);
      return {
        id,
        origT: { ...(fl.transform ?? {}) },
        origX: resolved.x ?? 0,
        origY: resolved.y ?? 0,
        localTime: Math.max(0, ct - fl.start),
        hasXKF: (fl.keyframes?.x?.length ?? 0) > 0,
        hasYKF: (fl.keyframes?.y?.length ?? 0) > 0,
        origKF: JSON.parse(JSON.stringify(fl.keyframes ?? {})),
      };
    }).filter(Boolean);

    const buildPatches = (clientX, clientY) => {
      const s = scaleRef.current;
      const { format } = useTimelineStore.getState().project ?? {};
      const cW = format?.width ?? 1080, cH = format?.height ?? 1920;
      return layerStates.map(ls => {
        const rawX = ls.origX + (clientX - startClientX) / s;
        const rawY = ls.origY + (clientY - startClientY) / s;
        const { x: newX, y: newY } = dragIds.length === 1
          ? snapBody(rawX, rawY, ls.origT.width ?? cW, ls.origT.height ?? cH, cW, cH)
          : { x: rawX, y: rawY };
        if (ls.hasXKF || ls.hasYKF) {
          const kf = JSON.parse(JSON.stringify(ls.origKF));
          const upsert = (arr, time, value) => {
            const idx = arr.findIndex((k) => Math.abs(k.time - time) < 0.001);
            if (idx >= 0) arr[idx] = { ...arr[idx], value };
            else { arr.push({ time, value }); arr.sort((a, b) => a.time - b.time); }
            return arr;
          };
          if (ls.hasXKF) kf.x = upsert(kf.x ?? [], ls.localTime, newX);
          if (ls.hasYKF) kf.y = upsert(kf.y ?? [], ls.localTime, newY);
          const transform = { ...ls.origT };
          if (!ls.hasXKF) transform.x = newX;
          if (!ls.hasYKF) transform.y = newY;
          return { id: ls.id, patch: { keyframes: kf, transform } };
        }
        return { id: ls.id, patch: { transform: { ...ls.origT, x: newX, y: newY } } };
      });
    };

    const onMove = (me) => {
      const store = useTimelineStore.getState();
      buildPatches(me.clientX, me.clientY).forEach(({ id, patch }) => store.updateLayerSilent(id, patch));
    };

    const onUp = (me) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraggingLayerId(null);
      const patches = buildPatches(me.clientX, me.clientY);
      const store = useTimelineStore.getState();
      patches.forEach(({ id, patch }, i) => {
        if (i < patches.length - 1) store.updateLayerSilent(id, patch);
        else store.commitDrag(id, patch, preDragProject);
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [selectLayer, toggleLayerSelection]);

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
      currentTime >= l.start &&
      currentTime < l.end
  );

  const sfxLayers = layers.filter((l) => l.sfx?.key && l.visible !== false);

  const mod = isMac ? "⌘" : "Ctrl";
  const SHORTCUTS = [
    { section: "Playback" },
    { key: "Space",            desc: "Play / Pause" },
    { key: "← →",              desc: "Seek ±1s  (Shift = ±5s)" },
    { section: "Layer" },
    { key: "↑ ↓ ← →",          desc: "Nudge layer ±1px (when selected)" },
    { key: "⇧ + arrows",       desc: "Nudge layer ±10px" },
    { key: `${mod}D`,           desc: "Duplicate layer" },
    { key: "Del / ⌫",           desc: "Delete layer" },
    { key: `${mod}]  /  ${mod}[`, desc: "Bring forward / send back" },
    { section: "History" },
    { key: `${mod}Z`,           desc: "Undo" },
    { key: `${mod}Y  /  ${mod}⇧Z`, desc: "Redo" },
    { section: "Canvas Zoom" },
    { key: `${mod}=  /  ${mod}+`, desc: "Zoom in" },
    { key: `${mod}−`,           desc: "Zoom out" },
    { key: `${mod}0`,           desc: "Reset zoom + pan" },
    { key: `${mod} + scroll`,   desc: "Zoom in / out" },
    { key: "Scroll",            desc: "Pan canvas" },
    { key: "H + drag",          desc: "Pan canvas (hand tool)" },
    { section: "Selection" },
    { key: "⇧ + click",         desc: "Add to multi-select" },
    { key: "F",                 desc: "Toggle fullscreen" },
    { key: "Esc",               desc: "Deselect layer" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

      {/* ── Shortcuts toolbar ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", padding: "5px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0, gap: 10, background: "#0d0d18",
      }}>
        {/* Quick hints */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#555", fontFamily: "monospace" }}>
          <span>Space ▶/⏸</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>H+drag pan</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{mod}Z undo</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{mod}Y redo</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>Esc deselect</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {/* Zoom controls */}
          <button
            onClick={() => setUserZoom((z) => clampZoom(z - ZOOM_STEP))}
            title={`Zoom out (${mod}-)`}
            style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "#999", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
          >−</button>
          <button
            onClick={() => { setUserZoom(1); setPanOffset({ x: 0, y: 0 }); panOffsetRef.current = { x: 0, y: 0 }; }}
            title={`Reset zoom (${mod}0)`}
            style={{ minWidth: 42, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: userZoom === 1 ? "#555" : "#a78bfa", fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}
          >{Math.round(userZoom * 100)}%</button>
          <button
            onClick={() => setUserZoom((z) => clampZoom(z + ZOOM_STEP))}
            title={`Zoom in (${mod}=)`}
            style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "#999", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
          >+</button>

          {/* All shortcuts link */}
          <button
            onClick={() => setShowShortcuts(true)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#555", fontFamily: "monospace", textDecoration: "underline", textUnderlineOffset: 2, padding: "0 4px", marginLeft: 4 }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#7c5cfc")}
            onMouseOut={(e)  => (e.currentTarget.style.color = "#555")}
          >All Shortcuts</button>
        </div>
      </div>

      {/* ── Canvas area (fullscreened on F / button) ───────────────────────── */}
    <div
      ref={containerRef}
      className="preview-container"
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a14",
        overflow: "hidden",
        position: "relative",
        cursor: isHandMode ? "grab" : undefined,
      }}
      onMouseDown={handleContainerMouseDown}
    >
      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 100,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 7,
          cursor: "pointer",
          padding: "5px 7px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.6,
          transition: "opacity 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseOut={(e) => (e.currentTarget.style.opacity = 0.6)}
      >
        {isFullscreen ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/>
            <polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/>
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        )}
      </button>

      {audioLayers.map((layer) => (
        <AudioLayerEl
          key={layer.id}
          layer={layer}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
      ))}
      {sfxLayers.map((layer) => (
        <SfxLayerEl
          key={`sfx-${layer.id}`}
          layer={layer}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
      ))}


      {/* Canvas wrapper — sized to scaled dimensions */}
      <div
        style={{
          position: "relative",
          width: canvasW * effectiveScale,
          height: canvasH * effectiveScale,
          flexShrink: 0,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
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
            transform: `scale(${effectiveScale})`,
            overflow: "hidden",
          }}
          onMouseDown={(e) => { if (!isHandModeRef.current) selectLayer(null); }}
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
              isSelected={layer.id === selectedLayerId || selectedLayerIds.includes(layer.id)}
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
              fontSize: Math.max(14, 24 * effectiveScale),
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
            transform: `scale(${effectiveScale})`,
            overflow: "visible",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>

      {/* ── Shortcuts modal ────────────────────────────────────────────────── */}
      {showShortcuts && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            style={{ background: "#16161f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "24px 28px", width: 440, maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e8e8f0", letterSpacing: "0.1em", textTransform: "uppercase" }}>Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>
            {SHORTCUTS.map((row, i) =>
              row.section ? (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#444", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: i === 0 ? 0 : 14, marginBottom: 6 }}>{row.section}</div>
              ) : (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <kbd style={{ fontSize: 12, fontFamily: "monospace", color: "#7c5cfc", background: "rgba(124,92,252,0.1)", padding: "2px 8px", borderRadius: 4 }}>{row.key}</kbd>
                  <span style={{ fontSize: 13, color: "#aaa" }}>{row.desc}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
