/**
 * classifier.js
 * Classifies a video topic into a pattern key + list count.
 * Local regex runs first (fast, free). Falls back to AI for ambiguous topics.
 */

import { serverFetch } from "../serverApi";

const NUMBER_WORDS = {
  one:1, two:2, three:3, four:4, five:5, six:6, seven:7,
  eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13,
  fourteen:14, fifteen:15, twenty:20,
};

function extractListCount(topic) {
  const t = topic.toLowerCase();
  const numMatch = t.match(/\b(\d+)\b/);
  if (numMatch) return parseInt(numMatch[1]);
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(t)) return num;
  }
  return null;
}

function detectPatternLocally(topic) {
  const t = topic.toLowerCase();
  const listCount = extractListCount(topic);

  if (listCount && /\b(ways|tips|hooks|things|reasons|mistakes|secrets|steps|hacks|facts|rules|signs|tricks|tools|strategies)\b/.test(t)) {
    return { pattern: listCount > 7 ? "listicle_simple" : "listicle_with_facts", listCount, confidence: "high" };
  }
  if (/\b(facts? about|did you know|things about|truth about)\b/.test(t)) {
    return { pattern: "facts_rapid", listCount, confidence: "high" };
  }
  if (/\b(how to|step by step|guide to|tutorial|explained)\b/.test(t)) {
    return { pattern: "explainer", listCount: null, confidence: "high" };
  }
  if (/\b(secret|nobody knows|hidden|shocking|you won't believe|the truth)\b/.test(t)) {
    return { pattern: "revealing", listCount: null, confidence: "high" };
  }
  return { pattern: "viral", listCount: null, confidence: "low" };
}

export async function classifyTopic({ topic, language, audience }) {
  // Fast local detection first
  const local = detectPatternLocally(topic);
  if (local.confidence === "high") {
    console.log("[classifier] local detection:", local.pattern, "listCount:", local.listCount);
    return local;
  }

  // Fall back to AI classifier for ambiguous topics
  try {
    const res = await serverFetch("/api/classify-topic", {
      method: "POST",
      body: JSON.stringify({ topic, language, audience }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log("[classifier] AI detection:", data.pattern, "listCount:", data.listCount);
      return data;
    }
  } catch (e) {
    console.warn("[classifier] AI fallback failed:", e.message);
  }

  return local;
}
