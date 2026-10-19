-- =====================================================================
-- DocuFast India – Supabase schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (idempotent).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- helpers ---------------------------------------------------
create or replace function public.touch_updated_date() returns trigger
language plpgsql as $$
begin
  new.updated_date := now();
  return new;
end $$;

-- ---------- profiles (replaces Base44 "User") --------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  role         text not null default 'user' check (role in ('admin','user')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- is_admin() is SECURITY DEFINER so policies can call it without recursion.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Auto-create a profile whenever someone signs up (email or Google).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Back-fill profiles for users who already exist.
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')
from auth.users on conflict (id) do nothing;

-- Nobody can change their own role from the browser.
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------- categories -------------------------------------------------
create table if not exists public.categories (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  icon          text,
  display_order numeric default 0,
  active        boolean default true,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by_id text default auth.uid()::text,
  created_by    text
);

-- ---------- services ---------------------------------------------------
create table if not exists public.services (
  id                   text primary key default gen_random_uuid()::text,
  name                 text not null,
  category             text not null,
  short_description    text not null,
  description          text,
  icon                 text,
  government_fee       numeric default 0,
  service_charge       numeric default 0,
  other_charges        numeric default 0,
  processing_info      text,
  appointment_required boolean default false,
  active               boolean default true,
  display_order        numeric default 0,
  requirements         jsonb default '[]'::jsonb,
  eligibility          text,
  created_date         timestamptz not null default now(),
  updated_date         timestamptz not null default now(),
  created_by_id        text default auth.uid()::text,
  created_by           text
);

-- ---------- banners ----------------------------------------------------
create table if not exists public.banners (
  id            text primary key default gen_random_uuid()::text,
  title         text not null,
  subtitle      text,
  image_url     text,
  cta_label     text,
  cta_link      text,
  bg_color      text default '#0A1D4D',
  active        boolean default true,
  display_order numeric default 0,
  created_date  timestamptz not null default now(),
  updated_date  timestamptz not null default now(),
  created_by_id text default auth.uid()::text,
  created_by    text
);

-- ---------- applications ----------------------------------------------
create table if not exists public.applications (
  id                   text primary key default gen_random_uuid()::text,
  reference            text not null unique,
  service_id           text,
  service_name         text not null,
  category             text,
  customer_name        text not null,
  customer_mobile      text,
  customer_email       text,
  status               text not null default 'Submitted'
    check (status in ('Draft','Submitted','Under Review','Action Required','Approved','Completed','Rejected','Cancelled')),
  form_data            jsonb default '{}'::jsonb,
  documents            jsonb default '[]'::jsonb,
  government_fee       numeric default 0,
  service_charge       numeric default 0,
  other_charges        numeric default 0,
  total                numeric default 0,
  appointment_required boolean default false,
  appointment_date     text,
  notes                text,
  created_date         timestamptz not null default now(),
  updated_date         timestamptz not null default now(),
  created_by_id        text default auth.uid()::text,
  created_by           text
);
create index if not exists applications_owner_idx on public.applications (created_by_id, created_date desc);

-- ---------- payments ---------------------------------------------------
create table if not exists public.payments (
  id                   text primary key default gen_random_uuid()::text,
  reference            text not null,
  application_id       text unique,
  application_ref      text not null,
  customer_name        text not null,
  customer_email       text,
  service_name         text,
  government_fee       numeric default 0,
  service_charge       numeric default 0,
  other_charges        numeric default 0,
  total                numeric not null default 0,
  status               text not null default 'Pending' check (status in ('Pending','Paid','Failed','Refunded')),
  utr                  text,
  payment_proof_uri    text,
  -- online gateway (Cashfree; columns keep their old razorpay_* names)
  razorpay_order_id    text,
  razorpay_payment_id  text,
  payment_method       text,            -- 'cashfree' | 'upi_manual'
  paid_at              timestamptz,
  created_date         timestamptz not null default now(),
  updated_date         timestamptz not null default now(),
  created_by_id        text default auth.uid()::text,
  created_by           text
);
create index if not exists payments_owner_idx on public.payments (created_by_id, created_date desc);
create index if not exists payments_order_idx on public.payments (razorpay_order_id);

-- updated_date triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','services','banners','applications','payments'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_date()', t, t);
  end loop;
end $$;

-- =====================================================================
-- ANTI-TAMPER TRIGGERS  (the browser can never be trusted with money)
-- =====================================================================

