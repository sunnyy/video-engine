-- help.sql — public Help Center / Knowledge Base articles. Run once in Supabase (idempotent).
-- Articles are written admin-side only (service role, via routes/help.js). Published articles are
-- served publicly through the /help API (service role, published-only), so no public RLS policy is
-- needed — RLS stays on with no policies, blocking all direct client access.

create table if not exists help_articles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                -- URL: /help/:slug
  title       text not null,
  category    text not null default 'General',
  excerpt     text,                                -- short summary for the list + SEO/meta
  body        text not null default '',            -- markdown
  status      text not null default 'draft',       -- draft | published
  views       int  not null default 0,
  sort_order  int  not null default 0,             -- lower = higher in its category
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists help_articles_pub_idx on help_articles (status, category, sort_order);

alter table help_articles enable row level security;
