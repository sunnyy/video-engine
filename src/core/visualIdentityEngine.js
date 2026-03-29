export function buildVisualIdentity(project = {}) {

  const brandColor = project?.meta?.brand_color || "#f5c518";

  return {
    colorStory: {
      dominant: "#0b0b10",
      accent: brandColor,
      surface: "#111118",
      treatment: "dark_vivid"
    },

    typography: {
      display: "Inter",
      body: "Inter",
      weight: "600"
    },

    grain: 0.25,
    vignette: true,

    motionArc: "energetic_open_calm_close"
  };

}