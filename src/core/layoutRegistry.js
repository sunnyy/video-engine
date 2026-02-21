import FullLayout from "../remotion/layouts/FullLayout";
import SplitLayout from "../remotion/layouts/SplitLayout";
import FloatingLayout from "../remotion/layouts/FloatingLayout";
import DualLayout from "../remotion/layouts/DualLayout";

export const layoutRegistry = {
  full: FullLayout,
  split: SplitLayout,
  floating: FloatingLayout,
  dual: DualLayout,
};