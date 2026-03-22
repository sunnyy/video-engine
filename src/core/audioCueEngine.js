export function injectAudioCues(beats, format) {

  if (!format?.audio_rules) return beats;

  return beats.map((beat, index) => {

    let cue = null;

    if (index === 0 && format.audio_rules.hook_sfx) {
      cue = {
        type: "impact",
        position: 0,
        volume: 1
      };
    }

    else if (format.audio_rules.layout_whoosh && index > 0) {
      cue = {
        type: "whoosh",
        position: 0,
        volume: 0.7
      };
    }

    else if (beat.components?.badge) {
      cue = {
        type: "soft_hit",
        position: 0,
        volume: 0.6
      };
    }

    else if (beat.components?.cta) {
      cue = {
        type: "impact",
        position: 0,
        volume: 0.8
      };
    }

    else if (beat.components?.numberedList) {
      cue = {
        type: "tick",
        position: 0.12,
        volume: 0.6
      };
    }

    return {
      ...beat,
      audio_cues: cue ? [cue] : []
    };

  });

}