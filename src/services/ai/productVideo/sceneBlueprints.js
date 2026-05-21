export const SCENE_BLUEPRINTS = [
  {
    index: 0,
    scene_type: "hero_intro",
    purpose: "hook",
    duration: 2.5,
    layout: {
      product_position: "bottom_right",
      negative_space: "upper_left_40percent",
      text_position: "top_left",
      camera: "3/4 angle diagonal",
      composition_note: "Large clean upper-left area for bold typography. Product anchored lower-right. Diagonal visual flow.",
    },
  },
  {
    index: 1,
    scene_type: "feature_showcase",
    purpose: "hero",
    duration: 2.5,
    layout: {
      product_position: "upper_center",
      negative_space: "bottom_40percent",
      text_position: "bottom_panel",
      camera: "front floating elevated",
      composition_note: "Product floats in upper portion. Clean solid-color band at bottom for feature text. Clear horizontal split.",
    },
  },
  {
    index: 2,
    scene_type: "cta_ending",
    purpose: "cta",
    duration: 2.5,
    layout: {
      product_position: "center",
      negative_space: "top_30percent_and_bottom_30percent",
      text_position: "top_and_bottom",
      camera: "symmetrical front clean",
      composition_note: "Product centered. Clean space above for headline. Clean space below for CTA button. Symmetrical and minimal.",
    },
  },
];
