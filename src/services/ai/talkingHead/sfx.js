/**
 * talkingHead/sfx.js — transition SFX for cutaways, self-contained (shared import only).
 * The shared sfx.js keys off AI Video layer ids, so the TH service picks its own contextual
 * sound and attaches it onto a cutaway's lead layer. Pulls from the full sfx_tracks library.
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";

const PALETTES = {
  whoosh: ["swoosh_cinematic", "whoosh_soft", "whoosh", "whoosh_hard"], // slides into footage
  impact: ["cinematic_impact", "impact", "soft_hit", "ground_impact"],  // hard cut to a still
  pop:    ["pop_soft", "pop_hard", "classic_ding", "click"],            // a stat/number card lands
};

/** key → { public_url } for active SFX. Empty map on any failure (SFX simply won't attach). */
export async function loadSfxTracks() {
  try {
    const { data } = await supabaseAdmin.from("sfx_tracks").select("key, public_url").eq("is_active", true);
    return new Map((data ?? []).map((t) => [t.key, t]));
  } catch { return new Map(); }
}

/** First track in the palette we have and didn't just use → an sfx layer field, or null. */
export function pickSfx(byKey, paletteName, lastKey) {
  const list = PALETTES[paletteName] || PALETTES.whoosh;
  const key = list.find((k) => byKey.has(k) && k !== lastKey) || list.find((k) => byKey.has(k));
  return key ? { key, src: byKey.get(key).public_url } : null;
}
