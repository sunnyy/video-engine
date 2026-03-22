import { supabase } from "../../lib/supabase";

export async function getGalleryAssets({ orientation }) {
  let dbOrientation = orientation;

  if (orientation === "9:16") dbOrientation = "vertical";
  if (orientation === "16:9") dbOrientation = "horizontal";

  console.log("DB ORIENTATION:", dbOrientation);

  let query = supabase.from("assets_library").select("*");

  if (dbOrientation) {
    query = query.eq("orientation", dbOrientation);
  }

  const { data, error } = await query;

  console.log("SUPABASE RAW DATA:", data);
  console.log("SUPABASE ERROR:", error);

  if (error) {
    return [];
  }

  return (
    data?.map((a) => ({
      id: a.id,
      url: a.url,
      thumbnail_url: a.thumbnail_url,
      type: a.type,
      source: "gallery",
    })) || []
  );
}