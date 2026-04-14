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
  medium: { min: 6, max: 9  },  // ~25–45 seconds
  long:   { min: 9, max: 13 },  // ~45–60 seconds
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
You are a viral short-form video scriptwriter and creative director with a distinct creative voice for every niche.

LANGUAGE: ${langInstr}

VIDEO TYPE: ${videoTypeLabel}
TONE: ${toneLabel} — ${typeConfig.tone}. ${toneOverride}
STRUCTURE: ${typeConfig.structure}
AVOID: ${typeConfig.avoid}

AUDIENCE: ${audienceInstr}

TOPIC: ${topic}
${context ? `\nCONTEXT / FACTS TO USE:\n${context}` : ""}
${userRules}
${NICHE_VOICE_RULES}
${SPOKEN_PERSONALITY_RULES}
${INTENT_GUIDE}

${VISUAL_HINT_GUIDE}

YOUR JOB:
Write a script for a short-form vertical video (TikTok / Instagram Reels / YouTube Shorts style).
The script is split into beats. Each beat is ONE spoken sentence — short, punchy, and natural.
The video should feel like a real creator made it, not like a template was filled in.

RULES:
- Write ${beatCount.min}–${beatCount.max} beats total
- Each beat = exactly ONE sentence, naturally spoken
- First beat MUST stop the scroll immediately — no slow starts
- Vary sentence length and energy across beats
- Use real numbers and specific details when relevant to the topic
- Do NOT use generic filler like "In today's video" or "Don't forget to like"
- Do NOT follow a rigid formula — follow emotional logic instead
- The last beat should feel like a satisfying end, not an abrupt stop

STORYTELLING APPROACHES (pick what fits the topic, don't force a pattern):
- The confession: admit something uncomfortable, then why it matters
- The reframe: show something familiar, completely change what it means
- The contrast: two things that shouldn't coexist, but do
- The journey: I was here, something happened, now I'm here
- The secret: everyone thinks X, but actually Y
- The demonstration: don't tell me, show me
- The challenge: you probably can't do this, here's why
- The revelation: slow build to one shocking truth

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
      "asset_hint": {
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "prompt": "Specific photographable scene for image generation, e.g. 'fresh lemon and ginger on wooden surface, soft morning light, close-up'",
        "visual_type": "entity | abstract",
        "search_query": "exact search query if entity, else null"
      }
    }
  ]
}

