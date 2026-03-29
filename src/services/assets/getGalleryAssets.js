import { supabase } from "../../lib/supabase";

function normalizeOrientation(o) {
  if (o === "9:16") return "vertical";
  if (o === "16:9") return "horizontal";
  return o;
}

export async function getGalleryAssets({ orientation }) {

  const dbOrientation = normalizeOrientation(orientation);

  let query = supabase
    .from("assets_library")
    .select("*");

  if (dbOrientation) {
    query = query.eq("orientation", dbOrientation);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Gallery asset fetch error:", error);
    return [];
  }

  return data.map((a) => ({
    id: a.id,
    url: a.url,
    thumbnail_url: a.thumbnail_url,
    type: a.type,
    orientation: a.orientation,
    category: a.category,
    tags: a.tags || [],
    source: "gallery"
  }));

}