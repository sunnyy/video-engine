/**
 * falService.js
 * src/services/assets/falService.js
 *
 * Generates images via Fal.ai FLUX Schnell.
 * Uses concept-to-visual translation — not raw spoken text.
 */

import { uploadUserAsset } from "../../services/assets/uploadUserAsset";
import { useAssetsStore }  from "../../store/useAssetsStore";
import { supabase }        from "../../lib/supabase";
import { serverFetch }     from "../../services/serverApi";

/* ── AI Image Library — reuse before generating ─────────────*/

async function findExistingImage(assetHint, dna) {
  try {
    const { keywords, visual_type } = assetHint || {};
    const niche = dna?.niche;
    if (!niche || !visual_type || !keywords?.length) return null;

    const { data, error } = await supabase
      .from("ai_image_library")
      .select("id, src, prompt, context, tags, reuse_count")
      .eq("niche", niche)
      .eq("visual_type", visual_type)
      .contains("tags", keywords.slice(0, 2))
      .limit(10);

    if (error || !data?.length) return null;

    const match = data[Math.floor(Math.random() * data.length)];

    // Fire-and-forget reuse count increment (via server to bypass RLS)
    serverFetch("/api/ai-image-library/increment-reuse", {
      method: "POST",
      body: JSON.stringify({ id: match.id, reuse_count: match.reuse_count }),
    }).catch(() => {});

    return match;
  } catch (e) {
    console.warn("[ai_image_library] findExistingImage error:", e.message);
    return null;
  }
}

async function saveToImageLibrary({ src, prompt, assetHint, beat, dna, orientation, width, height }) {
  try {
    const energy = typeof beat?.energy === "number"
      ? (beat.energy >= 0.7 ? "high" : beat.energy <= 0.35 ? "low" : "medium")
      : "medium";

    const record = {
      src,
      prompt,
      search_query:  assetHint?.search_query  || null,
      subject:       assetHint?.keywords?.[0] || null,
      context:       assetHint?.prompt        || null,
      mood:          beat?.layoutBackground?.mood || null,
      visual_type:   assetHint?.visual_type   || null,
      niche:         dna?.niche               || null,
      intent:        beat?.intent             || null,
      energy,
      color_mood:    dna?.colorStory?.mood    || null,
      tags:          assetHint?.keywords      || [],
      width,
      height,
      orientation,
      generator:     "fal",
      reuse_count:   0,
    };

    const res = await serverFetch("/api/ai-image-library/save", {
      method: "POST",
      body: JSON.stringify(record),
    });
  } catch (e) {
    console.warn("[ai_image_library] saveToImageLibrary error:", e.message);
  }
}

