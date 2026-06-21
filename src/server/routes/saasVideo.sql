-- Run this in the Supabase dashboard SQL editor

CREATE TABLE IF NOT EXISTS promo_videos (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text          NOT NULL DEFAULT 'draft',
  video_goal          text,
  product_name        text,
  product_url         text,
  product_description text,
  target_platform     text,
  language            text          DEFAULT 'en',
  tone                text,
  target_audience     text,
  duration_seconds    integer,
  has_script          boolean       DEFAULT false,
  has_talking_head    boolean       DEFAULT false,
  has_screenshots     boolean       DEFAULT false,
  has_recordings      boolean       DEFAULT false,
  has_logo            boolean       DEFAULT false,
  has_voiceover       boolean       DEFAULT false,
  style               jsonb         DEFAULT '{}',
  scenes              jsonb         DEFAULT '[]',
  scene_format        text          DEFAULT NULL,
  asset_manifest      jsonb         DEFAULT '{}',
  credits_estimated   integer       DEFAULT 10,
  credits_charged     integer       DEFAULT 0,
  approved_at         timestamptz,
  created_at          timestamptz   DEFAULT now(),
  updated_at          timestamptz   DEFAULT now()
);

-- Data API grants — REQUIRED for any table created from Oct 30, 2026 onward.
-- Without these, PostgREST/supabase-js returns 42501 even when RLS policies exist
-- (RLS only filters rows after the role already has table-level access).
-- promo_videos is per-user/private, so anon (logged-out) gets nothing.
GRANT SELECT, INSERT, UPDATE, DELETE ON promo_videos TO authenticated;
GRANT ALL                          ON promo_videos TO service_role;

-- Enable Row Level Security
ALTER TABLE promo_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can select own promo videos"
  ON promo_videos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own promo videos"
  ON promo_videos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own promo videos"
  ON promo_videos FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own promo videos"
  ON promo_videos FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_videos_user_id ON promo_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_videos_status  ON promo_videos(status);
