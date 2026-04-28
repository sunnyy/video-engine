import { supabase } from "../../lib/supabase";

export async function deleteUserAccount({ reason = "", reasonDetail = "" } = {}) {
  const { error } = await supabase.functions.invoke("delete-user", {
    body: { reason, reasonDetail },
  });
  if (error) throw error;
}
