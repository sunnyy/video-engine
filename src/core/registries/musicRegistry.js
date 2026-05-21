import { supabase } from "../../lib/supabase.js";

export async function loadMusicLibrary() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from("music_tracks")
      .select("id, key, title, artist, mood, public_url, preview_url, bpm, duration")
      .eq("is_active", true);
    if (error || !data?.length) return {};
    return data.reduce((acc, track) => {
      if (!acc[track.mood]) acc[track.mood] = [];
      acc[track.mood].push(track);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function pickAutoMood(videoType = "viral", tone = "bold", energy = "medium") {
  if (tone === "funny" || videoType === "entertainment") return "playful";
  if (tone === "emotional" && energy === "high") return "dramatic";
  if (tone === "emotional" || videoType === "story") return "calm";
  if (videoType === "news" || videoType === "opinion") return "dramatic";
  if (energy === "low") return "calm";
  return "energetic";
}

export function pickMusicByMood(mood, library = {}) {
  const tracks = library[mood] || [];
  if (tracks.length) {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    return { src: track.public_url, label: track.title };
  }
  const all = Object.values(library).flat();
  if (all.length) {
    const track = all[Math.floor(Math.random() * all.length)];
    return { src: track.public_url, label: track.title };
  }
  return null;
}
