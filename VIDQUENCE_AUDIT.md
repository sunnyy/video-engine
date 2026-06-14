# Vidquence — Comprehensive Product & Business Audit
> Prepared as a self-contained briefing for an AI model with no prior context.
> All technical details are derived directly from the live codebase as of June 2026.

---

## 1. Executive Summary

### What Is Vidquence
Vidquence is an AI-first short-form video creation platform. It takes structured inputs (product descriptions, social media URLs, topics, voiceover scripts, product images) and outputs ready-to-publish vertical videos (primarily 9:16) complete with AI-generated voiceover, background music, animated text, and images.

It is **not** a clipper, not a dubber, not a template editor. Its core value proposition is: describe what you want → receive a fully composed, narrated, music-scored video in minutes.

### Core Value Proposition
- Zero-to-video in one prompt or upload — no design skills required
- Every video is uniquely composed by GPT-5.4 (HTML/CSS scene designer) rather than filled into templates
- Multiple specialized pipelines for different content types (SaaS promo, product ads, social repurposing, kinetic text)
- Full timeline editor post-generation — users can modify anything the AI produced
- Export via server-side Remotion renderer — no browser-tab dependency

### Target Users
1. **Solo founders / SaaS builders** — need product demo videos without a video team
2. **Ecommerce brands** — need product ad videos fast with AI-generated photography
3. **Content creators / influencers** — repurpose tweets, threads, Instagram posts as viral reels
4. **Marketing agencies** — batch-produce videos for multiple clients (Agency plan)
5. **Educators / newsletter writers** — turn written content into watchable short-form video

### Main Competitors
Opus Clip, InVideo, Pika, Runway, Veed, HeyGen, Synthesia, Creatify, Arcads

### Current Stage
**Late alpha / pre-launch.** Core pipelines are functional (SaaS Video, Social Video, Typography Video are stable). Product Video pipeline is actively being developed. The editor, export, credit system, and payments are all wired. The platform is not yet publicly launched.

---

## 2. Services Overview

### 2.1 SaaS / Promo Video
**Purpose:** Converts a product/SaaS description into a multi-scene promotional video with voiceover, music, and AI-designed visuals.

**Target user:** SaaS founders, product marketers, startup teams.

**Inputs:**
- Product name, description, goal (launch/promo/awareness/discount)
- Tone (professional/casual/energetic/minimal), accent color, theme (dark/medium/light)
- Scene count (1, 3, 5, 7), language, voice ID
- Optional: custom script, logo URL, format ratio (9:16 / 16:9 / 1:1)
- Optional: talking head video upload

**Outputs:**
- Full timeline JSON saved to `projects` table
- Editor project loaded directly in timeline editor
- Voiceover MP3 in Supabase Storage
- Background music from DB track library

**Strengths:**
- Rich, varied scene designs — GPT-5.4 has full creative freedom
- Whisper-synced timing so scene duration matches actual speech
- Talking head mode (TH) supports pip/split/hero/content_only layouts
- Supports all 4 aspect ratios
- Custom script bypass (skip GPT generation, use your own copy)
- 50+ intent patterns across 1/3/5/7 scene counts

**Weaknesses:**
- Image placeholders (Pixabay stock) are often low-quality matches
- No logo animation — logos injected as static image layer only
- TH pipeline requires user to upload the video separately after generation (two-step)
- No brand kit / style persistence across projects

---

### 2.2 Product Video
**Purpose:** Takes a product image (uploaded or URL) and generates an ecommerce-style short-form video ad, with AI-photographed product shots per scene.

**Target user:** DTC/ecommerce brand owners, Shopify sellers, product marketers.

**Inputs:**
- Product image (upload)
- Brand name, CTA text, offer text, website
- Scene count (1/3/5), campaign goal, voice ID

**Outputs:**
- Per-scene FAL flux-kontext product shots (uploaded to Supabase)
- GPT-5.4 HTML scenes with product shot as background
- Full timeline with voiceover + music
- Editor project

**Strengths:**
- AI photography is genuinely differentiating — takes one product photo, generates editorial shots
- Parallel shot generation + HTML design per scene
- Product brief (GPT-4.1 vision) drives everything — accent color, mood, theme auto-derived
- Vertical reference composite ensures FAL receives proper 9:16 framing

**Weaknesses:**
- Currently broken: product-shot placeholder injection failing (black video bug)
- No user control over shot style/background
- No ability to regenerate individual shots
- Pipeline is v3/v4 in flux — architecture changed multiple times, technical debt

---

### 2.3 Social Video
**Purpose:** Takes a social media post URL (Twitter/X, Instagram, LinkedIn, etc.) and turns it into a shareable reel or short.

**Target user:** Content creators, influencers, newsletter writers, viral content repurposers.

**Inputs:**
- Social post URL
- Language, voice ID
- Target duration (15–60 seconds), include author attribution toggle

**Outputs:**
- Full timeline with scenes matching the post's content
- Post images injected as social-image placeholders
- Voiceover narrating the key points of the post
- Background music matched to content mood

**Strengths:**
- Content fetcher handles Twitter/X, Instagram, LinkedIn (scrapes text, images, metrics)
- GPT-5.4 designs scenes specifically matching the content type (stat, quote, list, image, cta)
- Thread support — covers multiple posts
- List scenes show actual items, not summaries
- Palette auto-derived from content tone (inspiring → gold, tech → cyan, etc.)
- Image injection from scraped post photos

**Weaknesses:**
- Content fetcher fragile — depends on platform HTML structure; breaks when platforms update
- No authentication for private/locked posts
- Image scraping can fail silently
- No video clips from reels/TikTok support — text and images only

---

### 2.4 Typography Video
**Purpose:** Turns any topic, question, or educational script into a kinetic text video (Apple-keynote style).

**Target user:** Educators, YouTubers, podcast highlight creators, motivational content creators.

**Inputs:**
- Topic/question/existing script
- Input type (topic / article / script)
- Target duration (15–60 seconds)
- Language, voice ID

**Outputs:**
- Kinetic beat timeline (each spoken word group = one flash scene)
- Full narration voiceover
- Background music
- Editor project (typography video source)

**Strengths:**
- Most reliable pipeline — no external image dependencies
- Two-level timing: scene-level + beat-level word timestamp matching
- Dramatic keyword vs phrase beat types create genuine kinetic energy
- Auto-derived palette, font pair, music mood from content niche
- Works in multiple languages (ElevenLabs multilingual v2)

**Weaknesses:**
- Visually monotone — background is always a gradient, no images
- All scenes look similar (dark gradient + white text)
- No user control over animation style or beat pacing
- Cannot import a YouTube video and make it kinetic (input is text only)

---

### 2.5 Caption Studio (Add Captions)
**Purpose:** User uploads a video; AI transcribes it and burns in animated word-highlight captions.

