/**
 * generateVideoJSON.js
 * src/services/ai/generateVideoJSON.js
 *
 * ONE GPT-4.1 call → complete project beats array with zones, styles,
 * content, and asset prompts. No layout registry, no zone filling.
 */

import { serverFetch } from "../serverApi";

const VALID_ENTER_ANIMATIONS = new Set([
  "fadeIn", "slideUpIn", "slideDownIn", "slideLeftIn", "slideRightIn", "popIn", "scaleIn",
]);
const VALID_TEXT_EFFECTS = new Set([
  "none", "typewriter", "wordReveal", "fadeWords", "slideUp", "popIn",
]);

function validateZones(zones) {
  if (!zones || typeof zones !== "object") return {};
  const out = {};

  for (const [rawKey, zone] of Object.entries(zones)) {
    if (!zone || typeof zone !== "object") continue;

    // Rename numeric keys → z1, z2, ...
    const key = /^\d+$/.test(rawKey) ? `z${parseInt(rawKey) + 1}` : rawKey;
    const z   = { ...zone, id: key };

    // Clamp bounds
    const x = z.x ?? 0;
    const y = z.y ?? 0;
    if ((x + (z.width  ?? 0)) > 105) z.width  = 105 - x;
    if ((y + (z.height ?? 0)) > 105) z.height = 105 - y;

    // Validate enter animation
    if (z.enterAnimation && !VALID_ENTER_ANIMATIONS.has(z.enterAnimation)) {
      z.enterAnimation = "fadeIn";
    }

    // Validate text zone style
    if (z.type === "text" && z.style) {
      const fs = z.style.fontSize;
      if (typeof fs === "number") {
        if (fs > 250) z.style = { ...z.style, fontSize: 250 };
        if (fs < 20)  z.style = { ...z.style, fontSize: 20  };
      }
      if (z.style.textEffect && !VALID_TEXT_EFFECTS.has(z.style.textEffect)) {
        z.style = { ...z.style, textEffect: "none" };
      }
    }

    out[key] = z;
  }

  return out;
}

