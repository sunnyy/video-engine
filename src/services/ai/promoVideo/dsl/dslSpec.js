/**
 * dslSpec.js
 * src/services/ai/promoVideo/dsl/dslSpec.js
 *
 * The Visual Intent DSL specification — injected verbatim into GPT prompts.
 * GPT outputs DSL text. A deterministic parser converts it to structured JSON.
 * GPT NEVER decides layout, position, color, animation, or icon library names.
 */

export const DSL_SPEC = `
# Visual Intent DSL — Specification

## Purpose
This DSL communicates WHAT to say and WHY — never HOW it looks.
The rendering engine makes all visual decisions: layout, typography, color, animation, background, icon selection.
Your job as GPT is to extract semantic meaning from the script and express it using only the keywords below.

---

## Keywords

SCENE
  Starts a new scene block. Every scene begins with this keyword.
  Usage: SCENE

SPOKEN
  The exact voiceover text for this scene. Always required.
  This is what the viewer hears. Copy it verbatim from the script.
  Usage: SPOKEN Vidquence turns any idea into a short-form video in minutes.

INTENT
  The communicative purpose of this scene.
  Required. Must be exactly one of:
    hook        — grab attention, open loop, tease the value
    list        — enumerate items, tools, features, or categories
    feature     — highlight one specific product capability
    benefit     — state a clear value or outcome for the viewer
    statistic   — present a number, metric, or data point
    comparison  — contrast two states (before/after, old/new, with/without)
    process     — explain a sequence of steps
    proof       — credibility signal (testimonial, case study, social proof)
    cta         — call to action (follow, save, visit, try)
    statement   — general declaration that doesn't fit other intents
  Usage: INTENT hook

SECTION_ROLE
  Where this scene sits in the overall video narrative.
  Optional. One of: hook, body, proof, cta
  Usage: SECTION_ROLE hook

HEADLINE
  Primary text — large, dominant, the main message of the scene.
  One per scene. Keep under 8 words for readability.
  Usage: HEADLINE Turn any idea into a video

SUBHEAD
  Secondary text — smaller than HEADLINE, supports or expands the headline.
  One per scene. Optional.
  Usage: SUBHEAD No editing skills required

BODY
  Supporting copy — small text for context or elaboration.
  One per scene. Optional. Keep under 15 words.
  Usage: BODY Works with any niche or product type

STAT
  A number, metric, or data point. Used with INTENT statistic.
  Examples: 10x, 85%, $0, 2 minutes, 50,000+
  Usage: STAT 10x

LABEL
  Context label for a STAT or ICON — explains what the number or icon means.
  Usage: LABEL faster than manual editing

STEP
  One step in a sequential process. Multiple STEP lines allowed per scene.
  Used with INTENT process. Number them naturally in the text.
  Usage: STEP Upload your script or idea
  Usage: STEP Pick your visual style
  Usage: STEP Export your video

ITEM
  One item in a list or enumeration. Multiple ITEM lines allowed per scene.
  Used with INTENT list.
  Usage: ITEM Auto-generated captions
  Usage: ITEM Background music
  Usage: ITEM Custom branding

ICON
  A semantic concept word — describes the idea, never the icon library component name.
  The rendering engine resolves this to an actual icon.
  Valid examples: speed, analytics, growth, lock, star, chart, check, video, globe
  Invalid examples: Zap, ArrowRight, BarChart2 (these are library names — never output these)
  Usage: ICON speed

MOOD
  Visual tone of the scene. The renderer picks automatically if omitted.
  Optional. One of: premium, energetic, modern, educational, corporate, playful
  Usage: MOOD energetic

EMPHASIS
  A single word or short phrase to visually highlight or animate.
  One per scene. Optional.
  Usage: EMPHASIS 10x faster

VISUAL_WEIGHT
  Controls how dominant the visual asset is versus the talking head.
  Optional. One of:
    low    — talking head is dominant, asset is minimal or absent
    medium — balanced composition
    high   — asset (screenshot, recording, image) fills most of the frame
  Usage: VISUAL_WEIGHT high

ASSET_REQUIREMENT
  Whether this scene needs an uploaded asset and what kind.
  Optional. One of: screenshot, recording, image, none
  Default is none if omitted.
  Usage: ASSET_REQUIREMENT screenshot

ASSET_HINT
  Plain-text description of exactly what asset is needed for this scene.
  Used in the asset collection UI to prompt the user.
  Only include when ASSET_REQUIREMENT is not none.
  Be specific — name the exact screen, feature, or moment.
  Usage: ASSET_HINT Screenshot of the Vidquence timeline editor showing multiple video tracks

---

## Rules

1. GPT must NEVER output: positions, coordinates, colors, hex values, gradients, font sizes, animation names, z-index, padding, margin, or any CSS property.
2. GPT must NEVER output Lucide, Phosphor, or any icon library component names. ICON takes concept words only.
3. Every scene must have SPOKEN and INTENT. All other keywords are optional.
4. MOOD is optional — the renderer selects the background automatically. Only include MOOD when the script's tone clearly demands a specific mood.
5. Multiple ITEM lines and multiple STEP lines are allowed and expected for list/process scenes.
6. DSL is plain text — not JSON, not YAML, not Markdown. One keyword per line.
7. Do not add punctuation after keyword names. The value follows on the same line after a single space.
8. Do not invent new keywords. Use only the keywords listed above.
9. SPOKEN must always be the exact spoken words, never a description like "talks about features".
10. Keep HEADLINE concise — the renderer controls typography. Do not add emphasis characters like *, **, or CAPS.

---

## Example Output

SCENE
SPOKEN Today I want to show you a tool that changes how you make content.
INTENT hook
SECTION_ROLE hook
HEADLINE Stop making videos the hard way
MOOD energetic
EMPHASIS hard way
VISUAL_WEIGHT low
ASSET_REQUIREMENT none

SCENE
SPOKEN Vidquence gives you AI captions, background music, custom branding, and auto layout — all in one place.
INTENT list
SECTION_ROLE body
HEADLINE Everything you need in one place
VISUAL_WEIGHT medium
ITEM AI-generated captions
ITEM Background music library
ITEM Custom branding and logo
ITEM Auto layout engine
ITEM One-click export
ASSET_REQUIREMENT none

SCENE
SPOKEN Creators using Vidquence are producing videos ten times faster than before.
INTENT statistic
SECTION_ROLE proof
HEADLINE Creators are moving fast
STAT 10x
LABEL faster video production
ICON speed
MOOD premium
VISUAL_WEIGHT medium
ASSET_REQUIREMENT none

SCENE
SPOKEN To get started, upload your script, pick a visual style, and export. That is it.
INTENT process
SECTION_ROLE body
HEADLINE Three steps. Done.
STEP Upload your script or idea
STEP Pick your visual style
STEP Export and publish
VISUAL_WEIGHT low
ASSET_REQUIREMENT none

SCENE
SPOKEN Follow for more tools like this — I post every day.
INTENT cta
SECTION_ROLE cta
HEADLINE Follow for daily tools
SUBHEAD New video every day
MOOD energetic
VISUAL_WEIGHT low
ASSET_REQUIREMENT none
`.trim();

export default DSL_SPEC;
