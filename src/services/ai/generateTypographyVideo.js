/**
 * generateTypographyVideo.js
 *
 * Kinetic typography pipeline: GPT-4.1 splits a script into word-by-word
 * staggered beats with stickers, then TTS + music are added.
 */

import { serverFetch } from "../serverApi";
import { loadMusicLibrary, pickMusicByMood } from "../../core/registries/musicRegistry";
import { measureAudioDuration, syncBeatsToTTS } from "../../core/syncBeatsToTTs";
import { supabase } from "../../lib/supabase.js";

const VALID_ENTER = new Set(["fadeIn", "slideUpIn", "slideDownIn", "slideLeftIn", "slideRightIn", "popIn", "scaleIn"]);

function validateZone(zone) {
  const z = { ...zone };

  // Clamp bounds
  const x = typeof z.x === "number" ? z.x : 0;
  const y = typeof z.y === "number" ? z.y : 0;
  if ((x + (z.width  ?? 0)) > 100) z.width  = 100 - x;
  if ((y + (z.height ?? 0)) > 100) z.height = 100 - y;

  // Clamp fontSize on text zones
  if (z.style?.fontSize != null) {
    const fs = Number(z.style.fontSize);
    z.style = { ...z.style, fontSize: Math.max(30, Math.min(200, isNaN(fs) ? 60 : fs)) };
  }

  // Validate enterAnimation
  if (!VALID_ENTER.has(z.enterAnimation)) z.enterAnimation = "fadeIn";

  // Ensure start is a non-negative number
  if (typeof z.start !== "number" || z.start < 0) z.start = 0;

  // end: leave null as-is (renderer fills beat duration)
  if (z.end !== null && typeof z.end !== "number") z.end = null;

  return z;
}

function validateBeats(rawBeats) {
  return rawBeats.map((beat, i) => {
    const zones = {};
    for (const [key, zone] of Object.entries(beat.zones || {})) {
      if (!zone || typeof zone !== "object") continue;
      zones[key] = validateZone({ ...zone, id: key });
    }

    return {
      ...beat,
      id:             `beat_${crypto.randomUUID().slice(0, 8)}_${i}`,
      order:          beat.order ?? i,
      zones,
      blocks:         beat.blocks         ?? [],
      overlays:       beat.overlays       ?? [],
      deletedZones:   beat.deletedZones   ?? [],
      layoutPadding:  beat.layoutPadding  ?? 0,
      asset_settings: beat.asset_settings ?? {},
      avatarZone:     beat.avatarZone     ?? null,
      components:     beat.components     ?? {},
      visual_hint:    beat.visual_hint    ?? "none",
      layout:         beat.layout         ?? null,
      audio_cues:     beat.audio_cues     ?? [],
      transition:     beat.transition     ?? { type: "cut", duration: 0 },
    };
  });
}

// FIX 2 — Sticker URL lookup: exact → lowercase → partial
function resolveStickerUrl(name, stickerMap) {
  if (!name) return null;
  if (stickerMap[name]) return stickerMap[name];
  if (stickerMap[name.toLowerCase()]) return stickerMap[name.toLowerCase()];
  const key = Object.keys(stickerMap).find(k =>
    k.includes(name.toLowerCase()) || name.toLowerCase().includes(k)
  );
  return key ? stickerMap[key] : null;
}

