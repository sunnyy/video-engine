-- plans.sql — public paid plans:
--   Pro     $49/mo  ($490/yr, ≈2 months free)  · 1,500 credits/mo
--   Agency  $99/mo  ($990/yr, ≈2 months free)  · 4,000 credits/mo (everything in Pro, more credits)
-- Free is not a plan row (no checkout). Run once in Supabase. Existing/old plans are deactivated
-- (not deleted) so past subscriptions / FKs stay intact. Safe to re-run (idempotent).

-- 1) Retire all current plans (Starter/Creator/Business/etc.) — keeps history.
update plans set is_active = false;

-- 2) Pro (upsert; no unique-constraint assumption on slug).
update plans set
  name = 'Pro', description = 'Everything included.', credits = 1500,
  price_monthly = 49, price_annual = 490, discount_percent = 17,
  is_active = true, is_popular = true, sort_order = 1, features = null
where slug = 'pro';
insert into plans (name, slug, description, credits, price_monthly, price_annual, discount_percent, is_active, is_popular, sort_order)
select 'Pro', 'pro', 'Everything included.', 1500, 49, 490, 17, true, true, 1
where not exists (select 1 from plans where slug = 'pro');

-- 3) Agency (everything in Pro + more credits).
update plans set
  name = 'Agency', description = 'For agencies & high-volume teams.', credits = 4000,
  price_monthly = 99, price_annual = 990, discount_percent = 17,
  is_active = true, is_popular = false, sort_order = 2, features = null
where slug = 'agency';
insert into plans (name, slug, description, credits, price_monthly, price_annual, discount_percent, is_active, is_popular, sort_order)
select 'Agency', 'agency', 'For agencies & high-volume teams.', 4000, 99, 990, 17, true, false, 2
where not exists (select 1 from plans where slug = 'agency');
