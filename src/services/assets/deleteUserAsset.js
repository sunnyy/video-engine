import { supabase } from "../../lib/supabase";

export async function deleteUserAsset(asset) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  console.log(await supabase.auth.getSession());

  console.log("Deleting:", asset.file_path);

  // 🔥 MUST use stored file_path
  const { data: storageData, error: storageError } =
    await supabase.storage
      .from("user-assets")
      .remove([asset.file_path]);

  console.log("Storage delete:", storageData, storageError);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("user_assets")
    .delete()
    .eq("id", asset.id)
    .eq("user_id", user.id);

  if (dbError) throw dbError;

  return true;
}