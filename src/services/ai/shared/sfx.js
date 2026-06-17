/**
 * sfx.js
 * src/services/ai/shared/sfx.js
 *
 * Shared transition SFX — a tasteful whoosh on energetic cuts (slides/zooms),
 * capped so it reads as energy, not noise. Skips fades / "none" / continuation
 * beats. Attaches the sfx onto the INCOMING scene's base layer (s{i+1}_media or
 * its background). Each scene must carry `transition_out`; optional
 * `continues_previous` marks a build that should stay quiet.
 */

import { supabaseAdmin } from "../../../server/middleware/shared.js";

export async function attachTransitionSfx(layers, scenes, { cap = 6, volume = 0.4, label = "sfx" } = {}) {
  try {
    const { data: tracks } = await supabaseAdmin
      .from("sfx_tracks").select("key, public_url, duration").eq("is_active", true);
    const whoosh = (tracks ?? []).find(t => /whoosh|swoosh|swish|woosh|transition/i.test(t.key));
    if (!whoosh) return 0;

    let attached = 0;
    for (let i = 0; i < scenes.length - 1; i++) {
      if (attached >= cap) break;
      const t = scenes[i].transition_out;
      if (t === "fade" || t === "none" || !t) continue;   // quiet cuts stay quiet
      if (scenes[i + 1]?.continues_previous) continue;     // builds stay quiet
      const target = layers.find(l => l.id === `s${i + 1}_media`)
        ?? layers.find(l => l.id?.startsWith(`s${i + 1}_`) && /background/.test(l.id));
      if (!target) continue;
      target.sfx = { key: whoosh.key, src: whoosh.public_url, volume, delay: -0.1 };
      attached++;
    }
    if (attached) console.log(`[${label}] sfx: ${attached}x "${whoosh.key}"`);
    return attached;
  } catch (e) {
    console.warn(`[${label}] sfx skipped:`, e.message);
    return 0;
  }
}