**Target user:** Any video creator wanting TikTok-style captions.

**Inputs:**
- Video file upload
- Caption style selection

**Outputs:**
- Remotion-rendered video with caption overlay
- 8 credits per export

**Strengths:**
- Uses FAL Whisper for fast transcription
- Full editor preview before export
- Word-level timestamps = accurate highlight sync

**Weaknesses:**
- Caption style options limited (not enough variety)
- No language detection — user must know their video language
- No emoji or emoji caption mode
- Cannot re-style captions after render without re-upload

---

### 2.6 Blank Canvas
**Purpose:** Direct timeline editor access with no AI generation — user builds from scratch.

**Target user:** Power users, designers, agencies with their own assets.

**Inputs:**
- Empty project creation
- User uploads assets, types text, arranges layers

**Outputs:**
- Timeline project (same format as AI-generated)
- Exportable via Remotion

**Strengths:**
- Full layer system available: text, image, gradient, video, audio, sticker
- Keyframe animation editor
- Multi-layer selection, group operations
- Undo/redo stack (50 steps)

**Weaknesses:**
- No template library for blank canvas starts
- No AI assist within the editor (no "improve this headline" etc.)
- Asset library integration is basic

---

### 2.7 Product Ad Studio
**Purpose:** Takes a product image → GPT-4o vision strategy → FAL base image → 5 scene images → LTX video clips.

**Target user:** Ecommerce brands wanting a full multi-clip product ad in one shot.

**Inputs:**
- Product image upload
- Target market description

**Outputs:**
- GPT-4o shot strategy (5 scene descriptions)
- FAL Flux base model image
- 5 scene images (FAL)
- 5 LTX video clips (FAL)

**Credit cost:** 353 credits total ($3.50+ worth)

**Strengths:**
- Most visually impressive output for ecommerce
- Full autonomous pipeline from one image
- LTX motion clips are genuinely differentiating

**Weaknesses:**
- Most expensive service (353 credits)
- LTX clips are ~3-4 seconds each — no narrative arc
- No voiceover or music — it's raw clips, not a video
- No timeline editor integration — clips are delivered as individual files

---

### 2.8 Poster Studio
**Purpose:** AI-generated marketing poster from a prompt.

**Inputs:** Topic/product description, poster style.

**Outputs:** Single 1080x1920 poster image (10 credits).

**Strengths:** Fast (single image gen), cheap.

**Weaknesses:** Not a video service — doesn't fit the core value prop tightly.

---

### 2.9 Thumbnail Generator
**Purpose:** YouTube-style thumbnail generation.

**Inputs:** Video topic, style preferences.

**Outputs:** 1280x720 thumbnail (10 credits).

**Strengths:** Single-purpose, fast, cheap.

**Weaknesses:** Standalone tool, no editor integration.

---

### 2.10 Virtual Try-On
**Purpose:** Upload a clothing item → try it on a model.

**Inputs:** Clothing image, optional model image.

**Outputs:** Single generated image (15 credits).

**Weaknesses:** Completely unrelated to video — strategic misfit.

---

### 2.11 Social Post / Banner Design
**Purpose:** AI-designed social media graphic for a topic.

**Inputs:** Topic, platform.

**Outputs:** Image (15 credits).

**Weaknesses:** Competes with Canva, not a video differentiator.

---

## 3. Complete Pipeline Breakdown

### 3.1 SaaS/Promo Video Pipeline

```
User Input
│
├── [Optional] Custom script provided? → skip GPT step 1
│
├── Step 1: GPT-4.1 Script Generation
│   Input: product description, goal, tone, scene count, language
│   Output: full_script, scenes[] with intent/script_segment/visual_concept/archetype
│   Pattern selection: random from INTENT_PATTERNS[sceneCount]
│   Word budgets per intent (e.g. hook=16w/4s, feature=20w/5s)
│
├── Step 2: GPT-5.4 Scene Design (parallel per scene)
│   Input: script_segment, projectContext (accent, theme, niche, visualStyle)
│   Output: self-contained HTML file (1080x1920, inline CSS, absolute positioning)
│   Model: gpt-5.4, max_completion_tokens: 16000
│   Fallback: retry once if invalid HTML returned
│
├── Step 3: parseSceneHTML → scene graph arrays
│   Input: raw HTML string
│   Output: layer objects [{id, type, role, content, style, transform, animation…}]
│   Uses: node-html-parser, reads <style> blocks + inline styles
│
├── Step 4: ElevenLabs TTS (single full voiceover)
│   Model: eleven_multilingual_v2
│   Endpoint: /with-timestamps (character alignment → word timestamps)
│   Post-processing: loudnorm to -9 LUFS via FFmpeg
│   Output: audio_url (Supabase), duration_seconds, wordTimestamps[]
│
├── Step 5: Assign scene durations from word timestamps
│   Maps each scene's word count to its Whisper timestamp window
│   Sets scene.duration_seconds from actual speech timing
│   Last scene extended to cover full audio + 0.4s trail
│
├── Step 6: buildTimeline(sceneGraphs, scenes, projectContext)
│   Input: scene graphs + duration-tagged scenes
│   Output: timeline JSON {format, meta, layers[]}
│   Each graph entry → layer with calculated start/end based on cursor
│   Animation delays proportional to scene duration (spread windows)
│
├── Step 7: Inject voiceover audio layer (global, start=0, end=totalDuration)
│
├── Step 8: Background music
│   Mood picked from: pickAutoMood(video_goal, tone)
│   Random track from music_tracks table matching mood
│   Volume: 0.25, fade in/out
│
├── Step 9: Resolve image placeholders
│   assetType=stock → Pixabay API search
│   assetType=ai → FAL flux/schnell, re-upload to Supabase
│   assetType=asset → mark as pending, user upload required
│
└── Step 10: Save to projects table → return editor_project_id
```

---

### 3.2 Talking Head (TH) Pipeline

```
User uploads video → POST /promo-video/transcribe-th
│
├── Step 1: processTalkingHeadFromPath
│   FAL Whisper transcription → word/segment timestamps
│   Output: scenes[] (raw Whisper segments), full_transcript
│
├── Step 2: normalizeTHTranscript (GPT-4.1)
│   Input: Whisper segments with timestamps
│   Prompt: Full TH visual director prompt (see Section 4)
│   Output: groups[] with treatment (th_full/th_hero/th_pip/th_split/content_only)
│           archetype, visual_direction, visual_source per group
│
├── Step 3: GPT-5.4 Scene Design (sequential — th_full scenes skip)
│   Only non-th_full scenes get HTML designed
│   TH-aware prompt injection: "design AROUND TH video area"
│   visual_source=categories → no image placeholder (build cards in HTML)
│   visual_source=asset → include image-placeholder element
│
├── Step 4: buildTimeline
│
├── Step 5: Inject th_video_base layer (full duration, z-index 0)
│           src=null → filled at render time when user uploads to Supabase
│
├── Step 6: Inject per-scene TH clip layers
│   th_hero   → fullscreen video clip (z-index 2)
│   th_split  → top 45% of canvas (splitH = canvas.height * 0.45)
│   th_pip    → circular PiP bottom-left (330px diameter, z-index 50)
│   content_only → no TH clip (generated visual only)
│
├── Step 7: Resolve image placeholders
│
├── Step 8: Background music (volume=0.12 — quieter for TH audio)
│
└── Step 9: Save timeline (source: promo_video_th)
    NOTE: TH timeline goes directly to editor — NO Remotion render step for TH.
    The editor previews it, user renders manually.
```

