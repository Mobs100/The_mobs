-- THE MOBS V2 / Supabase alignment
-- Review existing schema before running in production.
-- This migration only adds delivery fields if they do not exist.
alter table if exists public.orders add column if not exists customer_name text;
alter table if exists public.orders add column if not exists phone text;
alter table if exists public.orders add column if not exists delivery_address text;
alter table if exists public.orders add column if not exists delivery_instructions text;
alter table if exists public.orders add column if not exists latitude double precision;
alter table if exists public.orders add column if not exists longitude double precision;
alter table if exists public.orders add column if not exists delivery_started_at timestamptz;
alter table if exists public.orders add column if not exists delivery_arrived_at timestamptz;
alter table if exists public.orders add column if not exists delivery_completed_at timestamptz;
alter table if exists public.orders add column if not exists driver_id uuid;

-- Standardize product category reference.
alter table if exists public.products add column if not exists category_id uuid;

-- Backfill category_id from legacy menu_category_id when that column exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='menu_category_id'
  ) then
    execute 'update public.products set category_id = menu_category_id where category_id is null';
  end if;
end $$;

create index if not exists idx_orders_restaurant_created
  on public.orders(restaurant_id, created_at desc);
create index if not exists idx_orders_customer_token
  on public.orders(customer_token);
create index if not exists idx_order_items_order
  on public.order_items(order_id);
create index if not exists idx_products_restaurant_category
  on public.products(restaurant_id, category_id);


-- =========================================================
-- THE MOBS DRIVER REGISTRATION / APPROVAL SYSTEM
-- =========================================================
create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  phone text not null,
  email text,
  city text,
  date_of_birth date,
  nationality text,
  national_address text,
  id_number text,
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  plate_number text,
  id_document_path text,
  vehicle_image_path text,
  license_document_path text,
  vehicle_registration_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  availability_status text not null default 'offline' check (availability_status in ('offline','online','busy')),
  rejection_reason text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_driver_profiles_status on public.driver_profiles(status);
create index if not exists idx_driver_profiles_availability on public.driver_profiles(availability_status);

