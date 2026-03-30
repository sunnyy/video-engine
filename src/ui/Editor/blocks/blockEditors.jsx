/**
 * blockEditors.js
 * Place at: src/ui/Editor/blocks/blockEditors.js
 *
 * Maps block.type → editor component.
 * ContentTab already imports this as:
 *   import blockEditors from "../../blocks/blockEditors";
 *   const BlockEditor = block?.type ? blockEditors[block.type] : null;
 *
 * Uncomment each import + entry as that block is built.
 */

import StatExplosionEditor   from "./editors/StatExplosionEditor";
import ListCountdownEditor   from "./editors/ListCountdownEditor";
import QuoteHighlightEditor  from "./editors/QuoteHighlightEditor";
// import MythVsFactEditor      from "./editors/MythVsFactEditor";
import BeforeAfterEditor     from "./editors/BeforeAfterEditor";
import ProcessStepsEditor    from "./editors/ProcessStepsEditor";
import ProblemSolutionEditor from "./editors/ProblemSolutionEditor";
import HookImpactEditor      from "./editors/HookImpactEditor";
import SlideshowEditor       from "./editors/SlideshowEditor";
// import BadgePackEditor       from "./editors/BadgePackEditor";
// import LowerThirdEditor      from "./editors/LowerThirdEditor";
// import ProgressBarsEditor    from "./editors/ProgressBarsEditor";
// import CountdownTimerEditor  from "./editors/CountdownTimerEditor";
// import CTAButtonEditor       from "./editors/CTAButtonEditor";
// import KineticTypographyEditor from "./editors/KineticTypographyEditor";
// import ReactionFloatEditor   from "./editors/ReactionFloatEditor";
// import SplitScreenEditor     from "./editors/SplitScreenEditor";
// import WaveformEditor        from "./editors/WaveformEditor";
// import TestimonialEditor     from "./editors/TestimonialEditor";
// import ChapterTitleEditor    from "./editors/ChapterTitleEditor";

const blockEditors = {
  StatExplosion:   StatExplosionEditor,
  ListCountdown:   ListCountdownEditor,
  QuoteHighlight:  QuoteHighlightEditor,
  // MythVsFact:      MythVsFactEditor,
  BeforeAfter:     BeforeAfterEditor,
  ProcessSteps:    ProcessStepsEditor,
  ProblemSolution: ProblemSolutionEditor,
  HookImpact:      HookImpactEditor,
  Slideshow:       SlideshowEditor,
  // BadgePack:       BadgePackEditor,
  // LowerThird:      LowerThirdEditor,
  // ProgressBars:    ProgressBarsEditor,
  // CountdownTimer:  CountdownTimerEditor,
  // CTAButton:       CTAButtonEditor,
  // KineticTypography: KineticTypographyEditor,
  // ReactionFloat:   ReactionFloatEditor,
  // SplitScreen:     SplitScreenEditor,
  // Waveform:        WaveformEditor,
  // Testimonial:     TestimonialEditor,
  // ChapterTitle:    ChapterTitleEditor,
};

export default blockEditors;