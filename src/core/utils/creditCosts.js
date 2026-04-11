/**
 * creditCosts.js
 * src/core/utils/creditCosts.js
 *
 * Single source of truth for credit costs across server and client.
 * Server enforces deductions; client uses these for pre-flight UI warnings.
 */

export const CREDIT_COSTS = {
  base_generation:  8,   // script + beats + layouts + zone content
  ai_image:         2,   // per image generated via Fal.ai
  image_reuse:      0,   // reused from library — free
  tts_generation:   5,   // full video TTS
  export_local:     2,   // local render export
  export_lambda:    8,   // cloud render export (future)
  layout_swap:      1,   // swap layout on a beat
  individual_tts:   2,   // single beat TTS regeneration
};

export const PLANS = {
  starter: { price: 29, credits: 300,  label: "Starter"        },
  creator: { price: 49, credits: 600,  label: "Creator"        },
  pro:     { price: 79, credits: 1200, label: "Pro"            },
  payg:    { price: 9,  credits: 80,   label: "Pay As You Go"  },
};
