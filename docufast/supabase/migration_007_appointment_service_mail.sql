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
