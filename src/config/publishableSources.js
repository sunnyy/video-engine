/**
 * publishableSources.js — single source of truth for which video services expose the editor's
 * "Publish to social" flow (render → publish → status). Mirrors the backend pipeline registry:
 * a service is publishable once it has an automation pipeline + saves a project with this source.
 *
 * To enable publishing for a new service, add its `meta.source` value here — the editor Publish
 * button, modal, and status chip light up with no other UI change.
 */
export const PUBLISHABLE_SOURCES = ["ai_video"];

export function isPublishableSource(source) {
  return PUBLISHABLE_SOURCES.includes(source);
}
