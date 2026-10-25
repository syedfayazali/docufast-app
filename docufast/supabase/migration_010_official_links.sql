-- Official source links + service-fee-only pricing (run once in Supabase -> SQL Editor). Safe to run again.
--
-- 1) Every service can carry the link of the official website for that service.
-- 2) Customers now pay ONLY our service charge (+ other charges). The official/government fee
--    is shown for information ("pay it directly to the department") and is NOT collected by us.

alter table public.services add column if not exists official_url text;

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
  new.government_fee       := coalesce(s.government_fee, 0);   -- information only, paid by the customer to the department
  new.service_charge       := coalesce(s.service_charge, 0);
  new.other_charges        := coalesce(s.other_charges, 0);
  new.total                := new.service_charge + new.other_charges;   -- what we collect
  new.appointment_required := coalesce(s.appointment_required, false);
  new.status               := 'Draft';
  if auth.uid() is not null then
    new.created_by_id := auth.uid()::text;
    new.created_by    := (select email from auth.users where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists applications_bi on public.applications;
create trigger applications_bi before insert on public.applications
  for each row execute function public.applications_before_insert();

-- Unpaid drafts created before this change: charge only our fee from now on.
update public.applications set total = coalesce(service_charge,0) + coalesce(other_charges,0)
 where status = 'Draft';
update public.payments p set total = coalesce(p.service_charge,0) + coalesce(p.other_charges,0)
 where p.status = 'Pending' and p.razorpay_order_id is null;
