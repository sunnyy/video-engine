import posthog from "posthog-js";

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: "https://app.posthog.com",
    autocapture: true,
    capture_pageview: true,
  });
}

export { posthog };
