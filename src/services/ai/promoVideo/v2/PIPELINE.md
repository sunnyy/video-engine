# Promo Video V2 Pipeline

Source of truth for the v2 faceless promo video pipeline. Read this before touching any pipeline file.

---

## Pipeline Overview

Ordered execution inside `runV2Pipeline(project)`:

1. **Script generation** — GPT-4.1 writes `full_script` + scene array with intents, segments, visual concepts
2. **Scene design (parallel)** — GPT-5.4 receives each scene's script segment + visual concept + previous scenes context, returns self-contained HTML
3. **HTML parsing** — `parseSceneHTML` converts each HTML frame into a flat scene graph array (list of layer entries)
4. **TTS voiceover** — ElevenLabs `eleven_multilingual_v2` generates one continuous MP3 for the full script
5. **Whisper transcription** — `whisper-1` returns word-level timestamps from the MP3 buffer
6. **Timestamp assignment** — `assignWhisperTimestamps` walks words sequentially, sets `vo_start`/`vo_end`/`duration_seconds` on each scene
7. **Last-scene extension** — if total scene duration < voiceover duration, the gap is added to the last scene; then a 0.4s trail buffer is always appended
8. **Timeline build** — `buildTimeline` converts scene graphs + corrected durations into the timeline JSON (cursor-based, no gaps)
9. **Voiceover layer injection** — single `voiceover_full` audio layer spanning `0 → totalDuration`
10. **Background music** — random track selected by mood from `music_tracks` table, volume 0.25, fade in/out 1s
11. **Image placeholder resolution** — `stock` → Pixabay, `ai` → Fal.ai flux/schnell, `asset` → marked `assetQueued: true`
12. **Asset manifest build** — scans all `assetQueued` layers, builds `user_required` array with dimensions and aspect ratio
13. **Save to projects table** — timeline JSON saved to `projects.safe_project_json`, returns `editor_project_id`
14. **Update promo_videos row** — status, scene data, editor_project_id, duration written back

---

## File Map

| File | Responsibility |
|---|---|
| `pipelineOrchestrator.js` | Orchestrates all steps; the only file that calls external APIs in sequence |
| `scriptGenerator.js` | GPT-4.1 call; produces `full_script` + scene array with intents and visual concepts |
| `sceneDesigner.js` | GPT-5.4 call per scene; returns raw HTML string |
| `intentPrompts.js` | Builds system + user prompt for scene designer; contains `buildDesignMandate()` |
| `htmlParser.js` | Parses GPT HTML → flat scene graph array; resolves CSS cascade, computes transforms |
| `timelineBuilder.js` | Converts scene graphs + scenes → timeline JSON; handles keyframes, spread windows, role priority |
| `ttsGenerator.js` | ElevenLabs TTS + Whisper transcription; exports `generateFullVoiceover`, `transcribeWithTimestamps` |
| `../../routes/promoVideo.js` | Express routes: `/create`, `/render`, `/approve`, `/upload-asset`, `/list` |
| `../../../../pages/PromoVideo.jsx` | 6-step wizard UI; handles all user input, polling, asset upload |
| `../../../../core/utils/creditCosts.js` | Single source of truth for credit amounts used by both server and client |

---

## Key Constants

### `INTENT_PATTERNS` — `scriptGenerator.js`
Narrative structures per scene count. One is randomly selected at generation time.

```
1 scene:  [standalone]
3 scenes: classic | product_first | challenge
5 scenes: full_arc | product_led | early_reveal | deep_problem
7 scenes: full_funnel | product_first_full | early_reveal_full | double_problem
```

Each pattern has `name`, `intents[]`, and `tone` (description passed to GPT).

### `SCENE_WORD_BUDGETS` — `scriptGenerator.js`
| Intent | Duration | Max words |
|---|---|---|
| hook | 4s | 16 |
| problem | 5s | 20 |
| solution | 4s | 16 |
| benefit | 4s | 16 |
| feature | 5s | 20 |
| process | 6s | 24 |
| proof | 4s | 16 |
| cta | 4s | 16 |
| standalone | 8s | 32 |

### `CANVAS_SIZES` — `pipelineOrchestrator.js`
```
9:16 → 1080 × 1920
16:9 → 1920 × 1080
1:1  → 1080 × 1080
```
Canvas is passed as `{ width, height }` through every downstream call: `parseSceneHTML(html, idx, canvas)`, `buildTimeline(graphs, scenes, { canvasWidth, canvasHeight })`.

