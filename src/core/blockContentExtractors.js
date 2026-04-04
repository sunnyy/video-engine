/**
 * Block Content Extractors - Utility Functions
 * 
 * These are fallback/utility functions for manual content extraction.
 * The primary extraction now happens via AI in blockPropExtractor.js
 * 
 * Use these when:
 * - User manually edits block props in the UI
 * - Need quick client-side validation
 * - API extraction fails and need basic fallback
 */

/**
 * Validate and normalize stat props
 */
export function validateStatProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { value, label } = props;
  
  if (!value) return null;
  
  return {
    value: String(value).slice(0, 20), // Max 20 chars for value
    label: String(label || "").slice(0, 50) // Max 50 chars for label
  };
}

/**
 * Validate and normalize list props
 */
export function validateListProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { items } = props;
  
  if (!Array.isArray(items) || items.length < 2) return null;
  
  return {
    items: items
      .filter(item => item && String(item).trim())
      .map(item => String(item).slice(0, 60)) // Max 60 chars per item
      .slice(0, 7) // Max 7 items
  };
}

/**
 * Validate and normalize before/after props
 */
export function validateBeforeAfterProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { before, after } = props;
  
  if (!before || !after) return null;
  
  return {
    before: String(before).slice(0, 40),
    after: String(after).slice(0, 40)
  };
}

/**
 * Validate and normalize myth vs fact props
 */
export function validateMythVsFactProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { myth, fact } = props;
  
  if (!myth || !fact) return null;
  
  return {
    myth: String(myth).slice(0, 60),
    fact: String(fact).slice(0, 80)
  };
}

/**
 * Validate and normalize problem/solution props
 */
export function validateProblemSolutionProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { problem, solution } = props;
  
  if (!problem || !solution) return null;
  
  return {
    problem: String(problem).slice(0, 60),
    solution: String(solution).slice(0, 80)
  };
}

/**
 * Validate and normalize process steps props
 */
export function validateProcessStepsProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { steps } = props;
  
  if (!Array.isArray(steps) || steps.length < 2) return null;
  
  return {
    steps: steps
      .filter(step => step && String(step).trim())
      .map(step => String(step).slice(0, 50))
      .slice(0, 5)
  };
}

/**
 * Validate and normalize quote props
 */
export function validateQuoteProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { text, author } = props;
  
  if (!text) return null;
  
  return {
    text: String(text).slice(0, 120),
    author: author ? String(author).slice(0, 40) : null
  };
}

/**
 * Validate and normalize hook props
 */
export function validateHookProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { text } = props;
  
  if (!text) return null;
  
  return {
    text: String(text).slice(0, 100)
  };
}

/**
 * Validate and normalize slideshow props
 */
export function validateSlideshowProps(props) {
  if (!props || typeof props !== 'object') return null;
  
  const { items } = props;
  
  if (!Array.isArray(items) || items.length < 2) return null;
  
  return {
    items: items
      .filter(item => item && String(item).trim())
      .map(item => String(item).slice(0, 40))
      .slice(0, 6)
  };
}

/**
 * Main validation dispatcher
 */
export function validateBlockProps(blockType, props) {
  switch (blockType) {
    case "StatExplosion":
      return validateStatProps(props);
    
    case "ListCountdown":
      return validateListProps(props);
    
    case "BeforeAfter":
      return validateBeforeAfterProps(props);
    
    case "MythVsFact":
      return validateMythVsFactProps(props);
    
    case "ProblemSolution":
      return validateProblemSolutionProps(props);
    
    case "ProcessSteps":
      return validateProcessStepsProps(props);
    
    case "QuoteHighlight":
      return validateQuoteProps(props);
    
    case "HookImpact":
      return validateHookProps(props);
    
    case "Slideshow":
      return validateSlideshowProps(props);
    
    default:
      return props;
  }
}

/**
 * Generate placeholder props for preview/testing
 */
export function generatePlaceholderProps(blockType) {
  switch (blockType) {
    case "StatExplosion":
      return { value: "85%", label: "engagement rate" };
    
    case "ListCountdown":
      return { items: ["First point", "Second point", "Third point"] };
    
    case "BeforeAfter":
      return { before: "Before state", after: "After state" };
    
    case "MythVsFact":
      return { myth: "Common misconception", fact: "The actual truth" };
    
    case "ProblemSolution":
      return { problem: "The challenge", solution: "Our solution" };
    
    case "ProcessSteps":
      return { steps: ["Step one", "Step two", "Step three"] };
    
    case "QuoteHighlight":
      return { text: "Inspiring quote goes here", author: null };
    
    case "HookImpact":
      return { text: "Attention-grabbing statement" };
    
    case "Slideshow":
      return { items: ["Item 1", "Item 2", "Item 3"] };
    
    default:
      return { text: "Content here" };
  }
}

/**
 * Check if block props are placeholder/invalid
 */
export function isPlaceholderProps(blockType, props) {
  if (!props) return true;
  
  const placeholder = generatePlaceholderProps(blockType);
  
  // Simple check - if props match placeholder exactly, it's likely placeholder
  return JSON.stringify(props) === JSON.stringify(placeholder);
}