/**
 * patterns.js
 * Video pattern definitions — each pattern defines the beat sequence,
 * pacing, and layout hints per beat type.
 */

export const VIDEO_PATTERNS = {
  listicle_simple: {
    label: "Listicle — Simple",
    sequence: ["hook", "item", "cta"],
    itemExpandable: true,
    description: "Hook then N items then CTA",
    pacing: { hook: 3, item: 4, fact: 3, cta: 3 },
    layoutHints: {
      hook: { visualHint: "text_only", energy: 0.9, intent: "shock" },
      item: { visualHint: "text_only", energy: 0.7, intent: "explanation" },
      cta:  { visualHint: "text_only", energy: 0.8, intent: "urgency" },
    },
  },
  listicle_with_facts: {
    label: "Listicle — With Facts",
    sequence: ["hook", "item", "fact", "item", "fact", "item", "cta"],
    itemExpandable: true,
    description: "Items alternating with supporting facts",
    pacing: { hook: 3, item: 4, fact: 3, cta: 3 },
    layoutHints: {
      hook: { visualHint: "text_only", energy: 0.9, intent: "shock" },
      item: { visualHint: "text_only", energy: 0.7, intent: "explanation" },
      fact: { visualHint: "stat",      energy: 0.8, intent: "proof" },
      cta:  { visualHint: "text_only", energy: 0.8, intent: "urgency" },
    },
  },
  revealing: {
    label: "Revealing",
    sequence: ["hook", "tension", "escalate", "escalate", "reveal", "cta"],
    itemExpandable: false,
    description: "Build tension then deliver the reveal",
    pacing: { hook: 3, tension: 4, escalate: 4, reveal: 5, cta: 3 },
    layoutHints: {
      hook:     { visualHint: "faces",     energy: 0.9, intent: "shock" },
      tension:  { visualHint: "scene",     energy: 0.7, intent: "curiosity" },
      escalate: { visualHint: "scene",     energy: 0.8, intent: "proof" },
      reveal:   { visualHint: "faces",     energy: 1.0, intent: "reveal" },
      cta:      { visualHint: "text_only", energy: 0.8, intent: "urgency" },
    },
  },
  explainer: {
    label: "Explainer",
    sequence: ["problem", "concept", "step", "step", "result", "cta"],
    itemExpandable: true,
    description: "Problem to solution step by step",
    pacing: { problem: 4, concept: 4, step: 4, result: 4, cta: 3 },
    layoutHints: {
      problem: { visualHint: "faces",     energy: 0.7, intent: "empathy" },
      concept: { visualHint: "text_only", energy: 0.6, intent: "explanation" },
      step:    { visualHint: "list",      energy: 0.6, intent: "explanation" },
      result:  { visualHint: "faces",     energy: 0.8, intent: "reveal" },
      cta:     { visualHint: "text_only", energy: 0.8, intent: "urgency" },
    },
  },
  facts_rapid: {
    label: "Facts — Rapid Fire",
    sequence: ["hook", "fact", "fact", "fact", "insight", "cta"],
    itemExpandable: true,
    description: "Rapid fire facts with connecting insight",
    pacing: { hook: 3, fact: 3, insight: 4, cta: 3 },
    layoutHints: {
      hook:    { visualHint: "text_only", energy: 0.9, intent: "shock" },
      fact:    { visualHint: "stat",      energy: 0.8, intent: "proof" },
      insight: { visualHint: "text_only", energy: 0.7, intent: "contrast" },
      cta:     { visualHint: "text_only", energy: 0.8, intent: "urgency" },
    },
  },
  viral: {
    label: "Viral / Hook",
    sequence: ["hook", "escalate", "contrast", "reveal", "punchline", "cta"],
    itemExpandable: false,
    description: "Maximum pattern interrupt viral format",
    pacing: { hook: 3, escalate: 4, contrast: 3, reveal: 4, punchline: 3, cta: 3 },
    layoutHints: {
      hook:      { visualHint: "faces",      energy: 1.0, intent: "shock" },
      escalate:  { visualHint: "scene",      energy: 0.8, intent: "curiosity" },
      contrast:  { visualHint: "comparison", energy: 0.7, intent: "irony" },
      reveal:    { visualHint: "faces",      energy: 0.9, intent: "reveal" },
      punchline: { visualHint: "text_only",  energy: 0.8, intent: "punchline" },
      cta:       { visualHint: "text_only",  energy: 0.8, intent: "urgency" },
    },
  },
};

export function getPattern(patternKey) {
  return VIDEO_PATTERNS[patternKey] || VIDEO_PATTERNS.viral;
}

export function expandPattern(pattern, listCount) {
  if (!pattern.itemExpandable || !listCount) return pattern.sequence;

  const sequence = ["hook"];
  const hasFact = pattern.sequence.includes("item") && pattern.sequence.includes("fact");
  const primaryType = pattern.sequence.find(s => s === "item" || s === "fact" || s === "step") || "item";
  const midpoint = Math.floor(listCount / 2) - 1;

  for (let i = 0; i < listCount; i++) {
    sequence.push(primaryType);

    // For listicle_with_facts: insert a fact beat after every 2nd item
    if (hasFact && i > 0 && i % 2 === 1) {
      sequence.push("fact");
    }

    // For longer lists (5+ items): insert a contrast beat at the midpoint for variety
    if (listCount >= 5 && i === midpoint) {
      sequence.push("contrast");
    }
  }

  sequence.push("cta");
  return sequence;
}
