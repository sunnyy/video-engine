/**
 * sfx.js
 * src/services/ai/shared/sfx.js
 *
 * Shared transition SFX — picks a sound that fits the MOMENT (the incoming scene's
 * content kind + camera + cut type) from the full sfx_tracks library, instead of a
 * single whoosh on every cut. Quiet on fades / "none" / continuation beats, never
 * repeats the same sound back-to-back, and capped so it reads as energy, not noise.
 * Attaches onto the INCOMING scene's base layer (s{i+1}_media or its background).
 *
 * Each scene should carry `transition_out`; richer signal (content.kind, camera,
 * continues_previous) is used when present and degrades gracefully when absent.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

// Sound palettes by moment — ordered preference lists. We pick the first key the library
// actually has, skipping the last-used one so cuts don't repeat the same sound. Keys that
// aren't in sfx_tracks are simply skipped, so this is resilient to the exact library.
const PALETTES = {
  boom:    ["cinematic_boom", "cinematic_impact", "ground_impact", "impact"],        // the hook / big reveal
  impact:  ["cinematic_impact", "impact", "soft_hit", "ground_impact", "impact_soft"], // hard cuts / fast zoom
  whoosh:  ["swoosh_cinematic", "whoosh_soft", "whoosh", "whoosh_hard"],             // slides / pans
  pop:     ["pop_soft", "pop_hard", "classic_ding", "click"],                        // stat / number / chart
  ding:    ["classic_ding", "notification_ding", "pop_soft"],                        // small affirmations
  success: ["great_success", "crowd_cheer_short", "notification_ding", "cash-register"], // the CTA / payoff
  tick:    ["tick_clock", "countdown_beep", "tick_digital"],                         // time / countdown beats
  glitch:  ["glitch_short", "glitch_long"],                                          // tech / disruption
};

// Which palette suits the INCOMING beat, from its content/camera/cut.
function paletteFor(beat, transition) {
  const kind = beat?.content?.kind;
  const cam  = beat?.camera;
  const head = `${beat?.content?.headline ?? ""} ${beat?.script_line ?? ""}`.toLowerCase();

  if (kind === "cta")                      return "success";
  if (kind === "stat" || kind === "chart") return "pop";
  if (kind === "hook")                     return "boom";
  if (/countdown|seconds|timer|deadline|\b\d{1,2}:\d{2}\b/.test(head)) return "tick";
  if (cam === "fast_zoom_in")              return "impact";
  if (/slide|pan/.test(transition || "") || /pan/.test(cam || "")) return "whoosh";
  if (transition === "zoom" || /zoom/.test(cam || ""))             return "impact";
  return "whoosh";
}

export async function attachTransitionSfx(layers, scenes, { cap = 6, volume = 0.4, label = "sfx" } = {}) {
  try {
    const { data: tracks } = await supabaseAdmin
      .from("sfx_tracks").select("key, public_url, duration").eq("is_active", true);
    if (!tracks?.length) return 0;

    // Group by CATEGORY (strip a trailing _<n> so "whoosh_3" and "whoosh" share a pool);
    // named variants like "whoosh_soft" stay their own category. More rows per category = variety.
    const byCat = new Map();
    for (const t of tracks) {
      const cat = t.key.replace(/_\d+$/, "");
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(t);
    }
    const has = (k) => byCat.has(k);
    // First existing category in any of the given preference lists (overall fallback chain).
    const firstExisting = (...keys) => keys.find(has) ?? null;
    const pickFrom = (cat) => { const a = byCat.get(cat) || []; return a[Math.floor(Math.random() * a.length)] || null; };

    let attached = 0, lastCat = null;
    const chosen = [];

    for (let i = 0; i < scenes.length - 1; i++) {
      if (attached >= cap) break;
      const t = scenes[i].transition_out;
      if (t === "fade" || t === "none" || !t) continue;   // quiet cuts stay quiet
      const next = scenes[i + 1];
      if (next?.continues_previous) continue;              // builds stay quiet

      const target = layers.find(l => l.id === `s${i + 1}_media`)
        ?? layers.find(l => l.id?.startsWith(`s${i + 1}_`) && /background/.test(l.id));
      if (!target) continue;

      const palette = PALETTES[paletteFor(next, t)] ?? PALETTES.whoosh;
      // Prefer a palette category we have and didn't just use; then any palette category; then a whoosh/impact.
      const cat = palette.find(k => has(k) && k !== lastCat)
        ?? palette.find(has)
        ?? firstExisting("whoosh", "whoosh_soft", "swoosh_cinematic", "impact")
        ?? tracks[0].key.replace(/_\d+$/, "");
      const track = pickFrom(cat);
      if (!track) continue;

      target.sfx = { key: track.key, src: track.public_url, volume, delay: -0.1 };
      lastCat = cat;
      chosen.push(track.key);
      attached++;
    }

    if (attached) console.log(`[${label}] sfx: ${attached} cues — ${chosen.join(", ")}`);
    return attached;
  } catch (e) {
    console.warn(`[${label}] sfx skipped:`, e.message);
    return 0;
  }
}