---

### 3.3 Social Video Pipeline

```
POST /api/social-video/generate
{ url, userId, voiceId, language, targetDuration, includeAuthor }
│
├── Step 1: fetchSocialContent(url)
│   Scrapes: text, images, author, platform, metrics, thread detection
│   Output: { text, imageUrls, author, platform, isThread, threadLength }
│
├── Step 2: generateSocialScript(content, targetDuration, language)
│   GPT-4.1 with SCRIPT_SYSTEM prompt (see Section 4)
│   Scales scene count by word count (short=3-4, medium=4-5, long=5-7, thread=7)
│   Output: full_script, scenes[], palette, fontPair, musicMood, projectName
│           Each scene: intent, script_segment, archetype, visual_text, use_fetched_image
│
├── Steps 3+4: designSocialScene (parallel per scene)
│   Uses social intentPrompts.js
│   Archetypes: typography_hero, single_stat, quote_statement, list_reveal,
│               full_bleed_image, split_composition, minimal_cta
│   Output: HTML → parseSceneHTML → scene graph
│
├── Step 5: ElevenLabs TTS (same as promo — /with-timestamps)
│
├── Step 6: Assign durations from word timestamps
│
├── Step 7: buildTimeline
│
├── Step 8: Inject fetched social images into social-image placeholder layers
│   assetType=social-image → replace src with scraped imageUrls[scene.image_index]
│
├── Step 9: Background music (volume=0.20)
│
└── Step 10: Save (source: social_video)
```

---

### 3.4 Typography Video Pipeline

```
POST /api/typography-video/generate
{ input, inputType, targetDuration, userId, voiceId, language }
│
├── Step 1: generateTypographyScript (GPT-4.1)
│   Input: topic/article/script text + targetDuration
│   Output: scenes[] each with:
│     - voiceover: full narration sentence (6-14 words)
│     - beats[]: [{text, type: "keyword"|"phrase"}] — visual flash units
│   Also: projectName, palette{bg, text, accent, accent2}, fontPair, musicMood, niche
│
├── Step 2: ElevenLabs TTS
│   Joins all scene voiceovers as single continuous narration
│   Speed: 1.1 (slightly faster for kinetic style)
│
├── Step 3: Assign per-beat timing (two-level matching)
│   Level 1: match scene's first word to global Whisper timestamps
│   Level 2: match each beat's words within that scene's timestamp slice
│   Fallback: word-count-based estimation if no TTS
│
├── Step 4: buildTypographyTimelineDirect(timedBeats, {palette, fontPair, audioUrl})
│   Each beat → text layer with:
│     - Font size based on beat type and word count
│       keyword 1-word=160px, keyword 2-word=128px, phrase ≤4w=86px, etc.
│     - textAnimation: keyword → "fade-up-zoom", phrase → "fade-in"
│     - wordTimestamps for per-word highlight animation
│   Background: gradient layer (palette.bg → palette.bg2)
│   Alternating accent colors on consecutive keywords
│
├── Step 5: Background music (volume=0.18, fade 1.5s in, 2s out)
│
└── Step 6: Save (source: typography_video)
```

---

### 3.5 Product Video Pipeline (v4 — current state)

```
POST /api/product-video/generate
{ imageUrl, brandName, ctaText, offerText, website, sceneCount, goal, voiceId }
│
├── Step 1a: analyzeProduct (GPT-4.1 vision) — in parallel with 1b
│   Input: product image URL
│   Output: {product_name, category, dominant_color, accent_color, mood, theme,
│            target_audience, key_benefits, visual_style}
│
├── Step 1b: buildVerticalReference (Sharp)
│   Composites product image centered on 1080x1920 dark canvas
│   Output: vertRefUrl (Supabase) — used as FAL input
│
├── Step 2: generateProductScript (GPT-4.1)
│   Input: brief from Step 1a
│   Output: scenes with display_text (multiline), visual_concept, shot_directive
│   Pattern: random from PRODUCT_INTENT_PATTERNS[sceneCount]
│   JSON sanitization: regex replaces literal newlines in string values before parse
│
├── Step 3: ElevenLabs TTS (single full voiceover)
│
├── Step 4: Assign scene durations from word timestamps
│
├── Step 5: Per-scene parallel execution for EACH scene:
│   ├── generateSingleShot (FAL flux-kontext)
│   │   Input: vertRefUrl + scene.shot_directive + NO_TEXT_SUFFIX
│   │   Fallback: FALLBACK_PROMPTS[intent] if directive missing
│   │   Output: shotUrl (Supabase) — re-uploaded from fal.media for permanence
│   │
│   └── designProductScene (GPT-5.4)
│       Input: scene, productBrief, projectContext
│       Prompt: buildProductScenePrompt (see Section 4)
│       Background: data-asset-type="product-shot" placeholder (first body child)
│       Gradient overlays for legibility included in HTML
│
├── Step 6: parseSceneHTML → inject shot URLs
│   For each graph entry where entry.assetType==="product-shot":
│     entry.src = shotUrl (or productImageUrl fallback)
│
├── Step 7: buildTimeline (shared from promoVideo)
│
├── Step 8: Inject voiceover
│
├── Step 9: Background music
│
├── Step 10: Logo injection (if logoUrl provided)
│
└── Step 11: Save (source: product_video, scene_format: v4)
```

---

### 3.6 Export Pipeline (All Services)

```
POST /api/render/timeline
{ project: TimelineJSON, projectId, resolution: "1080p" }
│
├── Deduct 8 export credits
├── Create async job (jobId returned immediately)
│
├── timelineRenderJob:
│   ├── Sanitize blob: URLs (replace with null)
│   ├── Drop image/sticker layers with no resolvable src
│   ├── Cap duration to max visual layer end
│   ├── Check subscription → add watermark if free user
│   ├── Load Remotion bundle (pre-built or runtime)
│   ├── getCompositions → find TimelineComposition
│   ├── renderFrames → PNG sequence at 30fps
│   ├── stitchFramesToVideo → MP4 (h264, AAC audio)
│   └── Upload to Supabase → public URL returned
│
└── GET /api/render/status/:jobId → poll for progress/url/error
```

