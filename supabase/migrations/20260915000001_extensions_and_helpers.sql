-- ═══════════════════════════════════════════════════════════════════════════
-- 01 · Extensions and shared helpers
--
-- Same shape as LogiFlow's migration 01: pgcrypto for gen_random_uuid/bytes,
-- pg_trgm for future fuzzy party search (duplicate detection — see the PRD),
-- fy_code() for the Indian financial year used in gapless document numbering,
-- and set_updated_at() for the updated_at trigger every table below uses.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────────────────────────────────────────────────────────
-- Indian financial year code: 1 April – 31 March, rendered as 4 digits.
--   2026-09-15 → '2627'      (FY 2026-27)
--   2027-02-10 → '2627'      (still FY 2026-27; Feb is before April)
-- IMMUTABLE (extract() arithmetic, not to_char()) so it can be used in an
-- index or a generated column later without a STABLE-function restriction.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.fy_code(p_date date)
returns text
language sql
immutable
parallel safe
as $$
  select lpad(
           (((extract(year from p_date)::int - case when extract(month from p_date) < 4 then 1 else 0 end)) % 100)::text,
           2, '0'
         ) || lpad(
           (((extract(year from p_date)::int - case when extract(month from p_date) < 4 then 1 else 0 end) + 1) % 100)::text,
           2, '0'
         )
$$;

comment on function public.fy_code(date) is
  'Indian financial year as 4 digits, e.g. 2627 for FY 2026-27 (1 April – 31 March).';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop function if exists public.set_updated_at();
-- drop function if exists public.fy_code(date);
