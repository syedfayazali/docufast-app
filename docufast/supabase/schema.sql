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

-- ---------- profiles (one row per login) --------------------------
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
  -- online gateway (Razorpay)
  razorpay_order_id    text,
  razorpay_payment_id  text,
  payment_method       text,            -- 'razorpay' | 'upi_manual'
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


-- ===== appointments (migration 006) =====
-- =====================================================================
-- Appointment booking (run once in Supabase -> SQL Editor). Safe to run again.
--
-- Customers pick a free time slot; you set working days, hours and slot
-- length. The database itself refuses double-booking, closed days,
-- holidays, lunch time and past times, so the rules cannot be bypassed
-- from the browser. All times are India time (Asia/Kolkata).
-- =====================================================================

-- ---------- settings (one row) -----------------------------------------
create table if not exists public.appointment_settings (
  id                      text primary key default 'main' check (id = 'main'),
  active                  boolean not null default true,
  open_days               int[]   not null default '{1,2,3,4,5,6}',   -- 0 = Sunday ... 6 = Saturday
  open_time               time    not null default '10:00',
  close_time              time    not null default '18:00',
  slot_minutes            int     not null default 30  check (slot_minutes between 10 and 240),
  capacity                int     not null default 1   check (capacity between 1 and 50),  -- people per slot
  lunch_start             time    default '13:00',
  lunch_end               time    default '14:00',
  advance_days            int     not null default 14  check (advance_days between 1 and 90),
  min_notice_hours        int     not null default 2   check (min_notice_hours between 0 and 168),
  cancel_before_hours     int     not null default 2   check (cancel_before_hours between 0 and 168),
  max_active_per_customer int     not null default 3   check (max_active_per_customer between 1 and 20),
  holidays                text[]  not null default '{}',               -- dates as YYYY-MM-DD
  location                text,
  note                    text,
  updated_date            timestamptz not null default now(),
  check (close_time > open_time)
);
insert into public.appointment_settings (id) values ('main') on conflict (id) do nothing;

drop trigger if exists appointment_settings_touch on public.appointment_settings;
create trigger appointment_settings_touch before update on public.appointment_settings
  for each row execute function public.touch_updated_date();

-- ---------- appointments -----------------------------------------------
create table if not exists public.appointments (
  id              text primary key default gen_random_uuid()::text,
  reference       text not null unique,
  kind            text not null default 'Office visit' check (kind in ('Office visit','Phone callback')),
  customer_name   text not null check (char_length(customer_name) between 1 and 200),
  customer_mobile text not null check (char_length(customer_mobile) between 5 and 20),
  customer_email  text,
  application_id  text,
  service_id      text,
  service_name    text,
  purpose         text check (purpose is null or char_length(purpose) <= 500),
  slot_start      timestamptz not null,
  slot_end        timestamptz not null,
  status          text not null default 'Booked' check (status in ('Booked','Completed','Cancelled','No Show')),
  cancelled_by    text,
  admin_note      text,
  created_date    timestamptz not null default now(),
  updated_date    timestamptz not null default now(),
  created_by_id   text default auth.uid()::text,
  created_by      text
);
create index if not exists appointments_owner_idx on public.appointments (created_by_id, slot_start desc);
create index if not exists appointments_slot_idx  on public.appointments (slot_start) where status = 'Booked';

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_date();

