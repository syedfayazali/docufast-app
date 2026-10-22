-- =====================================================================
-- Customer updates (notes with reference numbers) + admin Orders
-- Run once in Supabase -> SQL Editor. Safe to run again.
-- =====================================================================

-- Orders: remembers when you (admin) first opened a paid order, so new ones show a NEW badge.
alter table public.applications add column if not exists admin_seen_at timestamptz;

-- ---------- updates posted by the team on an application -----------------
create table if not exists public.application_updates (
  id             text primary key default gen_random_uuid()::text,
  application_id text not null references public.applications(id) on delete cascade,
  title          text check (title is null or char_length(title) <= 150),
  ref_label      text check (ref_label is null or char_length(ref_label) <= 80),
  ref_number     text check (ref_number is null or char_length(ref_number) <= 120),
  message        text check (message is null or char_length(message) <= 2000),
  link           text check (link is null or (char_length(link) <= 500 and link ~* '^https?://')),
  is_private     boolean not null default false,   -- true = only admins can see it
  status_at_time text,
  seen_at        timestamptz,                      -- set when the customer opens it
  mailed_at      timestamptz,
  created_date   timestamptz not null default now(),
  updated_date   timestamptz not null default now(),
  created_by_id  text default auth.uid()::text,
  created_by     text,
  check (coalesce(title,'') <> '' or coalesce(ref_number,'') <> '' or coalesce(message,'') <> '')
);
create index if not exists application_updates_app_idx on public.application_updates (application_id, created_date desc);

-- admins write; stamp who/what status
create or replace function public.application_updates_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only the team can add updates.';
  end if;
  new.status_at_time := (select status from public.applications where id = new.application_id);
  new.seen_at   := null;
  new.mailed_at := null;
  if auth.uid() is not null then
    new.created_by_id := auth.uid()::text;
    new.created_by    := (select email from auth.users where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists application_updates_bi on public.application_updates;
create trigger application_updates_bi before insert on public.application_updates
  for each row execute function public.application_updates_before_insert();

-- customers may only mark an update as seen; nothing else can change
create or replace function public.application_updates_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new := old;
    new.seen_at := coalesce(old.seen_at, now());
  end if;
  new.updated_date := now();
  return new;
end $$;
drop trigger if exists application_updates_bu on public.application_updates;
create trigger application_updates_bu before update on public.application_updates
  for each row execute function public.application_updates_before_update();

alter table public.application_updates enable row level security;

drop policy if exists upd_select on public.application_updates;
create policy upd_select on public.application_updates for select to authenticated
  using (
    public.is_admin()
    or (not is_private and exists (
         select 1 from public.applications a
          where a.id = application_id and a.created_by_id = auth.uid()::text))
  );
drop policy if exists upd_insert on public.application_updates;
create policy upd_insert on public.application_updates for insert to authenticated
  with check (public.is_admin());
drop policy if exists upd_update on public.application_updates;
create policy upd_update on public.application_updates for update to authenticated
  using (
    public.is_admin()
    or (not is_private and exists (
         select 1 from public.applications a
          where a.id = application_id and a.created_by_id = auth.uid()::text))
  );
drop policy if exists upd_delete on public.application_updates;
create policy upd_delete on public.application_updates for delete to authenticated
  using (public.is_admin());

do $$
begin
  begin alter publication supabase_realtime add table public.application_updates; exception when duplicate_object then null; end;
end $$;
