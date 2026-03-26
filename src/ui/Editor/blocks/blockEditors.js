import HookEditor from "./editors/HookEditor";
import QuoteEditor from "./editors/QuoteEditor";
import StatEditor from "./editors/StatEditor";
import NumberTickerEditor from "./editors/NumberTickerEditor";
import ListRevealEditor from "./editors/ListRevealEditor";
import SlideshowEditor from "./editors/SlideshowEditor";
import BeforeAfterEditor from "./editors/BeforeAfterEditor";
import ComparisonEditor from "./editors/ComparisonEditor";

const blockEditors = {
  Hook: HookEditor,
  Quote: QuoteEditor,
  Stat: StatEditor,
  NumberTicker: NumberTickerEditor,
  ListReveal: ListRevealEditor,
  Slideshow: SlideshowEditor,
  BeforeAfter: BeforeAfterEditor,
  Comparison: ComparisonEditor
};

export default blockEditors;