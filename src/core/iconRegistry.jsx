/**
 * iconRegistry.jsx
 * src/core/iconRegistry.jsx
 *
 * Built-in SVG icon library for type:"decorative" zones with content.iconId.
 * All paths are in a 100×100 viewBox.
 * Icons are stroke-based by default; set filled:true for solid fill.
 */

const iconRegistry = {

  // ── Love / Social ─────────────────────────────────────────
  heart: {
    label: "Heart", icon: "♥", group: "social",
    path: "M 50,80 C 20,63 3,50 3,32 C 3,14 18,5 35,12 C 41,15 46,19 50,25 C 54,19 59,15 65,12 C 82,5 97,14 97,32 C 97,50 80,63 50,80 Z",
    defaultFilled: true,
    defaults: { color: "#ff3366", opacity: 1, iconSize: 80 },
  },

  thumbsup: {
    label: "Thumbs Up", icon: "👍", group: "social",
    path: "M 38,72 L 38,42 C 38,42 50,22 50,8 C 58,8 60,16 58,30 L 70,30 C 75,30 78,34 78,38 C 78,40 77,42 76,44 C 79,44 81,47 81,50 C 81,53 79,55 77,56 C 79,57 80,60 80,63 C 80,67 78,69 75,69 L 55,69 C 51,74 46,74 38,72 Z M 32,42 L 26,42 C 23,42 21,44 21,47 L 21,70 C 21,73 23,75 26,75 L 32,75 Z",
    defaultFilled: true,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  thumbsdown: {
    label: "Thumbs Down", icon: "👎", group: "social",
    path: "M 38,28 L 38,58 C 38,58 50,78 50,92 C 58,92 60,84 58,70 L 70,70 C 75,70 78,66 78,62 C 78,60 77,58 76,56 C 79,56 81,53 81,50 C 81,47 79,45 77,44 C 79,43 80,40 80,37 C 80,33 78,31 75,31 L 55,31 C 51,26 46,26 38,28 Z M 32,58 L 26,58 C 23,58 21,56 21,53 L 21,30 C 21,27 23,25 26,25 L 32,25 Z",
    defaultFilled: true,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  handshake: {
    label: "Handshake", icon: "🤝", group: "social",
    path: "M 62,42 L 74,32 L 78,35 C 81,37 82,41 79,44 L 74,48 L 80,52 C 83,55 82,59 78,61 L 72,62 L 75,66 C 77,69 76,73 72,74 L 58,68 L 50,74 C 44,78 35,74 32,68 C 28,68 22,62 26,58 L 28,52 C 24,50 22,43 27,40 L 32,43 L 28,36 C 25,32 27,27 32,26 L 48,36 L 52,30 C 57,25 64,27 62,42 Z",
    defaultFilled: true,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  crown: {
    label: "Crown", icon: "👑", group: "social",
    path: "M 8,72 L 92,72 L 78,30 L 63,52 L 50,26 L 37,52 L 22,30 Z",
    defaultFilled: true,
    defaults: { color: "#f59e0b", opacity: 1, iconSize: 80 },
  },

  trophy: {
    label: "Trophy", icon: "🏆", group: "social",
    path: "M 30,8 L 70,8 L 70,45 C 70,60 62,68 50,68 C 38,68 30,60 30,45 Z M 17,8 L 30,8 L 30,32 C 30,32 17,32 17,20 Z M 70,8 L 83,8 L 83,20 C 83,32 70,32 70,32 Z M 43,68 L 43,80 L 35,90 L 65,90 L 57,80 L 57,68",
    defaultFilled: false,
    defaults: { color: "#f59e0b", opacity: 1, iconSize: 80 },
  },

  // ── Arrows / Navigation ───────────────────────────────────
  arrow_right: {
    label: "Arrow →", icon: "→", group: "arrow",
    path: "M 10,50 L 80,50 M 58,28 L 82,50 L 58,72",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  arrow_left: {
    label: "Arrow ←", icon: "←", group: "arrow",
    path: "M 90,50 L 20,50 M 42,28 L 18,50 L 42,72",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  arrow_up: {
    label: "Arrow ↑", icon: "↑", group: "arrow",
    path: "M 50,90 L 50,20 M 28,42 L 50,18 L 72,42",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  arrow_down: {
    label: "Arrow ↓", icon: "↓", group: "arrow",
    path: "M 50,10 L 50,80 M 28,58 L 50,82 L 72,58",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  chevron_right: {
    label: "Chevron ›", icon: "›", group: "arrow",
    path: "M 32,15 L 68,50 L 32,85",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  // ── Time / Alerts ─────────────────────────────────────────
  alarm: {
    label: "Alarm", icon: "🔔", group: "alert",
    path: "M 50,8 C 32,8 20,20 20,38 L 20,62 L 8,72 L 92,72 L 80,62 L 80,38 C 80,20 68,8 50,8 Z M 42,72 C 42,76.4 45.6,80 50,80 C 54.4,80 58,76.4 58,72 M 35,8 C 38,4 42,2 50,2 C 58,2 62,4 65,8",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  clock: {
    label: "Clock", icon: "🕐", group: "alert",
    path: "M 50,8 A 42,42 0 1,0 50,92 A 42,42 0 1,0 50,8 Z M 50,25 L 50,52 L 68,65",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  // ── Energy / Nature ───────────────────────────────────────
  bolt: {
    label: "Lightning", icon: "⚡", group: "energy",
    path: "M 58,5 L 25,52 L 48,52 L 42,95 L 75,48 L 52,48 Z",
    defaultFilled: true,
    defaults: { color: "#fbbf24", opacity: 1, iconSize: 80 },
  },

  fire: {
    label: "Fire", icon: "🔥", group: "energy",
    path: "M 50,8 C 50,8 65,25 65,42 C 65,50 62,55 58,58 C 60,52 56,45 50,44 C 50,44 55,33 50,22 C 48,30 42,36 42,44 C 36,41 30,50 30,60 C 30,76 38,90 50,92 C 62,90 70,76 70,60 C 70,44 58,28 50,8 Z",
    defaultFilled: true,
    defaults: { color: "#f97316", opacity: 1, iconSize: 80 },
  },

  star: {
    label: "Star", icon: "★", group: "energy",
    path: "M 50,5 L 61,36 L 95,36 L 68,58 L 79,91 L 50,70 L 21,91 L 32,58 L 5,36 L 39,36 Z",
    defaultFilled: true,
    defaults: { color: "#fbbf24", opacity: 1, iconSize: 80 },
  },

  // ── Faces / Emoji-style ───────────────────────────────────
  smile: {
    label: "Smile", icon: "😊", group: "face",
    path: "M 50,8 A 42,42 0 1,0 50,92 A 42,42 0 1,0 50,8 Z M 36,40 A 4,4 0 1,0 44,40 M 56,40 A 4,4 0 1,0 64,40 M 32,60 C 38,74 62,74 68,60",
    defaultFilled: false,
    defaults: { color: "#fbbf24", opacity: 1, iconSize: 80 },
  },

  laugh: {
    label: "Laugh", icon: "😂", group: "face",
    path: "M 50,8 A 42,42 0 1,0 50,92 A 42,42 0 1,0 50,8 Z M 34,38 L 44,38 M 56,38 L 66,38 M 30,56 C 30,72 70,72 70,56 Z",
    defaultFilled: false,
    defaults: { color: "#fbbf24", opacity: 1, iconSize: 80 },
  },

  wink: {
    label: "Wink", icon: "😉", group: "face",
    path: "M 50,8 A 42,42 0 1,0 50,92 A 42,42 0 1,0 50,8 Z M 34,40 L 44,36 L 34,36 M 56,40 A 4,4 0 1,0 64,40 M 32,60 C 38,74 62,74 68,60",
    defaultFilled: false,
    defaults: { color: "#fbbf24", opacity: 1, iconSize: 80 },
  },

  // ── Location / Contact ────────────────────────────────────
  location: {
    label: "Location", icon: "📍", group: "location",
    path: "M 50,8 C 34,8 22,20 22,36 C 22,56 50,90 50,90 C 50,90 78,56 78,36 C 78,20 66,8 50,8 Z M 50,45 A 9,9 0 1,0 50,27 A 9,9 0 1,0 50,45 Z",
    defaultFilled: true,
    defaults: { color: "#ef4444", opacity: 1, iconSize: 80 },
  },

  phone: {
    label: "Phone", icon: "📱", group: "location",
    path: "M 65,8 L 35,8 C 30,8 27,11 27,16 L 27,84 C 27,89 30,92 35,92 L 65,92 C 70,92 73,89 73,84 L 73,16 C 73,11 70,8 65,8 Z M 44,15 L 56,15 M 50,82 A 4,4 0 1,0 50,74 A 4,4 0 1,0 50,82 Z",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  // ── Checks / Status ───────────────────────────────────────
  check: {
    label: "Check", icon: "✓", group: "status",
    path: "M 10,52 L 38,78 L 90,20",
    defaultFilled: false,
    defaults: { color: "#22c55e", opacity: 1, iconSize: 80 },
  },

  check_circle: {
    label: "Check ○", icon: "✔", group: "status",
    path: "M 50,8 A 42,42 0 1,0 50,92 A 42,42 0 1,0 50,8 Z M 28,50 L 44,68 L 72,32",
    defaultFilled: false,
    defaults: { color: "#22c55e", opacity: 1, iconSize: 80 },
  },

  close: {
    label: "Close ✕", icon: "✕", group: "status",
    path: "M 18,18 L 82,82 M 82,18 L 18,82",
    defaultFilled: false,
    defaults: { color: "#ef4444", opacity: 1, iconSize: 80 },
  },

  plus: {
    label: "Plus +", icon: "+", group: "status",
    path: "M 50,12 L 50,88 M 12,50 L 88,50",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  // ── Media / Tech ──────────────────────────────────────────
  camera: {
    label: "Camera", icon: "📷", group: "media",
    path: "M 36,22 L 28,32 L 10,32 C 6,32 4,35 4,39 L 4,80 C 4,84 7,87 11,87 L 89,87 C 93,87 96,84 96,80 L 96,39 C 96,35 93,32 89,32 L 72,32 L 64,22 Z M 50,72 A 18,18 0 1,0 50,36 A 18,18 0 1,0 50,72 Z",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  music: {
    label: "Music", icon: "🎵", group: "media",
    path: "M 40,14 L 40,64 C 37,62 33,61 29,63 C 22,66 19,73 22,79 C 25,85 33,87 40,84 C 47,81 48,74 48,68 L 48,38 L 82,28 L 82,52 C 79,50 75,50 71,52 C 64,55 61,62 64,68 C 67,74 75,76 82,73 C 89,70 90,63 90,57 L 90,8 Z",
    defaultFilled: true,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  play: {
    label: "Play ▶", icon: "▶", group: "media",
    path: "M 20,10 L 85,50 L 20,90 Z",
    defaultFilled: true,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

  // ── Info / UI ─────────────────────────────────────────────
  info: {
    label: "Info", icon: "ℹ", group: "ui",
    path: "M 50,8 A 42,42 0 1,0 50,92 A 42,42 0 1,0 50,8 Z M 50,40 L 50,70 M 50,28 A 2,2 0 1,0 50,32 A 2,2 0 1,0 50,28 Z",
    defaultFilled: false,
    defaults: { color: "#3b82f6", opacity: 1, iconSize: 80 },
  },

  warning: {
    label: "Warning", icon: "⚠", group: "ui",
    path: "M 50,8 L 94,86 L 6,86 Z M 50,38 L 50,62 M 50,70 A 2,2 0 1,0 50,74 A 2,2 0 1,0 50,70 Z",
    defaultFilled: true,
    defaults: { color: "#f59e0b", opacity: 1, iconSize: 80 },
  },

  wifi: {
    label: "WiFi", icon: "📶", group: "ui",
    path: "M 50,75 A 5,5 0 1,0 50,85 A 5,5 0 1,0 50,75 Z M 26,54 C 34,44 42,40 50,40 C 58,40 66,44 74,54 M 10,38 C 22,22 36,14 50,14 C 64,14 78,22 90,38",
    defaultFilled: false,
    defaults: { color: "#ffffff", opacity: 1, iconSize: 80 },
  },

};

export default iconRegistry;

export const ICON_OPTIONS = Object.entries(iconRegistry).map(([id, entry]) => ({
  id,
  label:        entry.label,
  icon:         entry.icon,
  group:        entry.group,
  defaultFilled: entry.defaultFilled,
  defaults:     entry.defaults,
}));

export const ICON_GROUPS = [...new Set(Object.values(iconRegistry).map(e => e.group))];

/**
 * Render an icon as SVG content string.
 * @param {string} iconId
 * @param {object} style - { color, strokeWidth, filled, opacity }
 * @returns {{ viewBox: string, content: string } | null}
 */
export function renderIconSVG(iconId, style = {}) {
  const entry = iconRegistry[iconId];
  if (!entry) return null;

  const color  = style.color       ?? entry.defaults.color  ?? "#ffffff";
  const filled = style.filled      ?? entry.defaultFilled   ?? false;
  const sw     = style.strokeWidth ?? (filled ? 0 : 5);
  const fill   = filled ? color : "none";
  const stroke = filled ? "none" : color;

  const content = `<path d="${entry.path}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;

  return { viewBox: "0 0 100 100", content };
}
