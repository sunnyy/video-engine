-- Render-reuse cache: fingerprint each render with a content hash of its timeline + resolution.
-- When the user exports a video and then publishes it without editing, the publish flow finds the
-- matching done render by (project_id, project_hash) and reuses that MP4 instead of rendering again.
-- Nullable + best-effort: old rows have no hash (won't match, just render fresh), and the app sets
-- it in a separate update so a deploy before this migration can't fail the render record.

alter table public.renders add column if not exists project_hash text;

create index if not exists renders_project_hash_idx on public.renders (project_id, project_hash);
