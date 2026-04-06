import { supabase } from "../../lib/supabase";

export async function uploadUserAsset(
  file,
  forcedType  = null,
  onProgress  = null,
  scope       = "project",
  projectId   = null,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const fileExt  = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const uploadUrl = `${supabase.storageUrl}/object/user-assets/${filePath}`;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      if (onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
    xhr.onerror = reject;
    xhr.send(file);
  });

  const publicUrl = `${supabase.storageUrl}/object/public/user-assets/${filePath}`;

  let assetType = forcedType;
  if (!assetType) {
    if (file.type.startsWith("video"))  assetType = "video";
    else if (file.type.startsWith("audio")) assetType = "audio";
    else assetType = "image";
  }

  const { data, error } = await supabase
    .from("user_assets")
    .insert({
      user_id:    user.id,
      url:        publicUrl,
      file_path:  filePath,
      type:       assetType,
      name:       file.name,
      size:       file.size,
      scope,
      project_id: scope === "project" ? (projectId || null) : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
