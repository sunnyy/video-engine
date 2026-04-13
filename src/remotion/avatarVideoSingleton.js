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
let _currentSrc  = null; // current src on the element (may be a blob URL after upgrade)
let _originalSrc = null; // original URL before any blob upgrade

/**
 * Returns the singleton <video>, creating or replacing it when the source
 * actually changes.
 *
 * IMPORTANT: after upgradeAvatarToBlobUrl() runs, _currentSrc is the blob URL
 * but callers always pass the original URL (project.avatar.src). Without the
 * _originalSrc check below, every call after an upgrade would see a mismatch,
 * destroy the singleton, and create a new <video> that has to re-load and
 * re-seek — causing the 1-2 second blank and lip-sync delay on beat changes.
 */
export function getAvatarVideoSingleton(src) {
  // Reuse if src matches either the live src OR the pre-upgrade original URL.
  if (_video && (_currentSrc === src || _originalSrc === src)) return _video;

  // Truly different source — tear down and recreate.
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

  _video       = v;
  _currentSrc  = src;
  _originalSrc = src;
  return v;
}

/**
 * Swap the singleton's src to a blob URL once prefetch completes.
 * Preserves currentTime and play state so playback continues seamlessly.
 * With a blob URL all data is in RAM — seeks are decode-only (~5ms vs 500ms+).
 */
export function upgradeAvatarToBlobUrl(blobUrl) {
  if (!_video || _currentSrc === blobUrl) return;
  const savedTime  = _video.currentTime;
  const wasPlaying = !_video.paused;
  _video.src = blobUrl;
  _currentSrc = blobUrl;
  _video.preload = "auto";
  // Restore position once the blob is loaded (in-memory so this is near-instant)
  _video.addEventListener("loadedmetadata", () => {
    _video.currentTime = savedTime;
    if (wasPlaying) _video.play().catch(() => {});
  }, { once: true });
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
