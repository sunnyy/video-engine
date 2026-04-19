import { supabase } from "../../lib/supabase";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function completeOnboarding(userId, { niche, goal }) {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, niche, goal, onboarding_completed: true, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (error) throw error;
}
