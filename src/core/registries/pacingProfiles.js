export const PACING_PROFILES = {

  aggressive_short: {
    words_per_second: 4.2,
    min_duration: 1.0,
    max_duration: 2.0,
  },

  normal: {
    words_per_second: 3.4,
    min_duration: 1.0,
    max_duration: 2.0,
  },

  calm_longform: {
    words_per_second: 2.8,
    min_duration: 1.1,
    max_duration: 2.2,
  },

};

export function getPacingProfile(profileName) {
  return PACING_PROFILES[profileName] || PACING_PROFILES.normal;
}