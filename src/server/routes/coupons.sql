-- coupons.sql — promo/discount codes for plan checkout. Run once in Supabase (idempotent).
-- Coupons + redemptions are written server-side only (service role, via routes/coupons.js + payments.js).
-- Validation is fully server-authoritative; there are no public RLS policies (the validate endpoint
-- uses the service role), so reads/writes only happen through the API.

create table if not exists coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,               -- stored uppercase; matched case-insensitively
  discount_type   text not null default 'percent',    -- percent | fixed   (fixed = USD off)
  discount_value  numeric not null,                   -- percent 1..100, or USD amount for fixed
  active          boolean not null default true,
  expires_at      timestamptz,                        -- null = no expiry
  max_redemptions int,                                -- null = unlimited
  redeemed_count  int not null default 0,
  per_user_once   boolean not null default true,      -- a user can only redeem this code once
  description     text,                               -- internal note (e.g. "Launch week")
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists coupon_redemptions (
  id                     uuid primary key default gen_random_uuid(),
  coupon_id              uuid not null references coupons(id) on delete cascade,
  user_id                uuid not null,
  payment_id             text,                         -- razorpay_payment_id (idempotency)
  plan_slug              text,
  billing_cycle          text,
  amount_discounted_usd  numeric,
  created_at             timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_idx on coupon_redemptions (coupon_id);
create index if not exists coupon_redemptions_user_idx   on coupon_redemptions (coupon_id, user_id);
-- Guard against double-recording the same payment.
create unique index if not exists coupon_redemptions_payment_idx on coupon_redemptions (payment_id) where payment_id is not null;

alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
