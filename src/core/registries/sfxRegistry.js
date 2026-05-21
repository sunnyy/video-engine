import { supabase } from "../../lib/supabase.js";

let _sfxUrlCache = {};

export async function loadSFXLibrary() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from("sfx_tracks")
      .select("*")
      .eq("is_active", true);
    if (error || !data?.length) return {};
    const map = Object.fromEntries(data.map(t => [t.key, t]));
    _sfxUrlCache = map;
    return map;
  } catch {
    return {};
  }
}

export async function getSFXUrl(key) {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("sfx_tracks")
      .select("public_url")
      .eq("key", key)
      .eq("is_active", true)
      .maybeSingle();
    return data?.public_url || null;
  } catch {
    return null;
  }
}

export function getSFXPreviewUrl(key) {
  return _sfxUrlCache[key]?.public_url || `/sfx/${key}.mp3`;
}

export function getSFXDuration(key) {
  return _sfxUrlCache[key]?.duration ?? 3;
}
