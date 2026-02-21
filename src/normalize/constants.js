export const DEFAULT_META = {
  orientation: "9:16",
  mode: "faceless",
  fps: 30,
};

export const ORIENTATION_MAP = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

export const VALID_LAYOUTS = ["full", "split", "floating", "dual"];

export const DEFAULT_BEAT = {
  duration_sec: 3,
  visible: true,
  spoken: "",
};

export const DEFAULT_CAPTION = {
  show: true,
  style: "clean",
  position: "bottom",
  animation: "fade",
};

export const DEFAULT_TRANSITION = {
  type: "cut",
  duration: 0.3,
};