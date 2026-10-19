-- Application flow update (run once in Supabase -> SQL Editor). Safe to run again.
-- 1) New applications start as 'Draft' (shown to the customer as "Awaiting payment")
--    and only become 'Under Review' when payment is confirmed.
-- 2) A customer may discard their own UNPAID draft (and its untouched pending payment).

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

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications for delete to authenticated
  using (public.is_admin() or (created_by_id = auth.uid()::text and status = 'Draft'));

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete to authenticated
  using (public.is_admin() or (created_by_id = auth.uid()::text and status = 'Pending'
         and razorpay_order_id is null and utr is null and payment_proof_uri is null));

-- Old unpaid "Submitted" rows from before this change: show them as awaiting payment.
update public.applications a set status = 'Draft'
where a.status = 'Submitted'
  and not exists (select 1 from public.payments p where p.application_id = a.id and p.status = 'Paid');
