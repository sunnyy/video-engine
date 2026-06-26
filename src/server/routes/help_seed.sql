-- help_seed.sql — starter Help Center articles for Vidquence (run AFTER help.sql).
-- Safe to re-run: `on conflict (slug) do nothing` skips any article you've already inserted/edited.
-- Bodies are dollar-quoted ($md$ … $md$) so apostrophes/quotes need no escaping.
-- Edit or unpublish any of these afterwards from /admin/help.

insert into help_articles (slug, title, category, excerpt, body, status, sort_order) values

-- ─────────────────────────── GETTING STARTED ───────────────────────────
('what-is-vidquence', 'What is Vidquence?', 'Getting Started',
 'An all-in-one AI studio for making videos, images, and voiceovers.',
 $md$Vidquence is an all-in-one AI production studio. From a single prompt you can generate finished videos, and you also get a full creative suite for images, posters, thumbnails, voiceovers, and more — all in one dashboard.

Everything you create is yours to edit. Every AI video opens in a built-in editor where you can change text, visuals, timing, music, and captions.

**What you can make**

- **Videos** — AI Video, Social to Video, Product ads, Typography, Promo/website videos, Talking Head, and Auto Captions.
- **Images** — AI image generation, product posters, banners, thumbnails, and virtual try-on.
- **Audio** — AI voiceovers (text to speech) and speech to text.

New accounts get **150 free credits** to try things out — no credit card required.$md$,
 'published', 1),

('create-first-video', 'Create your first video', 'Getting Started',
 'Type what you want on the dashboard and Vidquence builds it.',
 $md$The fastest way to start is the prompt box on your **dashboard**.

1. Open your dashboard.
2. Pick a service (e.g. **AI Video**) from the options above the prompt box.
3. Describe what you want — your topic, the vibe, and any details that matter.
4. Set options like voice/language, duration, and orientation.
5. Hit send and let Vidquence research, script, design, and render your video.

When it's done, the video opens in the editor so you can fine-tune anything before exporting or publishing.

> Tip: the more specific your prompt (audience, tone, key points), the closer the first result will be to what you want.$md$,
 'published', 2),

('dashboard-overview', 'Navigating your dashboard', 'Getting Started',
 'Where to find projects, credits, account settings, and tools.',
 $md$Your workspace lives behind a slim left sidebar:

- **Home** — the prompt box where you create videos.
- **Explore** — image and audio tools (posters, banners, thumbnails, try-on, voiceover, speech to text).
- **Projects** — everything you've made, ready to reopen in the editor.
- **Social Accounts** — connect channels you publish to.
- **Alerts** — your in-app notifications.
- **Credits** — your balance, history, and where to top up.
- **Account** — Brand Kit, Settings, Invite & Earn, Help & Support, and Feedback.

Your current credit balance is always shown at the bottom of the sidebar.$md$,
 'published', 3),

('choosing-a-service', 'Which video service should I use?', 'Getting Started',
 'A quick guide to picking the right tool for your goal.',
 $md$Each video service is tuned for a different job:

- **AI Video** — any topic from a text prompt; great for explainers, faceless content, and storytelling.
- **Social to Video** — turn a post, article, or idea into a short social-ready video.
- **Product Video** — turn a product photo into a video ad.
- **Typography Video** — bold text-driven motion videos.
- **Promo / Website Video** — turn a website or product into a promo.
- **Talking Head** — upload your own clip and Vidquence builds the video around it (captions, b-roll, music).
- **Auto Captions** — add animated captions to a video you already have.

Not sure? Start with **AI Video** — it's the most general-purpose.$md$,
 'published', 4),