export async function generateVideoJSON({ topic, orientation = "9:16", language = "english", audience = "general", tone = "bold" }) {
  const langRule = language.toLowerCase() === "hinglish"
    ? `Write ALL spoken text in Hinglish — natural Hindi-English mix as spoken by Indian creators.`
    : language.toLowerCase() !== "english"
    ? `Write ALL spoken text in ${language}.`
    : "";

  const prompt = `You are an expert short-form video director and motion designer.
Your job is to generate a complete video project JSON for a 9:16 vertical short-form video (TikTok/Reels/Shorts style).

TOPIC: ${topic}
LANGUAGE: ${language}${langRule ? `\n${langRule}` : ""}
AUDIENCE: ${audience}
TONE: ${tone}

You will output a complete JSON object with beats array. Each beat contains zones — positioned visual elements that make up the frame.

═══════════════════
COORDINATE SYSTEM
═══════════════════
- x, y, width, height are ALL percentages of the frame (0-100)
- Frame is 1080×1920 (9:16 portrait)
- x=0,y=0 is top-left corner
- x+width must never exceed 105 (allow slight bleed)
- y+height must never exceed 105
- zIndex: 0=background, 1-3=mid layers, 4-6=foreground text/icons

═══════════════════
AVAILABLE ZONE TYPES
═══════════════════

1. ASSET ZONE (image/video background)
{
  "id": "z1",
  "type": "asset",
  "role": "background",
  "x": 0, "y": 0, "width": 100, "height": 100,
  "zIndex": 0,
  "style": { "objectFit": "cover", "brightness": 0.5 },
  "content": {
    "kind": "asset",
    "asset": {
      "src": null,
      "type": "image",
      "objectFit": "cover",
      "motion": "slowZoom",
      "enterTransition": "none",
      "exitTransition": "none"
    }
  },
  "enterAnimation": "fadeIn"
}
motion options: none, slowZoom, microZoom, cinematicPush, pushSlow, pullSlow, droneRise

2. TEXT ZONE
{
  "id": "z2",
  "type": "text",
  "role": "headline",
  "x": 8, "y": 20, "width": 84, "height": 20,
  "zIndex": 5,
  "style": {
    "color": "#ffffff",
    "fontSize": 120,
    "fontFamily": "Bebas Neue, sans-serif",
    "fontWeight": 900,
    "textAlign": "left",
    "lineHeight": 1.0,
    "letterSpacing": "-2px",
    "textEffect": "slideUp"
  },
  "content": { "kind": "text", "text": "YOUR HEADLINE" },
  "enterAnimation": "slideUpIn"
}
text roles: headline, subtext, label, number, stat, cta
font families: "Bebas Neue, sans-serif" | "Outfit, sans-serif" | "Barlow Condensed, sans-serif" | "JetBrains Mono, monospace"
textEffect options: none | typewriter | wordReveal | fadeWords | slideUp | popIn
enterAnimation options: fadeIn | slideUpIn | slideDownIn | slideLeftIn | slideRightIn | popIn | scaleIn

3. DECORATIVE ZONE (shapes, lines, overlays)
{
  "id": "z3",
  "type": "decorative",
  "role": "decorative",
  "x": 8, "y": 45, "width": 30, "height": 0.6,
  "zIndex": 4,
  "style": {
    "color": "#ffd400",
    "filled": true,
    "opacity": 1,
    "borderRadius": 999
  },
  "content": { "decorativeId": "shape_rectangle" },
  "enterAnimation": "fadeIn"
}
decorativeId options: shape_rectangle | shape_circle | shape_triangle
Use thin rectangles (height: 0.5-1) as accent lines/dividers
Use semi-transparent dark rectangles as text background overlays (opacity: 0.3-0.7)

4. ICON ZONE
{
  "id": "z4",
  "type": "icon",
  "role": "icon",
  "x": 80, "y": 8, "width": 8, "height": 4,
  "zIndex": 4,
  "style": { "color": "#ffd400", "filled": true },
  "content": { "iconify": { "set": "ph", "icon": "lightning-fill" } },
  "enterAnimation": "popIn"
}
Use Phosphor icons (set: "ph"). Common icons:
lightning-fill, star-fill, check-circle-fill, x-circle-fill,
arrow-right-fill, trend-up-fill, trend-down-fill, globe-fill,
clock-fill, fire-fill, warning-fill, info-fill,
play-fill, pause-fill, speaker-high-fill,
apple-logo-fill, android-logo-fill, instagram-logo-fill,
chart-bar-fill, coins-fill, crown-fill, rocket-fill

═══════════════════
BEAT STRUCTURE
═══════════════════
Each beat must have:
- id: "beat_1", "beat_2" etc
- order: 0, 1, 2...
- spoken: exact natural words for TTS voiceover (1-2 sentences max)
- duration_sec: 2.5-5.0 based on spoken length
- start_sec / end_sec: cumulative timing
- zones: object with z1, z2, z3... keys (NOT 0, 1, 2)
- asset_prompt: detailed cinematic image generation prompt for this beat
- audio_cues: array with one SFX per beat
- transition: { "type": "cut", "duration": 0.3 }
- layoutBackground: { "type": "color", "value": "#000000" }
- intent: hook|explanation|shock|reveal|proof|contrast|urgency
- energy: 0.3-1.0
- caption: { "show": false, "text": spoken, "style": "wordBlaze", "position": 80, "animation": "fade", "emphasis_words": [] }

═══════════════════
SFX KEYS (pick contextually)
═══════════════════
cinematic_boom, cinematic_impact, impact, whoosh, dramatic_sting,
tension_riser, news_sting, crowd_cheer, crowd_roar, great_success,
pop_soft, pop_hard, notification, click, soft_hit, glitch_short,
glitch_long, digital_blip, scan_beep, data_swoosh, tick_digital,
stock_up, coin_drop, keyboard_type, power_up, game_win, game_over,
error_buzz, countdown_beep, cash_register, classic_ding,
bell_temple, om_bell, chime_soft, sizzle, cork_pop,
sad_trombone, boing, rimshot, heartbeat, whistle_start

═══════════════════
DESIGN RULES
═══════════════════
1. ALWAYS start with a full-bleed background asset zone (z1, x:0,y:0,w:100,h:100,zIndex:0)
   with brightness 0.3-0.6 to darken the image for text readability
2. Pick a color palette for the whole video: bg color + primary accent + secondary accent
   Be creative — use colors that match the topic/niche (not always dark)
3. Use thin horizontal rectangles as accent lines under headlines
4. Use semi-transparent dark rectangles as text backdrop overlays when needed
5. Text must NEVER overlap asset zones without a dark overlay behind it
6. Vary layouts between beats — never same zone arrangement twice
7. Use icons contextually — they add visual interest
8. Asset prompts must be CINEMATIC and DRAMATIC — movie poster quality
   Bad: "Nokia phone on table"
   Good: "Nokia 3310 shattering mid-air, dramatic explosion, dark cinematic background, high contrast"
9. Generate 5-8 beats total
10. First beat = hook (dramatic, attention-grabbing)
    Last beat = cta (follow/subscribe/share)
11. spoken text per beat = 1-2 sentences, natural speech, under 20 words

═══════════════════
REFERENCE EXAMPLE (one beat — follow this structure exactly):
═══════════════════
{
  "id": "beat_2",
  "order": 1,
  "spoken": "At one point, Nokia dominated the entire mobile industry.",
  "duration_sec": 3.8,
  "start_sec": 3.4,
  "end_sec": 7.2,
  "intent": "explanation",
  "energy": 0.6,
  "asset_prompt": "Rows of Nokia phones filling shelves of a massive warehouse, warm golden light, epic wide angle, cinematic",
  "audio_cues": [{ "id": "sfx_1", "key": "crowd_cheer", "label": "Crowd Cheer", "source": "beat", "volume": 0.25, "position": 0 }],
  "transition": { "type": "cut", "duration": 0.3 },
  "layoutBackground": { "type": "color", "value": "#000000" },
  "caption": { "show": false, "text": "At one point, Nokia dominated the entire mobile industry.", "style": "wordBlaze", "position": 80, "animation": "fade", "emphasis_words": [] },
  "zones": {
    "z1": {
      "id": "z1", "type": "asset", "role": "background",
      "x": 0, "y": 0, "width": 100, "height": 100, "zIndex": 0,
      "style": { "objectFit": "cover", "brightness": 0.52 },
      "content": { "kind": "asset", "asset": { "src": null, "type": "image", "objectFit": "cover", "motion": "pushSlow", "enterTransition": "none", "exitTransition": "none" } },
      "enterAnimation": "fadeIn"
    },
    "z2": {
      "id": "z2", "type": "decorative", "role": "decorative",
      "x": 5, "y": 8, "width": 90, "height": 84, "zIndex": 1,
      "style": { "color": "#000000", "filled": true, "opacity": 0.36, "borderRadius": 16 },
      "content": { "decorativeId": "shape_rectangle" },
      "enterAnimation": "scaleIn"
    },
    "z3": {
      "id": "z3", "type": "text", "role": "number",
      "x": 8, "y": 10, "width": 12, "height": 8, "zIndex": 4,
      "style": { "color": "#ffd400", "fontSize": 78, "fontFamily": "Bebas Neue, sans-serif", "fontWeight": 900, "textEffect": "popIn" },
      "content": { "kind": "text", "text": "01" },
      "enterAnimation": "popIn"
    },
    "z4": {
      "id": "z4", "type": "text", "role": "headline",
      "x": 8, "y": 22, "width": 52, "height": 18, "zIndex": 5,
      "style": { "color": "#ffffff", "fontSize": 92, "textAlign": "left", "fontFamily": "Outfit, sans-serif", "fontWeight": 800, "lineHeight": 0.94, "letterSpacing": "-2px", "textEffect": "wordReveal" },
      "content": { "kind": "text", "text": "NOKIA RULED\\nTHE WORLD" },
      "enterAnimation": "slideUpIn"
    },
    "z5": {
      "id": "z5", "type": "text", "role": "subtext",
      "x": 8, "y": 43, "width": 58, "height": 7, "zIndex": 5,
      "style": { "color": "#ffffff", "fontSize": 55, "textAlign": "left", "fontFamily": "Outfit, sans-serif", "fontWeight": 500, "lineHeight": 1.2, "textEffect": "fadeWords" },
      "content": { "kind": "text", "text": "Almost everyone owned a Nokia phone." },
      "enterAnimation": "fadeIn"
    },
    "z6": {
      "id": "z6", "type": "icon", "role": "icon",
      "x": 76, "y": 16, "width": 10, "height": 5, "zIndex": 4,
      "style": { "color": "#0a84ff", "filled": true },
      "content": { "iconify": { "set": "ph", "icon": "globe-fill" } },
      "enterAnimation": "popIn"
    },
    "z7": {
      "id": "z7", "type": "decorative", "role": "decorative",
      "x": 8, "y": 56, "width": 26, "height": 0.6, "zIndex": 5,
      "style": { "color": "#ffd400", "filled": true, "opacity": 1, "borderRadius": 999 },
      "content": { "decorativeId": "shape_rectangle" },
      "enterAnimation": "fadeIn"
    }
  },
  "blocks": [], "cta": null, "stat": null, "text": null, "label": null,
  "quote": null, "heading": null, "subtext": null, "tagline": null,
  "headline": null, "language": "english", "overlays": [],
  "deletedZones": [], "layoutPadding": 0, "asset_settings": {},
  "avatarZone": null, "components": {}, "visual_hint": "none"
}

═══════════════════
OUTPUT FORMAT
═══════════════════
Return ONLY valid JSON — no markdown, no explanation:
{
  "niche": "detected niche",
  "tone": "detected tone",
  "palette": {
    "bg": "#hex",
    "text": "#hex",
    "primary": "#hex",
    "secondary": "#hex"
  },
  "musicMood": "one of: energetic | dramatic | chill | upbeat | dark | inspirational",
  "beats": [ ...beat objects... ]
}`;

  const res = await serverFetch("/api/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, model: "gpt-4.1", max_tokens: 4000 }),
  });

  if (!res.ok) throw new Error(`generateVideoJSON: API call failed (${res.status})`);

  const data = await res.json();

  if (!Array.isArray(data?.beats) || data.beats.length === 0) {
    throw new Error("generateVideoJSON: response contained no beats");
  }

  // Validate and normalise every beat's zones
  const beats = data.beats.map((beat, i) => ({
    ...beat,
    id:    beat.id    || `beat_${i + 1}`,
    order: beat.order ?? i,
    zones: validateZones(beat.zones),
    // Ensure required fields present for editor compatibility
    blocks:       beat.blocks       ?? [],
    overlays:     beat.overlays     ?? [],
    deletedZones: beat.deletedZones ?? [],
    layoutPadding: beat.layoutPadding ?? 0,
    asset_settings: beat.asset_settings ?? {},
    avatarZone:   beat.avatarZone   ?? null,
    components:   beat.components   ?? {},
    visual_hint:  beat.visual_hint  ?? "none",
    language,
  }));

  return {
    beats,
    palette:    data.palette    || { bg: "#0b0b10", text: "#ffffff", primary: "#7c5cfc", secondary: "#f5c518" },
    niche:      data.niche      || "general",
    tone:       data.tone       || tone,
    musicMood:  data.musicMood  || "energetic",
  };
}
