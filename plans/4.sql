begin;

-- Drop existing admin policies that restrict to today only
drop policy if exists "sales_manage_admin" on public.sales;
drop policy if exists "sales_delete_admin" on public.sales;
drop policy if exists "expenses_update_admin" on public.expenses;
drop policy if exists "expenses_delete_admin" on public.expenses;

-- Recreate policies without the "today only" restriction for admins
create policy "sales_manage_admin"
on public.sales
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "sales_delete_admin"
on public.sales
for delete
to authenticated
using (public.is_admin());

create policy "expenses_update_admin"
on public.expenses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "expenses_delete_admin"
on public.expenses
for delete
to authenticated
using (public.is_admin());

notify pgrst, 'reload schema';

commit;