/**
 * SFXRenderer.jsx
 * src/remotion/elements/SFXRenderer.jsx
 *
 * Single source of truth for all beat SFX rendering.
 * Replaces both old SFXRenderer and SFXRenderer.
 * Uses staticFile() — correct Remotion pattern for local assets.
 */
import React from "react";
import { Audio, Sequence, useVideoConfig, staticFile } from "remotion";

/* All 20 SFX files from public/sfx/ */
const SFX_FILES = {
  "cash_register":    staticFile("sfx/cash-register.mp3"),
  "cinematic_boom":   staticFile("sfx/cinematic_boom.mp3"),
  "cinematic_impact": staticFile("sfx/cinematic_impact.mp3"),
  "classic_ding":     staticFile("sfx/classic_ding.mp3"),
  "click":            staticFile("sfx/click.mp3"),
  "countdown_beep":   staticFile("sfx/countdown_beep.mp3"),
  "crowd_cheer":      staticFile("sfx/crowd_cheer_short.mp3"),
  "error_buzz":       staticFile("sfx/error_buzz.mp3"),
  "glitch_long":      staticFile("sfx/glitch_long.mp3"),
  "glitch_short":     staticFile("sfx/glitch_short.mp3"),
  "great_success":    staticFile("sfx/great_success.mp3"),
  "ground_impact":    staticFile("sfx/ground_impact.mp3"),
  "impact":           staticFile("sfx/impact.mp3"),
  "notification":     staticFile("sfx/notification_ding.mp3"),
  "pop_hard":         staticFile("sfx/pop_hard.mp3"),
  "pop_soft":         staticFile("sfx/pop_soft.mp3"),
  "soft_hit":         staticFile("sfx/soft_hit.mp3"),
  "tick_clock":       staticFile("sfx/tick_clock.mp3"),
  "tick_digital":     staticFile("sfx/tick_digital.mp3"),
  "whoosh":           staticFile("sfx/whoosh.mp3"),
  /* legacy keys from old SFXRenderer */
  "tick":             staticFile("sfx/tick_clock.mp3"),
  "whoosh_fast":      staticFile("sfx/whoosh.mp3"),
};

export default function SFXRenderer({ beat }) {
  const { fps } = useVideoConfig();

  const beatCues    = beat?.audio_cues || [];
  const overlayCues = (beat?.overlays || [])
    .filter(o => o?.sfx && o.sfx !== "none")
    .map((o, i) => ({
      id:       `ov_sfx_${i}`,
      key:      o.sfx,
      volume:   0.4,
      position: o.delay || 0,
    }));

  const allCues = [...beatCues, ...overlayCues];
  if (!allCues.length) return null;

  return (
    <>
      {allCues.map((cue, i) => {
        /* Support both old key format and new */
        const src = SFX_FILES[cue.key] || SFX_FILES[cue.type] || null;
        if (!src) return null;

        const offset = Math.floor((cue.position || 0) * fps);

        return (
          <Sequence
            key={cue.id || i}
            from={offset}
            durationInFrames={fps * 3}
          >
            <Audio src={src} volume={cue.volume ?? 1} />
          </Sequence>
        );
      })}
    </>
  );
}