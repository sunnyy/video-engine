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
import { pickAutoMusic, MUSIC_PREVIEW_URLS } from "../../core/musicRegistry";
import { generateZoneImage } from "../../server/assets/falService";
import { getLayoutDef } from "../../core/layoutRegistry";
import { uploadUserAsset } from "../assets/uploadUserAsset";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { getUserRules } from "../../hooks/useUserRules";

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
  const instructions = {
    hindi:    "Write entirely in Hindi (Devanagari script). Natural spoken Hindi, not formal.",
    hinglish: "Write in Hinglish — mix of Hindi and English as Indians naturally speak. Roman script.",
    english:  "Write in English. Natural spoken English, not formal or written style.",
    tamil:    "Write entirely in Tamil script. Natural spoken Tamil.",
    telugu:   "Write entirely in Telugu script. Natural spoken Telugu.",
    arabic:   "Write entirely in Arabic. Natural spoken Arabic, right-to-left.",
    portuguese: "Write in Brazilian Portuguese. Natural spoken style.",
  };
  return instructions[language?.toLowerCase()] || instructions.english;
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
  const typeConfig    = VIDEO_TYPE_CONFIGS[videoType] || VIDEO_TYPE_CONFIGS.viral;
  const beatCount     = BEAT_COUNTS[durationCategory] || BEAT_COUNTS.short;
  const langInstr     = getLanguageInstruction(language);
  const audienceInstr = AUDIENCE_CONFIGS[audience] || AUDIENCE_CONFIGS.general;
  const toneOverride  = TONE_OVERRIDES[tone] || "";
  const userRules     = buildUserRulesBlock();

  return `
You are a viral short-form video scriptwriter and creative director.

LANGUAGE: ${langInstr}

VIDEO TYPE: ${videoType}
TONE: ${typeConfig.tone}. ${toneOverride}
STRUCTURE: ${typeConfig.structure}
AVOID: ${typeConfig.avoid}

AUDIENCE: ${audienceInstr}

TOPIC: ${topic}
${context ? `\nCONTEXT / FACTS TO USE:\n${context}` : ""}
${userRules}
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

OUTPUT FORMAT — Return ONLY valid JSON, no markdown, no explanation:
{
  "videoType": "${videoType}",
  "language": "${language || 'english'}",
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
        "prompt": "Specific photographable scene for image generation, e.g. 'fresh lemon and ginger on wooden surface, soft morning light, close-up'"
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
- asset_hint.prompt: specific photographable scene for AI image gen — no abstractions, describe exactly what's in frame
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
      keywords: Array.isArray(beat.asset_hint.keywords) ? beat.asset_hint.keywords : [],
      prompt:   String(beat.asset_hint.prompt || "").trim(),
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
  language         = "english",
  videoType        = "viral",
  context          = "",
  brandColor       = null,
  audience         = "general",
  tone             = "bold",
  projectId        = null,
}) {

  const prompt = buildPrompt({ topic, videoType, language, durationCategory, context, audience, tone });

  /* ── API call ── */
  const response = await fetch("http://localhost:5000/api/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();

  /* ── Parse AI output ── */
  const rawText      = data.text || data.content || JSON.stringify(data);
  const parsedScript = parseAIResponse(rawText);

  let beats = await buildBeatsFromScript({
    structuredBeats: parsedScript.beats,
    mode, videoType, orientation, durationCategory,
    language, topic, brandColor, audience, tone,
    assetSource: generateImages ? "ai" : "none",
  });

  // Attach asset_hint to each beat for editor display
  parsedScript.beats.forEach((src, i) => {
    if (beats[i] && src.asset_hint) beats[i].asset_hint = src.asset_hint;
  });

  // Auto-generate images if requested
  if (generateImages) {
    await Promise.allSettled(beats.map(async (beat, beatIndex) => {
      const hint = parsedScript.beats[beatIndex]?.asset_hint;
      if (!hint?.prompt) return;
      const def       = getLayoutDef(beat.layout);
      const assetZone = def?.zones.find(z => z.type === "asset");
      if (!assetZone) return;
      try {
        const img = await generateZoneImage({
          spoken: beat.spoken, intent: beat.intent,
          visual_hint: beat.visual_hint, topic, orientation,
          beatIndex, zoneIndex: 0, promptOverride: hint.prompt,
          projectId,
        });
        if (img?.url) {
          beat.zones[assetZone.id] = {
            ...(beat.zones[assetZone.id] || {}),
            content: { kind: "asset", asset: { src: img.url, type: "image", objectFit: "cover", motion: "kenburns" } },
          };
        }
      } catch (e) {
        console.warn(`[img gen] beat ${beatIndex} failed:`, e.message);
      }
    }));
  }

  const script = parsedScript.beats.map(b => b.spoken).join(" ");

  // Generate TTS if requested
  let ttsAudio = null;
  if (generateTTS && script.trim()) {
    try {
      const ttsRes = await fetch("http://localhost:5000/api/generate-tts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ script, voice: "female_warm", speed: 1.0 }),
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

        ttsAudio = { src: uploaded.url, volume: 1, generated: true, voice: "female_warm" };
      }
    } catch (e) {
      console.warn("[TTS gen] failed:", e.message);
    }
  }

  const autoMusicKey = pickAutoMusic(videoType, tone);

  return {
    script, beats,
    meta: { videoType: parsedScript.videoType, language: parsedScript.language, emotionalArc: parsedScript.emotionalArc, brandColor, audience, tone },
    audio: { tts: ttsAudio, music: autoMusicKey ? { musicKey: autoMusicKey, src: MUSIC_PREVIEW_URLS[autoMusicKey], volume: 0.12 } : null },
  };
}