FIELD NOTES:
- spoken: natural speech, as if talking to one person
- intent: the emotional/narrative purpose of this beat
- energy: 0.0 (calm) to 1.0 (explosive) — vary this across beats
- visual_hint: what kind of visual would best serve this beat
- emphasis_words: 1–3 words from spoken text to highlight in captions
- asset_hint.keywords: 2–4 concrete nouns describing what image to show
- asset_hint.prompt: specific photographable scene for AI image gen — no abstractions, describe exactly what's in frame. CRITICAL: describe only the visual scene, never include text, numbers, statistics, charts, graphs, or any written content in the description
- asset_hint.visual_type: "entity" if the beat shows a real named thing (brand, app, tool, company, product, movie, show, person, team) — use image search for these. "abstract" for generic concepts (growth, motivation, technology, lifestyle) — use AI generation.
- asset_hint.search_query: ONLY set if visual_type is "entity". Write a precise image search query that will return the LOGO or OFFICIAL IMAGE of that entity. Rules:
  * For apps/tools/software: "<Name> logo" e.g. "ChatGPT logo", "Notion logo", "Midjourney logo"
  * For companies/brands: "<Brand> logo official" e.g. "OpenAI logo official", "Nike logo"
  * For movies/shows: "<Title> official movie poster" e.g. "Dune 2 official movie poster"
  * For people: "<Full Name> official photo" e.g. "Elon Musk official photo"
  * Always target the logo/poster/official image — NOT a random scene or article about them.
  * Set to null for abstract visual_type.
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
    order:          beat.order          ?? i,
    spoken:         String(beat.spoken  || "").trim(),
    intent:         validIntents.includes(beat.intent) ? beat.intent : "explanation",
    energy:         typeof beat.energy === "number"
                      ? Math.min(1, Math.max(0, beat.energy))
                      : 0.5,
    visual_hint:    validHints.includes(beat.visual_hint) ? beat.visual_hint : "none",
    emphasis_words: Array.isArray(beat.emphasis_words) ? beat.emphasis_words : [],
    asset_hint: beat.asset_hint ? {
      keywords:     Array.isArray(beat.asset_hint.keywords) ? beat.asset_hint.keywords : [],
      prompt:       String(beat.asset_hint.prompt || "").trim(),
      visual_type:  beat.asset_hint.visual_type === "entity" ? "entity" : "abstract",
      search_query: beat.asset_hint.search_query ? String(beat.asset_hint.search_query).trim() : null,
    } : null,
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

  // Attach asset_hint to each beat for editor display
  parsedScript.beats.forEach((src, i) => {
    if (beats[i] && src.asset_hint) beats[i].asset_hint = src.asset_hint;
  });

  /* ── Phase 3: AI zone content — fills text zones intelligently ── */
  report("content");
  try {
    const layoutDefs = beats.map(b => getLayoutDef(b.layout));
    const zoneContentArr = await generateZoneContent({ beats, layoutDefs, topic, videoDNA: dna });

    zoneContentArr.forEach(({ beatIndex, zones: zc }) => {
      if (!beats[beatIndex]) return;
      const beat      = beats[beatIndex];
      const layoutDef = layoutDefs[beatIndex];
      // Build a map of zoneId → zone type from the layout def for validation
      const defZoneTypes = {};
      (layoutDef?.zones || []).forEach(z => { defZoneTypes[z.id] = z.type; });

      Object.entries(zc).forEach(([zoneId, content]) => {
        if (!beat.zones[zoneId]) return;
        const defType = defZoneTypes[zoneId];

        // Only write text into text zones — never clobber asset zones with text content
        if (content.text !== undefined && defType === "text") {
          beat.zones[zoneId] = {
            ...beat.zones[zoneId],
            content: { kind: "text", text: content.text },
          };
        }
        // Only store asset prompts for asset zones — never for text zones
        if (content.prompt !== undefined && defType === "asset") {
          beat.zones[zoneId] = {
            ...beat.zones[zoneId],
            _assetPrompt: content.prompt,
          };
        }
      });
    });
  } catch (e) {
    console.warn("[generateZoneContent] failed, using spoken text fallback:", e.message);
  }

  // Always run: fill any text zones still empty after AI call (or if AI call failed).
  // Uses spoken text split by role so every zone has readable content.
  beats.forEach(beat => {
    const def = getLayoutDef(beat.layout);
    if (!def) return;

    const spoken = beat.spoken || "";
    const wordList = spoken.trim().split(/\s+/).filter(Boolean);
    const midpoint   = Math.ceil(wordList.length * 0.55);
    const secondHalf = wordList.slice(midpoint).join(" ") || spoken;

    // Intent-based label tag
    const INTENT_LABELS = {
      shock: "WILD FACT", curiosity: "DID YOU KNOW", proof: "PROOF",
      reveal: "REVEALED", urgency: "ACT NOW", empathy: "REAL TALK",
      explanation: "HOW IT WORKS", contrast: "THE TRUTH", irony: "IRONY",
      punchline: "PLOT TWIST", stat: "THE STAT", hook: "WAIT FOR IT",
    };
    const labelTag = INTENT_LABELS[beat.intent] || "FACT";

    // Extract first number from spoken, or fallback symbol
    const numMatch = spoken.match(/[\d,.]+%?[kKmMbB]?/);
    const statText = numMatch ? numMatch[0] : "—";

    const textZones = def.zones
      .filter(z => z.type === "text")
      .sort((a, b) => (a.order ?? 1) - (b.order ?? 1));

    textZones.forEach((zoneDef, idx) => {
      const zone = beat.zones[zoneDef.id];
      if (!zone) return;
      if (zone.content?.text?.trim()) return; // already filled — skip

      let fallbackText = spoken; // default
      const role = zoneDef.role || "subtext";

      if (role === "headline") {
        // Short and punchy — first 4–5 words only, never the full sentence
        const headlineWords = wordList.slice(0, Math.min(5, Math.ceil(wordList.length * 0.38)));
        fallbackText = headlineWords.join(" ");
      } else if (role === "label") {
        fallbackText = labelTag;
      } else if (role === "stat") {
        fallbackText = statText;
      } else {
        // subtext / quote / other — full sentence for first zone, second half for subsequent
        fallbackText = idx === 0 ? spoken : secondHalf;
      }

      // Clip at word boundary if over maxChars — no ellipsis, never cut mid-word
      if (zoneDef.maxChars && fallbackText.length > zoneDef.maxChars) {
        const words = fallbackText.split(/\s+/);
        let clipped = "";
        for (const w of words) {
          const next = clipped ? `${clipped} ${w}` : w;
          if (next.length > zoneDef.maxChars) break;
          clipped = next;
        }
        fallbackText = clipped || words[0];
      }

      beat.zones[zoneDef.id] = {
        ...zone,
        content: { kind: "text", text: fallbackText },
      };
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

    // Skip if no entity to search AND image gen is off
    if (!isEntity && !generateImages) return;

    const def = getLayoutDef(beat.layout);
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
    const motion    = "none";

    try {
      // Tier 1 — entity beats: search for the official image (always runs)
      let sharedEntityImgUrl = null;
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
                sharedEntityImgUrl = uploaded.url;
                console.log(`[img] Beat ${beatIndex}: entity → Supabase — ${sharedEntityImgUrl}`);
                useAssetsStore.getState().addMyAsset({
                  id: uploaded.id, url: uploaded.url, file_path: uploaded.file_path,
                  type: "image", name: uploaded.name || file.name, size: uploaded.size || file.size,
                  scope: "project", project_id: projectId || null, source: "user",
                });
              } catch {
                sharedEntityImgUrl = tempUrl; // fallback: use temp URL directly
              }
            }
          }
        } catch (e) {
          console.warn(`[img] Beat ${beatIndex}: entity search failed —`, e.message);
        }
      }

      // Tier 2 — per-zone image placement
      await Promise.allSettled(defAssetZones.map(async (assetZone, zoneIdx) => {
        let imgUrl = sharedEntityImgUrl; // entity beats share the found image

        // Abstract AI generation — only when generateImages=true and no entity image found
        if (!imgUrl && generateImages) {
          const zonePrompt = injectedBgZoneId
            ? null
            : beat.zones[assetZone.id]?._assetPrompt || null;
          const genPrompt = zonePrompt || hint?.prompt || null;

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

        if (!imgUrl) return;

        if (assetZone.id === injectedBgZoneId) {
          // Text-only layout: inject as a real full-bleed asset zone behind text zones
          beat.zones[injectedBgZoneId] = {
            type:    "asset",
            x: 0, y: 0, width: 100, height: 100,
            zIndex:  0,
            start:   0, end: null,
            enterAnimation: "fadeIn", exitAnimation: "none",
            content: { kind: "asset", asset: { src: imgUrl, type: "image", objectFit: "cover", motion: "none" } },
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