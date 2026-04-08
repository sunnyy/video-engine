/**
 * blockPropExtractor.js
 * src/core/ai/blockPropExtractor.js
 *
 * Extracts real content from beat spoken text into block props.
 * Uses correct prop keys matching each block's renderer defaults.
 */

/* ── Prop schemas per block type — matches renderer defaults ── */
const BLOCK_SCHEMAS = {
  StatExplosion: {
    desc: "Extract a stat/number from the spoken text",
    props: {
      prefix:      "currency or unit prefix (e.g. '$', '₹', '') — string",
      value:       "the main number/stat (e.g. '94', '2.4B', '40') — string",
      suffix:      "unit suffix (e.g. '%', 'K', 'M', 'B', 'x') — string",
      label:       "short label above number (e.g. 'Engagement Rate') — string",
      description: "one line description below number — string",
      badge:       "short badge text (e.g. '↑ 38% YoY') or empty string",
      accent:      "hex color accent, default #f0e040 — string",
    }
  },
  ListCountdown: {
    desc: "Extract a list of items from the spoken text",
    props: {
      title:  "list title (e.g. 'Top Reasons') — string",
      items:  "array of {title: string, desc: string, value: number 0-100} — up to 5 items",
      accent: "hex color, default #7c5cfc — string",
    }
  },
  QuoteHighlight: {
    desc: "Extract a quote or key statement",
    props: {
      text:   "the quote or key statement — string",
      author: "speaker or source, or empty string — string",
      accent: "hex color, default #f0e040 — string",
    }
  },
  BeforeAfter: {
    desc: "Extract two contrasting states being compared",
    props: {
      beforeLabel: "label for the 'before' state (e.g. 'Old Way', 'Without AI') — string, max 2 words",
      beforeValue: "short punchy value or word for before state (e.g. '2H', 'Slow', 'Manual') — string, max 5 chars",
      beforeDesc:  "one line description of before state — string, max 6 words",
      afterLabel:  "label for the 'after' state (e.g. 'New Way', 'With AI') — string, max 2 words",
      afterValue:  "short punchy value for after state (e.g. '0M', 'Fast', 'Auto') — string, max 5 chars",
      afterDesc:   "one line description of after state — string, max 6 words",
      accent:      "hex color, default #2dd4bf — string",
    }
  },
  HookImpact: {
    desc: "Extract the main hook/headline",
    props: {
      eyebrow:  "short category label above headline (max 3 words) or empty string — string",
      headline: "short punchy headline (max 6 words) — string",
      sub:      "optional supporting line (max 8 words) or empty string — string",
      cta:      "call-to-action button text (max 4 words) or empty string — string",
      accent:   "hex color, default #f5c518 — string",
    }
  },
  ProcessSteps: {
    desc: "Extract sequential steps from the spoken text",
    props: {
      title: "process title — string",
      steps: "array of {number: string, title: string, desc: string} — 2-4 steps",
      accent:"hex color, default #7c5cfc — string",
    }
  },
  ProblemSolution: {
    desc: "Extract a problem and its solution",
    props: {
      problemLabel:  "label for the problem side (e.g. 'The Problem', 'Before') — string, max 3 words",
      problem:       "the problem being described — string",
      solutionLabel: "label for the solution side (e.g. 'The Fix', 'After') — string, max 3 words",
      solution:      "the solution or answer — string",
      accent:        "hex color, default #f0e040 — string",
    }
  },
};

export async function extractBlockProps(beats = []) {
  const beatsWithBlocks = beats.filter(b =>
    b.block_candidate && BLOCK_SCHEMAS[b.block_candidate]
  );

  if (!beatsWithBlocks.length) return beats;

  const prompt = `You extract real content from video script beats into block props.
For each beat, read the spoken text carefully and extract actual content into the correct props.
Use the EXACT language of the spoken text — do not translate or paraphrase.
If a prop cannot be filled from the spoken text, use a short contextually appropriate placeholder.
Return ONLY a valid JSON array, no markdown.

BLOCK SCHEMAS:
${Object.entries(BLOCK_SCHEMAS).map(([type, schema]) => `
${type}: ${schema.desc}
Props: ${JSON.stringify(schema.props, null, 2)}`).join('\n')}

INPUT BEATS:
${JSON.stringify(beatsWithBlocks.map((b, i) => ({
  index: i,
  block_type: b.block_candidate,
  spoken: b.spoken,
  intent: b.intent,
})), null, 2)}

Return format (JSON array):
[
  { "index": 0, "props": { ...extracted props matching the block schema... } },
  { "index": 1, "props": null }
]

Rules:
- props: null ONLY if the spoken text has absolutely no extractable content for this block type
- For StatExplosion: ALWAYS extract a number — if none exists, infer the most relevant one
- For ListCountdown: create 3-5 items from the spoken content
- For HookImpact: condense the spoken text into a punchy headline
- NEVER copy the entire sentence as a single prop value
- Keep all text short and punchy — this is a short-form video`;

  try {
    const response = await fetch("http://localhost:5000/api/generate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    let raw = await response.json();

    // Normalize: AI sometimes wraps array in an object
    let results = raw;
    if (!Array.isArray(results)) {
      // Try common wrapper keys
      results = raw.data || raw.blocks || raw.results || raw.beats || null;
      if (!Array.isArray(results)) {
        console.warn("[blockPropExtractor] Unexpected response format, skipping extraction");
        return beats;
      }
    }

    return beats.map(beat => {
      if (!beat.block_candidate) return beat;

      const beatIdx = beatsWithBlocks.indexOf(beat);
      const result  = results.find(r => r.index === beatIdx);
      const props   = result?.props;

      // Only apply if props is a non-empty object
      if (!props || typeof props !== "object" || Array.isArray(props) || !Object.keys(props).length) {
        return beat;
      }

      return {
        ...beat,
        block_props: props,
      };
    });

  } catch (err) {
    console.error("[blockPropExtractor] Failed:", err.message);
    return beats; // return unchanged on error
  }
}