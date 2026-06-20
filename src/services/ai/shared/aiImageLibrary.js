/**
 * shared/aiImageLibrary.js — server-side reuse of previously generated AI images
 * (table `ai_image_library`). Generic, faceless, text-free concept/b-roll images
 * are safe to reuse across projects, so we look one up before paying to generate,
 * and save every new generation back for the next video. Cross-user by design.
 *
 * (The legacy client path lives in src/server/assets/falService.js; this is the
 * server equivalent the video pipelines use, via supabaseAdmin.)
 */
import { supabaseAdmin } from "../../../server/middleware/shared.js";

/** Find a reusable image by style + niche + visual_type + tag overlap + orientation.
 *  style_id is matched so a corporate video never reuses a retro image, etc. */
export async function findLibraryImage({ niche, visual_type, keywords, style_id } = {}, orientation = "9:16") {
  if (!niche || !visual_type || !keywords?.length) return null;
  try {
    const run = async (tagSlice) => {
      let q = supabaseAdmin
        .from("ai_image_library")
        .select("id, src, reuse_count")
        .eq("niche", niche)
        .eq("visual_type", visual_type)
        .eq("orientation", orientation)
        .contains("tags", tagSlice)
        .limit(10);
      if (style_id) q = q.eq("style_id", style_id);
      const { data, error } = await q;
      return error ? [] : (data ?? []);
    };

    let rows = await run(keywords.slice(0, 2));
    if (!rows.length) rows = await run(keywords.slice(0, 1));
    if (!rows.length) return null;

    const match = rows[Math.floor(Math.random() * rows.length)]; // variety, not always the first
    supabaseAdmin.from("ai_image_library")
      .update({ reuse_count: (match.reuse_count ?? 0) + 1 })
      .eq("id", match.id)
      .then(() => {}, () => {}); // fire-and-forget
    console.log(`[assets/library] reused image (${niche}/${visual_type})`);
    return { src: match.src };
  } catch (e) {
    console.warn("[assets/library] find error:", e.message);
    return null;
  }
}

/** Save a freshly generated image for future reuse. Fire-and-forget. */
export async function saveLibraryImage({ src, prompt, library = {}, orientation = "9:16", width, height, generator = "fal" }) {
  if (!src || !library?.niche || !library?.visual_type) return;
  try {
    await supabaseAdmin.from("ai_image_library").insert({
      src,
      prompt:      prompt ?? null,
      search_query: library.search_query ?? null,
      subject:     library.keywords?.[0] ?? null,
      context:     library.context ?? null,
      mood:        library.mood ?? null,
      visual_type: library.visual_type,
      style_id:    library.style_id ?? null,
      niche:       library.niche,
      intent:      library.intent ?? null,
      energy:      library.energy ?? null,
      color_mood:  library.color_mood ?? null,
      tags:        library.keywords ?? [],
      width:       width ?? null,
      height:      height ?? null,
      orientation,
      generator,
      reuse_count: 0,
    });
  } catch (e) {
    console.warn("[assets/library] save error:", e.message);
  }
}
