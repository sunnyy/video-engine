import library from "../../assets/library.json";
import { getGalleryAssets } from "./getGalleryAssets";

function normalizeOrientation(o) {
  if (o === "9:16") return "vertical";
  if (o === "16:9") return "horizontal";
  return o || "any";
}

function searchMatch(asset, search) {
  if (!search) return true;

  const s = search.toLowerCase();

  return (
    asset.category?.toLowerCase().includes(s) ||
    asset.tags?.some((t) => t.toLowerCase().includes(s))
  );
}

function inferOrientation(asset) {

  if (asset.orientation && asset.orientation !== "any") {
    return asset.orientation;
  }

  if (asset.width && asset.height) {

    const ratio = asset.width / asset.height;

    if (ratio > 1.2) return "horizontal";
    if (ratio < 0.8) return "vertical";

    return "square";
  }

  const url = asset.url || asset.src || "";

  if (url.includes("vertical")) return "vertical";
  if (url.includes("portrait")) return "vertical";
  if (url.includes("horizontal")) return "horizontal";
  if (url.includes("landscape")) return "horizontal";

  return "any";

}

export async function getAssets({
  search = "",
  orientation = "any",
  page = 1,
  limit = 18,
}) {

  const o = normalizeOrientation(orientation);

  const galleryAssets = await getGalleryAssets({ orientation: o });

  const localAssets = library.map((a) => ({
    ...a,
    source: "library"
  }));

  let assets = [...galleryAssets, ...localAssets];

  assets = assets.map((a) => ({
    ...a,
    orientation: inferOrientation(a)
  }));

  assets = assets.filter(
    (a) =>
      a.orientation === "any" ||
      a.orientation === o
  );

  assets = assets.filter((a) => searchMatch(a, search));

  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: assets.slice(start, end),
    hasMore: end < assets.length
  };

}