### `SPREAD_WINDOWS` — `timelineBuilder.js`
Controls when each element group starts animating, as a fraction of scene duration:
```
background  → 0.00 – 0.00  (immediate, no animation)
decoration  → 0.00 – 0.04
hero        → 0.00 – 0.25  (headline always at t=0)
supporting  → 0.15 – 0.40
workflow    → 0.25 – 0.50
```
`MAX_SPREAD = 0.50` — all elements visible by halfway through the scene.
`ANIM_DURATION = 0.30` — animation takes 300ms.

### `ROLE_PRIORITY` — `timelineBuilder.js`
Within each `sceneElement` group, determines stagger order (lower = appears first):
```
headline=0, kicker=1, subhead=2, stat-number=3, badge=4, label=5,
image-placeholder=6, card=7, step=8, icon=9, divider=10, glow=11,
decoration=12, background=13
```

### `PROMO_VIDEO_CREDITS` — `promoVideo.js`
```
1 scene  → 8 credits
3 scenes → 20 credits
5 scenes → 30 credits
```
Deducted once, in the `/render` route only.

---

## Timeline JSON Structure

Every saved timeline has this shape:

```json
{
  "version": "2.0",
  "id": "<projectId>",
  "name": "<productName> — Promo",
  "format": { "width": 1080, "height": 1920, "fps": 30, "duration": 18.4 },
  "full_script": "complete voiceover text...",
  "layers": [ ...layer objects... ],
  "meta": {
    "source": "promo_video_v2",
    "caption_style": "minimal",
    "transition_style": "cut",
    "music_mood": "upbeat",
    "product_name": "...",
    "scene_format": "v2"
  }
}
```

### Required fields on every layer

| Field | Type | Notes |
|---|---|---|
| `id` | string | `s{sceneIndex}_{role}` or `s{sceneIndex}_{role}_{n}` if duplicate |
| `trackId` | string | `track_text` / `track_background` / `track_overlay` / `track_badge` / `track_accent` / `track_icon` / `track_logo` |
| `type` | string | `text` / `gradient` / `image` / `audio` |
| `start` | number | Absolute seconds from video start |
| `end` | number | Absolute seconds |
| `zIndex` | number | |
| `visible` | boolean | Always `true` |
| `locked` | boolean | Always `false` |
| `keyframes` | object | `{ x, y, scale, rotation, opacity, blur }` — each an array of `{ time, value }` |
| `transition` | object | `{ in: { type, duration }, out: { type, duration } }` |
| `transform` | object | `{ x, y, width, height, opacity, rotation, scale, blur, borderRadius, borderWidth, borderColor }` |

Type-specific fields:
- **text**: `content` (string), `style` (fontFamily, fontSize, fontWeight, color, letterSpacing, lineHeight, textAlign, textTransform, textShadow, background, borderRadius, padding)
- **gradient**: `gradient` (CSS background string)
- **image**: `src` (URL or null), `objectFit`, `assetType` (stock/ai/asset), `assetHint`
- **audio**: `src`, `audioType` (voiceover/music), `volume`, `muted`, `fadeIn`, `fadeOut`, `trimStart`, `trimEnd`

---

## Design Rules (Scene HTML → Layer)

### Positioning
- All elements positioned absolutely with `left` and `top` in pixels relative to the canvas root
- Origin is **top-left (0,0)**. GPT is instructed never to use `right`, `bottom`, flexbox, or grid for positioning
- `resolveTransform` converts CSS `right`/`bottom` to `x`/`y` if present, but GPT should not emit them
- Clamp bounds: `x` in `[-200, canvasW]`, `y` in `[-200, canvasH]`, width ≤ `canvasW+200`, height ≤ `canvasH+200`

### Text sizing
- GPT must not set `height` on text elements — only `left`, `top`, `width`
- `htmlParser` recalculates height from `(chars / charsPerLine) × lineHeightPx + 20px`
- Text width is capped at `canvasW - x - 90` to prevent overflow

### Required data attributes on every HTML element
```
data-role:          headline | subhead | body | kicker | badge | label | stat-number |
                    background | glow | card | decoration | divider | step | icon | logo |
                    image-placeholder
data-layer:         text | gradient | image | effect | decoration
data-animation:     fade-in | fade-up | scale-in | slide-left | slide-right | none
data-scene-element: hero | background | workflow | decoration | supporting
```

