import library from "../assets/library.json";

const FALLBACK_ASSET = {
  id: "fallback_gradient",
  category: "fallback",
  tags: [],
  orientation: "any",
  tone: "neutral",
  type: "image",
  src: null, // Layout will render gradient
};

function matchByOrientation(asset, orientation) {
  return (
    asset.orientation === "any" ||
    asset.orientation === orientation
  );
}

function matchByTags(asset, tags = []) {
  if (!tags.length) return true;
  return tags.some((tag) => asset.tags.includes(tag));
}

export function matchAsset({
  orientation,
  tags = [],
  category,
}) {
  const candidates = library.filter(
    (asset) =>
      (!category || asset.category === category) &&
      matchByOrientation(asset, orientation) &&
      matchByTags(asset, tags)
  );

  if (!candidates.length) return FALLBACK_ASSET;

  return candidates[0]; // deterministic
}