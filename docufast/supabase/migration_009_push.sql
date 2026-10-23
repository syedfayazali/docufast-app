-- =====================================================================
-- Phone notifications (web push). Run once in Supabase -> SQL Editor. Safe to run again.
-- =====================================================================
create table if not exists public.push_subscriptions (
  id            text primary key default gen_random_uuid()::text,
  user_id       text not null,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- The server (service key) writes rows. Customers can only see and remove their own phones.
drop policy if exists push_select_own on public.push_subscriptions;
create policy push_select_own on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid()::text);
drop policy if exists push_delete_own on public.push_subscriptions;
create policy push_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid()::text);
