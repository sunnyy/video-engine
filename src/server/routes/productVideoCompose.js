import express from "express";
import { openai, requireAuth } from "../middleware/shared.js";

export const router = express.Router();


router.post("/compose-all", requireAuth, async (req, res) => {
  try {
    const { scenes, shotUrls, blueprints, totalDuration } = req.body;

    const systemPrompt = `You are a world-class motion designer composing a complete product video timeline.

CRITICAL RULE — SEPARATE LAYERS:
Every text element must be its own separate layer object in the layers array.
NEVER combine multiple text elements into one layer.
NEVER put headline + subheadline + features into a single layer content.

Each scene must have these as SEPARATE layers:
- 1 background image layer
- 1 optional overlay gradient layer
- 1 headline line 1 layer (white)
- 1 headline line 2 layer (accent color)
- 1 subheadline layer
- 1 body/feature layer per feature point (separate layer each)
- 1 CTA button layer (cta scene only)
- 1 brand name layer (cta scene only)

A video with 3 scenes should have minimum 15-20 layers total, not 3.
Each layer's trackId must equal its own id. Never use a scene name or shared identifier as trackId. Example: if id is "headline1-hook", then trackId must also be "headline1-hook".

CANVAS: 1080x1920 pixels (9:16 portrait)
COORDINATE SYSTEM: x:0, y:0 = canvas CENTER
- x:-540 = left edge, x:540 = right edge
- y:-960 = top edge, y:960 = bottom edge

LAYER TYPES:

gradient: { id, type:"gradient", trackId, start, end, zIndex, visible:true, locked:false, sfx:null, gradient:"#hex|linear-gradient(...)|radial-gradient(...)", transform:{x,y,width,height,opacity:1,rotation:0,scale:1,blur:0,borderRadius:0,borderWidth:0,borderColor:"#fff"}, keyframes:{x:[],y:[],scale:[],rotation:[],opacity:[],blur:[]}, animation:{in:{type:"fade",duration:0.4},out:{type:"none",duration:0.3}}, transition:{type:"none",duration:0.5} }

image: { id, type:"image", trackId, start, end, zIndex, visible:true, locked:false, sfx:null, src:"URL", objectFit:"cover|contain", transform:{x:0,y:0,width:1080,height:1920,opacity:1,rotation:0,scale:1,blur:0,borderRadius:0,borderWidth:0,borderColor:"#fff"}, keyframes:{x:[],y:[],scale:[],rotation:[],opacity:[],blur:[]}, animation:{in:{type:"fade",duration:0.5},out:{type:"none",duration:0.3}}, transition:{type:"fade",duration:0.5} }

text: { id, type:"text", trackId, start, end, zIndex, visible:true, locked:false, sfx:null, content:"TEXT", style:{fontFamily:"Oswald|Bebas Neue|Barlow Condensed|Playfair Display|Outfit|DM Sans", fontSize:108, fontWeight:900, color:"#fff", textAlign:"left|center|right", lineHeight:1.05, letterSpacing:-1, textTransform:"uppercase|none", background:null, borderRadius:0, padding:0, textShadow:null}, transform:{x,y,width,height,opacity:1,rotation:0,scale:1,blur:0,borderRadius:0,borderWidth:0,borderColor:"#fff"}, keyframes:{x:[],y:[],scale:[],rotation:[],opacity:[],blur:[]}, animation:{in:{type:"fade",duration:0.4},out:{type:"none",duration:0.3}}, transition:{type:"none",duration:0.5} }

ZINDEX: 1=bg image, 2=overlay, 3=shadow, 4=accent elements, 5=secondary, 6=category/brand, 7=headline, 8=subheadline, 9=body/features, 10=CTA button

BOUNDARY RULES:
- Text left edge (x - width/2) must be > -480
- Text right edge (x + width/2) must be < 480
- Text top/bottom (y ± height/2) must stay within -880 to 880
- Dark bg = white/light text. Light bg = dark (#111-#333) text
- Headline min 96px. Subheadline min 48px. CTA min 52px.
- NEVER put a hex color as text content

SCENE FORMAT RULES:
hook scene: full bleed image + dark overlay + TWO headline text layers (line1 white, line2 accent color) + subheadline. Text top-left area.
hero scene: full bleed image + solid color horizontal band covering bottom 40% (full width 1080px) + headline + 3 feature text layers inside the band.
cta scene: full bleed image + optional overlay + brand name top center + large headline center + subheadline + CTA button bottom center.

Leave all keyframes as empty arrays — they will be added programmatically.
Return ONLY valid JSON: { "layers": [...] }`;

    const userContent = scenes.map((scene, i) => {
      const blueprint = blueprints[i];
      const imageUrl = shotUrls[i];
      const start = i * 2.5;
      const end = start + 2.5;
      return `SCENE ${i + 1} (${scene.purpose}, start:${start}, end:${end}):
Background image URL: ${imageUrl}
Layout: text_position=${blueprint?.layout?.text_position}, negative_space=${blueprint?.layout?.negative_space}
Copy:
- Headline line 1 (white): ${scene.headline || ""}
- Headline line 2 (accent): ${scene.headline_accent || ""}
- Subheadline: ${scene.subheadline || ""}
- Body/Features: ${scene.features ? scene.features.join(", ") : scene.body || ""}
- CTA: ${scene.cta || ""}
- Brand: ${scene.brand || ""}`;
    }).join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Compose all ${scenes.length} scenes into a single flat layers array. Total duration: ${totalDuration}s.\n\n${userContent}\n\nReturn { "layers": [...all layers for all scenes...] }` },
      ],
    });

    let raw;
    try {
      raw = JSON.parse(completion.choices[0].message.content);
    } catch {
      console.error("[compose-all] parse failed, finish_reason:", completion.choices[0].finish_reason);
      raw = null;
    }

    const layers = (raw && Array.isArray(raw.layers)) ? raw.layers : [];
    console.log(`[compose-all] finish_reason: ${completion.choices[0].finish_reason}, layers: ${layers.length}, tokens:`, completion.usage);

    res.json({ layers });
  } catch (err) {
    console.error("[compose-all]", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/scene-to-json", requireAuth, async (req, res) => {
  try {
    const { imageUrl, scene, start, end, sceneIndex, layout } = req.body;

    const imageRes = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const imageMimeType = imageRes.headers.get("content-type") || "image/jpeg";

    const systemPrompt = `You are a world-class motion designer composing layers for a video timeline editor.

You will be given:
1. A product advertisement background image
2. The text copy to place on top of it

Your job: study the image carefully, identify the negative space and product placement, then design text and accent layers that look stunning overlaid on this image.

LAYOUT BLUEPRINT FOR THIS SCENE:
Product position in image: ${layout?.product_position || "unknown"}
Negative space location: ${layout?.negative_space || "unknown"}
Text should be placed: ${layout?.text_position || "in negative space"}
Composition note: ${layout?.composition_note || ""}

Use this blueprint to guide your layer placement decisions.
The negative space location tells you exactly where to look in the image for clean areas to place text.
The text_position tells you which area of the canvas to target for text layers.

TEXT POSITION MAPPING:
- "top_left" → x between -480 and -100, y between -880 and -300
- "top_center" → x between -400 and 400, y between -880 and -300
- "top_right" → x between 100 and 480, y between -880 and -300
- "bottom_panel" → x between -480 and 480, y between 200 and 880
- "top_and_bottom" → headline at y between -800 and -400, CTA at y between 500 and 800

CANVAS: 1080x1920 pixels (9:16 portrait)
COORDINATE SYSTEM: x:0, y:0 = canvas CENTER
- x:-540 = left edge, x:540 = right edge
- y:-960 = top edge, y:960 = bottom edge
- Layer position x,y is the CENTER of the layer

LAYER TYPES YOU CAN USE:

1. gradient — backgrounds, overlays, accent lines, badge backgrounds, shadow ellipses
{
  "id": "unique_id", "type": "gradient", "trackId": "unique_id",
  "start": ${start}, "end": ${end}, "zIndex": 1,
  "visible": true, "locked": false, "sfx": null,
  "gradient": "#hex | linear-gradient(...) | radial-gradient(...)",
  "transform": { "x": 0, "y": 0, "width": 1080, "height": 1920, "opacity": 1, "rotation": 0, "scale": 1, "blur": 0, "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff" },
  "keyframes": { "x": [], "y": [], "scale": [], "rotation": [], "opacity": [], "blur": [] },
  "animation": { "in": { "type": "fade", "duration": 0.4 }, "out": { "type": "none", "duration": 0.3 } },
  "transition": { "type": "none", "duration": 0.5 }
}

2. image — background scene photo only (objectFit: cover, full canvas)
{
  "id": "unique_id", "type": "image", "trackId": "unique_id",
  "start": ${start}, "end": ${end}, "zIndex": 1,
  "visible": true, "locked": false, "sfx": null,
  "src": "IMAGE_URL", "objectFit": "cover",
  "transform": { "x": 0, "y": 0, "width": 1080, "height": 1920, "opacity": 1, "rotation": 0, "scale": 1, "blur": 0, "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff" },
  "keyframes": { "x": [], "y": [], "scale": [], "rotation": [], "opacity": [], "blur": [] },
  "animation": { "in": { "type": "fade", "duration": 0.5 }, "out": { "type": "none", "duration": 0.3 } },
  "transition": { "type": "fade", "duration": 0.5 }
}

3. text — headlines, subheadlines, body, CTA buttons, labels
Available fonts: Oswald, Bebas Neue, Barlow Condensed, Playfair Display, Outfit, DM Sans
{
  "id": "unique_id", "type": "text", "trackId": "unique_id",
  "start": ${start}, "end": ${end}, "zIndex": 7,
  "visible": true, "locked": false, "sfx": null,
  "content": "TEXT HERE",
  "style": {
    "fontFamily": "Oswald", "fontSize": 108, "fontWeight": 900,
    "color": "#ffffff", "textAlign": "left",
    "lineHeight": 1.05, "letterSpacing": -1,
    "textTransform": "uppercase",
    "background": null, "borderRadius": 0, "padding": 0, "textShadow": null
  },
  "transform": { "x": -200, "y": -600, "width": 700, "height": 160, "opacity": 1, "rotation": 0, "scale": 1, "blur": 0, "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff" },
  "keyframes": { "x": [], "y": [], "scale": [], "rotation": [], "opacity": [], "blur": [] },
  "animation": { "in": { "type": "fade", "duration": 0.4 }, "out": { "type": "none", "duration": 0.3 } },
  "transition": { "type": "none", "duration": 0.5 }
}

ZINDEX ORDER:
1 = background image
2 = overlay gradient
3 = shadow/glow accents
4 = decorative elements
6 = category label / brand name
7 = headline
8 = subheadline
9 = body text / features
10 = CTA button

SCENE FORMAT — YOU MUST FOLLOW THE FORMAT FOR THIS SCENE PURPOSE:

hook:
- Full bleed background image covering entire canvas
- Optional dark/light overlay gradient for contrast (max opacity 0.35)
- TWO headline text layers for two-tone effect: first part in white/light color, second part in accent/brand color — stacked vertically, same font, same size
- One subheadline text layer below the headline
- Category label small text above the headline
- All text placed in the clear negative space you can see in the image
- No feature lists, no CTA button

hero:
- Full bleed background image covering entire canvas
- Study the image: find where the product is vertically. The product typically occupies the middle or upper portion of the image.
- Place a solid color rectangle (gradient layer) as a HORIZONTAL BAND covering the BOTTOM portion of the canvas — from where empty space begins downward to y:960. This is a top-to-bottom split, NOT left-to-right.
- The color panel x:0, width:1080 (full width). Height and y position based on where you see empty space in the image.
- Inside the color panel at the bottom: headline, 3 feature points as separate text layers, optional accent line
- All text x centered or left-aligned within the full width panel
- No CTA button

cta:
- Full bleed background image covering entire canvas
- Optional subtle overlay (max opacity 0.2)
- Brand name small text at top center: y between -800 and -700
- Large centered headline: y between -400 and -200
- Centered subheadline below headline
- Large CTA button centered at bottom: y between 600 and 750
- Nothing placed over the main product area

TWO-TONE HEADLINE RULE (hook scene only):
Split the headline into two parts. Example if headline is "STEP UP YOUR STYLE":
- Layer 1: "STEP UP" in white, fontWeight 900, large size
- Layer 2: "YOUR STYLE" in accent color (from product palette), fontWeight 900, same size, positioned directly below layer 1
- Both layers same x position, y positions consecutive with no gap

GENERAL PLACEMENT RULES:
- Study the image carefully: where is the product? where is empty/dark/light space?
- Place ALL text in negative space — never over the main product focal point
- Left edge of any layer: x - width/2 must be > -480
- Right edge: x + width/2 must be < 480
- Top/bottom: y ± height/2 must stay within -880 to 880
- Dark background = white/light text. Light background = dark (#111-#333) text
- Headline minimum 96px, subheadline minimum 48px, body minimum 40px, CTA minimum 52px

SCENE COPY TO PLACE:
Category label: "${scene.copy?.category_label || ""}"
Headline: "${scene.copy?.headline || ""}"
Subheadline: "${scene.copy?.subheadline || ""}"
Body/features: "${scene.copy?.body || ""}"
CTA: "${scene.copy?.cta || ""}"
Brand: "${scene.copy?.brand || ""}"
Scene purpose: ${scene.purpose}

REQUIRED LAYERS:
1. Background image layer (use this URL: ${imageUrl})
2. Scene-specific layout layers as defined in SCENE FORMAT above
3. Text layers for all non-empty copy fields, following the scene format

Leave keyframes empty — they will be added programmatically.
Return ONLY valid JSON: { "layers": [...] }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 6000,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: scene?.purpose === "cta" ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: `This is a CTA scene. Place the following text on a clean composition. Image URL for background: ${imageUrl}. Design a clean CTA layout.` },
      ] : [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This is scene ${sceneIndex + 1} (${scene.purpose}). Study the image carefully — identify where the product is and where the empty space is. Place the text copy in the negative space only.`,
            },
            { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    });

    console.log(`[scene-to-json] scene ${sceneIndex} raw completion:`, JSON.stringify({
      finish_reason: completion.choices[0].finish_reason,
      content_length: completion.choices[0].message.content?.length,
      content_preview: completion.choices[0].message.content?.slice(0, 300),
      usage: completion.usage,
    }));

    let raw;
    try {
      raw = JSON.parse(completion.choices[0].message.content);
    } catch (parseErr) {
      console.error(`[scene-to-json] JSON parse failed for scene ${sceneIndex}:`, completion.choices[0].message.content?.slice(0, 200));
      raw = null;
    }
    const layers = (raw && Array.isArray(raw.layers)) ? raw.layers : [];

    if (!raw) {
      console.error(`[scene-to-json] GPT returned null for scene ${sceneIndex}`);
    }
    if (layers.length === 0) {
      console.warn(`[scene-to-json] No layers returned for scene ${sceneIndex} (${scene?.purpose})`);
    }

    const timedLayers = layers.map((layer, i) => ({
      ...layer,
      id: layer.id || `s${sceneIndex}_layer_${i}`,
      trackId: layer.trackId || layer.id || `s${sceneIndex}_layer_${i}`,
      start,
      end,
      visible: layer.visible !== false,
      locked: false,
      sfx: null,
    }));

    res.json({ layers: timedLayers });
  } catch (err) {
    console.error("[scene-to-json]", err);
    res.status(500).json({ error: err.message });
  }
});