/* ── Concept → Visual Scene translator ──────────────────────
   Maps abstract concepts/words to concrete photographable scenes.
   This is the core of good image generation.
─────────────────────────────────────────────────────────────*/
const CONCEPT_VISUALS = {
  // Money / Finance
  money:       "stacks of cash banknotes on a dark surface, cinematic lighting",
  millionaire: "luxury penthouse interior, city skyline view at night, expensive decor",
  revenue:     "gold coins and currency notes on dark surface, financial wealth, cinematic lighting",
  profit:      "gold coins stacked, financial charts trending upward, dark background",
  income:      "wallet with cash, credit cards, financial freedom concept",
  salary:      "paycheck envelope, professional desk, corporate office",
  investment:  "gold bars and coins on dark marble surface, wealth and luxury, cinematic lighting",
  bank:        "modern bank interior, vault, financial institution architecture",
  rupees:      "Indian currency notes, financial wealth, gold accent",
  lakh:        "Indian currency stacks, wealth display, cinematic dark background",
  billion:     "massive scale visualization, skyscrapers from above, aerial cityscape",
  trillion:    "global financial map, world economy concept, data streams",
  gdp:         "industrial cityscape, factories and skyscrapers, economic power",
  economy:     "busy stock exchange floor, traders, financial screens everywhere",

  // Technology / Social Media
  tiktok:      "smartphone showing short video app, neon glow, dark room, content creation setup",
  youtube:     "professional video studio setup, ring light, camera, content creator desk",
  shorts:      "vertical phone screen glowing, social media interface, creator studio",
  viral:       "exponential graph exploding upward, digital network nodes connecting",
  views:       "massive stadium crowd from above, thousands of people, aerial view",
  content:     "professional camera setup, studio lights, creative workspace",
  creator:     "podcast studio with microphones, professional lighting, creative setup",
  algorithm:   "abstract network of glowing nodes, data flowing, dark tech background",
  trending:    "upward rocket trajectory, success graph, explosive growth visualization",
  subscribers: "crowd of people raising phones with lights, concert atmosphere",
  followers:   "digital network expanding, social connection nodes, glowing web",
  platform:    "multiple screens showing different apps, tech hub, modern workspace",

  // Growth / Success
  growth:      "plant sprouting through concrete, time-lapse concept, determination",
  success:     "trophy on a pedestal, stadium spotlight, achievement moment",
  opportunity: "open door with golden light streaming through, pathway forward",
  future:      "futuristic city at night, neon lights, advanced architecture",
  potential:   "rocket launching into space, explosive energy, night sky",
  million:     "aerial view of massive crowd, scale and magnitude, stadium full",
  brand:       "product display on minimalist shelf, brand identity, clean design",

  // Physical / Action
  explode:     "fireworks explosion against dark sky, colorful burst, dramatic moment",
  pop:         "kernel transforming with steam and heat, macro photography, dramatic",
  popcorn:     "fresh popcorn overflowing from red and white striped bucket, cinema",
  grain:       "wheat field aerial view golden hour, agriculture, harvest",
  ancient:     "archaeological ruins at sunset, historical stone structures, dramatic sky",
  history:     "museum artifacts under dramatic lighting, historical objects, dark background",

  // India specific
  india:       "India Gate monument at golden hour, dramatic sky, patriotic vista",
  indian:      "vibrant Indian marketplace, colorful textiles, bustling urban scene",
  mumbai:      "Mumbai skyline at night, Bandra Worli sealink, city lights reflection",
  delhi:       "India Gate Delhi aerial view, government district, wide boulevards",
  startup:     "modern Indian tech office, young professionals, collaborative workspace",

  // Abstract concepts
  pressure:    "industrial pipes under high pressure, steam venting, engineering close-up",
  round:       "perfect circle geometry, architectural curves, minimalist design",
  square:      "geometric grid pattern, architectural angles, modernist design",
  airplane:    "aircraft wing view from passenger window, clouds below, sunset sky",
  window:      "airplane oval window with clouds and golden light visible outside",
  altitude:    "aerial photography from plane, clouds from above, vast sky",

  // Morning / Lifestyle / Productivity
  waking:        "sunrise over mountains, golden morning light, dramatic dawn sky, peaceful",
  wake:          "alarm clock at 5am, morning light streaming through window, dawn atmosphere",
  morning:       "misty sunrise landscape, golden hour light rays, peaceful early morning",
  sunrise:       "dramatic sunrise over city skyline, golden orange sky, new day beginning",
  early:         "empty city streets at dawn, golden morning light, quiet peaceful atmosphere",
  productive:    "clean organized desk workspace, morning coffee, productivity setup, good lighting",
  productivity:  "organized workspace with multiple screens, morning light, focused environment",
  successful:    "corporate skyscraper exterior, glass building, success architecture, morning light",
  success:       "trophy on marble pedestal, spotlight, achievement moment, dark elegant background",
  ceo:           "executive boardroom, long conference table, city view window, corporate power",
  ceos:          "executive boardroom, long conference table, city view window, corporate power",
  athlete:       "empty running track at dawn, stadium lights, athletic training ground",
  athletes:      "athletic training facility, gym equipment, morning workout setup, no people",
  entrepreneur:  "modern startup office with whiteboards, innovative workspace, tech company",
  entrepreneurs: "modern coworking space, startup culture, collaborative workspace, morning",
  mental:        "peaceful zen garden, meditation space, calm water reflection, mindful",
  health:        "green smoothie and healthy food flat lay, wellness concept, clean background",
  bed:           "cozy unmade bed from above, soft morning light through curtains, warm tones",
  comfort:       "plush pillows and soft blankets overhead view, warm morning bedroom light",
  mindset:       "open book with highlighted notes, coffee cup, growth mindset desk concept",
  control:       "steering wheel close-up, driver perspective, taking control concept",
  bird:          "single bird silhouette against sunrise sky, freedom concept, morning flight",
  worm:          "dewy morning grass close-up, macro nature photography, fresh morning",
  week:          "calendar pages, weekly planner, organized schedule, productivity concept",
  shift:         "transformation concept, dramatic lighting change, before after atmosphere",
  gain:          "upward trending graph arrow, success chart, growth visualization",
  lose:          "empty scale, balance concept, minimalist dark background",
  shot:          "target bullseye with arrow, precision, goal achievement concept",
  studies:       "scientist in modern laboratory surrounded by glassware, research environment, dramatic lighting",
  show:          "dramatic stage spotlight on empty podium, theater curtains, professional presentation space",
  kicker:        "dramatic spotlight on empty stage, reveal moment, theatrical lighting",
  swear:         "handshake in dramatic lighting, commitment concept, professional trust",

  // AI / Technology / Future
  "ai":              "futuristic AI neural network visualization, glowing blue nodes, dark tech background",
  "artificial":      "robot arm in modern factory, precision machinery, blue lighting, industrial tech",
  "intelligence":    "abstract brain made of light circuits, neural network, glowing connections, dark bg",
  "revolutionizing": "transformation visualization, butterfly emerging, dramatic light burst, dark background",
  "revolution":      "massive technological transformation, city becoming futuristic, dramatic sky",
  "world":           "earth from space at night, city lights visible, dramatic space view, orbital perspective",
  "changing":        "metamorphosis concept, old vs new side by side, dramatic transformation lighting",
  "change":          "before after transformation, dramatic lighting shift, architectural metamorphosis",
  "future":          "futuristic smart city at night, neon lights, flying vehicles, advanced architecture",
  "technology":      "multiple screens with data visualizations, server room blue lighting, tech hub",
  "digital":         "abstract digital data streams, binary code visualization, glowing blue matrix",
  "data":            "data center server rows, blue lighting, organized cables, technology infrastructure",
  "analysis":        "scientist examining samples in modern laboratory, clean bright environment, professional",
  "algorithm":       "abstract network of glowing nodes, data flowing, dark tech background, connections",
  "machine":         "robotic assembly line in motion, precision machines, industrial automation, sparks",
  "learning":        "abstract neural pathways lighting up, brain scan visualization, medical tech",
  "climate":         "dramatic storm clouds over city, environmental crisis, dark atmospheric sky",
  "environment":     "lush rainforest canopy from above, aerial drone view, green nature expanse",
  "years":           "timeline visualization, glowing milestones, futuristic progress bar, dark background",
  "life":            "vibrant city street at golden hour, energy and movement, urban vitality",
  "music":           "professional recording studio, mixing board, microphone with sound waves visualization",
  "art":             "dramatic art gallery with spotlit paintings, high contrast museum lighting, dark walls",
  "creating":        "3D printing in action, creative workshop, innovation in progress, dramatic lighting",
  "predicting":      "crystal ball glowing in dark studio, future concept, mysterious dramatic light",
  "shopping":        "modern e-commerce interface on screen, digital shopping cart, tech retail concept",
  "accuracy":        "precision target bullseye, laser beam hitting center, sharp focus, dark background",
  "habits":          "behavioral data visualization, user pattern analysis, abstract flowchart, dark bg",
  "app":             "smartphone screen showing sleek app interface, floating UI elements, dark background",
  "favorite":        "app icons floating in space, digital ecosystem, glowing smartphone, dark backdrop",

  // Ships / Ocean / History
  titanic:     "massive ocean liner ship at sea, dramatic stormy ocean, vintage maritime scene",
  ship:        "large ocean vessel at sea, dramatic waves, maritime aerial view",
  iceberg:     "massive iceberg in arctic ocean, dramatic blue tones, underwater perspective",
  sank:        "deep ocean floor wreckage, underwater ruins, dramatic dark blue water",
  sinking:     "ocean waves crashing, dramatic storm at sea, dark stormy water",
  lifeboat:    "small rescue boat on stormy ocean, dramatic lighting, survival at sea",
  lifeboats:   "row of orange lifeboats on ship deck, maritime safety equipment",
  ocean:       "vast dark ocean aerial view, dramatic waves, deep blue water",
  sea:         "stormy sea waves crashing, dramatic ocean atmosphere, dark water",
  water:       "deep blue ocean surface, dramatic water reflections, cinematic",
  luxury:      "opulent interior design, gold accents, marble floors, luxury decor",
  luxurious:   "grand ballroom interior, crystal chandeliers, elegant architecture",
  ship:        "massive cruise ship aerial view, ocean liner, maritime grandeur",
  unsinkable:  "massive steel hull of ship, industrial engineering, iron structure",
  hubris:      "crumbling ancient monument, dramatic sunset, historical ruins",
  safety:      "emergency equipment on wall, life preservers, safety protocols display",
  regulations: "official documents on desk, government building exterior, formal setting",
  tragedy:     "dark stormy ocean, dramatic waves, somber atmospheric lighting",
  lives:       "memorial candles glowing, dramatic dark background, remembrance",
  night:       "dark starry sky over ocean, moonlight reflection on water, atmospheric",
  april:       "historical calendar, vintage newspaper, dramatic black and white",
  hours:       "antique clock face close-up, dramatic lighting, time concept",
  iceberg:     "massive iceberg emerging from arctic ocean, dramatic cold lighting",

  // Generic fallbacks by topic category
  health:      "clean modern hospital corridor, medical equipment, professional healthcare",
  food:        "gourmet dish on dark slate, restaurant kitchen, culinary artistry",
  sport:       "athletic stadium with dramatic lighting, sports arena, competition energy",
  nature:      "dramatic landscape with mountains, golden hour light, vast wilderness",
  city:        "modern city skyline at dusk, glass buildings, urban architecture",
  science:     "laboratory with glowing equipment, scientific research, clean environment",
};

