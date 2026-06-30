# App Promo Video — Build Spec (planning only, not built)

**One-liner:** Paste an **App Store / Play Store** link (or app name) → fetch the app's info, screenshots
and reviews → produce a promo video. Built as a **standalone fork** of the SaaS/Promo pipeline so the
existing SaaS service is **never touched** (same isolation pattern as Talking Head: "copy from, don't edit").

**Decision (2026-06-30):** Duplicate-to-isolate, but *selectively* — copy the SaaS-specific files, **import**
the shared engine (neutral infra), **replace** the input layer with an app-store fetcher, and **rewrite the
script/strategy prompts** for app-native framing. New service: **"App Promo Video"**, route `/app-video`,
`source: "app_video"`, tier-2 beta. **v1 = BOTH App Store + Play Store** (LOCKED 2026-06-30): Apple via
the official iTunes API (solid); Play via google-play-scraper (best-effort, fails gracefully).
**Pricing = scene-based, reusing the SaaS/Promo `promo_video` scene tiers** (LOCKED 2026-06-30).

---

## 1. The copy-vs-import line (from a dependency scan of src/services/ai/saasVideo/)

### IMPORT (neutral shared infra — never copy, never edit; already shared by AI Video/Social/Product):
- `../shared/safeFetch.js` (assertPublicUrl, safeFetch, normalizeUrl)
- `../shared/converter.js` (measureSceneHTML, closeMeasureBrowser)
- `../shared/motion.js` (simplifyTimelineKeyframes, expandEnter/Exit/Emphasis)
- `../shared/visualStyles.js`, `../shared/themeRegistry.js`, `../shared/designConstraints.js`
- `../shared/stock.js`, `../shared/aiImage.js`, `../shared/persist.js`
- `../shared/voiceoverError.js`, `../shared/incompleteProject.js`
- `../../../core/registries/musicRegistry.js`, `../../../core/utils/placeholders.js`
- `../../../server/middleware/shared.js` (supabaseAdmin, openai, TEMP_DIR, …)
- `../../../server/services/apiHealth.js` (track)

### COPY into a new `src/services/ai/appVideo/` (SaaS-specific — yours to edit freely):
| File | Why copy | Change needed |
|------|----------|---------------|
| `pipelineOrchestrator.js` | the spine | rewire input (fetcher instead of scrape/harvest), `source: "app_video"` |
| `scriptGenerator.js` | **the SaaS framing lives here** | **REWRITE for app-mode** (key file — see §3) |
| `visualDirector.js` | beat/strategy planning | review for app framing (download/proof beats) |
| `intentPrompts.js` | scene designer prompt | soften role line; screenshots as hero asset |
| `sceneDesigner.js` / `sceneDesignerFree.js` / `freeDesignPrompt.js` | wrap the prompts | minimal/none |
| `timelineBuilder.js` | beats → timeline | none (generic) |
| `htmlParser.js` | scene HTML → layers | none (generic) |
| `renderOrchestrator.js` | render/export path | none beyond source tags |
| `projectStateManager.js` / `projectSchema.js` / `assetRequirements.js` | state + vocab | none |
| `assetHarvester.js` | image harvesting | **adapt**: assets come from the fetcher (screenshots), not a site crawl |
| `ttsGenerator.js` | voiceover | copy for full isolation (or import if read-only coupling is OK) |
| `generateSaasVideo.js` (client) | frontend caller | copy → `generateAppVideo.js`, point at `/api/app-video` |

### SKIP (not relevant to apps):
- `talkingHeadProcessor.js` — App Promo has no talking-head upload mode.

### NEW files:
- `appVideo/appStoreFetcher.js` — the input adapter (see §2).
- `src/server/routes/appVideo.js` — copy saasVideo route, swap fetcher + pipeline import.
- `src/pages/AppVideo.jsx` — copy SaasVideo.jsx, change the input to "App Store / Play Store URL".

---

## 2. App-store fetcher contract (`appStoreFetcher.js`)

`fetchAppListing(input, { country = "us", reviewLimit = 8 }) → normalized listing`

Detect source from the input (URL or app name):
- **Apple (solid, official, no key):**
  - Listing: `GET https://itunes.apple.com/lookup?id={appId}&country={cc}` → name, description, screenshotUrls (+ipad), icon, genre, averageUserRating, ratingCount, seller, price.
  - App id parsed from `apps.apple.com/.../id{digits}`; or search via `…/search?term=…&entity=software&limit=1`.
  - Reviews: `GET https://itunes.apple.com/{cc}/rss/customerreviews/id={appId}/sortBy=mostHelpful/json` → title, rating, content, author.
