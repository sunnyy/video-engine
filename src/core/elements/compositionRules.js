// src/core/elements/compositionRules.js

export const COMPOSITION_RULES = [

  // ── LAYER RULES ──
  { rule: "one_background",      enforce: "max 1 element from category:background"                        },
  { rule: "one_overlay_per_type",enforce: "max 1 element from each overlay type"                          },
  { rule: "max_decoratives",     enforce: "max 2 elements from category:decorative"                       },
  { rule: "max_typography",      enforce: "max 3 elements from category:typography"                       },
  { rule: "always_background",   enforce: "must have exactly 1 background element"                        },
  { rule: "always_noise",        enforce: "noise_texture always present at opacity 0.04-0.08"             },

  // ── CONTRAST RULES ──
  { rule: "vignette_required",   enforce: "gradient_vignette required when asset_fill + any text element" },
  { rule: "tint_or_vignette",    enforce: "never color_tint AND gradient_vignette on same beat"           },
  { rule: "text_contrast",       enforce: "text color must have 4.5:1 contrast ratio against background"  },
  { rule: "badge_contrast",      enforce: "label_badge bg must contrast against its local background"     },

  // ── ENERGY RULES ──
  { rule: "high_energy_only",    enforce: "checker_pattern only when energy >= 0.75"                      },
  { rule: "high_energy_only_2",  enforce: "star_burst only when energy >= 0.6"                            },
  { rule: "low_energy_only",     enforce: "blob_shape only when energy <= 0.6"                            },
  { rule: "low_energy_only_2",   enforce: "wave_shape only when energy <= 0.5"                            },
  { rule: "calm_only",           enforce: "script_accent only when energy <= 0.55"                        },

  // ── ARCHETYPE RULES ──
  { rule: "hook_needs_impact",   enforce: "hook beats must have hero_word OR checker_pattern OR diagonal_cut" },
  { rule: "proof_needs_frame",   enforce: "proof beats should have inset_frame OR dot_grid"               },
  { rule: "cta_needs_brand",     enforce: "cta beats must use videoDNA.primary as dominant color"         },
  { rule: "rest_is_minimal",     enforce: "visual_rest beats max 3 total elements"                        },
  { rule: "reveal_is_dramatic",  enforce: "reveal beats must have gradient_vignette + asset_fill"         },

  // ── COMBINATION RULES ──
  { rule: "no_blob_checker",     enforce: "blob_shape and checker_pattern never together"                  },
  { rule: "no_double_hero",      enforce: "max 1 hero_word per beat"                                      },
  { rule: "no_double_badge",     enforce: "max 2 label_badge per beat"                                    },
  { rule: "no_ticker_polaroid",  enforce: "ticker_bar and polaroid_card never together"                   },
  { rule: "no_torn_checker",     enforce: "torn_edge and checker_pattern never together"                   },
  { rule: "no_double_frame",     enforce: "max 1 element from category:frame"                             },
  { rule: "polaroid_needs_asset",enforce: "polaroid_card requires has_asset"                              },
  { rule: "circle_badge_space",  enforce: "circle_badge requires no label_badge at same corner"           },
  { rule: "no_wave_diagonal",    enforce: "wave_shape and diagonal_cut never together"                    },
  { rule: "arrow_needs_cta",     enforce: "arrow_swoosh only on last 2 beats OR proof beats"              },

  // ── REPETITION RULES ──
  { rule: "no_repeat_bg",        enforce: "background variant cannot repeat on consecutive beats"          },
  { rule: "no_repeat_decorative",enforce: "same decorative variant cannot appear on consecutive beats"    },
  { rule: "no_repeat_frame",     enforce: "same frame type cannot repeat within 3 beats"                  },
  { rule: "rotate_typography",   enforce: "typography element variants must rotate across beats"           },

  // ── COLOR RULES ──
  { rule: "max_accent_colors",   enforce: "max 2 different accent colors visible per beat"                },
  { rule: "primary_dominant",    enforce: "videoDNA.primary must be used at least once per beat"          },
  { rule: "dark_bg_light_text",  enforce: "if bg luminance < 0.3 then text must be #ffffff or light"     },
  { rule: "light_bg_dark_text",  enforce: "if bg luminance > 0.7 then text must be #000000 or dark"      },
  { rule: "tint_matches_dna",    enforce: "color_tint color must come from videoDNA only"                 },
  { rule: "decorative_contrast", enforce: "decorative elements must be visible against background"        },

  // ── POSITION RULES ──
  { rule: "no_corner_collision", enforce: "no 2 elements occupy same corner position"                     },
  { rule: "text_safe_zone",      enforce: "text elements must stay within 85% of canvas width"            },
  { rule: "badge_not_center",    enforce: "label_badge never centered, always left or right aligned"      },
  { rule: "hero_centered",       enforce: "hero_word always horizontally centered"                        },
  { rule: "ticker_full_width",   enforce: "ticker_bar always spans full canvas width"                     },

  // ── CONTENT RULES ──
  { rule: "no_empty_beat",       enforce: "every beat must have background + at least 1 content element"  },
  { rule: "asset_over_abstract", enforce: "if has_asset prefer asset_fill over noise_gradient"            },
  { rule: "blurred_bg_fallback", enforce: "if has_asset but no clear subject use af_blurred variant"      },
  { rule: "stat_block_proof",    enforce: "if content has number/stat prefer proof archetype elements"    },

  // ── ANIMATION RULES ──
  { rule: "one_animated_dec",    enforce: "max 1 animated decorative per beat (sparkle or circle_badge)"  },
  { rule: "ticker_always_moves", enforce: "ticker_bar animation speed always between 20-40s"              },
  { rule: "kenburns_on_cover",   enforce: "asset_fill with objectFit:cover always gets kenburns motion"   },
];
