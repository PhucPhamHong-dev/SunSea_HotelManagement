-- Confirmed advance reservations are held through noon on the following
-- business day. The backend worker invokes this function with service_role;
-- it never creates a refund or changes existing deposit payments.

create index if not exists reservations_confirmed_planned_check_in_idx
  on public.reservations (planned_check_in_at)
  where status = 'confirmed';

create or replace function public.mark_overdue_confirmed_reservations()
returns table (reservation_id uuid, room_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_reservation public.reservations;
  updated_reservation public.reservations;
begin
  for current_reservation in
    select *
    from public.reservations
    where status = 'confirmed'
      and now() >= (
        (((planned_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date + 1) + time '12:00')
        at time zone 'Asia/Ho_Chi_Minh'
      )
    order by planned_check_in_at asc
    for update skip locked
  loop
    update public.reservations
    set status = 'no_show',
        no_show_at = now(),
        no_show_by = null,
        updated_by = null,
        version = version + 1
    where id = current_reservation.id
      and status = 'confirmed'
    returning * into updated_reservation;

    if updated_reservation.id is null then
      continue;
    end if;

    insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
    values (
      null,
      'reservation.no_show',
      'reservation',
      updated_reservation.id,
      to_jsonb(current_reservation),
      jsonb_build_object(
        'reservation', to_jsonb(updated_reservation),
        'source', 'system_scheduler',
        'reason', 'Khách không đến trước thời hạn tự động',
        'cutoffTimezone', 'Asia/Ho_Chi_Minh'
      )
    );

    return query select updated_reservation.id, updated_reservation.room_id;
  end loop;
end;
$$;

revoke all on function public.mark_overdue_confirmed_reservations() from public, anon, authenticated;
grant execute on function public.mark_overdue_confirmed_reservations() to service_role;