/* ── Intent → atmosphere ── */
const INTENT_ATMOSPHERE = {
  shock:       "dramatic side lighting, high contrast shadows, intense atmosphere",
  curiosity:   "mysterious soft glow, depth of field bokeh, intriguing perspective",
  proof:       "clean bright lighting, sharp detail, professional documentary style",
  reveal:      "spotlight from above, theatrical lighting, dramatic reveal moment",
  urgency:     "motion blur, dynamic angle, high energy kinetic atmosphere",
  empathy:     "warm golden hour light, soft shadows, human warmth",
  punchline:   "bold graphic composition, high contrast, punchy visual impact",
  explanation: "clear even lighting, clean background, informative clean aesthetic",
  contrast:    "split lighting, half shadow half light, dramatic duality",
  irony:       "unexpected juxtaposition, slightly surreal, editorial style",
};

/* ── Extract key concepts from spoken text ── */
const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","can","not",
  "no","yes","so","just","very","really","actually","basically","literally",
  "you","your","we","our","they","their","it","its","this","that","these",
  "those","what","how","when","where","who","which","why","about","from",
  "know","think","say","said","make","get","go","come","see","look","use",
  "one","two","three","four","five","six","like","than","more","some","any",
  "all","also","even","still","then","now","here","there","up","down","out",
  "into","over","after","before","since","until","while","though","because",
  "if","as","by","per","via","etc","yeah","hey","okay","ok","wow","oh",
]);