-- ─────────────────────────── CREDITS & BILLING ───────────────────────────
('how-credits-work', 'How credits work', 'Credits & Billing',
 'Credits power every AI action. New accounts get 150 free.',
 $md$Credits are how you pay for AI actions on Vidquence — generating a video, an image, a voiceover, and so on.

- **New accounts get 150 free credits** on signup.
- Each action has a credit cost. Longer videos and heavier services cost more; the cost is shown before you generate.
- **Credits never expire** — they stay in your account even between billing periods.
- You can see your balance any time at the bottom of the sidebar, and your full history on the **Credits** page.

To get more credits, subscribe to a plan or buy a top-up pack (see *Plans & pricing*).$md$,
 'published', 1),

('plans-and-pricing', 'Plans & pricing', 'Credits & Billing',
 'Paid plans add monthly credits and unlock the full suite.',
 $md$Every plan includes every service — higher plans simply give you more credits each month.

- Start **free** with 150 credits.
- Paid plans add a monthly credit allowance and are billed **monthly or annually** (annual saves vs. paying monthly).
- You can upgrade, downgrade, or cancel any time from the **Pricing** page or your account. If you cancel, you keep your remaining credits.

For the current plan tiers, credit amounts, and prices, see the **Pricing** section on our homepage.$md$,
 'published', 2),

('credit-topups', 'Buying extra credits (top-ups)', 'Credits & Billing',
 'Subscribers can buy one-off credit packs any time.',
 $md$If you run low before your next renewal, you can buy a one-off **top-up pack** of credits.

- Top-ups are available to **active subscribers**.
- Bought credits are added instantly and, like all credits, **never expire**.
- Find top-up packs on the **Credits** page.

If you're not on a plan yet, subscribe first — then top-ups become available.$md$,
 'published', 3),

('promo-codes', 'Using a promo code', 'Credits & Billing',
 'Apply a discount code at checkout.',
 $md$Have a promo code? Apply it at checkout:

1. Choose a plan and go to the **checkout** page.
2. Enter your code in the **Promo code** field and click **Apply**.
3. The discount and updated total appear instantly.
4. Complete payment as usual.

If a code won't apply, it may have expired, reached its limit, or already been used on your account. Double-check the code for typos.$md$,
 'published', 4),

('refunds', 'Refunds', 'Credits & Billing',
 'How refunds work and how to request one.',
 $md$If something went wrong with a purchase or a generation, we want to make it right.

- For issues with a specific generation, the fastest path is to **open a support ticket** with the details.
- Subscription refunds are handled per our **Refund Policy** (linked in the site footer).

Reach out through **Help & Support** and our team will look into it.$md$,
 'published', 5),

-- ─────────────────────────── VIDEO SERVICES ───────────────────────────
('ai-video', 'AI Video (prompt to video)', 'Video Services',
 'Turn any topic into a fully designed video from a prompt.',
 $md$**AI Video** turns a text prompt into a complete, edit-ready video. It researches your topic, writes a script, designs each scene, adds voiceover and music, and renders the result.

**How to use it**

1. Select **AI Video** on the dashboard.
2. Describe your topic and what you want to cover.
3. Choose voice/language, duration, and orientation (vertical or wide).
4. Generate — then refine everything in the editor.

Great for explainers, faceless channels, educational content, and storytelling. Multiple languages are supported, including English and Hindi.$md$,
 'published', 1),

('social-video', 'Social to Video', 'Video Services',
 'Turn a post, article, or idea into a short social video.',
 $md$**Social to Video** takes a short idea, post, or article and turns it into a snappy, social-ready clip with voiceover, motion, and captions.

**How to use it**

1. Select **Social to Video** on the dashboard.
2. Paste your idea or text and set voice/language and duration.
3. Generate, then tweak pacing, visuals, and captions in the editor.

Best for Reels, Shorts, and TikTok-style content.$md$,
 'published', 2),

('product-video', 'Product Video ads', 'Video Services',
 'Turn a product photo into a video ad.',
 $md$**Product Video** turns a single product image into a polished video ad with multiple scenes, motion, and music.

**How to use it**

1. Select **Product Video** on the dashboard.
2. Upload a clear product photo (or paste a product link where supported).
3. Add a few details about the product and the message.
4. Generate, then refine in the editor.

Works for fashion, gadgets, beauty, food, and more.$md$,
 'published', 3),

