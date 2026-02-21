// src/core/calculateTimeline.js

function calculateBeatTiming(beats) {
  let currentTime = 0;

  return beats.map((beat) => {
    const start_sec = currentTime;
    const end_sec = start_sec + beat.duration_sec;

    currentTime = end_sec;

    return {
      ...beat,
      start_sec,
      end_sec,
    };
  });
}

function calculateTotalDuration(beats) {
  if (!beats.length) return 0;
  return beats[beats.length - 1].end_sec;
}

export function calculateTimeline(project) {
  const timedBeats = calculateBeatTiming(project.beats);
  const totalDuration = calculateTotalDuration(timedBeats);

  return {
    ...project,
    beats: timedBeats,
    duration_sec: totalDuration,
  };
}