---

## 4. Prompt Inventory

### 4.1 SaaS Video — Script Generator System Prompt (GPT-4.1)

**Purpose:** Generate multi-scene promo script with voiceover + visual concept per scene.

**Key elements:**
- Elite SaaS copywriter persona
- Intent descriptions for: hook, problem, solution, benefit, feature, process, proof, cta, standalone
- 4 tone modes with distinct instructions: professional, casual, energetic, minimal
- Word budgets per intent (16–32 words)
- Punctuation rules for TTS pacing (periods for list items, em-dashes for contrast, commas for CTA)
- Forbids: "revolutionary", "game-changing", "next-gen", "cutting-edge", "unlock", "leverage"
- Niche-specific vocabulary injection
- pattern_tone passed through to influence narrative arc

**Inputs:** product_name, product_description, video_goal, tone, niche, language, scene_count, pattern
**Outputs JSON:** `{full_script, scenes[], accent_color, niche, pattern_name}`

**Known limitations:**
- GPT sometimes still writes generic copy for commoditized products
- Long descriptions cause truncation at 2500 tokens
- Non-English scripts can default to English accents in visual_concept

---

### 4.2 SaaS Video — Scene Designer System Prompt (GPT-5.4)

**Purpose:** Design a single 1080x1920 HTML/CSS scene for a promo video frame.

**Key elements:**
- Art director persona
- No JavaScript, no SVG, no external assets (Google Fonts @import allowed)
- Fixed size 1080x1920px, all positioning absolute with explicit pixels
- Required data attributes: `data-role`, `data-layer`, `data-animation`, `data-scene-element`
- Overflow prevention formula: `char_count × font_size × 0.60 ≤ element_width`
- Glow elements must be divs with radial-gradient, never text
- Button rule: background applied directly on text element, never a separate div behind
- 8 named archetypes: typography_hero, full_bleed_image, split_composition, feature_grid, single_stat, minimal_cta, numbered_list, quote_statement
- Lucide icon system: `data-icon="kebab-case-name"` on `data-role="icon"` elements
- Design mandate: theme (dark/medium/light) rules, accent color derivations, visual style (radiant/minimal/professional/high-contrast)

**Inputs:** sceneScript, projectContext {intent, archetype, visualConcept, accentColor, theme, visualStyle, productName, etc.}
**Output:** Single HTML file string

**Known limitations:**
- GPT-5.4 occasionally places elements at pixel positions that overflow canvas
- Glow-as-text rule sometimes violated (workaround: retry)
- Brand name bleeds into non-hero/cta scenes despite explicit instruction
- Font imports sometimes slow render

---

### 4.3 TH Normalizer Prompt (GPT-4.1)

**Purpose:** Takes raw Whisper transcript segments and decides visual treatment for each speech segment.

**Key elements:**
- 5 treatment types: th_full (speaker only), th_hero (speaker + text overlay), th_pip (full visual + PiP), th_split (speaker top 45% + visual bottom), content_only (full visual, speaker hidden)
- Critical list rule: consecutive list items = ONE group (overrides all splitting rules)
- Max group duration 5s, min 1.5s, never th_full > 3s, max 10 total groups
- Variety rule: never same treatment twice in a row
- Visual source: "categories" = build in HTML, no image placeholder; "asset" = include placeholder
- Archetype assignment

**Inputs:** Whisper segments with timestamps
**Outputs JSON:** `{groups[], full_transcript}`

**Known limitations:**
- GPT-4.1 still over-splits lists occasionally despite the CRITICAL LIST RULE
- treatment variety rule is enforced by prompt but not validated in code — can be violated

---

### 4.4 Product Analyzer (GPT-4.1 Vision)

**Purpose:** Analyze product image → creative brief for pipeline.

**Key elements:**
- Brand strategist + visual merchandiser persona
- Extracts: product name, category, dominant color (hex), accent color (hex), mood, theme, target audience, key_benefits[], visual_style
- theme logic: dark=black packaging, light=white packaging, medium=ANY colorful product

**Inputs:** product image URL (vision)
**Outputs JSON:** full creative brief

**Known limitations:**
- Cannot read text on small labels (flavor names, sizes)
- Hex color extraction is approximated — not pixel-accurate
- "medium" theme logic is too broad (assigns medium even to muted products)

---

### 4.5 Product Script Generator (GPT-4.1)

**Purpose:** Write scenes with voiceover, display_text (on-screen), visual_concept, shot_directive.

**Key elements:**
- World-class product advertising copywriter persona
- display_text: newline-separated short lines for on-screen use (max 4 lines, ~30 chars each)
- visual_concept: one sentence for scene designer
- shot_directive: "Keep the product exactly as shown. [environment/lighting]. No text. Vertical portrait."
- CRITICAL COMPOSITION RULE: product in lower 50-60%, upper 40-50% open for text
- Forbids: revolutionary, game-changing, next-gen, cutting-edge, unlock, leverage
- Campaign goal directives: launch/promo/discount/awareness

**Known limitations:**
- GPT sometimes outputs literal `\n` as a real newline in JSON — fixed by sanitization regex
- Shot directives can be overly specific in ways FAL ignores

---

### 4.6 Product Scene Designer (GPT-5.4)

**Purpose:** Design HTML scene with product photo as background (via placeholder).

**Key elements:**
- Same structural rules as SaaS scene designer
- BACKGROUND IS A PRODUCT PHOTOGRAPH — all intent directives say "NO product image element"
- `data-asset-type="product-shot"` placeholder as MANDATORY FIRST CHILD of body
- Gradient overlays injected by GPT in HTML: top vignette (rgba(0,0,0,0.52)) + bottom dark (rgba(0,0,0,0.92))
- Brand name restricted to hero/cta scenes only
- Product mood rules: premium/playful/minimalist/bold/elegant/organic

**Known limitations:**
- Product shot placeholder injection in orchestrator currently broken (all black video bug)
- GPT occasionally omits the placeholder div — needs retry logic enhancement

---

### 4.7 Social Video — Script Generator (GPT-4.1)

**Purpose:** Take scraped social post → viral video script.

**Key elements:**
- Never mention author name or platform name
- Product/company names from post ARE used (they are the hook)
- Scale scene count to content volume
- stat scenes: use numbers FROM the post's content only (never engagement metrics)
- list scenes: show actual items, not summaries (visual_text = real list items newline-separated)
- PALETTE GUIDE: 6 emotional archetypes mapped to color schemes
- For threads: hook → multiple list scenes covering all thread items → cta

**Known limitations:**
- Cannot access private posts
- Image-based posts with no text produce weak scripts