function extractConcepts(spoken, topic) {
  const text = `${spoken} ${topic}`.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = text.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

function buildImagePrompt({ spoken, intent, visual_hint, topic, orientation, beatIndex }) {
  const aspectHint = orientation === "9:16" ? "vertical 9:16 portrait composition" : "horizontal 16:9 landscape composition";
  const atmosphere = INTENT_ATMOSPHERE[intent] || "cinematic professional photography";

  const concepts = extractConcepts(spoken, topic);

  /* Find matching visual descriptions */
  const matchedVisuals = [];
  for (const concept of concepts) {
    if (CONCEPT_VISUALS[concept]) {
      matchedVisuals.push(CONCEPT_VISUALS[concept]);
      if (matchedVisuals.length >= 2) break; // max 2 concept matches
    }
  }

  /* If no matches, build from remaining meaningful words */
  let sceneDescription;
  if (matchedVisuals.length > 0) {
    sceneDescription = matchedVisuals[0]; // use best match
  } else {
    // Use topic + meaningful words as fallback
    const meaningfulWords = concepts.slice(0, 4).join(" ");
    sceneDescription = `${meaningfulWords} concept, cinematic scene, professional photography`;
  }

  /* Visual hint override */
  const hintOverride = {
    stat:       "dramatic close-up of stacked gold coins on dark surface, wealth concept, cinematic lighting",
    comparison: "two contrasting environments side by side, duality concept, dramatic lighting",
    list:       "organized collection of objects, systematic arrangement, clean composition",
    scene:      sceneDescription,
    product:    "product on minimalist surface, studio photography, clean background",
    faces:      "dramatic portrait photography, cinematic lighting, professional headshot",
  }[visual_hint];

  const finalScene = hintOverride || sceneDescription;

  /* Vary composition slightly per beat index to avoid repetition */
  const compositions = [
    "wide establishing shot",
    "close-up detail shot",
    "medium shot, rule of thirds",
    "overhead flat lay composition",
    "low angle dramatic perspective",
    "macro detail, shallow depth of field",
  ];
  const composition = compositions[beatIndex % compositions.length];

  return [
    finalScene,
    atmosphere,
    composition,
    aspectHint,
    "photorealistic, sharp focus, 8k quality, professional photography",
    "no text, no numbers, no statistics, no charts, no graphs, no labels, no captions, no watermark, no typography, no writing, no signs",
    "no faces, no people, no portraits, no humans",
  ].join(", ");
}

/* ── Generate single image ── */
export async function generateZoneImage({
  spoken, intent, visual_hint, topic, orientation,
  beatIndex = 0, zoneIndex = 0, promptOverride = null,
  projectId = null,
  // Library metadata (optional — enables reuse check + save)
  assetHint = null, dna = null, beat = null,
}) {
  const w = orientation === "9:16" ? 768  : 1344;
  const h = orientation === "9:16" ? 1344 : 768;

  // ── Check library for reusable image before generating ──
  if (assetHint && dna) {
    const existing = await findExistingImage(assetHint, dna);
    if (existing) {
      return { url: existing.src, type: "image", width: w, height: h, reused: true };
    }
  }

  // ── Generate new image via Fal.ai ──
  const effectiveIndex = beatIndex * 3 + zoneIndex;
  const NO_TEXT = "no text, no numbers, no statistics, no charts, no graphs, no labels, no captions, no watermark, no typography, no writing, no signs";
  const prompt = promptOverride
    ? `${promptOverride}, ${orientation === "9:16" ? "vertical 9:16 portrait composition" : "horizontal 16:9 landscape composition"}, photorealistic, sharp focus, 8k quality, ${NO_TEXT}`
    : buildImagePrompt({ spoken, intent, visual_hint, topic, orientation, beatIndex: effectiveIndex });

  const res = await serverFetch("/api/generate-image", {
    method: "POST",
    body:   JSON.stringify({ prompt, orientation }),
  });

  if (!res.ok) throw new Error(`Fal.ai proxy failed: ${res.status}`);

  const data = await res.json();
  const falUrl = data.url;
  if (!falUrl) throw new Error("No image URL returned from Fal.ai");

  // Re-upload to Supabase for permanent storage (Fal.ai URLs expire).
  // Fetch via server proxy to avoid browser QUIC/HTTP3 issues with fal.media CDN.
  try {
    const proxyRes = await serverFetch("/api/proxy-image", {
      method: "POST",
      body:   JSON.stringify({ url: falUrl }),
    });
    if (!proxyRes.ok) throw new Error(`Proxy returned ${proxyRes.status}`);
    const blob   = await proxyRes.blob();
    const file   = new File([blob], `ai-gen-${Date.now()}.jpg`, { type: "image/jpeg" });
    const asset  = await uploadUserAsset(file, "image", null, "project", projectId);
    useAssetsStore.getState().addMyAsset({
      id: asset.id, url: asset.url, file_path: asset.file_path,
      type: "image", name: asset.name || file.name, size: asset.size || file.size,
      scope: "project", project_id: projectId || null, source: "user",
    });

    // Fire-and-forget: save to library for future reuse
    saveToImageLibrary({ src: asset.url, prompt, assetHint, beat, dna, orientation, width: w, height: h });

    return { url: asset.url, assetId: asset.id, type: "image", width: w, height: h };
  } catch (_) {
    return { url: falUrl, type: "image", width: w, height: h };
  }
}

/* ── Generate multiple images with concurrency ── */
export async function generateImages({ prompts, orientation, concurrency = 3 }) {
  const results = [];

  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(p => generateZoneImage({ ...p, orientation }))
    );
    batchResults.forEach(r => {
      if (r.status === "fulfilled") results.push(r.value);
      else {
        console.warn("[falService] Image failed:", r.reason?.message);
        results.push(null);
      }
    });
  }

  return results.filter(Boolean);
}