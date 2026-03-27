begin;

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  daily_rate numeric(12, 2) not null default 0 check (daily_rate >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sku text not null,
  name text not null,
  retail_price numeric(12, 2) not null check (retail_price >= 0),
  stock_level integer not null default 0 check (stock_level >= 0),
  created_at timestamptz not null default now(),
  unique (business_id, sku)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  work_date date not null default (timezone('Asia/Manila', now())::date),
  wage_due numeric(12, 2) not null default 0 check (wage_due >= 0),
  is_paid boolean not null default false,
  clocked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, user_id, work_date)
);

create table if not exists public.eod_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  report_date date not null,
  gross_sales numeric(12, 2) not null default 0 check (gross_sales >= 0),
  total_wages_paid numeric(12, 2) not null default 0 check (total_wages_paid >= 0),
  net_cash numeric(12, 2) not null default 0,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, report_date)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null,
  amount numeric(12, 2) not null,
  category text not null,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.daily_attendance enable row level security;
alter table public.eod_reports enable row level security;
alter table public.transactions enable row level security;

insert into public.businesses (name)
values
  ('Laundromat'),
  ('Water Refilling Station')
on conflict (name) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, daily_rate)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    ),
    'staff',
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_attendance_wage_due()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_daily_rate numeric(12, 2);
begin
  select p.daily_rate
  into v_daily_rate
  from public.profiles p
  where p.id = new.user_id;

  if v_daily_rate is null then
    raise exception 'Profile not found for user %', new.user_id;
  end if;

  new.wage_due := v_daily_rate;

  return new;
end;
$$;

create or replace function public.prevent_attendance_wage_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.wage_due is distinct from old.wage_due then
    raise exception 'wage_due is locked after attendance creation';
  end if;

  return new;
end;
$$;

drop trigger if exists set_attendance_wage_due on public.daily_attendance;
create trigger set_attendance_wage_due
before insert on public.daily_attendance
for each row execute function public.sync_attendance_wage_due();

drop trigger if exists prevent_attendance_wage_change on public.daily_attendance;
create trigger prevent_attendance_wage_change
before update on public.daily_attendance
for each row execute function public.prevent_attendance_wage_change();

create or replace function public.ensure_sale_item_business_match()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_sale_business_id uuid;
  v_product_business_id uuid;
begin
  select s.business_id
  into v_sale_business_id
  from public.sales s
  where s.id = new.sale_id;

  select p.business_id
  into v_product_business_id
  from public.products p
  where p.id = new.product_id;

  if v_sale_business_id is null then
    raise exception 'Sale not found for item %', new.sale_id;
  end if;

  if v_product_business_id is null then
    raise exception 'Product not found for item %', new.product_id;
  end if;

  if v_sale_business_id <> v_product_business_id then
    raise exception 'Sale item business mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists sale_items_business_match on public.sale_items;
create trigger sale_items_business_match
before insert or update on public.sale_items
for each row execute function public.ensure_sale_item_business_match();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.create_sale(p_business_id uuid, p_items jsonb)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_product public.products%rowtype;
  v_item record;
  v_quantity integer;
  v_total numeric(12, 2) := 0;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
  ) then
    raise exception 'Business not found';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale must contain at least one item';
  end if;

  insert into public.sales (business_id, user_id, total_amount)
  values (p_business_id, v_user_id, 0)
  returning * into v_sale;

  for v_item in
    select
      (item->>'product_id')::uuid as product_id,
      coalesce((item->>'quantity')::integer, 0) as quantity
    from jsonb_array_elements(p_items) as item
  loop
    v_quantity := v_item.quantity;

    if v_quantity <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select *
    into v_product
    from public.products p
    where p.id = v_item.product_id
    for update;

    if not found then
      raise exception 'Product % not found', v_item.product_id;
    end if;

    if v_product.business_id <> p_business_id then
      raise exception 'Product business mismatch';
    end if;

    if v_product.stock_level < v_quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price)
    values (v_sale.id, v_product.id, v_quantity, v_product.retail_price);

    update public.products
    set stock_level = stock_level - v_quantity
    where id = v_product.id;

    v_total := v_total + (v_product.retail_price * v_quantity);
  end loop;

  update public.sales
  set total_amount = v_total
  where id = v_sale.id
  returning * into v_sale;

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
  v_total_wages_paid numeric(12, 2) := 0;
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
  into v_gross_sales
  from public.sales s
  where s.business_id = p_business_id
    and s.created_at::date = v_report_date;

  select coalesce(sum(a.wage_due), 0)::numeric(12, 2)
  into v_total_wages_paid
  from public.daily_attendance a
  where a.business_id = p_business_id
    and a.work_date = v_report_date
    and a.is_paid = false;

  v_net_cash := v_gross_sales - v_total_wages_paid;

  insert into public.transactions (business_id, type, amount, category)
  values
    (p_business_id, 'eod_gross_sales', v_gross_sales, 'sales'),
    (p_business_id, 'eod_wages_paid', v_total_wages_paid, 'payroll');

  update public.daily_attendance
  set is_paid = true
  where business_id = p_business_id
    and work_date = v_report_date
    and is_paid = false;

  insert into public.eod_reports (
    business_id,
    report_date,
    gross_sales,
    total_wages_paid,
    net_cash,
    closed_by
  )
  values (
    p_business_id,
    v_report_date,
    v_gross_sales,
    v_total_wages_paid,
    v_net_cash,
    v_user_id
  )
  returning * into v_report;

  return v_report;