---

### 4.8 Typography Video — Script Generator (GPT-4.1)

**Purpose:** Convert topic/article to kinetic text script with beats.

**Key elements:**
- "kinetic typography creative director" persona
- Two-level concept: voiceover (what narrator says) vs beats (what appears on screen)
- Beat types: keyword (1-3 words, impactful), phrase (2-6 words, context)
- Beats must appear in same order as voiceover (consecutive substrings, skipping function words)
- 1-word beats most dramatic — use for the single most impactful word
- Target scene count = targetDuration / 2
- Input type detection: question → maintain curiosity/question structure in hook beat

**Known limitations:**
- Very long articles produce too many scenes (no hard cap on GPT output)
- Beats can miss important words when GPT skips too many function words

---

## 5. Timeline Editor Architecture

### 5.1 Timeline JSON Schema

Every project saved to the `projects` table stores its full state in `safe_project_json`. The schema:

```json
{
  "format": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "duration": 18.4,
    "ratio": "9:16"
  },
  "meta": {
    "productName": "Acme SaaS",
    "projectName": "Acme SaaS — Promo",
    "niche": "saas",
    "accentColor": "#6366f1",
    "visualStyle": "radiant",
    "theme": "dark",
    "source": "promo_video",
    "scene_format": "v2"
  },
  "full_script": "Complete voiceover narration text.",
  "layers": [ ... ]
}
```

### 5.2 Layer Schema

Every element in the video is a layer:

```json
{
  "id": "s0_headline",
  "trackId": "s0_headline",
  "name": "Headline",
  "type": "text",
  "content": "STOP WASTING TIME",
  "start": 0.0,
  "end": 4.0,
  "zIndex": 5,
  "visible": true,
  "locked": false,
  "sfx": null,
  "keyframes": {
    "x": [], "y": [], "scale": [], "rotation": [],
    "opacity": [{"time": 0.1, "value": 0}, {"time": 0.4, "value": 1}],
    "blur": []
  },
  "transition": {
    "in":  {"type": "fade-in", "duration": 0.3},
    "out": {"type": "none",    "duration": 0}
  },
  "transform": {
    "x": 80, "y": 320, "width": 920, "height": 200,
    "opacity": 1, "scale": 1, "blur": 0, "rotation": 0,
    "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff"
  },
  "style": {
    "fontSize": 96,
    "fontFamily": "Inter, sans-serif",
    "fontWeight": 800,
    "color": "#ffffff",
    "textAlign": "center",
    "lineHeight": 1.2,
    "letterSpacing": 2
  },
  "animation": "fade-up",
  "dataRole": "headline",
  "dataLayer": "text",
  "dataSceneElement": "hero"
}
```

**Layer types:**
- `text` — styled text with font/color/align
- `image` — photo/illustration (src URL or placeholder)
- `gradient` — pure CSS gradient fill
- `video` — video clip (TH base, TH pip/split, user video)
- `audio` — voiceover, music, sfx
- `sticker` — animated sticker
- `shape` — geometric shape

### 5.3 Layer ID Convention

All layers generated by a pipeline use the pattern `s{sceneIndex}_{role}_{counter}`:
- `s0_bg` — scene 0 background
- `s0_headline` — scene 0 headline
- `s1_glow_0` — scene 1 first glow element
- `voiceover_full` — global voiceover (single-track model)
- `music_global` — background music
- `th_video_base` — talking head base video

### 5.4 Keyframe System

Keyframes are arrays of `{time, value}` pairs per transform property. The timeline store interpolates between them at render time:

```js
interpolateKeyframes(keyframes.opacity, currentTime, layer.start, layer.end)
```

The animation system supports:
- Opacity fade-in/out
- Scale keyframes (background zoom-in effect)
- Position (x/y) animations
- Blur keyframes

### 5.5 Timeline Store (Zustand)

```
useTimelineStore
├── project          — full TimelineJSON
├── projectId        — Supabase project row ID
├── currentTime      — playhead position (seconds)
├── isPlaying        — playback state
├── duration         — recalculated from layers
├── selectedLayerId  — single selection
├── selectedLayerIds — multi-selection
├── zoom             — timeline track zoom level
├── snapEnabled      — magnetic snap
├── _history         — undo stack (50 max)
├── _future          — redo stack
└── pendingFiles     — layerId → File (blobs awaiting upload on save)
```

Key actions: `setProject`, `updateLayer`, `addLayer`, `removeLayer`, `setCurrentTime`, `undo`, `redo`, `addKeyframe`

### 5.6 Rendering Flow

**Preview (in-browser):**
- React component tree renders at `currentTime`
- Each layer checks `start ≤ currentTime < end`
- Keyframe interpolation runs at 60fps via requestAnimationFrame
- Images/videos fetched from Supabase CDN URLs

**Export (server-side Remotion):**
1. Client POSTs `{project: TimelineJSON}` to `/api/render/timeline`
2. Server loads pre-built Remotion bundle (`remotion-bundle/`)
3. Remotion's `renderFrames` spawns headless Chromium
4. Each frame: React component tree renders with `currentTime = frame / fps`
5. `stitchFramesToVideo` → FFmpeg → MP4
6. Upload to Supabase → public URL returned

**Timeline composition props:**
- `inputProps.project` = full TimelineJSON
- Canvas size from `project.format.{width, height}`
- Duration from `project.format.duration`
- FPS from `project.format.fps` (default 30)

---

## 6. Output Examples

### 6.1 SaaS Video — Example

**Input:**
```
Product: Notion
Description: All-in-one workspace for notes, docs, tasks, and databases
Goal: promo
Tone: casual
Scene count: 3
```

**Generated intent pattern:** `challenge` (hook → benefit → cta)

**Generated script:**
```
"Are you still jumping between ten different apps just to get one thing done?
Everything you need — notes, docs, tasks, databases — in one place.
It's Notion. Try it free, get started today."
```

**Scene 0 (hook):** GPT-5.4 designs typography_hero archetype — massive "10 APPS. 1 TASK." in white on dark background with indigo glow orbs

**Scene 1 (benefit):** feature_grid archetype — 4 items in a card grid: Notes / Docs / Tasks / Databases

**Scene 2 (cta):** minimal_cta archetype — "Notion" large in upper third, "Try it free" pill button centered

**Timeline duration:** ~11.2 seconds (Whisper-calibrated)

---

### 6.2 Typography Video — Example

**Input:** "Why do we dream?"

**Beat sequence excerpt:**
```
Scene 0 voiceover: "Scientists still don't fully understand why humans dream."
Beats:
  phrase: "Scientists still don't know"
  keyword: "Why"
  keyword: "We Dream"

Scene 1 voiceover: "During REM sleep, your brain becomes almost as active as when awake."
Beats:
  keyword: "REM Sleep"
  phrase: "brain almost awake"
```

