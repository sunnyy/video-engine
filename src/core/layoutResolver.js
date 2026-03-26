import { getAvailableLayouts } from "./getAvailableLayouts";
import { layoutRegistry } from "./layoutRegistry";

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
      pool = ["HeadlineFocus", "QuoteCard", "FullZone"];
      break;

    case "list":
      pool = ["ListLayout", "SplitZone", "PictureInPicture"];
      break;

    case "comparison":
      pool = ["SplitZone", "PictureInPicture"];
      break;

    case "stat":
      pool = ["StatLayout", "HeadlineFocus"];
      break;

    case "quote":
      pool = ["QuoteCard"];
      break;

    case "question":
      pool = ["HeadlineFocus", "SplitZone"];
      break;

    case "cta":
      pool = ["HeadlineFocus", "FullZone"];
      break;

    default:
      pool = ["FullZone", "SplitZone", "HeadlineFocus"];
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