('typography-video', 'Typography Video', 'Video Services',
 'Bold, text-driven motion videos.',
 $md$**Typography Video** creates kinetic, text-forward videos — ideal for quotes, hooks, announcements, and punchy messaging set to music.

**How to use it**

1. Select **Typography Video** on the dashboard.
2. Enter your message or script and pick voice/language and duration.
3. Generate, then adjust text, timing, and style in the editor.$md$,
 'published', 4),

('promo-video', 'Promo / Website Video', 'Video Services',
 'Turn a product or website into a promo video.',
 $md$**Promo Video** builds a promotional video from your product or website — pulling in the key points and turning them into a clean, animated promo.

**How to use it**

1. Select the **Promo** service on the dashboard.
2. Provide your website link or describe the product.
3. Set your options and generate.
4. Polish in the editor before publishing.$md$,
 'published', 5),

('talking-head', 'Talking Head videos', 'Video Services',
 'Upload your own clip and build a full video around it.',
 $md$**Talking Head** lets you upload your own recorded clip, and Vidquence builds a finished video around it — adding animated captions, supporting visuals/b-roll, cutaways, and music.

**How to use it**

1. Select **Talking Head** on the dashboard.
2. Upload your recorded clip.
3. Choose your caption style and options.
4. Generate, then fine-tune in the editor.

Perfect when you want your own face and voice but a produced look.$md$,
 'published', 6),

('captions', 'Auto Captions', 'Video Services',
 'Add animated captions to an existing video.',
 $md$**Auto Captions** transcribes a video you already have and adds styled, animated captions.

**How to use it**

1. Open **Video Captions** from Explore.
2. Upload your video.
3. Pick a caption style.
4. Generate, then adjust wording, timing, and styling in the editor.$md$,
 'published', 7),

-- ─────────────────────────── IMAGES & AUDIO ───────────────────────────
('ai-images', 'AI Image Generation', 'Images & Audio',
 'Generate images from a text prompt.',
 $md$Create images from a description — for thumbnails, posts, backgrounds, or concept art.

**How to use it**

1. Open **Image Generation** from Explore.
2. Describe the image you want (subject, style, mood).
3. Generate and download, or reuse it inside other tools.$md$,
 'published', 1),

('product-poster', 'Product Poster', 'Images & Audio',
 'Create marketing posters from a product photo.',
 $md$**Product Poster** turns a product photo into a polished marketing poster with backgrounds, layout, and text.

**How to use it**

1. Open **Product Poster** from Explore.
2. Upload your product image.
3. Add your headline/details and generate.$md$,
 'published', 2),

('banner-design', 'Banner Design', 'Images & Audio',
 'Design banners and social graphics.',
 $md$**Banner Design** creates banners and social graphics sized for your channels.

**How to use it**

1. Open **Banner Design** from Explore.
2. Enter your text and pick a style.
3. Generate and download.$md$,
 'published', 3),

('thumbnails', 'Thumbnail Generator', 'Images & Audio',
 'Make click-worthy video thumbnails.',
 $md$Create eye-catching thumbnails for your videos.

**How to use it**

1. Open **Thumbnail** from Explore.
2. Describe the thumbnail or upload a base image.
3. Add your title text and generate.$md$,
 'published', 4),

('virtual-tryon', 'Virtual Try-On', 'Images & Audio',
 'Show clothing on an AI model.',
 $md$**Virtual Try-On** places a garment on an AI model so you can show apparel being worn without a photoshoot.

**How to use it**

1. Open **Virtual Try-On** from Explore.
2. Upload the clothing item (and a model where applicable).
3. Generate the try-on image.$md$,
 'published', 5),

('voiceover', 'Voiceover (Text to Speech)', 'Images & Audio',
 'Turn text into natural-sounding voiceovers.',
 $md$**Voiceover** converts text into natural-sounding speech in multiple voices and languages.

**How to use it**

1. Open **Voiceover** from Explore.
2. Paste your script and choose a voice and language.
3. Generate and download the audio.$md$,
 'published', 6),

