-- Style-aware AI image reuse — run in the Supabase SQL editor.
-- Adds a style_id column so a reused library image matches the video's visual
-- style (a corporate video never pulls a retro image, etc.). Existing rows get
-- NULL style_id and simply won't match styled lookups — they age out naturally.

ALTER TABLE public.ai_image_library ADD COLUMN IF NOT EXISTS style_id text;

-- Optional: speed up the reuse lookup (niche + visual_type + orientation + style).
CREATE INDEX IF NOT EXISTS idx_ai_image_library_match
  ON public.ai_image_library (niche, visual_type, orientation, style_id);
