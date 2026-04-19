/**
 * generateStructuredShort.js
 *
 * Single AI call that returns everything buildBeatsFromScript needs.
 * No secondary AI passes required.
 *
 * Supports: Hindi, English, Hinglish, and any other language.
 * Video types: news, entertainment, explainer, opinion, story, viral
 */

import { buildBeatsFromScript } from "../../core/buildBeatsFromScript";
import { serverFetch } from "../serverApi";
import { pickAutoMusic, MUSIC_PREVIEW_URLS } from "../../core/registries/musicRegistry";
import { generateZoneImage } from "../../server/assets/falService";
import { getLayoutDef, refreshCache } from "../../core/registries/layoutRegistry";
import { uploadUserAsset } from "../assets/uploadUserAsset";
import { useAssetsStore }  from "../../store/useAssetsStore";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { getUserRules } from "../../hooks/useUserRules";
import { generateVideoDNA } from "../../core/videoDNA";
import { generateZoneContent } from "./generateZoneContent";
import { pickMotion } from "../../core/visualPlanner";

/* ─────────────────────────────────────────────────────────────
   INTENT DEFINITIONS
   These are emotional/narrative intents — NOT content types.
   The engine uses these to pick layouts, blocks, captions.
───────────────────────────────────────────────────────────── */
const INTENT_GUIDE = `
INTENTS (pick one per beat — these are emotional/narrative, not content types):
- shock       : Something surprising, unexpected, hard to believe
- curiosity   : Makes viewer want to know more, open loop
- proof       : Evidence, stat, real number that validates a claim  
- irony       : Contradiction, "they said X but actually Y"
- reveal      : The answer to the open loop, the twist
- empathy     : Viewer feels seen, "this is you"
- urgency     : Time pressure, FOMO, call to action
- explanation : Clarifying how or why something works
- contrast    : Two things compared to show difference
- punchline   : The payoff, the funny or satisfying end
`;

/* ─────────────────────────────────────────────────────────────
   VISUAL HINT GUIDE
   Only used as a hint — engine makes final visual decision.
───────────────────────────────────────────────────────────── */
const VISUAL_HINT_GUIDE = `
VISUAL_HINT (optional hint to engine — pick one if obvious):
- faces       : Human faces, reactions, people
- text_only   : Pure typography, no imagery needed
- stat        : A number or metric is the main point
- comparison  : Two things side by side
- list        : Multiple sequential points
- scene       : A place, event, or situation
- product     : An object, app, or thing being shown
`;

/* ─────────────────────────────────────────────────────────────
   AUDIENCE CONFIGS
───────────────────────────────────────────────────────────── */
const AUDIENCE_CONFIGS = {
  general:       "Speak to a broad audience. Assume no prior knowledge. Keep it universally relatable.",
  teens:         "Speak to Gen Z. Use current references, casual language, fast pace. No corporate tone.",
  professionals: "Speak to working adults. Respect their intelligence. Data and outcomes matter.",
  creators:      "Speak to content creators and builders. Behind-the-scenes insights, tools, growth.",
  parents:       "Speak to parents. Warm, practical, relatable struggles and wins.",
};

/* ─────────────────────────────────────────────────────────────
   TONE OVERRIDES
───────────────────────────────────────────────────────────── */
const TONE_OVERRIDES = {
  bold:          "Be direct, punchy, confident. No hedging. Every sentence should hit hard.",
  conversational:"Sound like a real person talking. Use contractions, pauses, natural rhythm.",
  educational:   "Teach clearly. One idea at a time. Make complex things simple.",
  funny:         "Use irony, unexpected comparisons, comic timing. Land the joke without forcing it.",
  emotional:     "Make the viewer feel something. Use personal language. Vulnerability is strength.",
};

/* ─────────────────────────────────────────────────────────────
   VIDEO TYPE CONFIGS
───────────────────────────────────────────────────────────── */
const VIDEO_TYPE_CONFIGS = {
  entertainment: {
    tone: "excited, conversational, like you just found out something wild",
    structure: "Start with the most shocking fact. Build the story. End with an opinion or question.",
    avoid: "formal language, bullet points, academic tone",
  },
  news: {
    tone: "urgent but clear, like telling a friend breaking news",
    structure: "What happened → Why it matters → What comes next",
    avoid: "speculation, dramatic exaggeration",
  },
  explainer: {
    tone: "clear, confident, slightly conversational",
    structure: "Open with a relatable problem → explain the concept → show the result",
    avoid: "jargon, too many steps, dry language",
  },
  opinion: {
    tone: "bold, direct, slightly provocative",
    structure: "Take a strong position → back it with evidence → challenge the viewer",
    avoid: "being neutral, hedging, weak conclusions",
  },
  story: {
    tone: "narrative, personal, like telling a story to a friend",
    structure: "Set the scene → conflict or tension → resolution or lesson",
    avoid: "statistics heavy, impersonal tone",
  },
  viral: {
    tone: "punchy, surprising, every line makes you want to hear the next one",
    structure: "Hook that stops the scroll → escalating reveals → satisfying end",
    avoid: "slow buildup, complex sentences, anything boring",
  },
};

/* ─────────────────────────────────────────────────────────────
   NICHE VOICE RULES
───────────────────────────────────────────────────────────── */
const NICHE_VOICE_RULES = `
NICHE VOICE RULES — apply to every word of spoken text:
- entertainment: conversational, punchy, uses 'you', rhetorical questions, dramatic pauses
- gaming: energetic, uses gaming slang naturally, competitive framing, hype language
- finance: authoritative but accessible, uses specific numbers, contrarian takes
- spiritual: reverent but modern, poetic rhythm, metaphorical, emotionally warm
- food: sensory language, descriptive, makes viewer hungry/curious
- health: empowering, science-backed tone, avoids fear-mongering
- skincare: aspirational, gentle, ingredient-aware, transformation-focused
- tech: precise, slightly nerdy, impressed by innovation, future-focused
- sports: high energy, stats-driven, tribal, celebrates effort
- education: curious, builds on what viewer knows, aha-moment focused
- travel: wanderlust-inducing, vivid scene-setting, personal feeling
- comedy: subverts expectations, timing-aware, self-aware humor
- motivational: direct, no fluff, uses 'you' aggressively, action-oriented
- news: urgent, factual, uses 'just happened' framing
- lifestyle: relatable, aspirational, first-person feel
- music: emotional, scene-setting, artist/culture aware
- business: results-focused, ROI-minded, respects viewer's time
`;

