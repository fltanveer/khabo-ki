-- Khabo Ki? — fix unqualified column references in the orders policies
--
-- The subqueries referenced `daily_menu_id` / `item_id` unqualified, so inside
-- the subquery they bound to the subquery's own table rather than the orders
-- row being written:
--
--   dmi.daily_menu_id = daily_menu_id   -->  dmi.daily_menu_id = dmi.daily_menu_id
--   b.item_id         = item_id         -->  b.item_id         = b.item_id
--
-- Effect: the menu-membership test was always true (an employee could order an
-- item that was not on the day's menu), and the ban test was false for anyone
-- holding any ban at all (one ban blocked every manual pick). Qualify the
-- outer columns with `orders.` so they bind to the row being written.

drop policy orders_insert_own on public.orders;
drop policy orders_update_own on public.orders;

create policy orders_insert_own on public.orders for insert to authenticated
  with check (
    orders.employee_id = auth.uid()
    and orders.source = 'manual'
    and public.my_status() = 'active'
    and public.is_menu_open(orders.daily_menu_id)
    and exists (select 1 from public.daily_menu_items dmi
                where dmi.daily_menu_id = orders.daily_menu_id
                  and dmi.item_id = orders.item_id)
    and not exists (select 1 from public.employee_bans b
                    where b.employee_id = auth.uid()
                      and b.item_id = orders.item_id)
  );

create policy orders_update_own on public.orders for update to authenticated
  using (orders.employee_id = auth.uid() and public.is_menu_open(orders.daily_menu_id))
  with check (
    orders.employee_id = auth.uid()
    and orders.source = 'manual'
    and public.is_menu_open(orders.daily_menu_id)
    and exists (select 1 from public.daily_menu_items dmi
                where dmi.daily_menu_id = orders.daily_menu_id
                  and dmi.item_id = orders.item_id)
    and not exists (select 1 from public.employee_bans b
                    where b.employee_id = auth.uid()
                      and b.item_id = orders.item_id)
  );