-- ---------- the rules (shared by booking and rescheduling) -------------
create or replace function public.appointment_check_slot(p_start timestamptz, p_exclude text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  s     public.appointment_settings%rowtype;
  loc   timestamp;
  d     date;
  today date;
  tm    int;   -- minutes since midnight of the slot start
  om    int;   -- opening, closing, lunch (same unit)
  cm    int;
  lsm   int;
  lem   int;
  taken int;
begin
  select * into s from public.appointment_settings where id = 'main';
  if not found or not s.active then
    raise exception 'Appointment booking is currently closed.';
  end if;

  loc   := p_start at time zone 'Asia/Kolkata';
  d     := loc::date;
  today := (now() at time zone 'Asia/Kolkata')::date;

  if date_trunc('minute', loc) <> loc then
    raise exception 'Please choose one of the listed time slots.';
  end if;

  tm  := extract(hour from loc)::int * 60 + extract(minute from loc)::int;
  om  := extract(hour from s.open_time)::int  * 60 + extract(minute from s.open_time)::int;
  cm  := extract(hour from s.close_time)::int * 60 + extract(minute from s.close_time)::int;

  if not (extract(dow from d)::int = any (s.open_days)) then
    raise exception 'We are closed on that day. Please choose another date.';
  end if;
  if d::text = any (s.holidays) then
    raise exception 'We are closed on that date. Please choose another date.';
  end if;
  if tm < om or tm + s.slot_minutes > cm or mod(tm - om, s.slot_minutes) <> 0 then
    raise exception 'Please choose one of the listed time slots.';
  end if;
  if s.lunch_start is not null and s.lunch_end is not null then
    lsm := extract(hour from s.lunch_start)::int * 60 + extract(minute from s.lunch_start)::int;
    lem := extract(hour from s.lunch_end)::int   * 60 + extract(minute from s.lunch_end)::int;
    if tm < lem and tm + s.slot_minutes > lsm then
      raise exception 'We are closed for lunch at that time. Please choose another slot.';
    end if;
  end if;
  if p_start < now() + make_interval(hours => s.min_notice_hours) then
    raise exception 'That time is too soon. Please choose a later slot.';
  end if;
  if d > today + s.advance_days then
    raise exception 'You can book up to % days ahead.', s.advance_days;
  end if;

  -- Two people clicking the same slot at once: only one gets through.
  perform pg_advisory_xact_lock(hashtextextended(p_start::text, 42));
  select count(*) into taken from public.appointments
   where slot_start = p_start and status = 'Booked' and (p_exclude is null or id <> p_exclude);
  if taken >= s.capacity then
    raise exception 'That time slot has just been booked. Please choose another.';
  end if;
end $$;

-- ---------- insert: customers can only book for themselves -------------
create or replace function public.appointments_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s      public.appointment_settings%rowtype;
  a      public.applications%rowtype;
  active int;
begin
  select * into s from public.appointment_settings where id = 'main';

  if auth.uid() is not null and not public.is_admin() then
    perform public.appointment_check_slot(new.slot_start);

    select count(*) into active from public.appointments
     where created_by_id = auth.uid()::text and status = 'Booked' and slot_start > now();
    if active >= coalesce(s.max_active_per_customer, 3) then
      raise exception 'You already have % upcoming appointments. Please cancel one or wait until it is done.',
        coalesce(s.max_active_per_customer, 3);
    end if;

    new.created_by_id := auth.uid()::text;
    new.created_by    := (select email from auth.users where id = auth.uid());
    new.status        := 'Booked';
  end if;

  new.slot_end     := new.slot_start + make_interval(mins => coalesce(s.slot_minutes, 30));
  new.cancelled_by := null;
  new.reference    := 'APT-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
                      upper(substr(md5(gen_random_uuid()::text), 1, 6));

  if new.application_id is not null then
    select * into a from public.applications where id = new.application_id;
    if not found or a.created_by_id is distinct from new.created_by_id then
      raise exception 'Application not found.';
    end if;
    new.service_id   := a.service_id;
    new.service_name := a.service_name;
  end if;
  return new;
end $$;
drop trigger if exists appointments_bi on public.appointments;
create trigger appointments_bi before insert on public.appointments
  for each row execute function public.appointments_before_insert();

-- ---------- update: customers may only cancel or reschedule ------------
create or replace function public.appointments_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s        public.appointment_settings%rowtype;
  new_slot timestamptz := new.slot_start;
  new_stat text        := new.status;
begin
  select * into s from public.appointment_settings where id = 'main';

  if auth.uid() is not null and not public.is_admin() then
    if old.status <> 'Booked' then
      raise exception 'This appointment can no longer be changed.';
    end if;
    if old.slot_start < now() + make_interval(hours => coalesce(s.cancel_before_hours, 2)) then
      raise exception 'It is too close to the appointment time to change it online. Please call us.';
    end if;

    -- everything except the slot and the status is frozen
    new := old;
    if new_stat = 'Cancelled' then
      new.status       := 'Cancelled';
      new.cancelled_by := 'customer';
    elsif new_slot <> old.slot_start then
      perform public.appointment_check_slot(new_slot, old.id);
      new.slot_start := new_slot;
      new.slot_end   := new_slot + make_interval(mins => coalesce(s.slot_minutes, 30));
    end if;
  else
    -- admin / server: may change status, notes, even the slot
    if new.slot_start <> old.slot_start then
      new.slot_end := new.slot_start + make_interval(mins => coalesce(s.slot_minutes, 30));
    end if;
    if new.status = 'Cancelled' and old.status <> 'Cancelled' and new.cancelled_by is null then
      new.cancelled_by := 'admin';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists appointments_bu on public.appointments;
create trigger appointments_bu before update on public.appointments
  for each row execute function public.appointments_before_update();

-- ---------- which slots are taken? (counts only, no personal data) -----
create or replace function public.appointment_slot_counts(p_from timestamptz, p_to timestamptz)
returns table (slot_start timestamptz, booked bigint)
language sql stable security definer set search_path = public as $$
  select a.slot_start, count(*)::bigint
    from public.appointments a
   where a.status = 'Booked'
     and a.slot_start >= p_from
     and a.slot_start <  least(p_to, p_from + interval '100 days')
   group by a.slot_start;
$$;
revoke all on function public.appointment_slot_counts(timestamptz, timestamptz) from public;
grant execute on function public.appointment_slot_counts(timestamptz, timestamptz) to anon, authenticated;

-- ---------- row level security -----------------------------------------
alter table public.appointment_settings enable row level security;
alter table public.appointments         enable row level security;

drop policy if exists appt_settings_read on public.appointment_settings;
create policy appt_settings_read on public.appointment_settings for select to anon, authenticated using (true);
drop policy if exists appt_settings_admin on public.appointment_settings;
create policy appt_settings_admin on public.appointment_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated
  using (created_by_id = auth.uid()::text or public.is_admin());
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated
  with check (true);                                   -- trigger validates everything
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
  using (created_by_id = auth.uid()::text or public.is_admin());
drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments for delete to authenticated
  using (public.is_admin());

-- ---------- live updates -----------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.appointments; exception when duplicate_object then null; end;
end $$;


-- ===== appointments part 2 (migration 007) =====
-- =====================================================================
-- Appointments, part 2 (run once in Supabase -> SQL Editor; safe to re-run)
--  * customers can pick ANY service for an appointment
--  * remembers which e-mail was already sent (so nobody gets duplicates)
-- =====================================================================
alter table public.appointments add column if not exists last_mailed text;

create or replace function public.appointments_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s      public.appointment_settings%rowtype;
  a      public.applications%rowtype;
  sv     public.services%rowtype;
  active int;
begin
  select * into s from public.appointment_settings where id = 'main';

  if auth.uid() is not null and not public.is_admin() then
    perform public.appointment_check_slot(new.slot_start);

    select count(*) into active from public.appointments
     where created_by_id = auth.uid()::text and status = 'Booked' and slot_start > now();
    if active >= coalesce(s.max_active_per_customer, 3) then
      raise exception 'You already have % upcoming appointments. Please cancel one or wait until it is done.',
        coalesce(s.max_active_per_customer, 3);
    end if;

    new.created_by_id := auth.uid()::text;
    new.created_by    := (select email from auth.users where id = auth.uid());
    new.status        := 'Booked';
    new.last_mailed   := null;
  end if;

  new.slot_end     := new.slot_start + make_interval(mins => coalesce(s.slot_minutes, 30));
  new.cancelled_by := null;
  new.reference    := 'APT-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' ||
                      upper(substr(md5(gen_random_uuid()::text), 1, 6));

  if new.application_id is not null then
    select * into a from public.applications where id = new.application_id;
    if not found or a.created_by_id is distinct from new.created_by_id then
      raise exception 'Application not found.';
    end if;
    new.service_id   := a.service_id;
    new.service_name := a.service_name;
  elsif new.service_id is not null then
    select * into sv from public.services x where x.id = new.service_id and x.active is not false;
    if not found then
      raise exception 'Please choose a valid service.';
    end if;
    new.service_name := sv.name;
  else
    new.service_id   := null;
    new.service_name := null;
  end if;
  return new;
end $$;

-- keep the "already e-mailed" marker out of customers' hands
create or replace function public.appointments_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s        public.appointment_settings%rowtype;
  new_slot timestamptz := new.slot_start;
  new_stat text        := new.status;
begin
  select * into s from public.appointment_settings where id = 'main';

  if auth.uid() is not null and not public.is_admin() then
    if old.status <> 'Booked' then
      raise exception 'This appointment can no longer be changed.';
    end if;
    if old.slot_start < now() + make_interval(hours => coalesce(s.cancel_before_hours, 2)) then
      raise exception 'It is too close to the appointment time to change it online. Please call us.';
    end if;

    new := old;
    if new_stat = 'Cancelled' then
      new.status       := 'Cancelled';
      new.cancelled_by := 'customer';
    elsif new_slot <> old.slot_start then
      perform public.appointment_check_slot(new_slot, old.id);
      new.slot_start := new_slot;
      new.slot_end   := new_slot + make_interval(mins => coalesce(s.slot_minutes, 30));
    end if;
  else
    if new.slot_start <> old.slot_start then
      new.slot_end := new.slot_start + make_interval(mins => coalesce(s.slot_minutes, 30));
    end if;
    if new.status = 'Cancelled' and old.status <> 'Cancelled' and new.cancelled_by is null then
      new.cancelled_by := 'admin';
    end if;
  end if;
  return new;
end $$;


-- ===== customer updates + orders (migration 008) =====
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


-- ===== phone notifications (migration 009) =====
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
