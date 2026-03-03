import FullLayout from "../remotion/layouts/FullLayout.jsx";
import SplitLayout from "../remotion/layouts/SplitLayout.jsx";
import FloatingLayout from "../remotion/layouts/FloatingLayout.jsx";
import DualLayout from "../remotion/layouts/DualLayout.jsx";

export const layoutRegistry = {
  full: FullLayout,
  split: SplitLayout,
  floating: FloatingLayout,
  dual: DualLayout,
};