const CANVAS_W = 1080;
const CANVAS_H = 1920;

function isTooDark(hex) {
  const c = hex?.replace("#", "");
  if (!c || c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 60;
}

const PRESETS = {
  "background-image": (s, e) => ({
    keyframes: { x: [], y: [], scale: [{ time: 0, value: 1, easing: "linear" }, { time: e - s, value: 1.06, easing: "linear" }], rotation: [], opacity: [], blur: [] },
    animation: { in: { type: "fade", duration: 0.5 }, out: { type: "none", duration: 0.3 } },
    transition: { type: "fade", duration: 0.5 },
  }),
  "overlay": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "panel": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "headline": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0.12, value: 0, easing: "ease-out" }, { time: 0.52, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "headline-accent": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0.22, value: 0, easing: "ease-out" }, { time: 0.62, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "subheadline": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0.3, value: 0, easing: "ease-out" }, { time: 0.7, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "body": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0.4, value: 0, easing: "ease-out" }, { time: 0.8, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "feature": (s, e, i = 0) => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0.3 + i * 0.1, value: 0, easing: "ease-out" }, { time: 0.7 + i * 0.1, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "brand": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0, value: 0, easing: "ease-out" }, { time: 0.4, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "cta-button": () => ({ keyframes: { x: [], y: [], scale: [{ time: 0.4, value: 0.85, easing: "ease-out" }, { time: 0.7, value: 1, easing: "ease-out" }], rotation: [], opacity: [{ time: 0.4, value: 0, easing: "ease-out" }, { time: 0.7, value: 1, easing: "ease-out" }], blur: [] }, animation: { in: { type: "zoom", duration: 0.4 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "accent-line": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] }, animation: { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
  "accent-shape": () => ({ keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [], blur: [] }, animation: { in: { type: "fade", duration: 0.3 }, out: { type: "none", duration: 0.3 } }, transition: { type: "none", duration: 0.5 } }),
};

export function convertScenesToTimeline(aiOutput, shotUrls, logoUrl = null) {
  const layers = [];
  const featureCount = {};

  aiOutput.scenes.forEach((scene, sceneIndex) => {
    const start = sceneIndex * scene.sceneDuration;
    const end = start + scene.sceneDuration;
    const shotUrl = shotUrls[sceneIndex];
    featureCount[sceneIndex] = 0;

    scene.layers.forEach(aiLayer => {
      const role = aiLayer.role || "body";
      const fi = role === "feature" ? featureCount[sceneIndex]++ : 0;
      const preset = (PRESETS[role] || PRESETS["body"])(start, end, fi);

      const cx = ((aiLayer.x ?? 0) + (aiLayer.width ?? 80) / 2) - CANVAS_W / 2;
      const cy = ((aiLayer.y ?? 0) + (aiLayer.height ?? 80) / 2) - CANVAS_H / 2;

      const trackId = role === "feature"
        ? `track_feature_${fi}`
        : `track_${role}`;

      const base = {
        id: aiLayer.id,
        trackId,
        start,
        end,
        zIndex: aiLayer.zIndex || 1,
        visible: true,
        locked: false,
        sfx: null,
        ...preset,
      };

      if (role === "background-image") {
        const isVideo = scene.sceneType === "video" || (shotUrl && shotUrl.includes(".mp4"));
        layers.push({
          ...base,
          type: isVideo ? "video" : "image",
          src: shotUrl,
          objectFit: "cover",
          transform: { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, opacity: 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
        });
      } else if (aiLayer.type === "icon") {
        const iw = aiLayer.width || 80;
        const ih = aiLayer.height || 80;
        const ix = aiLayer.x != null ? (aiLayer.x + iw / 2) - CANVAS_W / 2 : cx;
        const iy = aiLayer.y != null ? (aiLayer.y + ih / 2) - CANVAS_H / 2 : cy;
        layers.push({
          ...base,
          type: "icon",
          iconName: aiLayer.iconName || "Star",
          style: {
            color: isTooDark(aiLayer.style?.color) ? "#ffffff" : (aiLayer.style?.color || "#ffffff"),
            weight: aiLayer.style?.weight || "regular",
          },
          transform: { x: ix, y: iy, width: iw, height: ih, opacity: aiLayer.style?.opacity || 1, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
        });
      } else if (aiLayer.type === "text") {
        layers.push({
          ...base,
          type: "text",
          content: aiLayer.content || "",
          style: {
            fontFamily: aiLayer.style?.fontFamily || "Outfit",
            fontSize: aiLayer.style?.fontSize || 48,
            fontWeight: aiLayer.style?.fontWeight || 400,
            color: aiLayer.style?.color || "#ffffff",
            textAlign: aiLayer.style?.textAlign || "left",
            lineHeight: aiLayer.style?.lineHeight || 1.2,
            letterSpacing: aiLayer.style?.letterSpacing || 0,
            textTransform: aiLayer.style?.textTransform || "none",
            background: aiLayer.style?.background || null,
            borderRadius: aiLayer.style?.borderRadius || 0,
            padding: aiLayer.style?.padding || 0,
            textShadow: aiLayer.style?.textShadow || null,
          },
          transform: { x: cx, y: cy, width: aiLayer.width, height: aiLayer.height, opacity: aiLayer.style?.opacity || 1, rotation: aiLayer.rotation || 0, scale: 1, blur: aiLayer.style?.blur || 0, borderRadius: aiLayer.style?.borderRadius || 0, borderWidth: 0, borderColor: "#ffffff" },
        });
      } else {
        layers.push({
          ...base,
          type: "gradient",
          gradient: aiLayer.style?.background || "#000000",
          transform: { x: cx, y: cy, width: aiLayer.width, height: aiLayer.height, opacity: aiLayer.style?.opacity || 1, rotation: role === "accent-line" ? 0 : (aiLayer.rotation || 0), scale: 1, blur: aiLayer.style?.blur || 0, borderRadius: aiLayer.style?.borderRadius || 0, borderWidth: 0, borderColor: "#ffffff" },
        });
      }
    });

    // Logo — top-left corner, every scene
    // canvas top-left coords: x=60, y=100, w=200, h=80 → center-origin: x=-380, y=-820
    if (logoUrl) {
      layers.push({
        id: `s${sceneIndex}_logo`,
        trackId: "track_logo",
        type: "image",
        src: logoUrl,
        objectFit: "contain",
        start,
        end,
        zIndex: 20,
        visible: true,
        locked: false,
        sfx: null,
        keyframes: { x: [], y: [], scale: [], rotation: [], opacity: [{ time: 0, value: 0, easing: "ease-out" }, { time: 0.4, value: 1, easing: "ease-out" }], blur: [] },
        animation: { in: { type: "fade", duration: 0.4 }, out: { type: "none", duration: 0.3 } },
        transition: { type: "none", duration: 0.5 },
        transform: { x: -380, y: -820, width: 200, height: 80, opacity: 0.92, rotation: 0, scale: 1, blur: 0, borderRadius: 0, borderWidth: 0, borderColor: "#ffffff" },
      });
    }
  });

  return layers;
}
