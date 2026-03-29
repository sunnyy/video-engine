import { supabase } from "../../lib/supabase";

const FALLBACK_ASSET = {
  id: "fallback_gradient",
  category: "fallback",
  tags: [],
  orientation: "any",
  tone: "neutral",
  type: "image",
  src: null,
};

function normalizeOrientation(o) {
  if (o === "9:16") return "vertical";
  if (o === "16:9") return "horizontal";
  return o || "any";
}

function matchByOrientation(asset, orientation) {
  orientation = normalizeOrientation(orientation);

  return (
    asset.orientation === "any" ||
    asset.orientation === orientation
  );
}

function scoreTags(asset, tags = []) {
  if (!tags.length) return 0;

  const assetTags = asset.tags || [];
  let score = 0;

  tags.forEach((tag) => {
    if (assetTags.includes(tag)) score += 3;
  });

  return score;
}

function scoreText(asset, tags = []) {

  const title = (asset.title || "").toLowerCase();
  const description = (asset.description || "").toLowerCase();

  let score = 0;

  tags.forEach((tag) => {
    if (title.includes(tag)) score += 2;
    if (description.includes(tag)) score += 1;
  });

  return score;

}

function scoreAsset(asset, tags) {

  let score = 0;

  score += scoreTags(asset, tags);
  score += scoreText(asset, tags);

  if (asset.type === "video") score += 0.5;

  return score;

}

export async function matchAsset({
  orientation,
  tags = [],
  category,
}) {

  let query = supabase.from("assets_library").select("*");

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    console.error("Asset match error:", error);
    return FALLBACK_ASSET;
  }

  const normalizedOrientation = normalizeOrientation(orientation);

  const candidates = data.filter((asset) =>
    matchByOrientation(asset, normalizedOrientation)
  );

  if (!candidates.length) return FALLBACK_ASSET;

  let best = null;
  let bestScore = -1;

  for (const asset of candidates) {

    const score = scoreAsset(asset, tags);

    if (score > bestScore) {
      bestScore = score;
      best = asset;
    }

  }

  if (!best) return FALLBACK_ASSET;

  return {
    id: best.id,
    type: best.type,
    src: best.url,
    thumbnail: best.thumbnail_url,
    category: best.category,
    tags: best.tags || [],
  };

}