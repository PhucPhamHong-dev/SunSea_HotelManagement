-- Checkout bill V1: the confirmation action records exactly the backend-
-- calculated outstanding balance as a completed cash settlement, then checks
-- the guest out and moves the room to cleaning in one transaction.

create or replace function public.checkout_and_settle_reservation(
  p_reservation_id uuid,
  p_expected_version integer,
  p_settlement_amount numeric,
  p_actor_id uuid
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_reservation public.reservations;
  updated_reservation public.reservations;
  current_room public.rooms;
  updated_room public.rooms;
  settlement_payment public.payments;
  settlement_payment_data jsonb := null;
  room_amount numeric(12, 2);
  service_amount numeric(12, 2);
  paid_amount numeric(12, 2);
  expected_settlement numeric(12, 2);
  local_check_in_date date;
  local_check_out_date date;
  local_today date;
  calendar_days integer;
  charged_nights integer;
  local_time time;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or not public.is_active_user() then
    raise exception using errcode = '42501', message = 'Active authenticated user is required';
  end if;
  if p_settlement_amount is null or p_settlement_amount < 0 or p_settlement_amount <> trunc(p_settlement_amount) then
    raise exception using errcode = '22023', message = 'Settlement amount must be a non-negative integer amount';
  end if;

  select * into current_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if current_reservation.id is null then
    raise exception using errcode = 'P0002', message = 'Reservation was not found';
  end if;
  if current_reservation.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Reservation was changed by another user';
  end if;
  if current_reservation.status <> 'checked_in' then
    raise exception using errcode = 'P0001', message = 'Only checked-in reservations can be checked out';
  end if;
  if current_reservation.room_rate_snapshot is null then
    raise exception using errcode = 'P0001', message = 'Room nightly rate is not configured';
  end if;

  select * into current_room
  from public.rooms
  where id = current_reservation.room_id
  for update;

  if current_room.id is null then
    raise exception using errcode = 'P0002', message = 'Room was not found';
  end if;

  local_check_in_date := (current_reservation.planned_check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
  if current_reservation.planned_check_out_at is not null then
    local_check_out_date := (current_reservation.planned_check_out_at at time zone 'Asia/Ho_Chi_Minh')::date;
    calendar_days := local_check_out_date - local_check_in_date;
    if calendar_days < 0 then
      raise exception using errcode = '22023', message = 'Check-out must be after check-in';
    end if;
    -- Mirrors the current PricingEngine V1 short-stay default. A longer
    -- same-day stay requires pricing configuration and is rejected by the
    -- backend preview before this transactional operation is called.
    room_amount := case when calendar_days = 0 then 250000 else calendar_days * current_reservation.room_rate_snapshot end;
  else
    local_today := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
    local_time := (now() at time zone 'Asia/Ho_Chi_Minh')::time;
    calendar_days := local_today - local_check_in_date;
    charged_nights := case
      when calendar_days <= 0 then 1
      when local_time >= time '17:00' then 1 + calendar_days
      else calendar_days
    end;
    room_amount := charged_nights * current_reservation.room_rate_snapshot;
  end if;

  select coalesce(sum(total), 0) into service_amount
  from public.reservation_services
  where reservation_id = p_reservation_id and active = true;

  select coalesce(sum(case
    when status = 'completed' and payment_type = 'refund' then -amount
    when status = 'completed' then amount
    else 0
  end), 0) into paid_amount
  from public.payments
  where reservation_id = p_reservation_id;

  expected_settlement := room_amount + service_amount - paid_amount;
  if expected_settlement < 0 then
    raise exception using errcode = 'P0001', message = 'Refund is required before checkout';
  end if;
  if p_settlement_amount <> expected_settlement then
    raise exception using errcode = '40001', message = 'Checkout bill changed; refresh and confirm again';
  end if;

  if p_settlement_amount > 0 then
    insert into public.payments (
      reservation_id, payment_type, amount, method, status, paid_at, note, created_by, updated_by
    ) values (
      p_reservation_id, 'settlement'::public.payment_type, p_settlement_amount,
      'cash'::public.payment_method, 'completed'::public.payment_status, now(),
      'Thanh toán khi trả phòng', p_actor_id, p_actor_id
    ) returning * into settlement_payment;
    settlement_payment_data := to_jsonb(settlement_payment);

    insert into public.audit_logs (actor_id, action, entity, entity_id, after_data)
    values (
      p_actor_id, 'payment.created', 'payment', settlement_payment.id,
      jsonb_build_object('payment', settlement_payment_data, 'reservationId', p_reservation_id, 'source', 'checkout_bill')
    );
  end if;

  update public.reservations
  set status = 'checked_out',
      actual_check_out_at = now(),
      version = version + 1,
      updated_by = p_actor_id
  where id = p_reservation_id
  returning * into updated_reservation;

  update public.rooms
  set housekeeping_status = 'cleaning',
      updated_by = p_actor_id
  where id = current_room.id
  returning * into updated_room;

  insert into public.audit_logs (actor_id, action, entity, entity_id, before_data, after_data)
  values (
    p_actor_id,
    'reservation.checked_out',
    'reservation',
    p_reservation_id,
    jsonb_build_object('reservation', to_jsonb(current_reservation), 'room', to_jsonb(current_room)),
    jsonb_build_object(
      'reservation', to_jsonb(updated_reservation),
      'room', to_jsonb(updated_room),
      'settlementPayment', settlement_payment_data
    )
  );

  return updated_reservation;
end;
$$;

revoke execute on function public.checkout_and_settle_reservation(uuid, integer, numeric, uuid) from public;
revoke execute on function public.checkout_and_settle_reservation(uuid, integer, numeric, uuid) from anon, service_role;
grant execute on function public.checkout_and_settle_reservation(uuid, integer, numeric, uuid) to authenticated;

-- The old checkout RPC does not record the bill settlement and therefore must
-- not remain callable after this atomic checkout flow is introduced.
revoke execute on function public.checkout_reservation(uuid, integer, uuid) from authenticated;
revoke execute on function public.checkout_reservation(uuid, integer, uuid) from anon, service_role;
