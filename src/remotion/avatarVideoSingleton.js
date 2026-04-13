/**
 * avatarVideoSingleton.js
 *
 * A single <video> DOM element that persists for the lifetime of the browser
 * session. It is moved between beat zone containers via appendChild (which
 * re-parents without cloning or re-creating), so the video element is NEVER
 * remounted and NEVER needs to seek when beats change.
 *
 * Sync contract:
 *   - Call syncAvatarVideoFrame(frame, fps) every Remotion frame to keep the
 *     video's currentTime aligned with the composition timeline.
 *   - Call setAvatarVideoPlaying(true/false) when the player plays/pauses.
 */

let _video = null;
let _currentSrc = null;

/** Returns the singleton <video>, creating or replacing it when src changes. */
export function getAvatarVideoSingleton(src) {
  if (_video && _currentSrc === src) return _video;

  // Clean up previous element if src changed
  if (_video) {
    _video.pause();
    _video.removeAttribute("src");
    _video.load();
    _video = null;
  }

  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = src;

  _video = v;
  _currentSrc = src;
  return v;
}

/**
 * Sync the singleton's currentTime to the Remotion timeline.
 * Only seeks when drift exceeds the threshold (avoids constant seeking during playback).
 */
export function syncAvatarVideoFrame(frame, fps, isPlaying) {
  if (!_video) return;
  const targetTime = frame / fps;
  const diff = Math.abs(_video.currentTime - targetTime);

  if (isPlaying) {
    // During playback: let the video run freely, only correct large drift
    if (diff > 0.5) {
      _video.currentTime = targetTime;
    }
    if (_video.paused) {
      _video.play().catch(() => {});
    }
  } else {
    // Paused: snap to exact frame and pause
    if (diff > 1.5 / fps) {
      _video.currentTime = targetTime;
    }
    if (!_video.paused) {
      _video.pause();
    }
  }
}
