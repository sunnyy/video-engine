export const VISION_JSON_REFERENCE = {
  "version": "2.0",
  "format": { "fps": 30, "width": 1080, "height": 1920, "duration": 5 },
  "layers": [
    {
      "id": "bg_example",
      "type": "gradient",
      "trackId": "bg_example",
      "start": 0,
      "end": 5,
      "zIndex": 1,
      "visible": true,
      "locked": false,
      "sfx": null,
      "gradient": "linear-gradient(160deg, #1a1410, #2d2018) | radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, transparent 70%) | #hexcolor | rgba(r,g,b,a)",
      "transform": {
        "x": 0, "y": 0,
        "width": 1080, "height": 1920,
        "opacity": 1, "rotation": 0, "scale": 1, "blur": 0,
        "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff"
      },
      "keyframes": { "x": [], "y": [], "scale": [], "rotation": [], "opacity": [], "blur": [] },
      "animation": {
        "in": { "type": "fade | zoom | slide-up | slide-down | slide-left | slide-right | none", "duration": 0.4 },
        "out": { "type": "fade | none", "duration": 0.3 }
      },
      "transition": { "type": "fade | none", "duration": 0.5 }
    },
    {
      "id": "image_example",
      "type": "image",
      "trackId": "image_example",
      "start": 0, "end": 5,
      "zIndex": 5, "visible": true, "locked": false, "sfx": null,
      "src": "IMAGE_URL_HERE",
      "objectFit": "contain | cover",
      "transform": {
        "x": 0, "y": 0, "width": 800, "height": 600,
        "opacity": 1, "rotation": 0, "scale": 1, "blur": 0,
        "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff"
      },
      "keyframes": {
        "x": [],
        "y": [
          { "time": 0, "value": 100, "easing": "ease-in-out" },
          { "time": 2.5, "value": 80, "easing": "ease-in-out" },
          { "time": 5, "value": 100, "easing": "ease-in-out" }
        ],
        "scale": [
          { "time": 0, "value": 1, "easing": "linear" },
          { "time": 5, "value": 1.06, "easing": "linear" }
        ],
        "rotation": [], "opacity": [], "blur": []
      },
      "animation": {
        "in": { "type": "zoom", "duration": 0.6 },
        "out": { "type": "none", "duration": 0.3 }
      },
      "transition": { "type": "fade", "duration": 0.5 }
    },
    {
      "id": "text_headline_example",
      "type": "text",
      "trackId": "text_headline_example",
      "start": 0, "end": 5,
      "zIndex": 7, "visible": true, "locked": false, "sfx": null,
      "content": "YOUR HEADLINE TEXT HERE",
      "style": {
        "fontFamily": "Oswald | Bebas Neue | Barlow Condensed | Playfair Display | Outfit | DM Sans",
        "fontSize": 108,
        "fontWeight": "900 | 800 | 700 | 600 | 500 | 400",
        "color": "#ffffff",
        "textAlign": "left | center | right",
        "lineHeight": 1.05,
        "letterSpacing": -1,
        "textTransform": "uppercase | none",
        "background": "null | #hexcolor | rgba(r,g,b,a)",
        "borderRadius": 0,
        "padding": "0 | 12 | 16 | 20",
        "textShadow": null,
        "opacity": 1
      },
      "transform": {
        "x": -300, "y": -600, "width": 700, "height": 160,
        "opacity": 1, "rotation": 0, "scale": 1, "blur": 0,
        "borderRadius": 0, "borderWidth": 0, "borderColor": "#ffffff"
      },
      "keyframes": {
        "x": [],
        "y": [
          { "time": 0, "value": -580, "easing": "ease-out" },
          { "time": 0.5, "value": -600, "easing": "ease-out" }
        ],
        "scale": [], "rotation": [],
        "opacity": [
          { "time": 0, "value": 0, "easing": "ease-out" },
          { "time": 0.5, "value": 1, "easing": "ease-out" }
        ],
        "blur": []
      },
      "animation": {
        "in": { "type": "fade", "duration": 0.4 },
        "out": { "type": "fade", "duration": 0.3 }
      },
      "transition": { "type": "none", "duration": 0.5 }
    },
    {
      "id": "audio_example",
      "type": "audio",
      "trackId": "audio_example",
      "start": 0, "end": 5,
      "zIndex": 0, "visible": true, "locked": false, "sfx": null,
      "audioType": "music | voiceover",
      "src": "AUDIO_URL_HERE",
      "name": "Track name",
      "volume": 0.4,
      "fadeIn": 1.5,
      "fadeOut": 2,
      "transform": null,
      "animation": null,
      "transition": null,
      "keyframes": null
    }
  ]
};
