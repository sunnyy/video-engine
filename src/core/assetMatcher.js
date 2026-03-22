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

function matchByOrientation(asset, orientation) {
  if (orientation === "9:16") orientation = "vertical";
  if (orientation === "16:9") orientation = "horizontal";

  return (
    asset.orientation === "any" ||
    asset.orientation === orientation
  );
}

function matchByTags(asset, tags = []) {
  if (!tags.length) return true;

  const assetTags = asset.tags || [];

  return tags.some((tag) => assetTags.includes(tag));
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

  const candidates = data.filter(
    (asset) =>
      matchByOrientation(asset, orientation) &&
      matchByTags(asset, tags)
  );

  if (!candidates.length) return FALLBACK_ASSET;

  const asset = candidates[0];

  return {
    id: asset.id,
    type: asset.type,
    src: asset.url,
    thumbnail: asset.thumbnail_url,
    category: asset.category,
    tags: asset.tags || [],
  };
}