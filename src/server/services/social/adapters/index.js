/**
 * adapters/index.js — platform adapter registry. Add TikTok/Instagram/LinkedIn/X here
 * as sibling adapters implementing the same contract (getAuthUrl, handleCallback,
 * refresh, publish). Nothing else in the codebase needs platform-specific knowledge.
 */
import { youtube } from "./youtube.js";

const ADAPTERS = { youtube };

export function getAdapter(platform) {
  const a = ADAPTERS[platform];
  if (!a) throw new Error(`Unsupported platform "${platform}"`);
  return a;
}

export function supportedPlatforms() {
  return Object.keys(ADAPTERS);
}

/** Capability descriptor for one platform (what it supports: scheduling, tags, privacy…). */
export function capabilitiesOf(platform) {
  return getAdapter(platform).capabilities || {};
}

/** Map of every supported platform → its capabilities (for the UI / publish normalization). */
export function allCapabilities() {
  return Object.fromEntries(Object.entries(ADAPTERS).map(([k, a]) => [k, a.capabilities || {}]));
}
