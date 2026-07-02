/**
 * safeArea.js — keep readable content out of the Shorts / Reels / TikTok UI zones.
 *
 * Those apps overlay their own chrome on FIXED edges of a 9:16 video: the TOP (status bar + tabs/
 * search), the BOTTOM (caption, channel, progress bar, nav), and the RIGHT (like/comment/share/remix
 * rail). Anything the video puts there gets covered — e.g. a hook headline pinned to the very top.
 *
 * This deterministic pass keeps TEXT / icon (readable) layers inside a safe box; media, backgrounds
 * and gradients are left FULL-BLEED (they're fine under the UI). Layers are grouped per scene: a group
 * that fits the safe band is translated the minimum amount (composition preserved); a group taller/
 * wider than the band is compressed into it (monotonic → no re-ordering).
 *
 * CRITICAL: a text layer's on-screen position is driven by its entrance/settle KEYFRAMES (e.g. y
 * animates 182→92), and `transform.y` is only the resting base. Moving `transform` alone does nothing —
 * the animation replays into the UI zone. So every shift is applied to `transform` AND to that layer's
 * x/y keyframe VALUES by the same delta, relocating the whole animation while preserving its shape.
 *
 * Insets are fractions of width/height. Defaults: top 12%, bottom 18%, right 12%, left 4%.
 */

const DEFAULTS = { top: 0.12, bottom: 0.18, right: 0.12, left: 0.04 };

// Only readable content is constrained; media/background/gradient/video/audio bleed full-frame.
const isReadable = (l) => (l.type === "text" || l.type === "icon") && l.transform;

function sceneKey(l) {
  const m = (l.trackId || "").match(/^s(\d+)_/) || (l.id || "").match(/^s(\d+)_/);
  return m ? `s${m[1]}` : (l.id || "solo");
}

// Move a layer's base position AND drag its x/y keyframe animation along by the same delta, so the
// entrance/settle motion lands at the new (safe) coordinates instead of replaying into the UI zone.
function shiftAxis(l, axis, newVal) {
  const t = l.transform;
  const old = t[axis] ?? 0;
  const rounded = Math.round(newVal);
  const d = rounded - old;
  if (d === 0) return false;
  t[axis] = rounded;
  const kf = l.keyframes?.[axis];
  if (Array.isArray(kf)) for (const k of kf) if (k && typeof k.value === "number") k.value = Math.round(k.value + d);
  return true;
}

/**
 * enforceSafeArea(timeline, insets?) — nudges each scene's text/icon group inside the safe box.
 * Mutates timeline.layers in place. No-op if the timeline has no format dims.
 */
export function enforceSafeArea(timeline, insets = {}) {
  const W = timeline?.format?.width, H = timeline?.format?.height;
  if (!W || !H || !Array.isArray(timeline.layers)) {
    console.log(`[safe-area] skipped — no format dims or layers (W=${W} H=${H})`);
    return;
  }
  const { top, bottom, right, left } = { ...DEFAULTS, ...insets };
  const topPx = Math.round(H * top);
  const botPx = Math.round(H * (1 - bottom));   // content must end above this y
  const rightPx = Math.round(W * (1 - right));  // content must end before this x
  const leftPx = Math.round(W * left);
  const bandH = botPx - topPx;
  const safeW = rightPx - leftPx;

  const groups = new Map();
  let readableCount = 0;
  for (const l of timeline.layers) {
    if (!isReadable(l)) continue;
    readableCount++;
    const k = sceneKey(l);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }

  let moved = 0;
  for (const layers of groups.values()) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const l of layers) {
      const t = l.transform;
      const x = t.x ?? 0, y = t.y ?? 0, w = t.width ?? 0, h = t.height ?? 0;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
    }
    const groupH = maxY - minY, groupW = maxX - minX;
    let changed = false;

    // ── Vertical ── fit into [topPx, botPx]. If the block fits, translate it in. If it's TALLER than
    // the band (text spans top→bottom), COMPRESS the vertical spread into the band, preserving order
    // (monotonic → no re-ordering) so nothing lands in the top/bottom UI zones.
    if (groupH <= bandH) {
      let dy = 0;
      if (minY < topPx) dy = topPx - minY;
      else if (maxY > botPx) dy = botPx - maxY;
      if (dy !== 0) { for (const l of layers) changed = shiftAxis(l, "y", (l.transform.y ?? 0) + dy) || changed; }
    } else if (minY < topPx || maxY > botPx) {
      const s = bandH / groupH;
      for (const l of layers) {
        const h = l.transform.height ?? 0;
        let ny = topPx + ((l.transform.y ?? 0) - minY) * s;
        ny = Math.max(topPx, Math.min(ny, botPx - h)); // clamp so the element's BOTTOM stays inside the band
        changed = shiftAxis(l, "y", ny) || changed;
      }
    }

    // ── Horizontal ── keep clear of the right action rail. Translate if it fits the safe width, else
    // compress the horizontal spread into it (shifts wide text left, out from under the rail).
    if (groupW <= safeW) {
      let dx = 0;
      if (maxX > rightPx) dx = rightPx - maxX;
      else if (minX < leftPx) dx = leftPx - minX;
      if (dx !== 0) { for (const l of layers) changed = shiftAxis(l, "x", (l.transform.x ?? 0) + dx) || changed; }
    } else if (maxX > rightPx || minX < leftPx) {
      const s = safeW / groupW;
      for (const l of layers) {
        const w = l.transform.width ?? 0;
        let nx = leftPx + ((l.transform.x ?? 0) - minX) * s;
        nx = Math.max(leftPx, Math.min(nx, Math.max(leftPx, rightPx - w))); // keep the RIGHT edge clear when it can fit
        changed = shiftAxis(l, "x", nx) || changed;
      }
    }

    if (changed) moved++;
  }
  console.log(`[safe-area] scanned ${readableCount} text/icon layer(s) in ${groups.size} scene group(s); nudged ${moved} group(s) inside the Shorts/Reels safe box (top ${Math.round(top*100)}% / bottom ${Math.round(bottom*100)}% / right ${Math.round(right*100)}%)`);
}