**Timeline:** keyword beats get 160px font + fade-up-zoom animation; phrase beats get 86px + fade-in

---

### 6.3 Social Video — Example

**Input:** Tweet: "Claude just wrote 550 videos in a day. That's 23/hour. 1 every 2.6 minutes. The future of content is automated."

**Script scenes:**
- hook: "Claude wrote 550 videos in a day." — archetype: typography_hero
- stat: "23 videos per hour." — archetype: single_stat (massive "23" in gold)
- stat: "One every 2.6 minutes." — archetype: single_stat
- cta: "Follow for more, save this now" — archetype: minimal_cta

**Palette:** Tech/AI/future → #050B18 bg, #00E5FF cyan accent

---

## 7. Current Technical Architecture

### 7.1 Frontend
- **Framework:** React 19 with Vite 7
- **Styling:** Tailwind CSS 3
- **State:** Zustand 5 (multiple stores: timeline, assets, credits, projects, imageLibrary)
- **Routing:** React Router v7
- **Icons:** Phosphor Icons (UI), Lucide React (in generated videos)
- **DnD:** @dnd-kit (drag-and-drop layer reordering)
- **Color picker:** react-colorful, react-gradient-color-picker
- **Analytics:** PostHog

### 7.2 Backend
- **Runtime:** Node.js (ESM modules)
- **Framework:** Express 5
- **Rate limiting:** express-rate-limit (100 req/15min general, 10/15min auth)
- **File uploads:** Multer (max 100MB body)
- **Image processing:** Sharp (resize, composite, format conversion)
- **Audio processing:** FFmpeg via fluent-ffmpeg + ffmpeg-static
- **HTML parsing:** node-html-parser

### 7.3 Database
- **Provider:** Supabase (PostgreSQL)
- **Key tables:**
  - `projects` — all timeline projects (safe_project_json JSONB)
  - `promo_videos` — promo/SaaS video job records + asset_manifest
  - `subscriptions` — user plan subscriptions
  - `user_credits` — credit balance
  - `credit_transactions` — credit history
  - `plans` — plan definitions (starter/pro/agency/payg)
  - `music_tracks` — background music library (mood, public_url)

### 7.4 Storage
- **Provider:** Supabase Storage
- **Buckets:**
  - `user-assets` — all generated images, voiceovers, product shots, renders
- **Structure:** `{service}/{userId}/{runId}/{type}-{timestamp}.{ext}`
- **Temp:** Local `TEMP_DIR` for render artifacts (cleaned every 6 hours, max age 24h)

### 7.5 AI Providers

| Provider | Models Used | Purpose |
|---|---|---|
| OpenAI | gpt-4.1 | Script generation, product analysis, TH normalization |
| OpenAI | gpt-5.4 | Scene HTML design (primary creative model) |
| OpenAI | gpt-4o | Product Ad studio analysis (vision) |
| OpenAI | tts-1-hd | TTS fallback (legacy path) |
| OpenAI | Whisper | Transcription (video/audio input) |
| ElevenLabs | eleven_multilingual_v2 | Primary TTS with word timestamps |

### 7.6 Image / Video Generation
- **FAL.ai:**
  - `fal-ai/flux/schnell` — fast background image generation (promo video stock)
  - `fal-ai/flux-kontext` — product shot generation (product video)
  - LTX model — video clip generation (product ad studio)
  - Whisper — audio transcription

### 7.7 Other External Services
- **Razorpay** — payments (INR-native, USD via live exchange rate)
- **Resend** — transactional email (plan expiry warnings, alerts)
- **Pixabay API** — free stock image search
- **exchangerate-api.com** — USD→INR exchange rate (cached 1h)
- **Railway** — deployment platform (auto-deploy from GitHub main push)

### 7.8 Video Rendering
- **Remotion 4** — server-side headless Chrome rendering
- **Pre-bundled:** `remotion-bundle/` pre-built to avoid runtime bundling on Railway
- **Process:** renderFrames (PNG sequence) → stitchFramesToVideo (MP4, h264+AAC)
- **Cost:** 8 credits per export

### 7.9 Credit System
| Action | Credits |
|---|---|
| SaaS Video (1 scene) | 50 |
| SaaS Video (3 scenes) | 120 |
| SaaS Video (5 scenes) | 200 |
| Talking Head video | 180 |
| Typography Video | 15 |
| Social Video | ~35 (script+TTS) |
| Product Video | ~120 (TBD) |
| Export (any) | 8 |
| Product Ad (full) | 353 |
| Poster / Thumbnail | 10 |
| Caption Studio export | 8 |

---

## 8. Competitive Positioning

### 8.1 Comparison Matrix

| Feature | Vidquence | Opus Clip | InVideo | Pika | Runway | Veed | HeyGen | Synthesia | Creatify | Arcads |
|---|---|---|---|---|---|---|---|---|---|---|
| AI script + voiceover | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Talking head video | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Social post → video | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Product image → ad video | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Kinetic typography | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Free-form HTML design | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Full timeline editor | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Native video generation | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI avatar presenters | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Price point | $15-50/mo | $15-149/mo | $20-80/mo | $8-28/mo | $12-76/mo | $18-78/mo | $29-89/mo | $22-67/mo | $39-186/mo | $39-199/mo |

### 8.2 Where Vidquence Is Stronger

**vs Opus Clip:** Opus Clip is a clipper (long video → short clips). Vidquence generates original content from scratch. Completely different use case.

**vs InVideo:** InVideo uses template-based scene filling. Vidquence's GPT-5.4 designs each scene uniquely from the script + product context — no templates. Social video repurposing is not an InVideo feature.

**vs Creatify/Arcads:** These are specialized for product ads with avatar presenters. Vidquence matches them on product videos without avatars, at a lower price point. Social video and SaaS video are outside their scope.

**vs HeyGen/Synthesia:** These require avatar licenses and production-quality recordings. Vidquence's TH mode works with any casual phone recording and wraps it in generated visuals — lower friction, lower cost.

**vs Veed:** Veed is primarily a manual editor with some AI helpers. Vidquence starts from AI generation and adds editing. Fundamentally different product philosophy.

**Unique to Vidquence (no direct competitor):**
- Social post URL → complete narrated video (nobody does this end-to-end)
- GPT-5.4 HTML scene design → every video visually unique without templates
- TH video with GPT-designed overlays in pip/split/hero modes
- Kinetic typography from any text

### 8.3 Where Vidquence Is Weaker

**vs Runway/Pika:** No native video generation (motion, generative clips). FAL's LTX is limited to the Product Ad service. This is a major gap for users who want "make this image move."

**vs HeyGen/Synthesia:** No avatar presenters. If users want a "virtual spokesperson," Vidquence cannot help.