/* ─────────────────────────────────────────────────────────────
   SPOKEN TEXT PERSONALITY RULES
───────────────────────────────────────────────────────────── */
const SPOKEN_PERSONALITY_RULES = `
SPOKEN TEXT QUALITY RULES — non-negotiable:
- Sound like a real human said it, not an AI summary
- Match the niche voice above precisely — the personality should be audible
- Have sentence variety — mix short punchy sentences with longer flowing ones
- Never start two consecutive beats with the same word
- Use specific details, numbers, names where relevant — never vague generalities
- Hook beats MUST create genuine curiosity or shock — never just state a fact plainly
- If the niche is gaming: you can say "bro", "no cap", "insane clutch"
- If the niche is finance: mention real figures, timeframes, % gains/losses
- If the niche is food: use words like "crispy", "melt", "punch of flavor"
- If the niche is spiritual: rhythm matters — let lines breathe
- Each beat should have distinct emotional texture — don't let energy flatten
`;

/* ─────────────────────────────────────────────────────────────
   BEAT COUNT BY DURATION
───────────────────────────────────────────────────────────── */
const BEAT_COUNTS = {
  short:  { min: 4, max: 6  },  // ~15–25 seconds
  medium: { min: 7, max: 10 },  // ~25–45 seconds
  long:   { min: 12, max: 18 }, // ~45–60 seconds
};

/* ─────────────────────────────────────────────────────────────
   LANGUAGE INSTRUCTION
───────────────────────────────────────────────────────────── */
function getLanguageInstruction(language) {
  if (!language || language === "auto") {
    return "Choose the most natural language for this topic. Default to English unless another language clearly fits better.";
  }
  const instructions = {
    hindi:      "Write entirely in Hindi (Devanagari script). Natural spoken Hindi, not formal.",
    hinglish:   "Write in Hinglish — mix of Hindi and English as Indians naturally speak. Roman script.",
    english:    "Write in English. Natural spoken English, not formal or written style.",
    tamil:      "Write entirely in Tamil script. Natural spoken Tamil.",
    telugu:     "Write entirely in Telugu script. Natural spoken Telugu.",
    arabic:     "Write entirely in Arabic. Natural spoken Arabic, right-to-left.",
    portuguese: "Write in Brazilian Portuguese. Natural spoken style.",
  };
  return instructions[language.toLowerCase()] || instructions.english;
}

/* ─────────────────────────────────────────────────────────────
   BUILD THE PROMPT
───────────────────────────────────────────────────────────── */
function buildUserRulesBlock() {
  const { do: doRules, dont: dontRules } = getUserRules();
  if (!doRules.length && !dontRules.length) return "";
  const lines = [];
  if (doRules.length)   lines.push(`ALWAYS: ${doRules.join(" | ")}`);
  if (dontRules.length) lines.push(`NEVER: ${dontRules.join(" | ")}`);
  return `\nCREATOR RULES (highest priority — follow without exception):\n${lines.join("\n")}\n`;
}

