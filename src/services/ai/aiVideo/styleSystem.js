/**
 * styleSystem.js
 * src/services/ai/aiVideo/styleSystem.js
 *
 * The visual-style registry now lives in shared/visualStyles.js (one set for all
 * video services). This file re-exports it under the names AI Video already uses,
 * so the director/designer imports are unchanged. STYLE_PRESETS === VISUAL_STYLES.
 */

export {
  VISUAL_STYLES as STYLE_PRESETS,
  STYLE_IDS,
  getStyle,
  styleImagePrompt,
  styleMenuForDirector,
  styleDirectiveBlock,
} from "../shared/visualStyles.js";
