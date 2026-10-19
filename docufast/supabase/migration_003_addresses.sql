-- Saved addresses (run once in Supabase -> SQL Editor). Safe to run again.
create table if not exists public.addresses (
  id            text primary key default gen_random_uuid()::text,
  label         text not null default 'Home',
  line          text not null,
  landmark      text,
  city          text,
  district      text,
  state         text,
  pin           text,
  lat           double precision,
  lng           double precision,
  is_default    boolean not null default false,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by_id text not null default auth.uid()::text,
  created_by    text
);
create index if not exists addresses_owner_idx on public.addresses (created_by_id, created_date desc);

drop trigger if exists addresses_touch on public.addresses;
create trigger addresses_touch before update on public.addresses
  for each row execute function public.touch_updated_date();

alter table public.addresses enable row level security;
drop policy if exists addresses_owner on public.addresses;
create policy addresses_owner on public.addresses for all to authenticated
  using (created_by_id = auth.uid()::text)
  with check (created_by_id = auth.uid()::text);
