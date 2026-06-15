/**
 * director.js
 * src/services/ai/aiVideo/director.js
 *
 * GPT-4.1 creative director for AI Video. Topic → a sequence of BEATS. Each beat is
 * one idea shown as short kinetic on-screen text, with an INVENTED layout (no fixed
 * templates), a duration, and the HERO's entrance/exit motion.
 *
 * Hero motion is decided HERE (not per-scene) on purpose: the per-scene GPT-5.4 calls
 * are isolated and all converge on the same "obvious" choice (everyone zoom-ins). The
 * director is the only call that sees every beat, so it's the right place to guarantee
 * variety. Supporting elements still get their motion from GPT-5.4.
 */

import { openai } from "../../../server/middleware/shared.js";
import { ENTER_TYPES, EXIT_TYPES } from "./motion.js";

const ENTERS = ENTER_TYPES.filter(t => t !== "none");
const EXITS  = EXIT_TYPES.filter(t => t !== "none");

const SYSTEM = `You are the creative director for a short, premium MOTION-GRAPHICS video (Linear / Vercel / Stripe quality) on a given topic.

Break the topic into 5–8 BEATS. Each beat is ONE idea shown as SHORT, punchy on-screen text — a few words, kinetic, never a paragraph. The beats should flow as a single thought building to a payoff.

For each beat give:
- "text": the on-screen words (short).
- "layout": ONE short phrase describing the frame's STRUCTURE — invent it, no fixed template, make every beat different. Don't default to "headline + subhead". (e.g. "one giant word filling the frame", "a tight vertical list of three", "a single huge number with a caption".)
- "duration_seconds": 1.8–3.2.
- "motion": { "enter": one of [${ENTERS.join(", ")}], "exit": one of [${EXITS.join(", ")}] } — the HERO element's motion. CHOOSE THE ONE WHOSE FEELING MATCHES THE LINE — motion must MEAN something, never be picked at random:
    • zoom-in / punch-through — a bold reveal, an important truth, diving in
    • fly-in / fly-out (use data direction) — momentum, arrival/departure, a gesture (a swipe flies sideways)
    • rise-in — emergence, growth, optimism, building up
    • fall-out — decline, loss, dropping, "shrinking"
    • pop-in / pop-out — a quick hit, a number or stat, punchy energy
    • blur-in / blur-out — clarity emerging, focus, a realization
    • bounce-in — playful, fun, light
    • spin-in / spin-out — chaotic, dynamic, dizzying
    • drift-in / drift-out / fade — calm, quiet, reflective
  Reuse a motion when it genuinely fits the meaning; just don't make every beat identical. The choice should feel obvious given the words.

Output JSON only:
{ "title": "short title", "beats": [ { "text": "...", "layout": "...", "duration_seconds": 2.4, "motion": { "enter": "fly-in", "exit": "punch-through" } } ] }`;

function valid(pool, want, fallback) {
  return pool.includes(want) ? want : fallback;
}

function sanitize(parsed) {
  const beats = Array.isArray(parsed?.beats) ? parsed.beats : [];
  const clean = beats
    .map((b) => ({
      text:             typeof b.text === "string" ? b.text.trim() : "",
      layout:           typeof b.layout === "string" ? b.layout.trim() : "",
      duration_seconds: Math.max(1.5, Math.min(4, parseFloat(b.duration_seconds) || 2.4)),
      motion: {
        enter: valid(ENTERS, b.motion?.enter, "rise-in"),
        exit:  valid(EXITS,  b.motion?.exit,  "fade-out"),
      },
    }))
    .filter((b) => b.text);
  return { title: (parsed?.title || "AI Video").toString().slice(0, 80), beats: clean.slice(0, 9) };
}

export async function planAiVideo(topic) {
  const res = await openai.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.8,
    max_tokens: 1600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `TOPIC: ${topic}` },
    ],
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
  const out = sanitize(parsed);
  if (!out.beats.length) throw new Error("director produced no beats");
  console.log(`[ai-video] director — "${out.title}", ${out.beats.length} beats — hero motion: ${out.beats.map(b => `${b.motion.enter}/${b.motion.exit}`).join(", ")}`);
  return out;
}
