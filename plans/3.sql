begin;

create extension if not exists pgcrypto;

alter table public.sales
  add column if not exists customer_name text,
  add column if not exists item_description text,
  add column if not exists is_paid boolean not null default false,
  add column if not exists paid_at timestamptz;

update public.sales
set
  customer_name = coalesce(customer_name, ''),
  item_description = coalesce(item_description, ''),
  is_paid = coalesce(is_paid, false),
  paid_at = case
    when coalesce(is_paid, false) and paid_at is null then created_at
    else paid_at
  end;

alter table public.sales
  alter column customer_name set default '',
  alter column item_description set default '',
  alter column customer_name set not null,
  alter column item_description set not null;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  description text not null,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_authenticated" on public.expenses;
create policy "expenses_select_authenticated"
on public.expenses
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "expenses_insert_self_or_admin" on public.expenses;
create policy "expenses_insert_self_or_admin"
on public.expenses
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "expenses_update_admin" on public.expenses;
create policy "expenses_update_admin"
on public.expenses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "expenses_delete_admin" on public.expenses;
create policy "expenses_delete_admin"
on public.expenses
for delete
to authenticated
using (public.is_admin());

alter table public.eod_reports
  add column if not exists paid_sales numeric(12, 2) not null default 0,
  add column if not exists total_expenses numeric(12, 2) not null default 0;

update public.eod_reports
set
  paid_sales = case when paid_sales = 0 then gross_sales else paid_sales end,
  total_expenses = case when total_expenses = 0 then coalesce(total_wages_paid, 0) else total_expenses end;

drop trigger if exists sale_items_business_match on public.sale_items;
drop trigger if exists set_attendance_wage_due on public.daily_attendance;
drop trigger if exists prevent_attendance_wage_change on public.daily_attendance;

drop function if exists public.create_sale(uuid, jsonb);
drop function if exists public.ensure_sale_item_business_match();
drop function if exists public.sync_attendance_wage_due();
drop function if exists public.prevent_attendance_wage_change();

drop table if exists public.sale_items cascade;
drop table if exists public.daily_attendance cascade;
drop table if exists public.products cascade;

create or replace function public.sync_sale_paid_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_paid then
    new.paid_at := coalesce(new.paid_at, now());
  else
    new.paid_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_sale_paid_at on public.sales;
create trigger set_sale_paid_at
before insert or update on public.sales
for each row execute function public.sync_sale_paid_at();

create or replace function public.mark_sale_paid(p_business_id uuid, p_sale_id uuid)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
begin
  update public.sales
  set
    is_paid = true,
    paid_at = coalesce(paid_at, now())
  where id = p_sale_id
    and business_id = p_business_id
  returning * into v_sale;

  if not found then
    raise exception 'Sale not found';
  end if;

  return v_sale;
end;
$$;

create or replace function public.process_end_of_day(p_business_id uuid)
returns public.eod_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.eod_reports%rowtype;
  v_report_date date := timezone('Asia/Manila', now())::date;
  v_gross_sales numeric(12, 2) := 0;
  v_paid_sales numeric(12, 2) := 0;
  v_total_expenses numeric(12, 2) := 0;
  v_net_cash numeric(12, 2) := 0;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can process end of day';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
  ) then
    raise exception 'Business not found';
  end if;

  if exists (
    select 1
    from public.eod_reports e
    where e.business_id = p_business_id
      and e.report_date = v_report_date
  ) then
    raise exception 'End of day already processed for this business and date';
  end if;

  select coalesce(sum(s.total_amount), 0)::numeric(12, 2)
  into v_paid_sales
  from public.sales s
  where s.business_id = p_business_id
    and s.is_paid = true
    and s.paid_at is not null
    and timezone('Asia/Manila', s.paid_at)::date = v_report_date;

  v_gross_sales := v_paid_sales;

  select coalesce(sum(e.amount), 0)::numeric(12, 2)
  into v_total_expenses
  from public.expenses e
  where e.business_id = p_business_id
    and timezone('Asia/Manila', e.created_at)::date = v_report_date;

  v_net_cash := v_paid_sales - v_total_expenses;

  insert into public.transactions (business_id, type, amount, category)
  values
    (p_business_id, 'eod_paid_sales', v_paid_sales, 'sales'),
    (p_business_id, 'eod_expenses', v_total_expenses, 'expenses');

  insert into public.eod_reports (
    business_id,
    report_date,
    gross_sales,
    paid_sales,
    total_expenses,
    net_cash,
    closed_by
  )
  values (
    p_business_id,
    v_report_date,
    v_gross_sales,
    v_paid_sales,
    v_total_expenses,
    v_net_cash,
    v_user_id
  )
  returning * into v_report;

  return v_report;
end;
$$;

revoke all on function public.process_end_of_day(uuid) from public;
grant execute on function public.process_end_of_day(uuid) to authenticated;

revoke all on function public.mark_sale_paid(uuid, uuid) from public;
grant execute on function public.mark_sale_paid(uuid, uuid) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;

grant select, insert, update, delete on table public.sales to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.eod_reports to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

notify pgrst, 'reload schema';

commit;
