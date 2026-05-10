import { serverFetch } from "../serverApi";
import { loadMusicLibrary, pickMusicByMood } from "../../core/registries/musicRegistry";
import { supabase } from "../../lib/supabase.js";

const LAYOUT_MAP = {
  full_asset:                 "39e3de69-f3a3-49c0-ad31-1f57d6efb8eb",
  top_avatar_bottom_asset:    "b8051813-62f2-45f8-b66b-3c72204a0ffe",
  top_asset_bottom_asset:     "75483ed0-bda9-40d0-a045-b2f340d9e4ac",
  full_asset_circular_avatar: "c1daa0a9-f3a3-48d7-b913-13c7ff03e749",
  full_avatar:                "873ce112-93da-49db-8edb-57561cc8ee45",
  left_avatar_right_asset:    "93315f37-44ec-4d15-af9b-b933c0421dd1",
  pip_avatar:                 "7fe7e5b2-f184-4199-9701-42452d99d2a6",
};

/* ── Step 1: Transcribe video file ── */
async function transcribeVideo(videoFile) {
  const form = new FormData();
  form.append("video", videoFile);

  const res = await serverFetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Transcription failed (${res.status})`);

  const data = await res.json();
  if (!Array.isArray(data.segments) || data.segments.length === 0) {
    throw new Error("Transcription returned no segments");
  }
  return data; // { transcript, segments: [{ text, start, end }] }
}

/* ── Step 2: GPT segments transcript into beats ── */
async function segmentTranscript({ transcript, segments, language }) {
  const prompt = `You are a video editor. You have a transcript from a talking-head video and need to structure it into visual beats for a vertical short-form video.

Full transcript: "${transcript}"

Whisper segments (with timestamps):
${JSON.stringify(segments.map(s => ({ text: s.text, start: s.start, end: s.end })))}

Your job: group consecutive segments into 4-8 beats that make sense visually. Each beat is a complete thought or sentence.

IMPORTANT: This is a talking-head video. The speaker MUST be visible in every single beat.
Only use these layouts (all include the avatar/speaker):
- top_avatar_bottom_asset  → speaker top half, asset/image bottom half (default choice)
- pip_avatar               → full asset background, small speaker picture-in-picture corner
- left_avatar_right_asset  → speaker left, asset right (side-by-side)
- full_avatar              → speaker fills the entire frame (use for emotional/impactful moments)
- full_asset_circular_avatar → full asset with small circular speaker overlay

DO NOT use full_asset or top_asset_bottom_asset — those hide the speaker.

For each beat:
- Combine consecutive segments into one spoken chunk
- Use the first segment start and last segment end for timing
- Choose a layout that keeps the speaker visible
- Write an asset_hint — what visual to overlay (e.g. "Show product demo", "Display pricing table", "Add hero screenshot")

Return ONLY valid JSON:
{
  "beats": [
    {
      "order": 0,
      "spoken": "exact transcript text for this beat",
      "start_sec": 0.0,
      "end_sec": 4.2,
      "layout_type": "top_avatar_bottom_asset",
      "asset_hint": "Show your product homepage"
    }
  ]
}`;

  const res = await serverFetch("/api/generate", {
    method: "POST",
    body:   JSON.stringify({ prompt, model: "gpt-4.1", max_tokens: 2000 }),
  });
  if (!res.ok) throw new Error(`Beat segmentation failed (${res.status})`);

  const data = await res.json();
  if (!Array.isArray(data?.beats) || data.beats.length === 0) {
    throw new Error("Beat segmentation returned no beats");
  }
  return data.beats;
}

/* ── Step 3: Fetch layouts from Supabase ── */
async function fetchLayouts(layoutIds) {
  const { data, error } = await supabase
    .from("layouts")
    .select("id, zones")
    .in("id", layoutIds);
  if (error) throw new Error(`Layout fetch failed — ${error.message}`);
  const map = {};
  (data || []).forEach(l => { map[l.id] = l.zones; });
  return map;
}

// Layouts that always include an avatar zone
const AVATAR_LAYOUTS = new Set([
  "top_avatar_bottom_asset", "pip_avatar", "left_avatar_right_asset",
  "full_avatar", "full_asset_circular_avatar",
]);

/* ── Step 4: Build beats ── */
function buildBeats(scriptBeats, layoutZonesMap, videoUrl) {
  return scriptBeats.map((sb, i) => {
    // Fall back to top_avatar_bottom_asset if GPT picked a layout with no avatar zone
    const layoutType = AVATAR_LAYOUTS.has(sb.layout_type) ? sb.layout_type : "top_avatar_bottom_asset";
    const layoutId = LAYOUT_MAP[layoutType] ?? LAYOUT_MAP.top_avatar_bottom_asset;
    const rawZones = layoutZonesMap[layoutId] ?? [];

    const zones = {};
    let avatarZoneId = null;

    rawZones.forEach(zone => {
      const z = JSON.parse(JSON.stringify(zone));

      // Keep only asset and avatar zones
      if (z.role === "headline" || z.role === "body" || z.role === "text" || z.role === "label" || z.type === "text") return;

      // Wire avatar zone to the uploaded video
      if (z.type === "avatar") {
        avatarZoneId = z.id;
        z.content = { kind: "video", src: videoUrl };
      }

      zones[z.id] = z;
    });

    const startSec = typeof sb.start_sec === "number" ? sb.start_sec : i * 3;
    const endSec   = typeof sb.end_sec   === "number" ? sb.end_sec   : startSec + 3;
    const duration = Math.max(0.5, endSec - startSec);

    return {
      id:             `beat_${crypto.randomUUID().slice(0, 8)}_${i}`,
      order:          i,
      spoken:         sb.spoken ?? "",
      intent:         "context",
      energy:         0.75,
      duration_sec:   duration,
      start_sec:      startSec,
      end_sec:        endSec,
      layout:         layoutId,
      zones,
      avatarZone:     avatarZoneId,
      blocks:         [],
      overlays:       [],
      deletedZones:   [],
      layoutPadding:  0,
      asset_settings: {},
      components:     {},
      visual_hint:    "none",
      audio_cues:     [],
      transition:     { type: "cut", duration: 0.3 },
      layoutBackground: { type: "color", value: "#0b0b10" },
      caption: {
        show:           false,
        text:           sb.spoken ?? "",
        style:          "wordBlaze",
        position:       80,
        animation:      "fade",
        emphasis_words: [],
      },
      asset_hint: sb.asset_hint ?? null,
      language:   null,
      cta:        null,
      stat:       null,
      text:       null,
      label:      null,
      quote:      null,
      heading:    null,
      subtext:    null,
      tagline:    null,
      headline:   null,
    };
  });
}

/* ── Main export ── */
export async function generateExplainerVideo({ videoFile, videoUrl, language = "english" }) {
  // Step 1 — Transcribe
  const { transcript, segments } = await transcribeVideo(videoFile);

  // Step 2 — Segment into beats
  const scriptBeats = await segmentTranscript({ transcript, segments, language });

  // Step 3 — Resolve layout IDs and fetch zones (only avatar-containing layouts)
  const layoutIds = [...new Set(scriptBeats.map(b => {
    const lt = AVATAR_LAYOUTS.has(b.layout_type) ? b.layout_type : "top_avatar_bottom_asset";
    return LAYOUT_MAP[lt] ?? LAYOUT_MAP.top_avatar_bottom_asset;
  }))];
  const layoutZonesMap = await fetchLayouts(layoutIds);

  // Step 4 — Build beats
  const beats = buildBeats(scriptBeats, layoutZonesMap, videoUrl);

  // Step 5 — Music (original video audio used as TTS track)
  const dbMusicLibrary = await loadMusicLibrary();
  const autoMusic      = pickMusicByMood("chill", dbMusicLibrary);

  return {
    beats,
    meta: {
      fps:         25,
      mode:        "talking_head",
      orientation: "9:16",
      width:       1080,
      height:      1920,
      name:        transcript.slice(0, 60),
      language,
      audience:    "general",
      tone:        "informative",
      brand:       {},
      brand_color: null,
      video_type:  "explainer",
    },
    audio: {
      tts:   { src: videoUrl, volume: 1, generated: false },
      music: autoMusic?.src ? { src: autoMusic.src, volume: 0.08 } : null,
    },
    avatar:   { src: videoUrl, type: "video" },
    dna:      null,
    script:   { text: transcript },
    overlays: [],
    workflow: { script_completed: true, beats_initialized: true },
  };
}
