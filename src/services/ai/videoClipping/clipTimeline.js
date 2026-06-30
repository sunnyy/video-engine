/**
 * videoClipping/clipTimeline.js — builds the editable 9:16 timeline for a SINGLE clip.
 *
 * The clip's own MP4 (already cut to its range) is the spine, composited the same way Talking Head
 * does it: a blurred COVER copy fills any letterbox, the clip CONTAIN'd on top (never cropped), and
 * word-synced captions run over it. Captions are real editor text layers (reusing the Talking Head
 * caption builder) so the user can restyle/move/hide them before exporting. No render here — the
 * final MP4 is produced by the editor on export, like every other service.
 */
import { buildCaptionLayers } from "../talkingHead/captionBuilder.js";

const NO_KF = { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] };

// Blurred-fill spine: cover copy behind (muted) + contained clip on top (audio). Vertical canvas.
function spineLayers(clipUrl, dur, canvas) {
  const common = {
    type: "video", src: clipUrl, start: 0, end: dur,
    visible: true, locked: false, sfx: null, animation: null,
    trimStart: 0, trimEnd: dur, fadeIn: 0, fadeOut: 0,
    transition: { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } },
  };
  const box = (scale) => ({ x: 0, y: 0, width: canvas.width, height: canvas.height, opacity: 1, rotation: 0, scale, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" });
  const bg = { ...common, id: "clip_bg_blur", trackId: "track_clip_bg", name: "Clip BG", objectFit: "cover", muted: true, volume: 0, zIndex: 0, filter: "blur(36px)", keyframes: { ...NO_KF }, transform: box(1.12) };
  const fg = { ...common, id: "clip_video", trackId: "track_clip_video", name: "Clip", objectFit: "contain", muted: false, volume: 1, zIndex: 1, filter: null, keyframes: { ...NO_KF }, transform: box(1) };
  return [bg, fg];
}

/**
 * buildClipTimeline({ clipUrl, duration, words, captionStyle, language }) → timeline object.
 * `words` must already be CLIP-RELATIVE ([{ word, start, end }] with start/end measured from the
 * clip's own 0, not the source video).
 */
export function buildClipTimeline({ clipUrl, duration, words = [], captionStyle = "wordBlaze", language = "en" }) {
  const canvas = { width: 1080, height: 1920, orientation: "9:16" };
  const total = parseFloat((Math.max(0.5, duration) + 0.2).toFixed(3));
  const captions = buildCaptionLayers(words, { captionStyle, captionPos: 78, canvas });
  return {
    version: "2.0",
    format: { width: canvas.width, height: canvas.height, fps: 30, duration: total },
    layers: [...spineLayers(clipUrl, total, canvas), ...captions],
    meta: { source: "video_clip", language, caption_style: captionStyle, editor_version: "timeline" },
  };
}
