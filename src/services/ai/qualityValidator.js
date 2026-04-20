/**
 * qualityValidator.js
 * Validates AI-generated beats and fixes common issues locally
 * without requiring a retry API call.
 */

const INTENT_SCENES = {
  shock:       "A person with wide eyes reacting to shocking news, dramatic lighting, close-up",
  curiosity:   "A person leaning forward intently at a glowing screen, cinematic lighting",
  proof:       "A chart showing dramatic growth, clean professional setting",
  reveal:      "A person's face lighting up with realization, cinematic close-up",
  empathy:     "A person nodding in understanding, warm lighting, genuine emotion",
  urgency:     "A person urgently checking their phone, dynamic angle",
  explanation: "A person explaining with confident hand gestures, clear background",
  contrast:    "Two dramatically different scenarios in split frame, high contrast",
  punchline:   "A person laughing and celebrating, bright energetic lighting",
  irony:       "Two contrasting scenes side by side, dramatic lighting",
};

function fixAssetHint(beat) {
  if (!beat.asset_hint?.prompt) return beat;

  const spokenWords = (beat.spoken || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const promptWords = (beat.asset_hint.prompt || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const overlap = promptWords.filter(w => spokenWords.includes(w)).length;

  if (overlap > 3) {
    return {
      ...beat,
      asset_hint: {
        ...beat.asset_hint,
        prompt: INTENT_SCENES[beat.intent] || `A dramatic cinematic scene with ${beat.intent} energy, professional photography`,
      },
    };
  }
  return beat;
}

export async function validateContent({ beats, pattern, expandedSequence, listCount, topic }) {
  const issues = [];

  // Rule 1: Beat count must match expected
  if (beats.length !== expandedSequence.length) {
    issues.push(`Expected ${expandedSequence.length} beats, got ${beats.length}`);
  }

  // Rule 2: For listicle, count actual item beats
  if (pattern.includes("listicle") && listCount) {
    const itemBeats = beats.filter(b => b.beatType === "item");
    if (itemBeats.length < listCount) {
      issues.push(`Expected ${listCount} item beats, got ${itemBeats.length}`);
    }
  }

  // Rule 3: Check for empty spoken text
  const emptyBeats = beats.filter(b => !b.spoken || b.spoken.trim().length < 5);
  if (emptyBeats.length > 0) {
    issues.push(`${emptyBeats.length} beats have empty spoken text`);
  }

  // Rule 4: Check asset hints echoing spoken text
  const badAssetHints = beats.filter(b => {
    if (!b.asset_hint?.prompt) return false;
    const spokenWords = (b.spoken || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const promptWords = (b.asset_hint.prompt || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const overlap = promptWords.filter(w => spokenWords.includes(w)).length;
    return overlap > 3;
  });
  if (badAssetHints.length > 0) {
    issues.push(`${badAssetHints.length} beats have asset hints echoing spoken text`);
  }

  // Fix issues locally — no retry needed
  const fixedBeats = beats.map(fixAssetHint);

  if (issues.length === 0) {
    console.log("[validator] ✓ Content passed all checks");
  } else {
    console.warn("[validator] Issues fixed locally:", issues);
  }

  return { valid: issues.filter(i => !i.includes("asset hint")).length === 0, issues, beats: fixedBeats };
}
