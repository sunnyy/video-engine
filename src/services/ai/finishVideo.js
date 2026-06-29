/**
 * finishVideo.js — maps a project's `source` to its "Finish incomplete video" function, so the
 * Projects page can offer one Finish button regardless of which service made the (incomplete) video.
 * Each finisher resolves { projectId } on success, or { incomplete, projectId, message } if the
 * voiceover provider is still down. SSE finishers also accept an optional onProgress callback.
 */
import { finishPromptVideo }     from "./promptVideo/generatePromptVideo";
import { finishSocialVideo }     from "./socialVideo/generateSocialVideo";
import { finishTypographyVideo } from "./typographyVideo/generateTypographyVideo";
import { finishProductVideo }    from "./productVideo/generateProductVideo";
import { finishPromoVideo }      from "./saasVideo/generateSaasVideo";

const FINISHERS = {
  ai_video:         finishPromptVideo,
  social_video:     finishSocialVideo,
  typography_video: finishTypographyVideo,
  product_video:    finishProductVideo,
  promo_video:      finishPromoVideo,
};

export function finisherFor(source) {
  return FINISHERS[source] || null;
}
