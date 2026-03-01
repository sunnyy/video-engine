export function injectAudioCues(beats, format) {
  if (!format?.audio_rules) return beats;

  return beats.map((beat, index) => {
    const cues = [];

    if (
      index === 0 &&
      format.audio_rules.hook_sfx
    ) {
      cues.push({
        type: "impact",
        position: 0,
      });
    }

    if (
      format.audio_rules.layout_whoosh &&
      index > 0
    ) {
      cues.push({
        type: "whoosh",
        position: 0,
      });
    }

    return {
      ...beat,
      audio_cues: cues,
    };
  });
}