**vs Opus Clip:** No long-form video analysis or automatic clipping. If users want to repurpose a YouTube video, Vidquence cannot clip it (can only add captions via Caption Studio).

**vs all competitors:** No mobile app. No Chrome extension. No API for developers.

---

## 9. Product Gaps

### 9.1 Missing Features
1. **Clip from long-form video** — upload a 10-minute YouTube video, get 5 viral clips
2. **Avatar/presenter mode** — AI spokesperson synced to generated script
3. **Image-to-video (generative)** — animate any image or product photo
4. **Template library** — starting points for blank canvas
5. **Brand kit** — save accent color, font, logo across all projects
6. **Style presets** — save/reuse a visual style across generations
7. **Bulk generation** — generate 5 product videos in one batch
8. **Webhook/API access** — programmatic video generation for developers
9. **Subtitles/translations** — auto-generate captions in other languages
10. **A/B variant generation** — generate 3 versions of the same video for testing

### 9.2 Missing Workflows
1. **"I have a blog post, make a video"** — article → narrated video (closest is Typography Video but no image support)
2. **"I have a podcast, make a reel"** — audio → video (only caption tool exists, not a reel generator)
3. **"I have a YouTube video, make a short"** — video → clip (Opus Clip territory, not supported)
4. **"I want an explainer video with screencasts"** — screen recording upload not supported

### 9.3 Missing Positioning Opportunities
1. **No-code/automation niche** — Zapier/Make users who want video in their workflows
2. **Local business advertising** — restaurants, gyms, salons (high volume, simple needs)
3. **Real estate** — property listing → video ad (strong template-free use case)
4. **Recruitment** — job description → "we're hiring" video

### 9.4 Weak Services
1. **Product Video** — currently broken (black video bug), architecture in flux
2. **Virtual Try-On** — completely off-brand; no video connection
3. **Poster/Banner** — commodity features, not differentiators
4. **Product Ad Studio** — expensive, not timeline-integrated, no narrative arc

### 9.5 Strong Services (Launch-Ready)
1. **Typography Video** — most reliable, visually distinctive, no competitor
2. **Social Video** — unique in market, solid pipeline
3. **SaaS/Promo Video** — core product, most mature
4. **Caption Studio** — simple, functional, immediately useful

---

## 10. Product-Market Fit Analysis

### 10.1 Most Likely Paying Users

**Tier 1 — Highest intent:**
- Indie hackers / solo SaaS founders building in public (promo video for launches)
- Content creators who post on X/Twitter and want to repurpose to video (social video)
- Shopify store owners running Meta/TikTok ads (product video — when fixed)

**Tier 2 — Strong fit:**
- Educators/educators creating educational short-form (typography video)
- Micro-influencers who post viral content and want a production upgrade
- Marketing agencies producing content for multiple clients (Agency plan)

**Tier 3 — Possible but uncertain:**
- Enterprise marketers (need compliance review, brand guardrails)
- Non-English markets (ElevenLabs multilingual helps but UI is English-only)

### 10.2 Highest Value Use Cases

1. **SaaS product launch video** — founder needs a promo video for Product Hunt, launch day, investor demos. Currently taking 2-5 days with freelancers. Vidquence does it in 3 minutes.

2. **Social repurposing at scale** — creator posts 5 threads a week, wants all 5 as Reels. Currently skipped because it's too much work. Vidquence makes it a 30-second task.

3. **Product ad for DTC brand** — Shopify store needs fresh ad creative every 2-4 weeks. Currently costs $500/video from freelancers. Vidquence does it for $0.20 in credits.

### 10.3 Most Compelling Workflows

1. **Paste a tweet URL → get a narrated reel** — 30 seconds, no input needed beyond the URL
2. **Describe your SaaS → get a promo video** — 3 minutes end-to-end with voiceover + music
3. **Type any question → get a kinetic video** — typography video is the fastest pipeline

### 10.4 Fastest Path to Revenue

**Path A (B2C growth):** Free tier with watermark → paid to remove. Target: indie hackers, creators. Channel: Product Hunt, Twitter/X organic.

**Path B (B2B SaaS):** Land agency plan users who produce for clients. 1 agency user = 5-10 individual users' revenue. Channel: cold outreach to social media agencies.

**Path C (vertical focus):** Own "SaaS product launch videos" as a category. This is the most underserved segment with highest pain and willingness to pay.

---

## 11. Strategic Opportunities

### 11.1 What Would Make Vidquence 2x Better (Quick Wins)

1. **Fix Product Video** — the black video bug is blocking a major differentiator. 1-2 days of focused debugging.
2. **Brand kit** — save accent color + font + logo. Users currently have to re-enter these every generation.
3. **Regenerate single scene** — currently users must redo the whole video. Per-scene regen would be high-value.
4. **Social video multi-platform** — add LinkedIn post, Reddit thread, YouTube description → video
5. **Typography video with background images** — add one contextual Pixabay image per scene, huge visual upgrade

### 11.2 What Would Make Vidquence 5x Better (Medium Term)

1. **Image-to-video integration** — partner with or integrate Runway/Pika API for motion generation on top of generated scenes
2. **Long-form → clips pipeline** — YouTube URL → AI selects best 3-5 moments → turns each into a Reel (Opus Clip territory but native to Vidquence)
3. **API + Zapier integration** — programmatic access unlocks power users, no-code builders, and use in other apps
4. **Real-time collaboration** — team editing the same timeline project (Figma model)
5. **Voice cloning** — user records their voice once, all future videos sound like them (ElevenLabs voice clone API)

### 11.3 What Would Make Vidquence 10x Better (Long Term / Moat)

1. **Autonomous video strategy AI** — user gives a business or channel, AI plans a week of content, generates all videos, schedules them. Zero human involvement after initial setup.
2. **Native motion generation** — don't just do HTML/CSS animations. Train or fine-tune a video diffusion model on the timeline format → generate actual motion video scenes.
3. **Marketplace of video formats** — community creates and sells custom scene archetypes, voice styles, animation presets. Revenue share creates content flywheel.
4. **B2B white-label** — allow agencies and SaaS companies to embed Vidquence into their own products under their brand. SDK/API with iframe embed.

### 11.4 Prioritized by Impact × Feasibility

| Opportunity | Impact | Effort | Priority |
|---|---|---|---|
| Fix Product Video | High | Low | **URGENT** |
| Brand kit | Medium | Low | Do now |
| Per-scene regeneration | High | Medium | Do now |
| Multi-platform Social Video | Medium | Low | Do now |
| Long-form → clips | Very High | High | Q3 |
| API/Zapier | High | Medium | Q3 |
| Voice cloning | High | Low | Q3 |
| Image-to-video motion | Very High | High | Q4 |
| Autonomous content planner | Transformative | Very High | 2027 |

