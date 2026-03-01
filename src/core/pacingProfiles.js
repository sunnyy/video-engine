export const PACING_PROFILES = {
  aggressive_short: {
    words_per_second: 3.2,
    min_duration: 2,
    max_duration: 8,
  },

  normal: {
    words_per_second: 2.5,
    min_duration: 2,
    max_duration: 10,
  },

  calm_longform: {
    words_per_second: 2,
    min_duration: 3,
    max_duration: 14,
  },
};

export function getPacingProfile(profileName) {
  return PACING_PROFILES[profileName] || PACING_PROFILES.normal;
}