end;
$$;

drop policy if exists "businesses_select_authenticated" on public.businesses;
create policy "businesses_select_authenticated"
on public.businesses
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "businesses_manage_admin" on public.businesses;
create policy "businesses_manage_admin"
on public.businesses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "products_select_authenticated" on public.products;
create policy "products_select_authenticated"
on public.products
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "products_manage_admin" on public.products;
create policy "products_manage_admin"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sales_select_authenticated" on public.sales;
create policy "sales_select_authenticated"
on public.sales
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "sales_insert_owner_or_admin" on public.sales;
create policy "sales_insert_owner_or_admin"
on public.sales
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "sales_manage_admin" on public.sales;
create policy "sales_manage_admin"
on public.sales
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sales_delete_admin" on public.sales;
create policy "sales_delete_admin"
on public.sales
for delete
to authenticated
using (public.is_admin());

drop policy if exists "sale_items_select_authenticated" on public.sale_items;
create policy "sale_items_select_authenticated"
on public.sale_items
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "sale_items_insert_sales_owner_or_admin" on public.sale_items;
create policy "sale_items_insert_sales_owner_or_admin"
on public.sale_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales s
    where s.id = sale_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "sale_items_manage_admin" on public.sale_items;
create policy "sale_items_manage_admin"
on public.sale_items
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sale_items_delete_admin" on public.sale_items;
create policy "sale_items_delete_admin"
on public.sale_items
for delete
to authenticated
using (public.is_admin());

drop policy if exists "attendance_select_authenticated" on public.daily_attendance;
create policy "attendance_select_authenticated"
on public.daily_attendance
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "attendance_insert_self_or_admin" on public.daily_attendance;
create policy "attendance_insert_self_or_admin"
on public.daily_attendance
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendance_manage_admin" on public.daily_attendance;
create policy "attendance_manage_admin"
on public.daily_attendance
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "attendance_delete_admin" on public.daily_attendance;
create policy "attendance_delete_admin"
on public.daily_attendance
for delete
to authenticated
using (public.is_admin());

drop policy if exists "eod_select_authenticated" on public.eod_reports;
create policy "eod_select_authenticated"
on public.eod_reports
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "eod_manage_admin" on public.eod_reports;
create policy "eod_manage_admin"
on public.eod_reports
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "transactions_select_authenticated" on public.transactions;
create policy "transactions_select_authenticated"
on public.transactions
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "transactions_manage_admin" on public.transactions;
create policy "transactions_manage_admin"
on public.transactions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on function public.create_sale(uuid, jsonb) from public;
grant execute on function public.create_sale(uuid, jsonb) to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.process_end_of_day(uuid) from public;
grant execute on function public.process_end_of_day(uuid) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.sales to authenticated;
grant select, insert, update, delete on table public.sale_items to authenticated;
grant select, insert, update, delete on table public.daily_attendance to authenticated;
grant select, insert, update, delete on table public.eod_reports to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;

commit;