### Animation keyframes
Keyframes are **relative to the layer's own start time**, not video-absolute. The renderer adds `layer.start` when playing.

| Animation | What it does |
|---|---|
| `fade-in` | opacity 0→1 over 0.3s |
| `fade-up` | opacity 0→1 + y slides up 40px over 0.35s |
| `scale-in` | opacity 0→1 + scale 0.88→1 over 0.35s |
| `slide-left` | opacity 0→1 + x slides left 60px over 0.3s |
| `slide-right` | opacity 0→1 + x slides right 60px over 0.3s |

### Asset placeholders
```html
<div data-role="image-placeholder"
     data-layer="image"
     data-asset-type="[stock|ai|asset]"
     data-asset-hint="[description, max 15 words]"
     ...>
</div>
```
- `stock` → Pixabay free API (no cost)
- `ai` → Fal.ai flux/schnell (cost per image)
- `asset` → queued for user upload; shown in Step 5 with aspect ratio guidance

Maximum 1 placeholder per scene.

### Asset intent rules
- `solution`, `feature`, `process`, `standalone` — MUST include `data-asset-type="asset"`
- `hook`, `problem`, `cta` — MUST NOT use `data-asset-type="asset"`

---

## Script Rules

### Punctuation
- Pain point lists use **periods**, not commas: `"Writing scripts. Finding stock. Endless cuts."`
- Single flowing thoughts use **commas**: `"Just drop your topic and get a finished video, done."`
- Em dash for dramatic contrast: `"Stuck for hours — done in seconds."`
- CTA must use comma, never em dash: `"Stop wasting hours, try Vidquence free today"`

### Product name rule
- Never say "AI" in the script — use the product name instead
- Product name must appear at least twice: once in the solution scene, once in the CTA
- Exception: `product_first` patterns may name it in scene 1

### Intent descriptions
See `INTENT_DESCRIPTIONS` in `scriptGenerator.js` for exact GPT instructions per intent. Key ones:
- **hook** — signals product category in ≤2 seconds; never abstract
- **problem** — deepens pain with specific tasks; no product name
- **solution** — first time product name appears (unless `product_first` pattern); names product + shows relief
- **cta** — one continuous thought, comma not em dash, product name included

### Language support
- `en` — English (default)
- `hinglish` — Hindi/English mix, FOMO-driven, casual register
- `es` — Latin American Spanish, `tú` form

### Tone instructions (injected into system prompt)
`professional` | `casual` | `energetic` | `minimal` — see `TONE_INSTRUCTIONS` in `scriptGenerator.js`

---

## Design Mandate (Color / Theme / Style)

Built by `buildDesignMandate(accentColor, visualStyle, theme)` in `intentPrompts.js`. Injected into the **system prompt** (higher weight than user message).

### Theme backgrounds
- `dark` — near-black: `#04050a`, `#060812`, `#07080f`
- `medium` — mid-tone: `#1a1d2e`, `#16192a`, `#1c1f35`
- `light` — near-white: `#ffffff`, `#f8f9fa`, `#f4f6ff`; no dark overlays

### Accent color dominance
Accent must be 60–70% visual presence. Derived alpha variants:
```
Full:  {color}      — solid fills, CTA buttons
70%:   {color}B3    — gradient midpoints, badge fills
40%:   {color}66    — background glow layers
15%:   {color}26    — card fills, subtle tints
8%:    {color}14    — very subtle overlays
```
FORBIDDEN: default purple (`#6366f1`, `#8b5cf6`) or indigo unless that IS the accent.

### Visual styles
`radiant` (layered glows, orbs) | `minimal` (sparse, negative space) | `professional` (card-based, frosted glass) | `high-contrast` (bold fills, no subtlety)

### Style + theme matrix
10 specific combinations in `buildDesignMandate` — e.g. `light+minimal` = white bg, thin accent borders; `dark+radiant` = near-black, heavy glows, full saturation.

---

## Credit System

### Constants
`PROMO_VIDEO_CREDITS = { 1: 8, 3: 20, 5: 30 }` in `promoVideo.js`  
`promoCredits(sceneCount)` helper returns the correct amount, falling back to 20.

### Where deduction happens
**Only in `/render`** — reads `scene_count` from `row.style`, calls `deductCredits(userId, creditsToDeduct, ...)`.  
On pipeline failure: `addCredits` refund fires in the `orchestratePromoRender.catch` handler.