// Language-specific script generation from a topic (called before beat-splitting)
async function generateScriptFromTopic(topic, language) {
  let scriptInstruction;

  if (language === "hindi") {
    scriptInstruction = `Generate a short viral Hindi reel script in simple spoken Hindi (not formal Hindi). Sound like a real Indian creator talking casually to viewers. Use emotional hooks, curiosity, and easy-to-understand words. Keep sentences short and conversational. Avoid difficult Sanskrit Hindi or robotic phrasing. Use storytelling + CTA style from Instagram Reels and YouTube Shorts. Tone: human, energetic, slightly persuasive. Add natural fillers like 'असल में', 'सिर्फ', 'सोचो', 'यार', 'मतलब', 'सीधा' where appropriate. Include small grammar imperfections like real spoken Hindi. Do NOT sound like news reporter Hindi. Use Hinglish-style internet creator tone written in Hindi script. Output in Devanagari Hindi script only. No emojis. End with strong CTA: 'फॉलो करो', 'कमेंट करो', or 'DM करो'. Keep under 80 words. Topic: ${topic}`;
  } else if (language === "hinglish") {
    scriptInstruction = `Generate a short viral Hinglish reel script — mix of Hindi and English as spoken by Indian Instagram/YouTube creators. Sound casual, energetic, like talking to a friend. Use emotional hooks, curiosity gaps, and conversational tone. Mix Hindi words naturally with English: 'yaar', 'matlab', 'seriously', 'actually', 'bhai', 'toh', 'karo', 'dekho'. Keep sentences punchy and short. No formal language. End with a strong CTA. Keep under 80 words. Topic: ${topic}`;
  } else {
    scriptInstruction = `Generate a short viral English reel script for Instagram/YouTube. Sound casual, energetic, like a creator talking directly to viewer. Use emotional hooks, curiosity, direct address ('you', 'your'). Keep sentences short and punchy. No corporate speak. End with a strong CTA. Keep under 80 words. Topic: ${topic}`;
  }

  // /api/generate always JSON.parses the response, so wrap the script in JSON
  const prompt = `${scriptInstruction}\n\nReturn ONLY valid JSON: { "script": "the full script text here" }`;

  const res = await serverFetch("/api/generate", {
    method: "POST",
    body:   JSON.stringify({ prompt, model: "gpt-4.1", max_tokens: 400 }),
  });

  if (!res.ok) throw new Error(`generateTypographyVideo: script generation failed (${res.status})`);

  const data = await res.json();
  if (typeof data?.script === "string") return data.script.trim();
  throw new Error("generateTypographyVideo: script generation returned unexpected format");
}


