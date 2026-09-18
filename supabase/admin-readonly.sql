-- =============================================================================
-- DG Expert — Admin is read-only on marketplace data
-- (run AFTER vendors.sql, service-orders.sql, order-chat.sql)
-- =============================================================================
-- Admins may VIEW everything (to monitor) but must NOT modify other people's
-- services, orders, or chats. This tightens the earlier policies that granted
-- admins blanket write access. Idempotent.
-- =============================================================================

-- 1. vendor_services: admin can read all, but NOT write --------------------------
drop policy if exists services_admin on vendor_services;      -- was: for all (write)
drop policy if exists services_admin_read on vendor_services;
create policy services_admin_read on vendor_services
  for select using (is_admin());
-- (services_write remains: only the owning approved vendor may write.)

-- 2. service_orders: admin can read all, but NOT update --------------------------
-- Rebuild the update policy WITHOUT is_admin() so admins cannot change others'
-- orders. Buyers may still cancel/complete their own; vendors update their own.
drop policy if exists orders_update on service_orders;
create policy orders_update on service_orders
  for update using (
    user_id = auth.uid()
    or exists (select 1 from vendors v where v.id = service_orders.vendor_id and v.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from vendors v where v.id = service_orders.vendor_id and v.user_id = auth.uid())
  );
-- (orders_select still includes is_admin() so admins can view every order.)

-- 3. order_messages: admin can read all, but NOT post ----------------------------
-- Insert requires the sender to be the BUYER or the VENDER OWNER of the order
-- (not merely someone who can access it), so an admin cannot post.
drop policy if exists order_messages_insert on order_messages;
create policy order_messages_insert on order_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from service_orders o
      where o.id = order_messages.order_id
        and (
          o.user_id = auth.uid()
          or exists (select 1 from vendors v where v.id = o.vendor_id and v.user_id = auth.uid())
        )
    )
  );
-- (order_messages_select still uses can_access_order, which includes admins.)

-- =============================================================================
-- Done. Admins are now strictly read-only across services, orders and chats.
-- =============================================================================
