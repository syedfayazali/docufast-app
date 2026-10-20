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
