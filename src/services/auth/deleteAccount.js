import { supabase } from "../../lib/supabase";

export async function deleteUserAccount() {
  const { error } = await supabase.functions.invoke("delete-user");
  if (error) throw error;
}