- **Google Play (best-effort, brittle):**
  - Use `google-play-scraper` (npm) for app() + reviews(); appId parsed from `play.google.com/store/apps/details?id={pkg}`.
  - Treat failure gracefully → fall back to Apple-only messaging / friendly error.

**Normalize to the SaaS pipeline's existing input shape** so downstream is unchanged:
```
{
  productName, tagline/subtitle, description,           // → script context
  brandColor (from icon, optional), logoUrl: iconUrl,   // → branding
  assets: [ { type: "asset", url: screenshotUrl }, … ], // → hero visuals (already ~9:16)
  proof: { rating, ratingCount, topReviews: [{ rating, text, author }] }, // → testimonial beat
  store: "ios" | "android", storeUrl, price             // → CTA / store badge
}
```
SSRF: allowlist `itunes.apple.com`, `*.mzstatic.com` (Apple screenshot CDN), `play.google.com`,
`*.ggpht.com`/`*.googleusercontent.com` (Play images). Reuse the shared `safeFetch`.

---

## 3. App-mode prompt changes (the real adaptation)

**scriptGenerator.js (rewrite — this is where SaaS framing lives):**
- Positioning: app-native, not SaaS. Vocabulary: "download," "tap," "on the go," "in your pocket,"
  "available on iOS/Android" — NOT "free trial," "for teams," "workflow," "dashboard."
- CTA beat: "Download on the App Store / Get it on Google Play" (+ store badge), not "start free trial."
- Proof beat: pull a real ★ rating + a short quoted review as social proof.
- Hero: the app **screenshots** carry the visual story (feature-by-feature), not a product dashboard.
- Pass a `productType: "mobile_app"` + `store` context through `projectContext`.

**intentPrompts.js (soften, ~2 lines):**
- Role line: "premium SaaS promo video designer" → "premium **app/product** promo video designer."
- Keep everything else — the designer is already content-driven; it'll render screenshots + ratings + a
  download CTA from the script. Ensure screenshot assets flow in via the existing `assetUrl`/placeholder path.

**visualDirector.js (review):** make sure beat planning allows a "store/CTA" beat and a "review/proof" beat;
likely already supported (it has a social-proof/testimonial composition option).

---

## 4. Wiring (mirrors how Video Clipping was added)
- `serviceCatalog.js`: `{ key: "app_video", name: "App Promo Video", category: "create", tier: 2, beta: true, route: "/app-video", creditKey: "app_video", pricing: {…}, publishable: false }`.
- `creditCosts.js`: **scene-based pricing — reuse the SaaS/Promo `promo_video` scene tiers** ({1,3,5}) for `app_video` (LOCKED 2026-06-30).
- `serviceCostLabels.js`: add `app_video` label.
- `App.jsx`: `<Route path="/app-video" element={<AppVideo/>} />`.
- `server/index.js`: `app.use("/api/app-video", appVideoRouter)`.
- `Projects.jsx`: filter pill `{ id:"app_video", label:"App Promo", sources:["app_video"] }`.
- `Explore.jsx`: add to the Video section.

---

## 5. Difficulty & scope
- **Medium.** ~14 files copied (mostly verbatim), 1 rewritten (scriptGenerator), 1 softened (intentPrompts),
  1 adapted (assetHarvester), 1 new (appStoreFetcher), plus route/page/catalog wiring.
- Reuse stays high because the **whole render/design/motion/tts engine is imported, not cloned**.
- The genuinely new thinking is the fetcher + the app-mode script prompt.

## 6. Risks
1. **Play scraping fragility** — brittle, anti-bot; ship Apple-first, Play best-effort, cache results.
2. **Fork drift** — SaaS fixes won't auto-reach App Promo (inherent to the isolation choice; accepted, same as TH).
3. **Screenshot variety** — some apps' screenshots have baked-in marketing text/frames; designer should scrim, not over-design on top (overlay mode already handles this).
4. **Rights** — a user can paste any app's link (same as today's URL mode); their responsibility — note in terms.
5. **Region/freshness** — reviews are country-scoped; pick a sensible default (us) + allow override later.

## 7. Sequencing
1. Fetcher (Apple-first) + normalization → verify the shape matches the SaaS input.
2. Copy the pipeline files into `appVideo/`, swap input + `source`, soften designer.
3. Rewrite `scriptGenerator.js` for app-mode.
4. Route + page + catalog + Explore/Projects wiring.
5. Localhost test on a few real apps; tune the script prompt.
6. Play Store best-effort last.
