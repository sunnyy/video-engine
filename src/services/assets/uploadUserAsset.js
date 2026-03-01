import { supabase } from "../../lib/supabase";

export async function uploadUserAsset(file) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  // 1️⃣ Upload to storage
  const { error: uploadError } = await supabase.storage.from("user-assets").upload(filePath, file, {
    contentType: "video/mp4",
  });

  if (uploadError) throw uploadError;

  // 2️⃣ Get public URL
  const { data: publicUrlData } = supabase.storage.from("user-assets").getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  // 3️⃣ Insert into user_assets table
  const { data, error } = await supabase
    .from("user_assets")
    .insert({
      user_id: user.id,
      url: publicUrl,
      file_path: filePath,
      type: file.type.startsWith("video") ? "video" : "image",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
