import { getAvailableLayouts } from "./getAvailableLayouts";
import { layoutRegistry } from "./layoutRegistry.js";

function randomPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function resolveLayout({
  intent,
  previousLayout = null,
  project = null
}) {

  const availableLayouts = getAvailableLayouts(project);

  let pool = [];

  switch (intent) {

    case "hook":
      pool = ["FullZone", "CenterAvatar"];
      break;

    case "list":
      pool = ["TwoTopOneBottom", "OneTopTwoBottom"];
      break;

    case "comparison":
      pool = ["SplitZone", "PictureInPicture"];
      break;

    case "stat":
      pool = ["FullZone", "ThreeZone"];
      break;

    case "quote":
      pool = ["CenterAvatar", "FullZone"];
      break;

    case "question":
      pool = ["FullZone", "SplitZone"];
      break;

    case "cta":
      pool = ["FullZone"];
      break;

    default:
      pool = ["FullZone", "SplitZone", "ThreeZone"];

  }

  const validLayouts = pool.filter((name) => {
    if (!availableLayouts.includes(name)) return false;

    const layout = layoutRegistry[name];
    if (!layout) return false;

    return true;
  });

  const filtered = validLayouts.filter((l) => l !== previousLayout);

  if (filtered.length) return randomPick(filtered);

  return randomPick(validLayouts);

}