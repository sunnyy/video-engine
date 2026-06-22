/**
 * notificationCategories.js
 * src/config/notificationCategories.js
 *
 * Canonical taxonomy for notifications — the single source of truth shared by the server
 * (gating in notificationService.notifyUser) and the frontend (Settings preference grid).
 * Plain ESM, no dependencies, so it imports cleanly into both Node and Vite.
 *
 * `locked: true` categories always deliver (transactional / admin broadcasts) and have no
 * user toggle. Everything else defaults to ON and is opt-out per channel (in_app | email).
 */

export const NOTIFICATION_CATEGORIES = [
  { key: "billing",       label: "Billing & plan",          description: "Purchases, renewals, upgrades, expiry and payment issues", locked: true },
  { key: "credits",       label: "Credits & refunds",       description: "Top-ups, low balance and refund decisions" },
  { key: "renders",       label: "Renders & exports",       description: "When your videos finish rendering or fail" },
  { key: "automation",    label: "Automation & publishing", description: "Posts published, automation pauses and account reconnects" },
  { key: "account",       label: "Account",                 description: "Welcome and account updates" },
  { key: "announcements", label: "Announcements",           description: "Product news and offers from Vidquence", locked: true },
];

const TYPE_TO_CATEGORY = {
  // billing
  plan_purchased: "billing", plan_renewed: "billing", plan_upgraded: "billing",
  plan_expiring: "billing", plan_expired: "billing", payment_failed: "billing",
  // credits
  credits_topup: "credits", credits_granted: "credits", low_credits: "credits",
  refund_approved: "credits", refund_rejected: "credits",
  // renders
  render_complete: "renders", render_timeline_failed: "renders",
  // automation
  post_published: "automation", publish_post_failed: "automation",
  generate_video_failed: "automation", automation_paused: "automation", social_disconnected: "automation",
  // account
  welcome: "account",
  // announcements
  announcement: "announcements",
};

/** Category key for a notification type, or null if the type isn't mapped (treated as always-on). */
export function categoryForType(type) {
  return TYPE_TO_CATEGORY[type] || null;
}

/** Whether a category always delivers regardless of preferences. */
export function isCategoryLocked(key) {
  return !!NOTIFICATION_CATEGORIES.find(c => c.key === key)?.locked;
}
