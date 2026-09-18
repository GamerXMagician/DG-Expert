-- =============================================================================
-- DG Expert — Mutual order completion (run AFTER service-orders.sql)
-- =============================================================================
-- An order is only marked `completed` when BOTH sides confirm. The buyer ticks
-- user_completed (from /orders), the vendor ticks vendor_completed (from
-- /vendor). A trigger flips status to 'completed' once both are true.
-- Idempotent.
-- =============================================================================

alter table service_orders add column if not exists user_completed   boolean not null default false;
alter table service_orders add column if not exists vendor_completed boolean not null default false;

-- When both parties have confirmed, mark the order completed.
create or replace function service_orders_mutual_complete()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.user_completed and new.vendor_completed
     and new.status is distinct from 'completed'
     and new.status not in ('cancelled', 'declined') then
    new.status := 'completed';
  end if;
  return new;
end $$;
drop trigger if exists trg_service_orders_mutual_complete on service_orders;
create trigger trg_service_orders_mutual_complete
  before update on service_orders
  for each row execute function service_orders_mutual_complete();

-- =============================================================================
-- Done. Both /orders (buyer) and /vendor (vendor) expose a "Mark complete"
-- action; the order completes only when both have ticked.
-- =============================================================================
