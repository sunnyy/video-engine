# Resend Broadcasts — plan (NOT built yet)

This documents how we'd add **bulk marketing email** (newsletters, product campaigns, win-back blasts)
when we're ready. It is intentionally **separate** from the triggered lifecycle emails we already
ship in-house (onboarding nudge + win-back), which live in `checkLifecycleEmails()` in
`src/server/index.js` and run on Resend transactional sends.

Build this only when we actually have campaigns to send — an empty/stale newsletter is worse than none.

## Why Resend Broadcasts (not Mailchimp/Customer.io)
- Same vendor we already use for transactional → no new account, no data-sync pipeline to a third party.
- Provides the marketing pieces we don't want to build: **managed unsubscribe**, suppression lists,
  contact **Audiences**, a broadcast composer, and open/click stats.
- Triggered/behavioral email stays in-house (it's coupled to our Supabase data); Broadcasts only owns
  the "send a campaign to a list" job.

## Hard prerequisite: protect transactional deliverability
Do **not** send marketing from the transactional domain. If recipients mark campaigns as spam, it can
poison deliverability for password resets/receipts.

1. Add a **separate marketing subdomain** in Resend, e.g. `news.vidquence.com` (its own SPF/DKIM/DMARC).
2. Send all Broadcasts from `Vidquence <news@news.vidquence.com>`; keep transactional on the current
   `no-reply@vidquence.com`.
3. Warm up the new subdomain (start small, ramp volume).
4. **One-click unsubscribe** (`List-Unsubscribe` + `List-Unsubscribe-Post`) — required by Gmail/Yahoo
   for bulk senders. Resend Broadcasts adds this automatically; just keep it enabled.

## Data model / sync (the only real engineering)
Resend **Audiences** = the contact list. We need our users in there, with marketing consent honored.

- **On signup:** add the user as a contact to the marketing Audience (Resend API), with `firstName`
  and any segment fields we care about (plan status, signup date).
- **Backfill once:** one script to push existing users into the Audience.
- **On account delete:** remove/suppress the contact (we already wipe data in `/account/delete`).
- **Consent:** treat Resend's unsubscribe state as the source of truth for *marketing* consent. A user
  who unsubscribes in an email must not be re-added on the next sync. (Our in-app "tips"/"announcements"
  prefs gate the *in-house* sends; Resend gates the *broadcast* sends — keep them conceptually separate.)
- **CAN-SPAM:** physical mailing address in the campaign footer + working unsubscribe.

## MVP vs. later
- **MVP (least build):** sync contacts + send campaigns from the **Resend dashboard** by hand. No admin
  UI needed. This is enough to start sending newsletters.
- **Later (optional):** an admin compose/schedule UI in our own dashboard via the Broadcasts API, and
  segments (e.g. "active paid", "inactive 30d", "free never-activated").

## Rough effort
- Subdomain + DNS + warmup: ~half a day (mostly DNS propagation/waiting).
- Contact sync on signup + delete + backfill script: ~half a day.
- Using Resend's dashboard to send: zero build.
- Optional in-app compose UI: 1–2 days.

## Open decisions for when we revisit
- One Audience with segment fields, or multiple Audiences? (Start with one + fields.)
- Do we reconcile Resend unsubscribes back into our DB, or keep marketing consent solely in Resend?
  (Recommend: solely in Resend for marketing; our prefs stay for in-app + transactional-style nudges.)