### `/approve` route
Credit deduction was removed from this route (it was dead code — never called from the frontend). The route still exists to mark a project approved but charges nothing.

---

## Wizard Flow (PromoVideo.jsx)

| Step | Name | What it collects |
|---|---|---|
| 0 | Video Type | `videoType`: `faceless` or `talking_head` |
| 1 | Product Info | `productName`, `productDesc`, upload TH video (TH) or faceless: `language`, `sceneCount`, `formatRatio` |
| 2 | Settings | Faceless: `sceneCount`, `formatRatio`, `hasVoiceover`, `voUrl`, `hasScript`, `scriptText`; TH: same format picker |
| 3 | Style | `visualStyle`, `theme`, `accentColor`, `customAccent`, `typographyStyle`, `tone`, `voiceId`, `logoUrl` |
| 4 | Generating | Spinner + rotating status messages; polls `/api/promo-video/:id` every 4s; advances to step 5 or editor |
| 5 | Asset Collection | Shows `user_required` manifest; user uploads screenshots per scene; all items decided → "Open Editor →" |

### What triggers generation
Step 3 "Create My Video" button → `handleBuildPlan()` → `POST /api/promo-video/create` → server returns project → `POST /api/promo-video/:id/render` → pipeline runs async → client polls until `status === "rendered"` or `editor_project_id` is set.

### Credit display
Button label: `"✦ Create My Video · {N} ✦"` where N = `PROMO_CREDITS[sceneCount] ?? 20`.  
Subtitle: `"{N} credits · {time} to generate"` — hidden while generating.

---

## Known Architectural Decisions

**Top-left origin for all coordinates**  
GPT is instructed to use only `left`/`top` absolute pixel values. `right`/`bottom` are converted in `resolveTransform` but should not appear in well-formed output. This simplifies the renderer — it never needs to know canvas dimensions to position elements.

**Relative keyframes**  
Keyframe `time` values are relative to the layer's own `start`, not the video timeline. The renderer adds `layer.start` at playback. This means keyframe data is reusable regardless of where in the video the scene appears.

**Scenes designed in parallel, not sequentially**  
All scenes are sent to GPT-5.4 simultaneously via `Promise.all`. This is safe because visual concepts are assigned upfront by the script generator — each scene already knows its `visual_concept` and the full list of sibling scenes is passed as context. Sequential design would be 3–5× slower for no quality gain.

**Single continuous voiceover, not per-scene TTS**  
One ElevenLabs call for the full script produces natural speech rhythm across scene boundaries. Per-scene TTS would cause audible pauses and inconsistent pacing. Whisper then re-segments the audio by word count to get per-scene timestamps.

**Whisper for timing, not duration estimates**  
Script generator budgets are approximate (words/2.8). Whisper timestamps are the ground truth — they're what actually sets `duration_seconds`. If TTS fails, the pipeline falls back to word-count estimates.

**Trail buffer (0.4s)**  
Whisper's last word boundary doesn't align with the actual audio end (silence, normalization). 0.4s is added unconditionally to the last scene so the video doesn't cut off mid-syllable.

**Style JSONB column for new fields**  
`format_ratio`, `theme`, `scene_count` are stored in `promo_videos.style` (JSONB), not as top-level columns. This avoids schema migrations for pipeline-level settings that aren't needed by the list/search queries.

**Asset manifest built after timeline, not before**  
The manifest lists which layers need user uploads. Those layers are only known after HTML parsing and timeline building — GPT decides whether to include a product screenshot, not the pipeline. Building the manifest upfront (step 1.5) was removed.

**Logo only in hook and CTA scenes**  
`buildTimeline` filters out `track_logo` layers from all scenes except the first (`isHook`) and last (`isCTA`). Logo repetition across every scene is visually noisy.

**Text height never trusted from GPT**  
GPT regularly sets fixed `height` on text elements that clips content. `htmlParser` always recalculates height from `(charCount / charsPerLine) × lineHeightPx + 20px`. GPT is also instructed to omit `height` on text elements entirely.

**Design mandate in system prompt, not user message**  
Color, theme, and style rules moved from the user message to the system prompt in `buildDesignMandate()`. System prompt has higher weight — GPT was ignoring accent color when it appeared only in the user message alongside other instructions.
