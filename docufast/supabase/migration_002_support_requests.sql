-- =====================================================================
-- Run once in Supabase → SQL Editor (safe to re-run).
-- Adds the table behind the Contact / Help forms and the
-- "Request account deletion" button.
-- =====================================================================
create table if not exists public.support_requests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 200),
  email           text not null check (char_length(email) between 3 and 200),
  mobile          text not null check (char_length(mobile) between 1 and 40),
  application_ref text check (application_ref is null or char_length(application_ref) <= 100),
  message         text not null check (char_length(message) between 1 and 2000),
  status          text not null default 'New' check (status in ('New','In progress','Resolved')),
  created_by_id   text default auth.uid()::text,
  created_date    timestamptz not null default now()
);

alter table public.support_requests enable row level security;

-- Anyone (even not logged in) can SEND a request; nobody but an admin can READ them.
drop policy if exists support_insert on public.support_requests;
create policy support_insert on public.support_requests for insert to anon, authenticated
  with check (status = 'New');
drop policy if exists support_admin_read on public.support_requests;
create policy support_admin_read on public.support_requests for select to authenticated
  using (public.is_admin());
drop policy if exists support_admin_update on public.support_requests;
create policy support_admin_update on public.support_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists support_admin_delete on public.support_requests;
create policy support_admin_delete on public.support_requests for delete to authenticated
  using (public.is_admin());
