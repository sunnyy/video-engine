export function injectAudioCues(beats, format) {

  if (!format?.audio_rules) return beats;

  const sfxPool = ["whoosh", "tick", "soft_hit"];

  return beats.map((beat, index) => {

    let cue = null;

    if (index === 0 && format.audio_rules.hook_sfx) {

      cue = {
        type: "impact",
        position: 0,
        volume: 1
      };

    } else if (format.audio_rules.layout_whoosh && index > 0) {

      const type = sfxPool[index % sfxPool.length];

      cue = {
        type,
        position: type === "tick" ? 0.12 : 0,
        volume: 0.7
      };

    }

    return {
      ...beat,
      audio_cues: cue ? [cue] : []
    };

  });

}