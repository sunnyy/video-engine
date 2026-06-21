/**
 * jobs/registry.js — job-type → handler map. Kept separate from the worker loop and
 * the queue so handlers and the worker can both import it without a circular dep.
 *
 * A handler is: async (payload, job) => result | void
 * Register handlers in jobs/handlers.js (loaded once by the worker on startup).
 */

const handlers = Object.create(null);

export function registerHandler(type, fn) {
  if (handlers[type]) console.warn(`[jobs] handler for "${type}" is being overwritten`);
  handlers[type] = fn;
}

export function getHandler(type) {
  return handlers[type] || null;
}

export function registeredTypes() {
  return Object.keys(handlers);
}
