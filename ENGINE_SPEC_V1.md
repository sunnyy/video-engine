ENGINE SPEC V1
Deterministic Short-Form Video Engine

Purpose
The engine converts a script into a structured short-form video using deterministic rules.  
The engine must produce consistent results from the same input and registries.

------------------------------------------------

1. ENGINE PIPELINE

Script
→ Beat Generation
→ Layout Assignment
→ Asset Selection
→ Component Generation
→ Caption Rendering
→ Audio Cues
→ Beat Transitions
→ Render

No system outside this pipeline is allowed in V1.

------------------------------------------------

2. PROJECT STRUCTURE (FINAL)

Project

meta
  title
  orientation (vertical | horizontal)
  duration_sec
  brand_color

avatar
  enabled
  src
  position

music
  src
  volume

captionPreset
  style

beats[]

------------------------------------------------

3. BEAT STRUCTURE (FINAL)

Beat

id
order

layout

zones[]

heading
text
spoken

components[]

caption

transition

duration_sec
start_sec
end_sec

asset_settings
audio_cues

No additional fields allowed.

------------------------------------------------

4. ZONE STRUCTURE

Zone

type ("asset" | "avatar")
src
objectFit

------------------------------------------------

5. LAYOUT SYSTEM

Layouts define visual structure and safe areas.

Layouts must support orientation rules.

Example:

SplitZone
vertical → top/bottom
horizontal → left/right

Layouts define:

zones
safe areas
caption default position
component anchors

Layouts DO NOT decide content.

Content is decided by the beat.

------------------------------------------------

6. REGISTRIES

All engine selections must come from registries.

Registries must use tags for deterministic selection.

Registries include:

layoutRegistry
assetRegistry
componentRegistry
captionStyleRegistry
assetAnimationRegistry
transitionsRegistry
audioCueRegistry

Registry objects must contain:

id
tags
intent support
orientation support (if applicable)

The engine must not generate items outside registries.

------------------------------------------------

7. CAPTION SYSTEM

Captions contain:

caption.text

Caption segments are NOT stored in JSON.

Caption timing is generated during render.

Rules:

One caption style per video by default.

User may override per beat.

Button must exist:
Apply Caption Style to All Beats.

Caption position is decided by layout.

User may override caption position.

Caption animation may vary per beat.

------------------------------------------------

8. COMPONENT SYSTEM

Components represent information.

Allowed component categories:

Stat
Badge
NumberCallout
QuoteBox
Checklist
ProgressBar
TimelineStep
Alert
CTA
HighlightBox

Components must define:

anchor
entry animation
size behavior

Components must be layout-aware.

Components must not overlap captions or avatar.

------------------------------------------------

9. BRAND COLOR

Project meta may contain:

brand_color

If defined, this color must be used for:

caption highlight words
component accents
badges
stat numbers
CTA buttons

If empty, system uses default theme color.

------------------------------------------------

10. AUDIO RULES

If avatar exists
→ spoken audio expected.

If avatar is disabled
→ engine must generate AI TTS narration from script.

Silent faceless videos are not allowed by default.

User options:

Auto AI Voice
Upload Voice
No Voice

------------------------------------------------

11. TRANSITIONS

Two independent systems exist.

Beat Transition

Applied to the entire beat layout.

Examples:

cut
fade
slide
scale
blurFade

Triggered at beat start.

Asset Motion

Applied to asset inside a zone.

Examples:

zoom
kenburns
slide
reveal
pan

Asset motion must begin
0.5s – 1s after beat transition.

Beat transition controls scene.
Asset motion controls content.

------------------------------------------------

12. ENGINE RULES

The engine must be deterministic.

Output must depend only on:

script
project orientation
registries

Randomness must use seed if implemented.

------------------------------------------------

13. ENGINE LIMITATIONS (V1)

The engine will NOT include:

AI layout generation
AI component creation
AI motion generation
dynamic layout creation
style switching mid-video automatically
caption segmentation in JSON
unregistered assets
unregistered components

Only registry items may be used.

------------------------------------------------

14. SPEC LOCK

This document freezes Engine Version 1.

New features require:

Engine Spec V2.

Code must follow this specification.