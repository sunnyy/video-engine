import { supabase } from "../../lib/supabase";

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("onboarding_done_")) localStorage.removeItem(k);
  });
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function requestPasswordReset(email) {
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signInWithGoogle(next = null) {
  // OAuth must redirect to an allow-listed URL (/dashboard). When a specific destination is
  // wanted afterwards (e.g. a plan checkout), stash it and Dashboard resumes it on landing.
  if (next) {
    try { localStorage.setItem("vq_post_login", next); } catch { /* ignore */ }
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}