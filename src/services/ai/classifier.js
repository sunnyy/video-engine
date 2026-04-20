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

const NICHE_KEYWORDS = {
  finance:       /\b(money|saving|savings|broke|rich|wealth|invest|stock|budget|debt|income|financial|salary|paycheck|spending|earn|bank|loan|credit|tax|retire|cash|afford|profit|revenue|fund)\b/i,
  tech:          /\b(ai|app|software|code|programming|algorithm|data|machine learning|developer|startup|saas|api|robot|automation|gadget|hardware|phone|laptop|digital|cyber|blockchain|crypto)\b/i,
  health:        /\b(diet|fitness|workout|exercise|calories|weight|nutrition|healthy|sleep|stress|mental health|meditation|yoga|muscle|keto|protein|doctor|symptom|disease|wellness|body)\b/i,
  gaming:        /\b(game|gaming|gamer|esports|minecraft|fortnite|roblox|console|fps|rpg|mmo|twitch|stream|playstation|xbox|pc gaming)\b/i,
  food:          /\b(recipe|cooking|food|eat|dish|ingredient|restaurant|chef|meal|breakfast|lunch|dinner|taste|flavor|cuisine|bake|grill|snack)\b/i,
  travel:        /\b(travel|destination|trip|visit|flight|hotel|vacation|explore|adventure|city|beach|mountain|tour|journey|passport|country)\b/i,
  sports:        /\b(sport|athlete|football|basketball|soccer|cricket|tennis|golf|olympic|training|champion|team|player|coach|match|tournament)\b/i,
  education:     /\b(learn|study|student|school|college|university|course|degree|teach|knowledge|history|science|math|exam|class|lesson)\b/i,
  motivational:  /\b(success|hustle|grind|goal|dream|achieve|mindset|win|productive|discipline|habit|motivation|inspire|confidence|leader|consistency)\b/i,
  business:      /\b(business|entrepreneur|startup|brand|marketing|sales|client|customer|revenue|profit|strategy|founder|ceo|product|market|growth)\b/i,
  skincare:      /\b(skincare|skin|acne|moisturizer|serum|sunscreen|beauty|glow|routine|pore|wrinkle|cleanser|toner|collagen|retinol)\b/i,
  spiritual:     /\b(spiritual|universe|manifest|energy|chakra|mindfulness|consciousness|soul|karma|meditation|prayer|faith|god|divine|zen)\b/i,
  lifestyle:     /\b(lifestyle|morning routine|life hack|self.improvement|relationship|dating|fashion|home|decor|minimalist|productivity|hack)\b/i,
  music:         /\b(music|song|album|artist|band|singer|rapper|beat|lyrics|playlist|genre|pop|hip.hop|rock|jazz|concert|tour)\b/i,
  comedy:        /\b(funny|comedy|joke|humor|laugh|meme|prank|roast|skit|stand.up|parody|satire)\b/i,
  news:          /\b(news|politics|election|government|policy|economy|climate|war|protest|law|president|minister|senate|congress)\b/i,
  entertainment: /\b(movie|film|tv show|series|celebrity|netflix|streaming|actor|actress|viral|trending|pop culture|influencer|trailer)\b/i,
};

function detectNicheLocally(topic) {
  const t = topic.toLowerCase();
  for (const [niche, pattern] of Object.entries(NICHE_KEYWORDS)) {
    if (pattern.test(t)) return niche;
  }
  return null;
}

function detectPatternLocally(topic) {
  const t = topic.toLowerCase();
  const listCount = extractListCount(topic);
  const niche = detectNicheLocally(topic);

  if (listCount && /\b(ways|tips|hooks|things|reasons|mistakes|secrets|steps|hacks|facts|rules|signs|tricks|tools|strategies)\b/.test(t)) {
    return { pattern: listCount > 7 ? "listicle_simple" : "listicle_with_facts", listCount, niche, confidence: "high" };
  }
  if (/\b(facts? about|did you know|things about|truth about)\b/.test(t)) {
    return { pattern: "facts_rapid", listCount, niche, confidence: "high" };
  }
  if (/\b(how to|step by step|guide to|tutorial|explained)\b/.test(t)) {
    return { pattern: "explainer", listCount: null, niche, confidence: "high" };
  }
  if (/\b(secret|nobody knows|hidden|shocking|you won't believe|the truth)\b/.test(t)) {
    return { pattern: "revealing", listCount: null, niche, confidence: "high" };
  }
  return { pattern: "viral", listCount: null, niche, confidence: "low" };
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