---

## 12. Founder Notes

### 12.1 Key Product Decisions

**Decision: Free HTML design over templates**
Early versions (v1-v2) used hardcoded layer templates. Each service had a `layerBuilder.js` with rigid slot-based layouts. This produced identical-looking videos regardless of product/content. The decision was made to replace all layer builders with GPT-5.4 free HTML design. Social Video was the first to switch; SaaS/Promo Video followed; Typography uses a hybrid (GPT script + code-built layers); Product Video switched most recently (still buggy).

**Decision: Single continuous voiceover + Whisper alignment**
Early pipelines generated one TTS audio file per scene. This caused awkward pauses between scenes. The switch to a single full-script voiceover with ElevenLabs character-alignment timestamps makes scene timing match natural speech. This is technically complex but produces a much more professional result.

**Decision: Razorpay over Stripe**
The platform targets Indian users (founder is Indian). Razorpay handles INR natively, supports UPI/NetBanking which are dominant in India. Stripe is available as backup but Razorpay is primary.

**Decision: Credit-based billing over subscriptions**
Credits give users granular control and allow different pricing per service (a 7-scene SaaS video costs 200 credits; a poster costs 10). This also means users who use one service don't feel they're wasting money on features they don't use.

**Decision: Remotion for rendering**
Remotion was chosen because it renders React components to video — the same component tree used for preview. This eliminates the "preview looks different from export" problem. The tradeoff is heavyweight deployment (headless Chrome) and slow cold starts. Pre-bundling at build time mitigates the Railway deployment issue.

### 12.2 Historical Context

- The platform started as a "promo video generator" and expanded into a multi-service platform
- Typography Video was added as a simpler/cheaper entry point
- Social Video was the most successful early pipeline in terms of output quality
- Product Video has been the most technically challenging — three rewrites in a short period
- The Product Ad Studio (FAL image chains + LTX) was an experimental feature, not the main video pipeline

### 12.3 Known Constraints

- Railway deployment doesn't allow ephemeral disk-heavy operations — pre-bundled Remotion is mandatory
- FAL flux-kontext has rate limits — large batch product video runs can hit them
- ElevenLabs API costs real money per character — long TTS scripts can be expensive in production
- GPT-5.4 is the most expensive model in the stack — each scene design call costs ~$0.05-0.10

### 12.4 Why Certain Decisions Were Made

- **No Redux / React Query:** Zustand is simpler and the app is largely client-side. Project data is loaded once and mutated locally.
- **No TypeScript:** Speed of development prioritized over type safety at this stage
- **Express 5 (not Fastify/Hono):** Familiar, battle-tested, no learning curve
- **No microservices:** Single Express server handles everything. Railway deploys one container. Simpler ops.
- **Supabase over Firebase:** Postgres is relational and easier to query for analytics/admin. Supabase auth is excellent. Storage integrated.

---

## 13. Launch Readiness Assessment

### 13.1 Service-by-Service Readiness

| Service | Quality | Stability | Uniqueness | Launch Ready? |
|---|---|---|---|---|
| Typography Video | 8/10 | 9/10 | 10/10 | ✅ Yes |
| Social Video | 8/10 | 7/10 | 10/10 | ✅ Yes |
| SaaS/Promo Video | 8/10 | 8/10 | 8/10 | ✅ Yes |
| Caption Studio | 7/10 | 8/10 | 4/10 | ✅ Yes |
| Talking Head Video | 7/10 | 7/10 | 7/10 | ⚠️ Almost |
| Product Video | 4/10 | 3/10 | 9/10 | ❌ Not yet |
| Product Ad Studio | 6/10 | 6/10 | 8/10 | ⚠️ Standalone |
| Poster/Thumbnail/Outfit | 5/10 | 7/10 | 2/10 | ⚠️ Filler |
| Blank Canvas | 7/10 | 8/10 | 5/10 | ✅ Yes |

### 13.2 Overall Ratings

**Product Quality: 7/10**
The core video pipelines (Typography, Social, SaaS/Promo) produce genuinely impressive output — far above what a non-designer could produce manually. Product Video is currently broken. The editor is functional but not polished. Export works.

**Differentiation: 9/10**
The HTML-design approach is genuinely unique. No competitor generates HTML scenes via a frontier model and parses them into a timeline. Social Video repurposing end-to-end is unmatched. Typography Video has no direct competitor. The combination of all three in one platform is rare.

**Market Demand: 8/10**
All three target segments (SaaS marketers, content creators, ecommerce brands) are actively spending on video tools. The market exists. The need is validated by the success of InVideo, Creatify, and Opus Clip (all $10M+ ARR).

**Monetization Potential: 7/10**
Credit system is well-designed. Price points are reasonable ($15-50/month). Razorpay/INR focus limits global reach initially. No free tier with viral growth loop yet.

**Launch Readiness: 6/10**
Core pipelines are ready. Product Video (the most compelling for paid ads) is broken. No onboarding flow, no free tier, no marketing site content reviewed. Technical launch is possible but growth loop is incomplete.

### 13.3 Brutally Honest Feedback

**What's genuinely good:**
The output quality when all systems work is impressive. A founder with no video skills can go from "my SaaS is called X and it does Y" to a watchable, professional promo video with voiceover, music, and unique scene designs in 3 minutes. That is real product value. The decision to use GPT-5.4 for unconstrained HTML design was the right call — it's what separates Vidquence from template-based competitors.

**What needs to be fixed before launch:**
1. Product Video is broken (black video) — this is the most visually impressive service and it doesn't work
2. No free tier = no viral growth, no word-of-mouth, no try-before-you-buy
3. No onboarding sequence — users land in a dashboard with no guidance
4. Credit costs are high relative to free trial access
5. Social post fetcher is fragile — Twitter/X scraping breaks regularly

**What is strategically risky:**
- Over-diversification: Poster, Thumbnail, Try-On, Banner dilute the brand and confuse positioning. A video platform that also does outfit try-ons is confusing.
- No moat in the credit system — any competitor can clone the pricing model
- Dependency on GPT-5.4 for quality — if OpenAI raises prices or changes behavior, the core pipeline is affected
- Product Video has been rewritten 3+ times — signs of unclear product vision for what was supposed to be the flagship

**What the market will reward:**
Focus on the 3-sentence pitch: "Paste your tweet. Get a viral reel. Done." Social Video is the easiest entry point with the clearest value proposition. Launch with that as the hero product, use it to acquire users, then upsell to promo video and product video. The "social post to video" use case has the lowest friction, the most obvious before/after, and no direct competitor with the same quality.

---

*End of Vidquence Audit — June 2026*
*All technical details verified against live codebase.*
*Prepared for handoff to any AI model for further analysis.*
