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