export async function generateTypographyVideo({ topic = null, script = null, language = "hinglish", audience = "general", voiceId = null }) {
  /* ── 0a. Topic mode: generate script first, then split it ── */
  let effectiveScript = script;
  if (topic && !script) {
    console.log(`[generateTypographyVideo] generating script from topic: "${topic}" (${language})`);
    effectiveScript = await generateScriptFromTopic(topic, language);
    console.log(`[generateTypographyVideo] generated script: "${effectiveScript}"`);
  }

  /* ── 0b. Fetch stickers from DB ── */
  const { data: stickers } = await supabase
    .from("stickers")
    .select("name, public_url")
    .order("name");

  // FIX 1 — Key by both "name.png" and "name" so GPT names without extension resolve correctly
  const stickerMap = {};
  stickers?.forEach(s => {
    const nameWithExt    = s.name;
    const nameWithout    = s.name.replace(/\.(png|jpg|jpeg|webp)$/i, "");
    stickerMap[nameWithout] = s.public_url;
    stickerMap[nameWithExt] = s.public_url;
  });

  const stickerNames = Object.keys(stickerMap)
    .filter(k => !k.match(/\.(png|jpg|jpeg|webp)$/i))
    .join(", ");

  // FIX 3 — Deduplicated URL list for random injection
  const stickerUrls = [...new Set(Object.values(stickerMap))];

  console.log("[stickers] map keys sample:", Object.keys(stickerMap).slice(0, 5));

  /* ── 1. GPT-4.1: split + design ── */
  const prompt = `
You are an expert motion designer and typography composition director
generating structured JSON for a video renderer.

Your task is to generate emotionally rich, visually premium typography
video beats for short-form vertical 9:16 videos.

${effectiveScript
  ? `SCRIPT (split into beats, preserve exact words — do NOT rewrite):\n${effectiveScript}`
  : `Write a punchy ${language} script for this topic: ${topic}\nKeep under 80 words. Casual, energetic, creator tone.\nThen split into beats.`}

LANGUAGE: ${language}
All text content must be in ${language === "hindi" || language === "hinglish" ? "Hindi/Hinglish as spoken by Indian creators" : "English"}.

You are a professional motion designer specialized in trending kinetic typography for Instagram Reels and YouTube Shorts 2025 style.

Convert the script into high-impact kinetic typography beats.
NOT subtitle style. NOT centered safe layouts.

DESIGN RULES:
- Strong size contrast — some words very large (fontSize 160-240), some very small (fontSize 40-60)
- Multiple font weights: bold Bebas Neue for impact words, italic Playfair Display for emotional words, regular Outfit for connecting words
- Every beat must have ONE dominant element that commands attention
- Words cluster tightly — no isolated floating text
- Asymmetric layouts — left-heavy or right-heavy, never perfectly centered
- Text must feel rhythmic and beat-synced — stagger zone.start values to create snap and punch (0, 0.15, 0.3, 0.45 seconds)
- Use the full frame — y positions from 15 to 85
- No empty middle section — if top has sticker, bottom must have text

FONT MIXING PER BEAT — pick one combination:
Option A: Bebas Neue (hero, huge) + Outfit (support, small)
Option B: Playfair Display italic (hero, huge) + Bebas Neue (secondary)
Option C: Cormorant Garamond italic (hero) + Outfit (support)

BACKGROUND RULES:
- Always use rich CSS gradient string for layoutBackground value
- Never plain black or flat colors
- Pick ONE gradient for the entire video, use same for ALL beats
- Cinematic palette examples:
  'linear-gradient(135deg, #ff6b35 0%, #c94b4b 100%)'
  'linear-gradient(160deg, #0d0d2b 0%, #2d0057 100%)'
  'radial-gradient(ellipse at 30% 40%, #2b1055 0%, #7597de 100%)'
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)'
  'linear-gradient(160deg, #000428 0%, #004e92 100%)'
  'linear-gradient(135deg, #1a0533 0%, #cc0066 100%)'
- Pick based on script emotional tone

TYPOGRAPHY RULES:
- Available fonts:
  "Playfair Display, serif" — elegant italic hero words
  "Bebas Neue, sans-serif" — bold impactful statements
  "Outfit, sans-serif" — clean modern supporting text
  "Cormorant Garamond, serif" — refined editorial
  "Great Vibes, cursive" — emotional script words
- Hero words: fontSize 140-260, italic, serif, emotional
- Supporting texts: fontSize 45-80, clean sans-serif
- Mix fontWeight: 900 for hero, 500-700 for support

STICKERS:
Add stickers to 4-6 beats as large collage elements.
Available sticker names: ${stickerNames}
Pick contextually matching the script theme.
Place as large asset zones: width 35-55, height 20-32
Position: left (x:2-15) or right (x:55-75)
Hero text goes on OPPOSITE side from sticker.
Sticker zIndex: 1-2 (behind text)

ANIMATIONS — use only these values:
enterAnimation: fadeIn | slideUpIn | slideDownIn | slideLeftIn | slideRightIn | popIn | scaleIn
zone.start: stagger 0, 0.25, 0.5 between zones

BEAT RULES:
- 6-12 beats total
- Each beat: 1.5-4.0 seconds
- Each beat spoken = one complete thought from script
- Never split mid-sentence
- Max 4 zones per beat
- Zone types: ONLY "text" and "asset" — nothing else
- All spoken words must appear in zones — do not omit words

CRITICAL RULES — violations will break the video:
1. x + width must NEVER exceed 92. If hero word is large, reduce width or fontSize so it fits.
2. Large Hindi/Devanagari text needs more width — use width: 85-90 for Hindi hero words.
3. Every word in spoken text must be visible on screen — split across zones but ensure all fit within frame bounds.
4. fontSize for Hindi text: reduce by 20% compared to English equivalents — Devanagari characters are wider.
5. If spoken text is long (more than 6 words), split into 2-3 zones each with shorter phrases, not one giant zone.
6. Sticker must not cover text — if sticker is top-right (x:55-75), all text zones must have x < 50. If sticker is left (x:2-15), all text zones must have x > 20.

REFERENCE EXAMPLES — these are real professionally designed beats.
Follow their composition, hierarchy, and styling exactly.
Each beat shows a different composition pattern — learn from all of them.

EXAMPLE 1 — Hook beat, 3 zones, no sticker:
{
  "spoken": "You know the Titanic, right?",
  "duration_sec": 1.8,
  "zones": {
    "z1": {
      "id": "z1", "type": "text", "role": "headline",
      "x": 22, "y": 46, "width": 66, "height": 12,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 300,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.82,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "TITANIC" },
      "enterAnimation": "slideUpIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "subtext",
      "x": 3, "y": 39, "width": 61, "height": 5,
      "zIndex": 3, "start": 0.22, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 89,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "You know the" },
      "enterAnimation": "slideLeftIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "subtext",
      "x": 58, "y": 60, "width": 33, "height": 7,
      "zIndex": 3, "start": 0.34, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 102,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 700, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "right?" },
      "enterAnimation": "fadeIn"
    }
  }
}

EXAMPLE 2 — Tease beat, 4 text zones + sticker top-center:
{
  "spoken": "But do you know the real story in just 5 minutes?",
  "duration_sec": 4.0,
  "zones": {
    "zs1": {
      "id": "zs1", "type": "asset", "role": "sticker",
      "x": 27, "y": 10, "width": 40, "height": 22,
      "zIndex": 1, "start": 0, "end": null,
      "style": { "objectFit": "contain" },
      "content": { "kind": "asset", "asset": {
        "src": "__STICKER__:calculator",
        "type": "image", "objectFit": "contain"
      }},
      "enterAnimation": "fadeIn"
    },
    "z1": {
      "id": "z1", "type": "text", "role": "headline",
      "x": 16, "y": 42, "width": 68, "height": 9,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 160,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 900, "lineHeight": 0.82,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "real story" },
      "enterAnimation": "slideRightIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "subtext",
      "x": 34, "y": 37, "width": 60, "height": 7,
      "zIndex": 3, "start": 0.2, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 58,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "But do you know the" },
      "enterAnimation": "slideUpIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "headline",
      "x": 28, "y": 52, "width": 58, "height": 5,
      "zIndex": 4, "start": 0.4, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 120,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.8,
        "letterSpacing": "-3px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "in just" },
      "enterAnimation": "popIn"
    },
    "z4": {
      "id": "z4", "type": "text", "role": "headline",
      "x": 9, "y": 58, "width": 83, "height": 14,
      "zIndex": 5, "start": 0.6, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 165,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 700, "lineHeight": 0.82,
        "letterSpacing": "-3px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "5 minutes?" },
      "enterAnimation": "scaleIn"
    }
  }
}

EXAMPLE 3 — Shock beat, 6 text zones, no sticker, full frame:
{
  "spoken": "Imagine this: the world's biggest ship, called unsinkable, hits an iceberg on its first trip!",
  "duration_sec": 5.5,
  "zones": {
    "z1": {
      "id": "z1", "type": "text", "role": "subtext",
      "x": 2, "y": 28, "width": 55, "height": 5,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 73,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "Imagine this:" },
      "enterAnimation": "fadeIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "headline",
      "x": 8, "y": 34, "width": 84, "height": 6,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 150,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.82,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "WORLD'S BIGGEST" },
      "enterAnimation": "slideLeftIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "headline",
      "x": 33, "y": 42, "width": 39, "height": 11,
      "zIndex": 3, "start": 0.25, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 203,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 700, "lineHeight": 0.85,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "ship" },
      "enterAnimation": "scaleIn"
    },
    "z4": {
      "id": "z4", "type": "text", "role": "subtext",
      "x": 6, "y": 54, "width": 56, "height": 5,
      "zIndex": 3, "start": 0.5, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 63,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "called 'unsinkable'" },
      "enterAnimation": "fadeIn"
    },
    "z5": {
      "id": "z5", "type": "text", "role": "headline",
      "x": 21, "y": 61, "width": 74, "height": 8,
      "zIndex": 3, "start": 0.7, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 144,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 700, "lineHeight": 0.85,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "hits an iceberg" },
      "enterAnimation": "popIn"
    },
    "z6": {
      "id": "z6", "type": "text", "role": "subtext",
      "x": 29, "y": 70, "width": 55, "height": 4,
      "zIndex": 3, "start": 0.9, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 69,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "on its first trip!" },
      "enterAnimation": "slideUpIn"
    }
  }
}

EXAMPLE 4 — Emotion beat, 4 zones, asymmetric:
{
  "spoken": "Chaos, bravery, heartbreak—all in one night.",
  "duration_sec": 2.2,
  "zones": {
    "z1": {
      "id": "z1", "type": "text", "role": "headline",
      "x": 12, "y": 35, "width": 54, "height": 7,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 140,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 900, "lineHeight": 0.81,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "CHAOS" },
      "enterAnimation": "slideLeftIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "headline",
      "x": 40, "y": 44, "width": 54, "height": 8,
      "zIndex": 3, "start": 0.18, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 197,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.85,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "bravery" },
      "enterAnimation": "slideRightIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "headline",
      "x": 9, "y": 52, "width": 54, "height": 6,
      "zIndex": 3, "start": 0.36, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 110,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 900, "lineHeight": 0.85,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "heartbreak" },
      "enterAnimation": "scaleIn"
    },
    "z4": {
      "id": "z4", "type": "text", "role": "subtext",
      "x": 38, "y": 59, "width": 48, "height": 6,
      "zIndex": 3, "start": 0.54, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 75,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "all in one night." },
      "enterAnimation": "popIn"
    }
  }
}

EXAMPLE 5 — Impact beat, big number hero:
{
  "spoken": "Over 1,500 lives lost, but legends were born.",
  "duration_sec": 2.9,
  "zones": {
    "z1": {
      "id": "z1", "type": "text", "role": "subtext",
      "x": 19, "y": 24, "width": 23, "height": 4,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 60,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "Over" },
      "enterAnimation": "fadeIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "headline",
      "x": 24, "y": 31, "width": 55, "height": 14,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 283,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.82,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "1,500" },
      "enterAnimation": "slideUpIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "subtext",
      "x": 17, "y": 46, "width": 43, "height": 6,
      "zIndex": 3, "start": 0.22, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 89,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "lives lost," },
      "enterAnimation": "fadeIn"
    },
    "z4": {
      "id": "z4", "type": "text", "role": "headline",
      "x": 4, "y": 53, "width": 58, "height": 10,
      "zIndex": 3, "start": 0.44, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 122,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 900, "lineHeight": 0.9,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "legends" },
      "enterAnimation": "slideLeftIn"
    },
    "z5": {
      "id": "z5", "type": "text", "role": "subtext",
      "x": 55, "y": 56, "width": 30, "height": 4,
      "zIndex": 3, "start": 0.62, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 53,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "were born." },
      "enterAnimation": "popIn"
    },
    "z6": {
      "id": "z6", "type": "text", "role": "subtext",
      "x": 53, "y": 46, "width": 26, "height": 8,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 172,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.82,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "But" },
      "enterAnimation": "slideUpIn"
    }
  }
}

EXAMPLE 6 — Challenge beat, sticker center, 3 text zones:
{
  "spoken": "What would you do in that moment?",
  "duration_sec": 2.6,
  "zones": {
    "zs1": {
      "id": "zs1", "type": "asset", "role": "sticker",
      "x": 30, "y": 24, "width": 40, "height": 22,
      "zIndex": 1, "start": 0, "end": null,
      "style": { "objectFit": "contain" },
      "content": { "kind": "asset", "asset": {
        "src": "__STICKER__:temperature_warning_icon",
        "type": "image", "objectFit": "contain"
      }},
      "enterAnimation": "fadeIn"
    },
    "z1": {
      "id": "z1", "type": "text", "role": "headline",
      "x": 14, "y": 49, "width": 72, "height": 7,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 90,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 400, "lineHeight": 1.4,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "WHAT WOULD" },
      "enterAnimation": "slideUpIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "headline",
      "x": 27, "y": 56, "width": 48, "height": 10,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 175,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 1.0,
        "letterSpacing": "3px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "YOU DO" },
      "enterAnimation": "slideUpIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "subtext",
      "x": 19, "y": 67, "width": 63, "height": 4,
      "zIndex": 3, "start": 0.3, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 71,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "in that moment?" },
      "enterAnimation": "fadeIn"
    }
  }
}

EXAMPLE 7 — CTA beat, 5 zones, strong hierarchy:
{
  "spoken": "Hit follow if you want more jaw-dropping stories in less than 5 minutes!",
  "duration_sec": 4.7,
  "zones": {
    "z1": {
      "id": "z1", "type": "text", "role": "headline",
      "x": 16, "y": 33, "width": 53, "height": 6,
      "zIndex": 3, "start": 0, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 148,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.81,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "HIT FOLLOW" },
      "enterAnimation": "slideLeftIn"
    },
    "z2": {
      "id": "z2", "type": "text", "role": "subtext",
      "x": 32, "y": 41, "width": 64, "height": 6,
      "zIndex": 3, "start": 0.22, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 82,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "if you want more" },
      "enterAnimation": "slideRightIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "headline",
      "x": 3, "y": 46, "width": 78, "height": 7,
      "zIndex": 3, "start": 0.44, "end": null,
      "style": {
        "color": "#ffd84d", "fontSize": 120,
        "fontStyle": "italic",
        "fontFamily": "Playfair Display, serif",
        "fontWeight": 900, "lineHeight": 0.9,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "jaw-dropping" },
      "enterAnimation": "scaleIn"
    },
    "z4": {
      "id": "z4", "type": "text", "role": "subtext",
      "x": 46, "y": 54, "width": 48, "height": 3,
      "zIndex": 3, "start": 0.66, "end": null,
      "style": {
        "color": "#ffffff", "fontSize": 54,
        "fontFamily": "Outfit, sans-serif",
        "fontWeight": 500, "lineHeight": 0.95,
        "textEffect": "none"
      },
      "content": { "kind": "text", "text": "stories in less than" },
      "enterAnimation": "fadeIn"
    },
    "z5": {
      "id": "z5", "type": "text", "role": "headline",
      "x": 18, "y": 58, "width": 60, "height": 8,
      "zIndex": 4, "start": 0.88, "end": null,
      "style": {
        "color": "#fe540b", "fontSize": 190,
        "fontFamily": "Bebas Neue, sans-serif",
        "fontWeight": 900, "lineHeight": 0.9,
        "letterSpacing": "-2px", "textEffect": "none"
      },
      "content": { "kind": "text", "text": "5 minutes!" },
      "enterAnimation": "popIn"
    }
  }
}

KEY PATTERNS TO FOLLOW FROM THESE EXAMPLES:
- Hero words: fontSize 140-300, Bebas Neue or Playfair Display italic
- Support words: fontSize 50-90, Outfit regular or medium
- Stagger: 0, 0.18-0.25, 0.36-0.5, 0.6-0.9 seconds
- y positions: spread from y:24 to y:70, never bunched in one area
- x positions: vary left (x:2-16) and right (x:32-58) for asymmetry
- Colors: accent (#ffd84d or similar) for hero, #ffffff for support
- Never use same font for consecutive zones
- Sticker when used: x:27-35, y:10-24, width:40, height:22, zIndex:1

REQUIRED OUTPUT FORMAT — return ONLY valid JSON, no markdown:
{
  "bg_gradient": "CSS gradient string",
  "accent_color": "#hex",
  "beats": [ ...all beats following the reference structure above... ]
}`;

  const res = await serverFetch("/api/generate", {
    method: "POST",
    body:   JSON.stringify({ prompt, model: "gpt-4.1", max_tokens: 8000 }),
  });

  if (!res.ok) throw new Error(`generateTypographyVideo: API call failed (${res.status})`);

  const data = await res.json();
  if (!Array.isArray(data?.beats) || data.beats.length === 0) {
    throw new Error("generateTypographyVideo: response contained no beats");
  }

  const bg_gradient     = data.bg_gradient     || "linear-gradient(135deg, #1a0505 0%, #3d0a0a 100%)";
  const accent_color    = data.accent_color    || "#ffd400";
  const secondary_color = data.secondary_color || "#ffffff";

  /* ── 2. Validate ── */
  let beats = validateBeats(data.beats);

  // Lock gradient on every beat
  beats = beats.map(b => ({
    ...b,
    layoutBackground: { type: "gradient", value: bg_gradient },
  }));

  /* ── 2b. Resolve __STICKER__ placeholders GPT placed, then inject extras ── */
  // Log GPT-placed sticker refs
  console.log("[stickers] GPT sticker names:",
    beats.flatMap(b => Object.values(b.zones || {})
      .filter(z => z.content?.asset?.src?.startsWith("__STICKER__"))
      .map(z => z.content.asset.src)
    )
  );

  // Resolve GPT-placed __STICKER__:name → real URL
  beats = beats.map(beat => {
    const zones = { ...beat.zones };
    for (const [key, zone] of Object.entries(zones)) {
      const src = zone?.content?.asset?.src;
      if (typeof src === "string" && src.startsWith("__STICKER__:")) {
        const name = src.slice("__STICKER__:".length).trim();
        const url  = resolveStickerUrl(name, stickerMap)
                     ?? stickerUrls[Math.floor(Math.random() * stickerUrls.length)];
        zones[key] = {
          ...zone,
          content: { ...zone.content, asset: { ...zone.content.asset, src: url } },
        };
      }
    }
    return { ...beat, zones };
  });

  // Code-inject an extra sticker on every 2nd beat (indices 1, 3, 5, …)
  if (stickerUrls.length > 0) {
    beats = beats.map((beat, idx) => {
      if (idx % 2 !== 1) return beat;
      const randomUrl = stickerUrls[Math.floor(Math.random() * stickerUrls.length)];
      return {
        ...beat,
        zones: {
          ...beat.zones,
          zs1: {
            id: "zs1", type: "asset", role: "sticker",
            x: 30, y: 5, width: 40, height: 22,
            zIndex: 1, start: 0, end: null,
            style: { objectFit: "contain" },
            content: { kind: "asset", asset: { src: randomUrl, type: "image", objectFit: "contain" } },
            enterAnimation: "fadeIn",
          },
        },
      };
    });
  }

  /* ── 3. TTS — use the effective script for smooth audio ── */
  const ttsText = effectiveScript || "";
  let ttsAudio = null;

  if (ttsText.trim()) {
    try {
      const useElevenLabs = voiceId && language === "hindi";
      const ttsRes = useElevenLabs
        ? await serverFetch("/api/generate-tts-elevenlabs", {
            method: "POST",
            body:   JSON.stringify({ script: ttsText, voiceId, language }),
          })
        : await serverFetch("/api/generate-tts", {
            method: "POST",
            body:   JSON.stringify({ script: ttsText, voice: "female_warm", speed: 1.0 }),
          });
      if (ttsRes.ok) {
        const ttsData  = await ttsRes.json();
        const audioUrl = ttsData.url;
        const duration = await measureAudioDuration(audioUrl);
        beats    = syncBeatsToTTS(beats, duration);
        ttsAudio = { src: audioUrl, volume: 1, generated: true, voice: voiceId || "female_warm" };
      }
    } catch (e) {
      console.warn("[generateTypographyVideo] TTS failed:", e.message);
    }
  }

  /* ── 4. Music ── */
  const dbMusicLibrary = await loadMusicLibrary();
  const autoMusic      = pickMusicByMood("chill", dbMusicLibrary);

  /* ── 5. Return ── */
  return {
    beats,
    meta: {
      fps:         25,
      mode:        "faceless",
      orientation: "9:16",
      width:       1080,
      height:      1920,
      name:        topic || (effectiveScript || "").slice(0, 60) || "Typography Video",
      language,
      audience,
      tone:        "bold",
      brand:       {},
      brand_color: null,
      video_type:  "typography",
      bg_gradient,
      accent_color,
    },
    audio: {
      tts:   ttsAudio,
      music: autoMusic?.src ? { src: autoMusic.src, volume: 0.10 } : null,
    },
    dna:      null,
    script:   { text: effectiveScript || "" },
    overlays: [],
    workflow: { script_completed: true, beats_initialized: true },
  };
}