create table if not exists public.admin_users (
  id boolean primary key default true check (id = true),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_mobs_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.get_driver_login_email(p_username text)
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.email
  from public.driver_profiles d
  join auth.users u on u.id = d.user_id
  where lower(d.username) = lower(trim(p_username))
    and d.status in ('pending','approved','rejected','suspended')
  limit 1;
$$;

grant execute on function public.get_driver_login_email(text) to anon, authenticated;
grant execute on function public.is_mobs_admin() to authenticated;

alter table public.driver_profiles enable row level security;
alter table public.admin_users enable row level security;

-- Drivers can see/update only their own profile. Approval fields are protected by column choice in the UI;
-- production writes should be restricted further if Postgres grants are customized.
drop policy if exists "drivers read own profile" on public.driver_profiles;
create policy "drivers read own profile" on public.driver_profiles for select to authenticated using (user_id = auth.uid() or public.is_mobs_admin());
drop policy if exists "drivers update own safe profile" on public.driver_profiles;
create policy "drivers update own safe profile" on public.driver_profiles for update to authenticated using (user_id = auth.uid() or public.is_mobs_admin()) with check (user_id = auth.uid() or public.is_mobs_admin());
drop policy if exists "drivers insert own profile" on public.driver_profiles;
create policy "drivers insert own profile" on public.driver_profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admin read admin singleton" on public.admin_users;
create policy "admin read admin singleton" on public.admin_users for select to authenticated using (user_id = auth.uid());

-- Private storage buckets for identity/vehicle documents and delivery proof.
insert into storage.buckets (id,name,public) values ('driver-documents','driver-documents',false) on conflict (id) do nothing;
insert into storage.buckets (id,name,public) values ('delivery-proofs','delivery-proofs',false) on conflict (id) do nothing;

drop policy if exists "driver upload own documents" on storage.objects;
create policy "driver upload own documents" on storage.objects for insert to authenticated
with check (bucket_id='driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "driver read own documents or admin" on storage.objects;
create policy "driver read own documents or admin" on storage.objects for select to authenticated
using (bucket_id='driver-documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_mobs_admin()));

drop policy if exists "driver upload delivery proof" on storage.objects;
create policy "driver upload delivery proof" on storage.objects for insert to authenticated
with check (bucket_id='delivery-proofs' and public.is_mobs_admin() or bucket_id='delivery-proofs' and exists(select 1 from public.driver_profiles d where d.user_id=auth.uid() and d.status='approved'));

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid not null references auth.users(id),
  event_type text not null,
  note text,
  proof_paths jsonb not null default '[]'::jsonb,
  duration_seconds integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_delivery_events_order on public.delivery_events(order_id, created_at desc);

alter table public.delivery_events enable row level security;
drop policy if exists "driver read own delivery events" on public.delivery_events;
create policy "driver read own delivery events" on public.delivery_events for select to authenticated using (driver_id=auth.uid() or public.is_mobs_admin());
drop policy if exists "driver create own delivery events" on public.delivery_events;
create policy "driver create own delivery events" on public.delivery_events for insert to authenticated with check (driver_id=auth.uid() and exists(select 1 from public.driver_profiles d where d.user_id=auth.uid() and d.status='approved') or public.is_mobs_admin());

-- The Admin account is intentionally a singleton. After creating the one Auth user,
-- seed it once with: insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID');


-- Protect approval/security fields from self-editing by a driver.
create or replace function public.protect_driver_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_mobs_admin() and old.user_id = auth.uid() then
    new.status := old.status;
    new.rejection_reason := old.rejection_reason;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.user_id := old.user_id;
    new.username := old.username;
    new.id_document_path := old.id_document_path;
    new.vehicle_image_path := old.vehicle_image_path;
    new.license_document_path := old.license_document_path;
    new.vehicle_registration_path := old.vehicle_registration_path;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_protect_driver_fields on public.driver_profiles;
create trigger trg_protect_driver_fields
before update on public.driver_profiles
for each row execute function public.protect_driver_fields();

-- Driver order access: only assigned orders are visible to approved drivers.
drop policy if exists "drivers read assigned orders" on public.orders;
create policy "drivers read assigned orders" on public.orders for select to authenticated
using (driver_id = auth.uid() and exists(select 1 from public.driver_profiles d where d.user_id=auth.uid() and d.status='approved') or public.is_mobs_admin());
drop policy if exists "drivers update assigned orders" on public.orders;
create policy "drivers update assigned orders" on public.orders for update to authenticated
using (driver_id = auth.uid() and exists(select 1 from public.driver_profiles d where d.user_id=auth.uid() and d.status='approved') or public.is_mobs_admin())
with check (driver_id = auth.uid() and exists(select 1 from public.driver_profiles d where d.user_id=auth.uid() and d.status='approved') or public.is_mobs_admin());

-- Order items are visible to a driver only when their order is assigned to that driver.
drop policy if exists "drivers read assigned order items" on public.order_items;
create policy "drivers read assigned order items" on public.order_items for select to authenticated
using (exists(select 1 from public.orders o join public.driver_profiles d on d.user_id=auth.uid() where o.id=order_items.order_id and o.driver_id=auth.uid() and d.status='approved') or public.is_mobs_admin());


-- =========================================================
-- HARDENING / REALTIME / DRIVER WORKFLOW
-- =========================================================

create unique index if not exists uq_driver_profiles_username_lower
  on public.driver_profiles (lower(username));

-- Drivers should never be able to self-approve or alter identity/document paths.
-- The trigger already protects those fields; this function additionally gives
-- the delivery app a narrow, auditable status-transition API.

create or replace function public.driver_transition_order(
  p_order_id uuid,
  p_status text,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_driver public.driver_profiles;
  v_now timestamptz := now();
begin
  select * into v_driver
  from public.driver_profiles
  where user_id = auth.uid()
    and status = 'approved';

  if v_driver.id is null then
    raise exception 'Approved driver account required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and driver_id = auth.uid()
  for update;

  if v_order.id is null then
    raise exception 'Order is not assigned to this driver';
  end if;

  if p_status = 'out_for_delivery' and v_order.status = 'ready' then
    update public.orders
      set status = 'out_for_delivery',
          delivery_started_at = coalesce(delivery_started_at, v_now)
    where id = p_order_id
    returning * into v_order;

  elsif p_status = 'arrived' and v_order.status = 'out_for_delivery' then
    update public.orders
      set status = 'arrived',
          delivery_arrived_at = coalesce(delivery_arrived_at, v_now)
    where id = p_order_id
    returning * into v_order;

  elsif p_status = 'delivered' and v_order.status = 'arrived' then
    update public.orders
      set status = 'delivered',
          delivery_completed_at = coalesce(delivery_completed_at, v_now)
    where id = p_order_id
    returning * into v_order;

  else
    raise exception 'Invalid delivery status transition: % -> %', v_order.status, p_status;
  end if;

  insert into public.delivery_events(order_id, driver_id, event_type, note)
  values (p_order_id, auth.uid(), p_status, nullif(trim(p_note), ''));

  return v_order;
end;
$$;

grant execute on function public.driver_transition_order(uuid,text,text) to authenticated;

-- Realtime is used by the three applications for live order/driver updates.
do $$
begin
  alter table public.orders replica identity full;
exception when others then null;
end $$;

do $$
begin
  alter table public.driver_profiles replica identity full;
exception when others then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='driver_profiles'
  ) then
    alter publication supabase_realtime add table public.driver_profiles;
  end if;
exception when others then
  raise notice 'Realtime publication update skipped: %', SQLERRM;
end $$;

-- Delivery proof files are scoped to the assigned order.
drop policy if exists "driver upload delivery proof" on storage.objects;
create policy "driver upload delivery proof" on storage.objects
for insert to authenticated
with check (
  bucket_id='delivery-proofs'
  and split_part(name,'/',1) <> ''
  and exists (
    select 1
    from public.orders o
    join public.driver_profiles d on d.user_id=auth.uid()
    where o.id::text = split_part(name,'/',1)
      and o.driver_id=auth.uid()
      and d.status='approved'
  )
);

drop policy if exists "driver read own delivery proof" on storage.objects;
create policy "driver read own delivery proof" on storage.objects
for select to authenticated
using (
  bucket_id='delivery-proofs'
  and exists (
    select 1
    from public.orders o
    where o.id::text = split_part(name,'/',1)
      and o.driver_id=auth.uid()
  )
);

drop policy if exists "admin read delivery proof" on storage.objects;
create policy "admin read delivery proof" on storage.objects
for select to authenticated
using (bucket_id='delivery-proofs' and public.is_mobs_admin());


-- Drivers change delivery state only through driver_transition_order().
drop policy if exists "drivers update assigned orders" on public.orders;

drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders
for update to authenticated
using (public.is_mobs_admin())
with check (public.is_mobs_admin());

-- Driver-created events are limited to delivery proof records.
-- Transition events are written by the security-definer RPC above.
drop policy if exists "driver create own delivery events" on public.delivery_events;
create policy "driver create own delivery events" on public.delivery_events
for insert to authenticated
with check (
  event_type = 'delivery_proof'
  and driver_id = auth.uid()
  and exists (
    select 1
    from public.orders o
    join public.driver_profiles d on d.user_id=auth.uid()
    where o.id=delivery_events.order_id
      and o.driver_id=auth.uid()
      and d.status='approved'
  )
);

-- Refresh PostgREST schema cache after applying the new order columns.
notify pgrst, 'reload schema';
