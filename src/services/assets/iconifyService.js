/**
 * iconifyService.js
 * src/services/assets/iconifyService.js
 *
 * Fetches SVG icons from the Iconify API (Phosphor Icons — set "ph").
 * All responses are cached in-memory for the session.
 */

const cache = new Map();

export async function fetchIconSVG(set, icon, color = "#ffffff") {
  const key = `${set}:${icon}:${color}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch(
      `https://api.iconify.design/${set}/${icon}.svg?color=${encodeURIComponent(color)}&width=100&height=100`
    );
    if (!res.ok) { cache.set(key, null); return null; }
    const svg = await res.text();
    cache.set(key, svg);
    return svg;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export async function searchIcons(query, set = "ph", limit = 36) {
  try {
    const res = await fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${set}&limit=${limit}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.icons ?? []).map(id => ({
      id,
      set:  id.split(":")[0],
      icon: id.split(":")[1],
    }));
  } catch {
    return [];
  }
}

/** Maps local iconRegistry keys → Phosphor icon names */
export const LOCAL_TO_PHOSPHOR = {
  heart:        "heart-fill",
  thumbsup:     "thumbs-up-fill",
  thumbsdown:   "thumbs-down-fill",
  crown:        "crown-fill",
  trophy:       "trophy-fill",
  arrow_right:  "arrow-right-bold",
  arrow_up:     "arrow-up-bold",
  arrow_down:   "arrow-down-bold",
  bolt:         "lightning-fill",
  fire:         "fire-fill",
  star:         "star-fill",
  check:        "check-bold",
  check_circle: "check-circle-fill",
  close:        "x-bold",
  clock:        "clock-fill",
  alarm:        "bell-fill",
  play:         "play-fill",
  camera:       "camera-fill",
  music:        "music-note-fill",
  location:     "map-pin-fill",
  info:         "info-fill",
  warning:      "warning-fill",
};