function buildPrompt({ topic, videoType, language, durationCategory, context, audience, tone }) {
  // "auto" values → let AI infer from the topic
  const effectiveVideoType = (!videoType || videoType === "auto") ? "viral" : videoType;
  const typeConfig    = VIDEO_TYPE_CONFIGS[effectiveVideoType] || VIDEO_TYPE_CONFIGS.viral;
  const beatCount     = BEAT_COUNTS[durationCategory] || BEAT_COUNTS.short;
  const langInstr     = getLanguageInstruction(language);
  const audienceInstr = AUDIENCE_CONFIGS[audience] || AUDIENCE_CONFIGS.general;
  const toneOverride  = (!tone || tone === "auto") ? "Choose the tone that best fits this topic — be natural and authentic." : (TONE_OVERRIDES[tone] || "");
  const userRules     = buildUserRulesBlock();

  const videoTypeLabel = (!videoType || videoType === "auto") ? "auto (infer from topic)" : videoType;
  const toneLabel      = (!tone || tone === "auto")           ? "auto (infer from topic)" : tone;

  return `
You are a viral short-form video director with 15+ years of experience.
Your videos have generated billions of views across YouTube Shorts, Instagram Reels, and TikTok.
You think like a filmmaker, not a writer. Every beat is a scene. Every scene has a purpose.

LANGUAGE: ${langInstr}

VIDEO TYPE: ${videoTypeLabel}
TONE: ${toneLabel} — ${typeConfig.tone}. ${toneOverride}
STRUCTURE: ${typeConfig.structure}
AVOID: ${typeConfig.avoid}

AUDIENCE: ${audienceInstr}

TOPIC: ${topic}
${context ? `\nCONTEXT / FACTS TO USE:\n${context}` : ""}

TOPIC SPECIFICITY RULES — non-negotiable:
- Use the actual names, people, brands, and entities from this topic — never genericize them
- If the topic mentions a specific person (MrBeast, Elon Musk, Virat Kohli), use their real name in the script — especially in the first beat
- If the topic mentions a specific product, company, or event — name it explicitly
- Use real known facts and numbers where they exist — MrBeast's subscriber count, video budgets, viral milestones
- "A creator" when the topic says "MrBeast" is a critical failure — never do this
- The first beat must reference the specific subject by name, not by vague description
${userRules}
YOUR PHILOSOPHY:
- First 3 seconds = life or death. Open with the most shocking, curious, or emotional moment.
- Never explain what you're about to say. Just say it.
- Sentences are maximum 10 words. Short. Punchy. Like a punch to the face.
- Every beat must make the viewer think "wait... what?" or "no way" or "I need to know more"
- Concrete specifics beat vague generalities every time. Numbers, names, quotes, moments.
- Open loops constantly — never close an idea fully until the last beat.
- Pattern interrupt every 3-5 seconds. New angle, new energy, new perspective.
- Write exactly how a human talks on camera. Contractions, incomplete sentences, pauses.
- The CTA beat must feel earned, not forced. Never say "follow for more" — make them WANT to.

BEAT ENERGY RULES:
- Hook beat: Maximum shock, curiosity, or disbelief. Drop the viewer into the deep end.
- Escalate beat: Build tension. Raise the stakes. "But wait, it gets worse."
- Proof beat: One specific fact, number, or example. Not three. One.
- Reveal beat: The payoff. Make it worth the wait. Mic drop energy.
- Explanation beat: Calm, clear, but never boring. One idea only.
- Contrast beat: Set up the opposition sharply. "Everyone thinks X. Reality is Y."
- Stat beat: Lead with the number. Never bury it.
- Testimonial beat: Real, human, specific. Not polished.
- Visual rest beat: Let the visuals breathe. Minimal text. Atmospheric.
- CTA beat: Conversational, direct, personal. "You" not "viewers".

SCRIPT QUALITY RULES:
- You MUST generate exactly ${beatCount.max} beats. Never fewer. short=6, medium=10, long=16. If the topic runs short, add explanation beats, proof beats, or expand existing beats. Do not end early.
- Write ${beatCount.min}–${beatCount.max} beats total
- Never start two consecutive beats with the same word
- Never use: "In conclusion", "As we can see", "It's important to note", "In today's video"
- Never be vague: not "some people" but "37% of creators", not "a lot of money" but "₹10 lakh"
- First beat must not start with "Did you know" — find a more original hook
- Each beat's spoken text must work as a standalone line — remove context and it still hits
- Write in the niche voice — finance sounds authoritative, food sounds sensory, gaming sounds hype
- Hinglish topics get Hinglish scripts — mix naturally, don't force English
- Match energy to beat type — high energy beats get short punchy sentences, low energy gets rhythm
${NICHE_VOICE_RULES}
${INTENT_GUIDE}
${VISUAL_HINT_GUIDE}

ASSET DIRECTION RULES:
- asset_hint.prompt must describe a specific visual scene, not a concept
- Good: "a person's hands counting cash on a wooden desk, warm lighting, close-up"
- Bad: "a person with money showing success"
- visual_type entity = specific named person, product, landmark only
- visual_type abstract = emotion, action, concept, scene
- Never use platform logos as entity search — YouTube, Instagram, TikTok logos are not useful assets
- image_count_needed must match actual visual content in the beat — if beat is pure text, set to 0

CONTENT DENSITY RULES:
- text_density "simple" = spoken text under 10 words, one idea only
- text_density "medium" = 10–20 words, main point plus one supporting detail
- text_density "rich" = 20+ words, multiple ideas that can fill multiple zones
- Be honest about density — do not mark everything as "rich"
- image_count_needed 0 = pure text beat, no image needed
- image_count_needed 1 = one strong hero image
- image_count_needed 2 = two contrasting or complementary images
- Never exceed 2 for short-form vertical video

NICHE — Pick exactly one from this list based on the topic:
entertainment | gaming | sports | finance | education | health | lifestyle | food | travel | tech | spiritual | skincare | business | music | comedy | news | motivational

OUTPUT FORMAT — Return ONLY valid JSON, no markdown, no explanation:
{
  "videoType": "${videoType}",
  "language": "${language || 'english'}",
  "niche": "one value from the niche list above",
  "emotionalArc": "one sentence describing the emotional journey of this video",
  "beats": [
    {
      "order": 0,
      "spoken": "The exact words to be spoken",
      "intent": "shock | curiosity | proof | irony | reveal | empathy | urgency | explanation | contrast | punchline",
      "energy": 0.0,
      "visual_hint": "faces | text_only | stat | comparison | list | scene | product | none",
      "emphasis_words": ["word1", "word2"],
      "text_density": "simple | medium | rich",
      "image_count_needed": 1,
      "asset_hint": {
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "prompt": "Specific photographable scene for image generation, e.g. 'a person's hands counting cash on a wooden desk, warm lighting, close-up'",
        "visual_type": "entity | abstract",
        "search_query": "exact search query if entity (real person / physical product only), else null"
      },
      "headline": "MILLIONS SPENT",
      "subtext": "He reinvests every dollar back into content.",
      "label": "WILD STAT",
      "stat": "$3.5M",
      "tagline": "Go big or go home",
      "quote": "MrBeast doesn't make videos. He makes events.",
      "cta": "FOLLOW NOW"
    }
  ]
}

FIELD NOTES:
- spoken: natural speech, as if talking to one person
- intent: the emotional/narrative purpose of this beat
- energy: 0.0 (calm) to 1.0 (explosive) — vary this across beats
- visual_hint: what kind of visual would best serve this beat
- emphasis_words: 1–3 words from spoken text to highlight in captions
- text_density: honest assessment of how many ideas are in this beat
- image_count_needed: how many images this beat actually needs (0, 1, or 2)
- asset_hint.keywords: 2–4 concrete nouns describing what image to show
- asset_hint.prompt: specific photographable scene — describe exactly what's in frame. NEVER include text, numbers, statistics, charts, or written content in the description
- asset_hint.visual_type: "entity" = specific named real person / product / landmark; "abstract" = everything else
- asset_hint.search_query: only for entity type — "<Full Name> official photo" or "<Product> product photo". NEVER a platform name (YouTube, Instagram, TikTok, Google…). Null for abstract.

ZONE CONTENT RULES — these fields fill layout zones independently:
- headline: the single most powerful restatement of this beat. ALL CAPS optional. Max 28 chars.
- subtext: supporting detail that ADDS to the headline, never repeats it. Complete sentence. Max 55 chars.
- label: a short category tag like BREAKING, FACT CHECK, PRO TIP, WILD STAT. Max 12 chars. ALL CAPS.
- stat: the key number from this beat formatted short (₹10L, 94%, 3X). Null if no number exists.
- tagline: a short memorable phrase, different from both headline and subtext. Max 20 chars.
- quote: a quotable line with personality — something a real person would screenshot. Max 90 chars.
- cta: a short action directive for CTA-intent beats. Max 16 chars. e.g. FOLLOW NOW, TRY THIS.
- headline and subtext must NOT share the same opening words
- label must be a category tag, never a sentence fragment
- All zone fields must be INDEPENDENT — no zone should repeat another zone's content
`.trim();
}

