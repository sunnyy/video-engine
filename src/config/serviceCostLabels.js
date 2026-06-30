/**
 * serviceCostLabels.js
 * Per-service credit-cost display labels, derived from the single source of truth (CREDIT_COSTS)
 * so the landing pricing and the checkout order-summary never drift from what billing charges.
 * Duration/scene-priced videos show a min–max range; flat-rate services show one number.
 */
import { CREDIT_COSTS, VIDEO_DURATION_BANDS, TALKING_HEAD_PER_30S, VIDEO_CLIPPING_PER_MIN } from "../core/utils/creditCosts.js";

const durRange = `${Math.min(...Object.values(VIDEO_DURATION_BANDS))}–${Math.max(...Object.values(VIDEO_DURATION_BANDS))}`;
const promo    = Object.values(CREDIT_COSTS.promo_video);

// Keyed by catalog service key (matches serviceCatalog `videoServices()` keys).
export const SERVICE_COST_LABEL = {
  ai_video:         `${durRange} cr`,
  social_video:     `${CREDIT_COSTS.social_video} cr`,
  typography_video: `${durRange} cr`,
  product_video:    "50–250 cr", // typical total range (a few image scenes → ~5 video scenes)
  promo_video:      `${Math.min(...promo)}–${Math.max(...promo)} cr`,
  talking_head:     `~${TALKING_HEAD_PER_30S} cr / 30s`,
  video_clipping:   `~${VIDEO_CLIPPING_PER_MIN} cr / min`,
};

// The "10+ AI image & audio tools" bucket — cheapest item (an AI image) sets the "from" floor.
export const TOOLS_COST_LABEL = `from ${CREDIT_COSTS.ai_image} cr`;