('speech-to-text', 'Speech to Text', 'Images & Audio',
 'Transcribe audio or video into text.',
 $md$**Speech to Text** transcribes spoken audio or video into editable text.

**How to use it**

1. Open **Speech to Text** from Explore.
2. Upload your audio or video file.
3. Generate the transcript and copy or download it.$md$,
 'published', 7),

-- ─────────────────────────── EDITING & BRAND ───────────────────────────
('video-editor', 'Editing your video', 'Editing & Brand',
 'Every element of every scene is editable.',
 $md$Every AI video opens in the built-in editor, where you have full control:

- Edit on-screen text and swap visuals.
- Adjust scene timing and transitions.
- Update captions and add overlays.
- Swap background music and add sound effects.
- Re-order or remove scenes.

When you're happy, export the video or publish it to a connected channel. Your projects are always saved under **Projects** to reopen later.$md$,
 'published', 1),

('brand-kit', 'Brand Kit', 'Editing & Brand',
 'Save your colors, fonts, and logo for consistent videos.',
 $md$**Brand Kit** stores your brand''s colors, fonts, and logo so your videos stay on-brand automatically.

**How to set it up**

1. Open **Brand Kit** from the Account menu.
2. Add your logo, brand colors, and preferred fonts.
3. Save — new projects can use these automatically.$md$,
 'published', 2),

-- ─────────────────────────── PUBLISHING ───────────────────────────
('connect-youtube', 'Connecting your YouTube channel', 'Publishing',
 'Publish to YouTube using your own Google project.',
 $md$You can publish videos straight to YouTube. Vidquence connects through **your own Google Cloud project**, so uploads run on your own quota.

**How to connect**

1. Go to **Social Accounts** in the sidebar.
2. Click **Connect** on YouTube to open the guided setup.
3. Follow the steps to create an OAuth client in Google and paste in your Client ID and Secret.
4. Authorize your channel.

The setup screen walks you through it for both first-time Google users and people who already have a Google Cloud project. It''s a one-time setup — after that, reconnecting is a single click.$md$,
 'published', 1),

-- ─────────────────────────── ACCOUNT ───────────────────────────
('invite-earn', 'Invite & Earn (referrals)', 'Account',
 'Share your link — you and your friend both get credits.',
 $md$Invite friends and you both earn credits.

- Your friend gets **50 bonus credits** when they sign up through your link.
- You get **100 credits** the first time they make a purchase.

**How to use it**

1. Open **Invite & Earn** from the Account menu.
2. Copy your unique invite link and share it.
3. Track who''s joined and the credits you''ve earned right on that page.$md$,
 'published', 1),

('notifications', 'Notifications & email preferences', 'Account',
 'Choose what you''re notified about and how.',
 $md$Vidquence keeps you posted on renders, billing, support replies, referrals, and product news — both in-app (the **Alerts** bell) and by email.

**Manage what you receive**

1. Open **Settings** from the Account menu.
2. Under notification preferences, toggle each category on or off for **in-app** and **email**.

Some essential messages (like billing and important account notices) are always sent.$md$,
 'published', 2),

('account-settings', 'Account settings & languages', 'Account',
 'Update your profile, defaults, and language.',
 $md$In **Settings** (Account menu) you can manage your profile and defaults, including your niche, goal, and preferred language.

Vidquence supports multiple languages for scripts and voiceovers, including English and Hindi, with more available across the services.$md$,
 'published', 3),

('delete-account', 'Deleting your account', 'Account',
 'How to permanently delete your account and data.',
 $md$You can permanently delete your account at any time.

1. Open **Settings** from the Account menu.
2. Scroll to the account deletion section.
3. Confirm — this removes your account and associated data and can''t be undone.

If you''re having an issue we could fix instead, please reach out via **Help & Support** first — we''re happy to help.$md$,
 'published', 4)

on conflict (slug) do nothing;