/* ─────────────────────────────────────────────────────────────
   PARSE AND VALIDATE AI RESPONSE
───────────────────────────────────────────────────────────── */
function parseAIResponse(raw) {
  let parsed;

  try {
    // Strip markdown fences if AI ignored instructions
    const cleaned = raw
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON — cannot parse script");
  }

  if (!Array.isArray(parsed.beats) || parsed.beats.length === 0) {
    throw new Error("AI returned no beats");
  }

  // Validate niche
  const validNiches = [
    "entertainment","gaming","sports","finance","education","health","lifestyle",
    "food","travel","tech","spiritual","skincare","business","music","comedy",
    "news","motivational",
  ];
  parsed.niche = validNiches.includes(parsed.niche) ? parsed.niche : null;

  // Sanitise each beat
  const validIntents = [
    "shock","curiosity","proof","irony","reveal",
    "empathy","urgency","explanation","contrast","punchline",
  ];
  const validHints = [
    "faces","text_only","stat","comparison","list","scene","product","none",
  ];

  parsed.beats = parsed.beats.map((beat, i) => ({
    order:             beat.order          ?? i,
    spoken:            String(beat.spoken  || "").trim(),
    intent:            validIntents.includes(beat.intent) ? beat.intent : "explanation",
    energy:            typeof beat.energy === "number"
                         ? Math.min(1, Math.max(0, beat.energy))
                         : 0.5,
    visual_hint:       validHints.includes(beat.visual_hint) ? beat.visual_hint : "none",
    emphasis_words:    Array.isArray(beat.emphasis_words) ? beat.emphasis_words : [],
    text_density:      ["simple","medium","rich"].includes(beat.text_density) ? beat.text_density : null,
    image_count_needed: typeof beat.image_count_needed === "number"
                         ? Math.min(2, Math.max(0, Math.round(beat.image_count_needed)))
                         : null,
    // Zone content pre-generated by the director — used by generateZoneContent as hints
    headline: (beat.headline && beat.headline !== 'null') ? String(beat.headline).trim().slice(0, 40)  : null,
    subtext:  (beat.subtext  && beat.subtext  !== 'null') ? String(beat.subtext).trim().slice(0, 80)   : null,
    label:    (beat.label    && beat.label    !== 'null') ? String(beat.label).trim().slice(0, 20)     : null,
    stat:     (beat.stat     && beat.stat     !== 'null') ? String(beat.stat).trim().slice(0, 20)      : null,
    tagline:  (beat.tagline  && beat.tagline  !== 'null') ? String(beat.tagline).trim().slice(0, 30)   : null,
    quote:    (beat.quote    && beat.quote    !== 'null') ? String(beat.quote).trim().slice(0, 120)    : null,
    cta:      (beat.cta      && beat.cta      !== 'null') ? String(beat.cta).trim().slice(0, 24)       : null,
    asset_hint: (() => {
      const ah = beat.asset_hint || {};
      // Fallback for empty asset hints — derive from spoken text
      const spokenWords = String(beat.spoken || "").trim().split(/\s+/).filter(Boolean);
      const keywords = Array.isArray(ah.keywords) && ah.keywords.length > 0
        ? ah.keywords
        : spokenWords.slice(0, 4);
      // Fallback prompt: use keywords to form a scene description (NOT raw spoken text —
      // the echo-clearing guard below would strip it if it matched spoken verbatim).
      const rawPrompt = String(ah.prompt || "").trim();
      const prompt = rawPrompt
        || (keywords.length > 0 ? `${keywords.slice(0, 3).join(", ")}, photorealistic scene` : spokenWords.slice(0, 6).join(" "));

      const validTypes = ["entity", "abstract", "scene"];
      let visual_type  = validTypes.includes(ah.visual_type) ? ah.visual_type : "abstract";
      let search_query = ah.search_query ? String(ah.search_query).trim() : null;

      // Fix 1: Platform name guard — platform logos are never useful as beat assets.
      // If AI set visual_type=entity with a platform name in search_query, demote to abstract.
      const PLATFORM_RE = /\b(youtube|instagram|tiktok|facebook|twitter|x\.com|google|snapchat|pinterest|linkedin|reddit|whatsapp|telegram|discord)\b/i;
      if (visual_type === "entity" && search_query && PLATFORM_RE.test(search_query)) {
        visual_type  = "abstract";
        search_query = null;
      }
      // Also reject entity with no search_query — it would just do a blank image search
      if (visual_type === "entity" && !search_query) {
        visual_type = "abstract";
      }

      // Fix: detect prompts that are just spoken-text keywords joined with commas/spaces.
      // If more than 2 of the prompt's words are in the spoken text, replace with a proper scene description.
      const spokenWordSet = new Set(spokenWords.map(w => w.toLowerCase().replace(/[^\w]/g, "")));
      const promptWords   = prompt.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
      const spokenOverlap = promptWords.filter(w => w.length > 3 && spokenWordSet.has(w)).length;
      const cleanedPrompt = spokenOverlap > 2
        ? `A photorealistic scene showing ${visual_type === "entity" ? "a specific subject" : (beat.intent || "visual") + " energy"}, ${(keywords.filter(k => !spokenWordSet.has(k.toLowerCase())).slice(0, 2).join(", ") || keywords.slice(0, 2).join(", "))}, dramatic lighting, vertical 9:16`
        : prompt;

      return { keywords, prompt: cleanedPrompt, visual_type, search_query };
    })(),
  }));

  return parsed;
}

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export async function generateStructuredShort({
  topic,
  mode             = "faceless",
  orientation      = "9:16",
  durationCategory = "short",
  generateImages   = false,
  generateTTS      = false,
  ttsVoice         = "female_warm",
  language         = "english",
  videoType        = "viral",
  context          = "",
  brandColor       = null,
  audience         = "general",
  tone             = "bold",
  projectId        = null,
  talkingHead      = null,
  onProgress       = null,
}) {
  const report = (step) => { if (onProgress) onProgress(step); };

  // Always refresh layout registry before generation so newly-added Supabase layouts are visible
  await refreshCache();

  let parsedScript;

  /* ── Transcript path (Upload Video option) — focused Claude call for beat splitting + intent ── */
  if (talkingHead?.type === "upload" && talkingHead.segments?.length) {
    report("transcript");

    const rawSegments = talkingHead.segments;

    // Single focused OpenAI call — processes transcript into beats with intent + energy
    const segmentsForPrompt = rawSegments.map(s => ({
      start: s.start,
      end:   s.end,
      text:  s.text?.trim() || "",
    }));

    let aiBeats = null;
    try {
      const beatRes = await serverFetch("/api/process-beats", {
        method: "POST",
        body:   JSON.stringify({ segments: segmentsForPrompt }),
      });
      if (beatRes.ok) {
        const beatData = await beatRes.json();
        if (Array.isArray(beatData.beats) && beatData.beats.length > 0) {
          aiBeats = beatData.beats;
        }
      }
    } catch (e) {
      console.warn("[transcript beats] OpenAI call failed, using raw segments:", e.message);
    }

    // Fallback: if Claude call failed, do a simple 2s merge pass
    if (!aiBeats) {
      const merged = [];
      let pending  = null;
      for (const seg of rawSegments) {
        if (!pending) {
          pending = { ...seg };
        } else {
          pending.text = (pending.text || "") + " " + (seg.text || "");
          pending.end  = seg.end;
        }
        const dur = (pending.end ?? 0) - (pending.start ?? 0);
        if (dur >= 2.0) { merged.push(pending); pending = null; }
      }
      if (pending) merged.push(pending);

      const total = merged.length;
      aiBeats = merged.map((seg, i) => {
        const pos = total <= 1 ? 0.5 : i / (total - 1);
        let intent, energy;
        if      (i === 0)      { intent = "curiosity"; energy = 0.8; }
        else if (i === total - 1) { intent = "urgency"; energy = 0.75; }
        else if (pos < 0.35)   { intent = "shock";       energy = 0.7; }
        else if (pos < 0.65)   { intent = "explanation"; energy = 0.5; }
        else                   { intent = "reveal";       energy = 0.6; }
        return { spoken: seg.text?.trim() || "", start_sec: seg.start ?? null, end_sec: seg.end ?? null, intent, energy, showAvatar: true, asset_hint: null };
      });
    }

    const validIntentsSet = new Set(["shock","curiosity","proof","irony","reveal","empathy","urgency","explanation","contrast","punchline"]);
    parsedScript = {
      videoType,
      language,
      niche:        null,
      emotionalArc: "Viewer follows the spoken content",
      beats: aiBeats
        .filter(b => b.spoken?.trim())
        .map((b, i) => ({
          order:          i,
          spoken:         b.spoken.trim(),
          intent:         validIntentsSet.has(b.intent) ? b.intent : "explanation",
          energy:         typeof b.energy === "number" ? Math.min(1, Math.max(0, b.energy)) : 0.5,
          visual_hint:    b.showAvatar === false ? "product" : "faces",
          emphasis_words: [],
          // Pass showAvatar and asset_hint through to buildBeatsFromScript
          showAvatar:     b.showAvatar !== false, // default true
          asset_hint:     b.showAvatar === false && b.asset_hint ? {
            keywords:     Array.isArray(b.asset_hint.keywords) ? b.asset_hint.keywords : [],
            prompt:       b.asset_hint.prompt || null,
            visual_type:  ["entity","abstract","scene"].includes(b.asset_hint.visual_type) ? b.asset_hint.visual_type : "abstract",
            search_query: b.asset_hint.search_query || null,
          } : null,
          start_sec:      b.start_sec ?? null,
          end_sec:        b.end_sec   ?? null,
        })),
    };
  } else {
    /* ── Standard path — Claude script generation ── */
    report("script");

    const prompt = buildPrompt({ topic, videoType, language, durationCategory, context, audience, tone });

    const response = await serverFetch("/api/generate", {
      method: "POST",
      body:   JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data    = await response.json();
    const rawText = data.text || data.content || JSON.stringify(data);
    parsedScript  = parseAIResponse(rawText);

    // Enforce minimum beat count — retry once if AI returned too few beats
    const beatCount = BEAT_COUNTS[durationCategory] || BEAT_COUNTS.short;
    if (parsedScript.beats.length < beatCount.min) {
      console.warn(`[generateStructuredShort] Only ${parsedScript.beats.length} beats returned (min ${beatCount.min} for "${durationCategory}") — retrying`);
      const retryPrompt = prompt + `\n\nCRITICAL: Your previous response returned only ${parsedScript.beats.length} beats. You MUST return at least ${beatCount.min} beats for "${durationCategory}" duration. Target is ${beatCount.max} beats. Add more distinct beats to meet the minimum.`;
      try {
        const retryRes = await serverFetch("/api/generate", {
          method: "POST",
          body:   JSON.stringify({ prompt: retryPrompt }),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const retryRaw  = retryData.text || retryData.content || JSON.stringify(retryData);
          const retryParsed = parseAIResponse(retryRaw);
          if (retryParsed.beats.length >= beatCount.min) {
            parsedScript = retryParsed;
            console.log(`[generateStructuredShort] Retry succeeded: ${retryParsed.beats.length} beats`);
          } else {
            console.warn(`[generateStructuredShort] Retry still short (${retryParsed.beats.length}) — keeping original`);
          }
        }
      } catch (e) {
        console.warn("[generateStructuredShort] Beat count retry failed:", e.message);
      }
    }
  }

  // Compute average energy across beats for palette selection
  const avgEnergy = parsedScript.beats.length
    ? parsedScript.beats.reduce((s, b) => s + (b.energy ?? 0.5), 0) / parsedScript.beats.length
    : 0.7;

  const dna = generateVideoDNA({
    videoType,
    tone,
    niche:      parsedScript.niche || null,
    energy:     avgEnergy,
    brandColor: brandColor || null,
    language,
  });

  let beats = await buildBeatsFromScript({
    structuredBeats: parsedScript.beats,
    mode, videoType, orientation, durationCategory,
    language, topic, brandColor, audience, tone,
    // Always "none" here — the image loop below handles ALL image assignment
    // (both search scraping for entities and Fal.ai for abstract beats)
    assetSource: "none",
    dna,
  });

  // Attach asset_hint to each beat for editor display.
  // If the AI echoed spoken text verbatim as the prompt, clear it — image gen will use keywords instead.
  parsedScript.beats.forEach((src, i) => {
    if (!beats[i] || !src.asset_hint) return;
    const hint = { ...src.asset_hint };
    const spoken = (beats[i].spoken || "").trim().toLowerCase();
    if (hint.prompt && hint.prompt.trim().toLowerCase() === spoken) {
      hint.prompt = null;
    }
    beats[i].asset_hint = hint;
  });

  /* ── Phase 3a: Direct seed injection — bypass AI for seeded roles ── */
  beats.forEach(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return;

    const seedMap = {
      headline: beat.headline || null,
      subtext:  beat.subtext  || null,
      label:    beat.label    || null,
      stat:     beat.stat     || null,
      tagline:  beat.tagline  || null,
      quote:    beat.quote    || null,
      cta:      beat.cta      || null,
    };

    // First zone of each role gets the seed — subsequent zones of same role left for AI
    const filledRoles = new Set();

    layoutDef.zones
      .filter(z => z.type === "text")
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(zoneDef => {
        const seed = seedMap[zoneDef.role];
        if (!seed || filledRoles.has(zoneDef.role)) return;

        // Skip locked/static zones — content is set by layout designer or user, not AI.
        // Check BOTH the layout-def-level lock (set in Layout Editor) AND
        // the beat-level lock (set via ZoneEditor "Lock Zone" toggle in the Editor).
        const beatZoneLocked = beat.zones?.[zoneDef.id]?.locked === true;
        if (zoneDef.locked === true || zoneDef.static === true || beatZoneLocked) return;

        // Don't overwrite user-edited content
        const existing = beat.zones[zoneDef.id];
        const hasContent = existing?.content?.text?.trim();
        if (hasContent) return;

        beat.zones[zoneDef.id] = {
          ...(existing || {}),
          role: zoneDef.role,
          content: { kind: "text", text: seed },
        };
        filledRoles.add(zoneDef.role);
      });

    // Stamp role onto ALL layout text zones regardless of whether they got a seed,
    // so role is always visible in saved JSON for debugging.
    layoutDef.zones
      .filter(z => z.type === "text")
      .forEach(zoneDef => {
        if (!beat.zones[zoneDef.id]) return;
        beat.zones[zoneDef.id] = {
          ...beat.zones[zoneDef.id],
          role: zoneDef.role,
        };
      });
  });

  /* ── Phase 3: AI zone content — fills text zones intelligently ── */
  report("content");
  try {
    // Only call generateZoneContent for beats that still have unfilled text zones
    const beatsWithUnfilled = beats.filter(beat => {
      const def = getLayoutDef(beat.layout);
      if (!def) return false;
      return def.zones
        .filter(z => z.type === "text")
        .some(z => !beat.zones[z.id]?.content?.text?.trim());
    });

    console.log("[pipeline] generateZoneContent: total beats", beats.length, "→ unfilled", beatsWithUnfilled.length);

    // Build an ID→beat map so write-back is by beat ID, not by array index.
    // beatIndex from generateZoneContent is relative to beatsWithUnfilled, NOT beats —
    // using beats[beatIndex] would write to the wrong beat whenever some beats are skipped.
    const beatById = Object.fromEntries(beats.map(b => [b.id, b]));

    let zoneContentArr = [];
    if (beatsWithUnfilled.length > 0) {
      const unfilledDefs = beatsWithUnfilled.map(b => getLayoutDef(b.layout));
      zoneContentArr = await generateZoneContent({ beats: beatsWithUnfilled, layoutDefs: unfilledDefs, topic, videoDNA: dna });
    }

    zoneContentArr.forEach(({ beatIndex, beatId, zones: zc }) => {
      // Prefer beatId (stable) over beatIndex (relative to filtered subset)
      const beat = (beatId && beatById[beatId]) || beatsWithUnfilled[beatIndex];
      if (!beat) return;
      const beatDef = getLayoutDef(beat.layout);

      for (const [zoneId, filled] of Object.entries(zc)) {
        if (!filled?.text || filled.text.trim() === "") continue;

        // Never overwrite a zone already filled by seed injection — AI result loses to seed.
        if (beat.zones[zoneId]?.content?.text?.trim()) continue;

        // Only write to zones the layout def declares as type "text".
        const defZoneType = beatDef?.zones?.find(z => z.id === zoneId)?.type;
        if (defZoneType && defZoneType !== "text") {
          console.warn(`[zoneContent] zone ${zoneId}: skipping — def type "${defZoneType}" not text`);
          continue;
        }

        if (!beat.zones[zoneId]) beat.zones[zoneId] = {};
        beat.zones[zoneId] = {
          ...beat.zones[zoneId],
          role: beatDef?.zones?.find(z => z.id === zoneId)?.role || beat.zones[zoneId]?.role,
          content: { kind: "text", text: filled.text },
        };
      }
    });
    // Fix 4: Debug empty zones for known problematic layout
    beats.forEach((beat, beatIndex) => {
      if (beat.layout !== "f46f2091-91d9-4718-bef9-99b65cef32d9") return;
      const emptyZones = ["z6","z9"].filter(id => !beat.zones[id]?.content?.text?.trim());
      if (emptyZones.length > 0) {
        const returned = zoneContentArr.find(b => b.beatIndex === beatIndex);
        console.warn(`[f46f2091 debug] beat ${beatIndex} empty zones: [${emptyZones.join(",")}] | AI returned:`, JSON.stringify(returned?.zones || {}));
      }
    });
  } catch (e) {
    console.warn("[generateZoneContent] failed, using spoken text fallback:", e.message);
  }

  /* ── Stat zone fallback — fill empty stat zones so they never render blank ── */
  // Priority: beat.stat (script seed) → number/% extracted from spoken text → skip
  beats.forEach(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    if (!layoutDef) return;

    const statZones = layoutDef.zones.filter(z =>
      z.type === "text" && z.role === "stat" && !z.locked && !z.static
      && !beat.zones?.[z.id]?.locked  // also respect beat-level zone lock
    );
    if (!statZones.length) return;

    // Extract the most prominent stat-like token from the spoken text
    const spoken = beat.spoken || "";
    const statTokenMatch = spoken.match(
      /\b(\$[\d,]+(?:[KMB])?|\d+(?:[.,]\d+)?[KMBk+]?%?(?:\+| percent| million| billion| thousand)?)\b/i
    );
    const spokenStat = statTokenMatch ? statTokenMatch[1].trim() : null;

    statZones.forEach(zoneDef => {
      const existing = beat.zones[zoneDef.id];
      if (existing?.content?.text?.trim()) return; // already filled — leave it

      const fallback = beat.stat || spokenStat;
      if (!fallback) return; // nothing useful — leave blank rather than show nonsense

      beat.zones[zoneDef.id] = {
        ...(existing || {}),
        role: "stat",
        content: { kind: "text", text: String(fallback).trim() },
      };
      console.log(`[stat fallback] beat ${beat.id} zone ${zoneDef.id} → "${fallback}"`);
    });
  });

  // Image processing:
  // - Entity image search ALWAYS runs (free, deterministic, no AI cost)
  // - Abstract AI generation only runs when generateImages=true
  report("images");
  // Process beats with limited concurrency (2 at a time) to avoid fal.ai rate limits
  const processBeat = async (beat, beatIndex) => {
    const hint     = parsedScript.beats[beatIndex]?.asset_hint || null;
    const isEntity = hint?.visual_type === "entity" && !!hint.search_query;

    // Check if any asset zone in the layout has a visual_type override that forces entity search
    const def = getLayoutDef(beat.layout);
    const hasZoneEntityOverride = (def?.zones || []).some(
      z => z.type === "asset" && z.visual_type === "entity"
    );

    // Skip if no entity to search AND image gen is off
    // (still run if any zone has entity override — entity search doesn't need generateImages)
    if (!isEntity && !hasZoneEntityOverride && !generateImages) return;

    let defAssetZones = (def?.zones || [])
      .filter(z => z.type === "asset")
      .filter(z => beat.zones[z.id]?.content?.kind !== "block")
      .filter(z => !beat.zones[z.id]?.content?.asset?.src)
      .filter(z => z.id !== beat.avatarZone); // skip avatar zone — filled by talking head video

    // For text-only layouts, add a real full-bleed asset zone for the background image
    let injectedBgZoneId = null;
    if (defAssetZones.length === 0 && hint) {
      // Use the next available zone number after existing layout zones
      const existingNums = Object.keys(beat.zones)
        .map(id => parseInt(id.replace(/\D/g, ""), 10))
        .filter(n => !isNaN(n));
      const nextN = existingNums.length ? Math.max(...existingNums) + 1 : 1;
      injectedBgZoneId = `z${nextN}`;
      defAssetZones = [{ id: injectedBgZoneId, type: "asset" }];
    }

    if (!defAssetZones.length) return;

    const isLogo    = isEntity && /logo|icon/i.test(hint.search_query);
    const objectFit = isLogo ? "contain" : "cover";
    const motion    = pickMotion(beat.energy ?? 0.5, beatIndex, null, dna?.motionStyle);

    try {
      // Tier 1 — entity beats: search for the official image (always runs, used for zone 0 only)
      let entityImgUrl = null;
      if (isEntity) {
        console.log(`[img] Beat ${beatIndex}: entity search — "${hint.search_query}"`);
        try {
          const searchRes = await serverFetch("/api/search-image", {
            method: "POST",
            body:   JSON.stringify({ query: hint.search_query }),
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const tempUrl    = searchData.url || null;
            if (tempUrl) {
              try {
                const imgRes   = await fetch(tempUrl);
                const blob     = await imgRes.blob();
                const ext      = blob.type.includes("png") ? "png" : "jpg";
                const file     = new File([blob], `entity-${Date.now()}.${ext}`, { type: blob.type });
                const uploaded = await uploadUserAsset(file, "image", null, "project", projectId);
                entityImgUrl = uploaded.url;
                console.log(`[img] Beat ${beatIndex}: entity → Supabase — ${entityImgUrl}`);
                useAssetsStore.getState().addMyAsset({
                  id: uploaded.id, url: uploaded.url, file_path: uploaded.file_path,
                  type: "image", name: uploaded.name || file.name, size: uploaded.size || file.size,
                  scope: "project", project_id: projectId || null, source: "user",
                });
              } catch {
                entityImgUrl = tempUrl; // fallback: use temp URL directly
              }
            }
          }
        } catch (e) {
          console.warn(`[img] Beat ${beatIndex}: entity search failed —`, e.message);
        }
      }

      // Tier 2 — per-zone image placement.
      // Fix 2: Each zone in a beat MUST get a different image.
      // - Entity beats: zone 0 gets the entity image; zones 1+ get AI-generated variations.
      // - Abstract beats: each zone uses its own _assetPrompt; zone 1+ get a variation suffix.
      // - Track assigned URLs per beat — never reuse the same URL in two zones.
      const usedUrlsInBeat = new Set();

      await Promise.allSettled(defAssetZones.map(async (assetZone, zoneIdx) => {
        // Zone-level visual_type from layout def can force entity search for a specific zone.
        // Beat-level isEntity (from GPT hint) also triggers entity placement for zone 0.
        const zoneVisualType = assetZone.visual_type || "abstract";
        const zoneIsEntity   = zoneVisualType === "entity" && !!hint?.search_query;

        // Zone 0 gets the entity image when either:
        //   (a) the beat itself is an entity beat (isEntity), or
        //   (b) the layout zone is explicitly marked visual_type=entity
        // Subsequent zones always get AI-generated variations.
        const isEntityZone = (isEntity || zoneIsEntity) && zoneIdx === 0;
        let imgUrl = isEntityZone ? entityImgUrl : null;

        // Use AI when: not an entity zone, OR entity zone but image search returned nothing.
        const needsAI = !isEntityZone || !imgUrl;
        if (!imgUrl && needsAI && generateImages) {
          const zonePrompt = injectedBgZoneId
            ? null
            : beat.zones[assetZone.id]?._assetPrompt || null;
          const basePrompt = zonePrompt || hint?.prompt || null;

          // Add a variation directive for zone 1+ so AI produces a distinct image
          const variationSuffix = zoneIdx > 0
            ? `, different scene, different angle, variation ${zoneIdx + 1}`
            : "";
          const genPrompt = basePrompt ? basePrompt + variationSuffix : null;

          if (genPrompt) {
            console.log(`[img] Beat ${beatIndex} zone ${zoneIdx}: AI gen — "${genPrompt.slice(0, 60)}..."`);
            const img = await generateZoneImage({
              spoken: beat.spoken, intent: beat.intent,
              visual_hint: beat.visual_hint, topic, orientation,
              beatIndex, zoneIndex: zoneIdx, promptOverride: genPrompt,
              projectId, assetHint: hint, dna, beat,
            });
            imgUrl = img?.url || null;
          }

          // Final fallback — generate from spoken text alone
          if (!imgUrl) {
            console.log(`[img] Beat ${beatIndex} zone ${zoneIdx}: fallback from spoken text`);
            const img = await generateZoneImage({
              spoken: beat.spoken, intent: beat.intent,
              visual_hint: beat.visual_hint, topic, orientation,
              beatIndex, zoneIndex: zoneIdx,
              projectId, assetHint: hint, dna, beat,
            });
            imgUrl = img?.url || null;
          }
        }

        // Dedup: if this exact URL was already assigned to another zone in this beat, skip it
        if (imgUrl && usedUrlsInBeat.has(imgUrl)) {
          console.warn(`[img] Beat ${beatIndex} zone ${zoneIdx}: duplicate URL skipped — ${imgUrl.slice(-40)}`);
          imgUrl = null;
        }
        if (imgUrl) usedUrlsInBeat.add(imgUrl);

        if (!imgUrl) return;

        if (assetZone.id === injectedBgZoneId) {
          // Text-only layout: inject as a real full-bleed asset zone behind text zones
          beat.zones[injectedBgZoneId] = {
            type:    "asset",
            x: 0, y: 0, width: 100, height: 100,
            zIndex:  0,
            start:   0, end: null,
            enterAnimation: "fadeIn", exitAnimation: "none",
            content: { kind: "asset", asset: { src: imgUrl, type: "image", objectFit: "cover", motion } },
            style:   { opacity: 1, borderRadius: 0 },
            background: {},
          };
        } else {
          beat.zones[assetZone.id] = {
            ...(beat.zones[assetZone.id] || {}),
            content: { kind: "asset", asset: { src: imgUrl, type: "image", objectFit, motion } },
            ...(isLogo ? { background: { kind: "color", color: "#0d0d14" }, style: { ...(beat.zones[assetZone.id]?.style || {}), borderRadius: 16, contentPadding: 16 } } : {}),
          };
        }
      }));
    } catch (e) {
      console.warn(`[img gen] beat ${beatIndex} failed:`, e.message);
    }
  };

  // Run beats 4 at a time — fal.ai fails fast on overload so Bing fallback kicks in quickly
  for (let i = 0; i < beats.length; i += 4) {
    await Promise.allSettled([
      processBeat(beats[i],     i),
      i + 1 < beats.length ? processBeat(beats[i + 1], i + 1) : Promise.resolve(),
      i + 2 < beats.length ? processBeat(beats[i + 2], i + 2) : Promise.resolve(),
      i + 3 < beats.length ? processBeat(beats[i + 3], i + 3) : Promise.resolve(),
    ]);
  }

  // Clean up orphan asset zones — non-layout zones with no src that accumulated from
  // failed/skipped image generation runs. These render as phantom placeholders in the video.
  beats.forEach(beat => {
    const layoutDef = getLayoutDef(beat.layout);
    const layoutZoneIds = new Set((layoutDef?.zones || []).map(z => z.id));
    const cleaned = {};
    for (const [id, zone] of Object.entries(beat.zones || {})) {
      // Keep if: part of layout def, OR has actual content, OR is not an asset zone
      const isOrphanAsset = !layoutZoneIds.has(id)
        && (zone?.type === "asset" || zone?.content?.kind === "asset")
        && !zone?.content?.asset?.src;
      if (!isOrphanAsset) cleaned[id] = zone;
    }
    beat.zones = cleaned;
  });

  const script = parsedScript.beats.map(b => b.spoken).join(" ");

  // Generate TTS if requested
  let ttsAudio = null;
  if (generateTTS && script.trim()) {
    report("voiceover");
    try {
      const ttsRes = await serverFetch("/api/generate-tts", {
        method: "POST",
        body:   JSON.stringify({ script, voice: ttsVoice, speed: 1.0 }),
      });
      if (ttsRes.ok) {
        const ttsData  = await ttsRes.json();
        const audioRes = await fetch(ttsData.url);
        const blob     = await audioRes.blob();
        const file     = new File([blob], `tts-${Date.now()}.mp3`, { type: "audio/mpeg" });
        const uploaded = await uploadUserAsset(file, "audio", null, "project", projectId);

        // Sync beat durations to TTS duration
        const duration = await measureAudioDuration(uploaded.url);
        beats = syncBeatsToTTS(beats, duration);

        ttsAudio = { src: uploaded.url, volume: 1, generated: true, voice: ttsVoice };
      }
    } catch (e) {
      console.warn("[TTS gen] failed:", e.message);
    }
  }

  const autoMusicKey = pickAutoMusic(videoType, tone);

  return {
    script, beats,
    meta: { videoType: parsedScript.videoType, language: parsedScript.language, emotionalArc: parsedScript.emotionalArc, brandColor, audience, tone, dna },
    audio: { tts: ttsAudio, music: autoMusicKey ? { musicKey: autoMusicKey, src: MUSIC_PREVIEW_URLS[autoMusicKey], volume: 0.12 } : null },
    // Pass through talking head metadata so the project can store it
    talkingHead: talkingHead ? { type: talkingHead.type, videoFileName: talkingHead.videoFileName || null } : null,
  };
}