-- New application: price is ALWAYS copied from the service table, status forced.
create or replace function public.applications_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.services%rowtype;
begin
  select * into s from public.services where id = new.service_id and coalesce(active, true);
  if not found then
    raise exception 'Unknown or inactive service';
  end if;
  new.service_name         := s.name;
  new.category             := s.category;
  new.government_fee       := coalesce(s.government_fee, 0);
  new.service_charge       := coalesce(s.service_charge, 0);
  new.other_charges        := coalesce(s.other_charges, 0);
  new.total                := new.government_fee + new.service_charge + new.other_charges;
  new.appointment_required := coalesce(s.appointment_required, false);
  new.status               := 'Draft';   -- becomes 'Under Review' once payment is confirmed
  if auth.uid() is not null then
    new.created_by_id := auth.uid()::text;
    new.created_by    := (select email from auth.users where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists applications_bi on public.applications;
create trigger applications_bi before insert on public.applications
  for each row execute function public.applications_before_insert();

-- New payment: copied from the customer's own application, always Pending.
create or replace function public.payments_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.applications%rowtype;
begin
  select * into a from public.applications where id = new.application_id;
  if not found then
    raise exception 'Application not found';
  end if;
  if auth.uid() is not null and a.created_by_id is distinct from auth.uid()::text and not public.is_admin() then
    raise exception 'Not your application';
  end if;
  new.application_ref := a.reference;
  new.customer_name   := a.customer_name;
  new.customer_email  := a.customer_email;
  new.service_name    := a.service_name;
  new.government_fee  := a.government_fee;
  new.service_charge  := a.service_charge;
  new.other_charges   := a.other_charges;
  new.total           := a.total;
  new.status          := 'Pending';
  new.razorpay_order_id := null;
  new.razorpay_payment_id := null;
  new.paid_at := null;
  if auth.uid() is not null then
    new.created_by_id := auth.uid()::text;
    new.created_by    := (select email from auth.users where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists payments_bi on public.payments;
create trigger payments_bi before insert on public.payments
  for each row execute function public.payments_before_insert();

-- Customers may only attach UTR + screenshot to their own still-pending payment.
-- (Admins and the server's service-role key may change anything.)
create or replace function public.payments_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if old.status <> 'Pending' then
      raise exception 'This payment can no longer be changed';
    end if;
    -- keep only utr + proof; force every other column back to its old value
    new.reference           := old.reference;
    new.application_id      := old.application_id;
    new.application_ref     := old.application_ref;
    new.customer_name       := old.customer_name;
    new.customer_email      := old.customer_email;
    new.service_name        := old.service_name;
    new.government_fee      := old.government_fee;
    new.service_charge      := old.service_charge;
    new.other_charges       := old.other_charges;
    new.total               := old.total;
    new.status              := old.status;
    new.razorpay_order_id   := old.razorpay_order_id;
    new.razorpay_payment_id := old.razorpay_payment_id;
    new.paid_at             := old.paid_at;
    new.created_by_id       := old.created_by_id;
    new.created_by          := old.created_by;
    new.created_date        := old.created_date;
    new.payment_method      := case when new.payment_proof_uri is not null then 'upi_manual' else old.payment_method end;
  end if;
  return new;
end $$;
drop trigger if exists payments_bu on public.payments;
create trigger payments_bu before update on public.payments
  for each row execute function public.payments_before_update();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.services     enable row level security;
alter table public.banners      enable row level security;
alter table public.applications enable row level security;
alter table public.payments     enable row level security;

-- profiles: read own (admin reads all). Updates go through the protect trigger.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin());

-- catalogue tables: public read, admin write
do $$
declare t text;
begin
  foreach t in array array['categories','services','banners'] loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format('create policy %I_admin_write on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- applications
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select to authenticated
  using (created_by_id = auth.uid()::text or public.is_admin());
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
  with check (true);                       -- trigger stamps owner + price
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated
  using (public.is_admin() or (created_by_id = auth.uid()::text and status = 'Draft'));

-- payments
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (created_by_id = auth.uid()::text or public.is_admin());
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (true);                       -- trigger validates ownership + amount
drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated
  using (created_by_id = auth.uid()::text or public.is_admin());
drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete to authenticated
  using (public.is_admin() or (created_by_id = auth.uid()::text and status = 'Pending'
         and razorpay_order_id is null and utr is null and payment_proof_uri is null));

-- =====================================================================
-- REALTIME (live status updates on the customer's screen)
-- =====================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.applications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.payments;     exception when duplicate_object then null; end;
end $$;

-- =====================================================================
-- STORAGE
--   public-assets : banner images (anyone can view, only admin uploads)
--   private-files : customer documents + payment screenshots
--                   (owner + admin only; files live in <user-id>/...)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-assets', 'public-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-files', 'private-files', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public-assets read" on storage.objects;
create policy "public-assets read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-assets');
drop policy if exists "public-assets admin write" on storage.objects;
create policy "public-assets admin write" on storage.objects for all to authenticated
  using (bucket_id = 'public-assets' and public.is_admin())
  with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "private-files upload own" on storage.objects;
create policy "private-files upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'private-files' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "private-files read own or admin" on storage.objects;
create policy "private-files read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'private-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "private-files admin delete" on storage.objects;
create policy "private-files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'private-files' and public.is_admin());

-- ---------- support requests (contact form) ----------
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

-- =====================================================================
-- MAKE YOURSELF ADMIN  (run AFTER you have registered on the website)
--   update public.profiles set role = 'admin' where email = 'hayylogic@gmail.com';
-- =====================================================================

-- ---------- saved addresses --------------------------------------------
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
