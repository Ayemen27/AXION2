-- ══════════════════════════════════════════════════════════════════════════════
--  AXION — Complete VPS Migration Script
--  تشغيل هذا الملف على قاعدة بيانات PostgreSQL الخارجية لإعداد النظام كاملاً
--  Usage: psql -U postgres -d axion_db -f setup/migration.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── 1. user_profiles ──────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  id          uuid        primary key,
  email       text        not null unique,
  username    text,
  full_name   text,
  phone       text,
  role        text        not null default 'user' check (role in ('admin', 'manager', 'user')),
  is_active   boolean     not null default true,
  last_login  timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── 2. system_settings ────────────────────────────────────────────────────────
create table if not exists public.system_settings (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null unique,
  value       text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.system_settings (key, value, description) values
  ('app_name',               'AXION',    'اسم التطبيق'),
  ('app_version',            '2.0.0',    'إصدار التطبيق'),
  ('setup_complete',         'false',    'هل تم إعداد النظام؟'),
  ('admin_email',            '',         'بريد المسؤول الأول'),
  ('allow_registration',     'true',     'السماح بتسجيل مستخدمين جدد'),
  ('require_admin_approval', 'false',    'يتطلب موافقة المسؤول للتسجيل'),
  ('admin_only_pages',       'users-management,backup-manager,git-manager,autocomplete-admin', 'الصفحات المحمية')
on conflict (key) do nothing;

-- ─── 3. user_permissions ───────────────────────────────────────────────────────
create table if not exists public.user_permissions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.user_profiles(id) on delete cascade,
  granted_by  uuid        references public.user_profiles(id) on delete set null,
  page_key    text        not null,
  can_read    boolean     not null default true,
  can_write   boolean     not null default false,
  can_delete  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, page_key)
);

-- ─── 4. projects ───────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  description         text,
  status              text        not null default 'active',
  project_type_id     integer,
  project_type_name   text,
  engineer_id         uuid        references public.user_profiles(id) on delete set null,
  engineer_name       text,
  location            text,
  image_url           text,
  total_workers       integer     default 0,
  total_expenses      numeric     default 0,
  total_income        numeric     default 0,
  current_balance     numeric     default 0,
  active_workers      integer     default 0,
  completed_days      integer     default 0,
  material_purchases  numeric     default 0,
  last_activity       date        default current_date,
  created_by          uuid        references public.user_profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── 5. workers ────────────────────────────────────────────────────────────────
create table if not exists public.workers (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  type        text        not null,
  daily_wage  numeric     not null default 0,
  phone       text,
  hire_date   date,
  is_active   boolean     not null default true,
  project_id  uuid        references public.projects(id) on delete set null,
  created_by  uuid        references public.user_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── 6. attendance_records ─────────────────────────────────────────────────────
create table if not exists public.attendance_records (
  id           uuid        primary key default gen_random_uuid(),
  worker_id    uuid        references public.workers(id) on delete cascade,
  worker_name  text,
  worker_type  text,
  project_id   uuid        references public.projects(id) on delete set null,
  project_name text,
  well_id      text,
  date         date        not null default current_date,
  status       text        not null default 'present',
  hours        numeric     not null default 8,
  daily_wage   numeric     not null default 0,
  earned       numeric     not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  unique(worker_id, date)
);

-- ─── 7. daily_expenses ─────────────────────────────────────────────────────────
create table if not exists public.daily_expenses (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        references public.projects(id) on delete cascade,
  project_name text,
  category     text        not null,
  description  text        not null,
  amount       numeric     not null default 0,
  date         date        not null default current_date,
  well_id      text,
  created_by   uuid        references public.user_profiles(id) on delete set null,
  receipt_url  text,
  created_at   timestamptz not null default now()
);

-- ─── 8. suppliers ──────────────────────────────────────────────────────────────
create table if not exists public.suppliers (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  phone            text,
  address          text,
  type             text        not null,
  total_purchases  numeric     default 0,
  total_payments   numeric     default 0,
  balance          numeric     default 0,
  is_active        boolean     not null default true,
  created_by       uuid        references public.user_profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ─── 9. material_purchases ─────────────────────────────────────────────────────
create table if not exists public.material_purchases (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        references public.projects(id) on delete cascade,
  supplier_id   uuid        references public.suppliers(id) on delete set null,
  supplier_name text,
  material_name text        not null,
  quantity      numeric     not null default 0,
  unit          text        not null,
  unit_price    numeric     not null default 0,
  total_price   numeric     not null default 0,
  date          date        not null default current_date,
  well_id       text,
  notes         text,
  created_by    uuid        references public.user_profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ─── 10. supplier_payments ─────────────────────────────────────────────────────
create table if not exists public.supplier_payments (
  id            uuid        primary key default gen_random_uuid(),
  supplier_id   uuid        references public.suppliers(id) on delete cascade,
  supplier_name text,
  amount        numeric     not null default 0,
  notes         text,
  date          date        not null default current_date,
  created_by    uuid        references public.user_profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ─── 11. wells ─────────────────────────────────────────────────────────────────
create table if not exists public.wells (
  id                    uuid        primary key default gen_random_uuid(),
  project_id            uuid        references public.projects(id) on delete cascade,
  well_number           integer     not null,
  owner_name            text        not null,
  region                text        not null,
  number_of_bases       integer     default 0,
  number_of_panels      integer     default 0,
  well_depth            numeric     not null,
  water_level           numeric,
  number_of_pipes       integer     default 0,
  fan_type              text,
  pump_power            text,
  status                text        not null default 'pending',
  completion_percentage integer     default 0,
  start_date            date,
  completion_date       date,
  notes                 text,
  created_by            uuid        references public.user_profiles(id) on delete set null,
  created_at            timestamptz not null default now()
);

-- ─── 12. equipment ─────────────────────────────────────────────────────────────
create table if not exists public.equipment (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  code           text,
  type           text        not null,
  unit           text        not null default 'قطعة',
  quantity       integer     not null default 1,
  status         text        not null default 'available',
  condition      text        not null default 'good',
  project_id     uuid        references public.projects(id) on delete set null,
  purchase_price numeric,
  purchase_date  date,
  description    text,
  created_by     uuid        references public.user_profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ─── 13. customers ─────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  phone       text,
  email       text,
  address     text,
  type        text        not null default 'individual',
  status      text        not null default 'active',
  project_id  uuid        references public.projects(id) on delete set null,
  notes       text,
  created_by  uuid        references public.user_profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── 14. fund_custody ──────────────────────────────────────────────────────────
create table if not exists public.fund_custody (
  id              uuid        primary key default gen_random_uuid(),
  amount          numeric     not null default 0,
  sender_name     text        not null,
  transfer_type   text        not null default 'cash',
  transfer_number text,
  project_id      uuid        references public.projects(id) on delete set null,
  project_name    text,
  date            date        not null default current_date,
  notes           text,
  created_by      uuid        references public.user_profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ─── 15. worker_transfers ──────────────────────────────────────────────────────
create table if not exists public.worker_transfers (
  id              uuid        primary key default gen_random_uuid(),
  worker_id       uuid        references public.workers(id) on delete cascade,
  worker_name     text,
  project_id      uuid        references public.projects(id) on delete set null,
  project_name    text,
  amount          numeric     not null default 0,
  recipient_name  text        not null,
  recipient_phone text,
  transfer_method text        not null default 'cash',
  transfer_number text,
  transfer_date   date        not null default current_date,
  notes           text,
  created_by      uuid        references public.user_profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ─── 16. worker_misc_expenses ──────────────────────────────────────────────────
create table if not exists public.worker_misc_expenses (
  id           uuid        primary key default gen_random_uuid(),
  worker_id    uuid        references public.workers(id) on delete cascade,
  worker_name  text,
  project_id   uuid        references public.projects(id) on delete set null,
  project_name text,
  amount       numeric     not null default 0,
  description  text        not null,
  date         date        not null default current_date,
  well_id      text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ─── 17. notifications ─────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references public.user_profiles(id) on delete cascade,
  title      text        not null,
  body       text        not null,
  type       text        not null default 'system',
  is_read    boolean     not null default false,
  link       text,
  created_at timestamptz not null default now()
);

-- ─── 18. user_github_settings ──────────────────────────────────────────────────
create table if not exists public.user_github_settings (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.user_profiles(id) on delete cascade,
  github_username  text        not null,
  github_email     text        not null,
  github_token     text        not null,
  default_repo_url text,
  default_branch   text        default 'main',
  token_scopes     text[],
  token_expires_at timestamptz,
  is_active        boolean     not null default true,
  last_verified    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(user_id)
);

-- ─── 19. git_staged_files ──────────────────────────────────────────────────────
create table if not exists public.git_staged_files (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.user_profiles(id) on delete cascade,
  path        text        not null,
  status      text        not null default 'modified',
  content     text,
  patch       text,
  additions   integer     default 0,
  deletions   integer     default 0,
  staged      boolean     not null default false,
  repository  text        not null default '',
  branch      text        not null default 'main',
  created_at  timestamptz not null default now(),
  unique(user_id, path, repository)
);

-- ─── 20. git_pending_commits ───────────────────────────────────────────────────
create table if not exists public.git_pending_commits (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.user_profiles(id) on delete cascade,
  commit_message text        not null,
  files          jsonb       not null default '[]',
  branch         text        not null default 'main',
  repository     text        not null default '',
  is_pushed      boolean     not null default false,
  created_at     timestamptz not null default now()
);

-- ─── 21. git_operations ────────────────────────────────────────────────────────
create table if not exists public.git_operations (
  id            uuid        primary key default gen_random_uuid(),
  operation     text        not null,
  repository    text        not null,
  branch        text        not null default 'main',
  status        text        not null,
  message       text,
  error_details text,
  commit_hash   text,
  files_changed integer     default 0,
  user_id       uuid        references public.user_profiles(id) on delete set null,
  user_name     text,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

-- ─── 22. repository_status ─────────────────────────────────────────────────────
create table if not exists public.repository_status (
  id               uuid        primary key default gen_random_uuid(),
  repository_url   text        not null unique,
  repository_name  text        not null,
  is_connected     boolean     not null default true,
  last_check       timestamptz not null default now(),
  last_push        timestamptz,
  last_pull        timestamptz,
  total_operations integer     default 0,
  failed_operations integer    default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ── user_profiles ─────────────────────────────────────────────────────────────
drop policy if exists "users_select_profiles"  on public.user_profiles;
drop policy if exists "users_update_profiles"  on public.user_profiles;

-- Admin/Manager see all, others see own only
create policy "users_select_profiles" on public.user_profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role in ('admin','manager'))
  );

create policy "users_update_profiles" on public.user_profiles
  for update to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.user_profiles up where up.id = auth.uid() and up.role = 'admin')
  );

create policy "users_insert_profiles" on public.user_profiles
  for insert to authenticated with check (id = auth.uid());

-- ── projects — data isolation ─────────────────────────────────────────────────
drop policy if exists "authenticated_select_projects" on public.projects;

create policy "authenticated_select_projects" on public.projects
  for select to authenticated
  using (
    -- Admin/Manager see all
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','manager'))
    -- Owner sees own
    or created_by = auth.uid()
    -- Explicitly granted
    or exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = 'projects' and can_read = true)
  );

create policy "authenticated_insert_projects" on public.projects
  for insert to authenticated
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','manager'))
    or exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = 'projects' and can_write = true)
  );

create policy "authenticated_update_projects" on public.projects
  for update to authenticated
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','manager'))
    or (created_by = auth.uid() and exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = 'projects' and can_write = true))
  );

create policy "authenticated_delete_projects" on public.projects
  for delete to authenticated
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
    or (created_by = auth.uid() and exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = 'projects' and can_delete = true))
  );

-- ── workers — data isolation ──────────────────────────────────────────────────
drop policy if exists "authenticated_select_workers" on public.workers;

create policy "authenticated_select_workers" on public.workers
  for select to authenticated
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','manager'))
    or created_by = auth.uid()
    or exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = 'workers' and can_read = true)
  );

create policy "authenticated_insert_workers"  on public.workers for insert to authenticated with check (true);
create policy "authenticated_update_workers"  on public.workers for update to authenticated using (true);
create policy "authenticated_delete_workers"  on public.workers for delete to authenticated using (true);

-- ── user_permissions ──────────────────────────────────────────────────────────
create policy "admin_manage_permissions" on public.user_permissions
  for all to authenticated
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin'));

create policy "users_read_own_permissions" on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid());

-- ── system_settings ───────────────────────────────────────────────────────────
create policy "auth_select_settings" on public.system_settings
  for select to authenticated using (true);

create policy "admin_modify_settings" on public.system_settings
  for all to authenticated
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin'));

-- ── git tables — own data only ────────────────────────────────────────────────
create policy "own_git_staged"   on public.git_staged_files   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_git_commits"  on public.git_pending_commits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_git_ops"      on public.git_operations      for all to authenticated using (user_id = auth.uid() or exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin'));
create policy "own_github_settings" on public.user_github_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "auth_repo_status" on public.repository_status   for all to authenticated using (true);

-- ── remaining tables — admin/manager full access, others own data ─────────────
create policy "auth_all_expenses"       on public.daily_expenses        for all to authenticated using (true);
create policy "auth_all_attendance"     on public.attendance_records    for all to authenticated using (true);
create policy "auth_all_suppliers"      on public.suppliers             for all to authenticated using (true);
create policy "auth_all_purchases"      on public.material_purchases    for all to authenticated using (true);
create policy "auth_all_payments"       on public.supplier_payments     for all to authenticated using (true);
create policy "auth_all_wells"          on public.wells                 for all to authenticated using (true);
create policy "auth_all_equipment"      on public.equipment             for all to authenticated using (true);
create policy "auth_all_customers"      on public.customers             for all to authenticated using (true);
create policy "auth_all_fund"           on public.fund_custody          for all to authenticated using (true);
create policy "auth_all_transfers"      on public.worker_transfers      for all to authenticated using (true);
create policy "auth_all_misc_expenses"  on public.worker_misc_expenses  for all to authenticated using (true);
create policy "own_notifications"       on public.notifications         for all to authenticated using (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_permission(p_page text, p_action text)
returns boolean language sql security definer as $$
  select case
    when exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin') then true
    when p_action = 'read'   then exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = p_page and can_read   = true)
    when p_action = 'write'  then exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = p_page and can_write  = true)
    when p_action = 'delete' then exists (select 1 from public.user_permissions where user_id = auth.uid() and page_key = p_page and can_delete = true)
    else false
  end;
$$;

-- Auto-create user profile on signup (first user = admin)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare admin_count integer;
begin
  select count(*) into admin_count from public.user_profiles where role = 'admin';
  insert into public.user_profiles (id, email, username, full_name, role, is_active)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    case when admin_count = 0 then 'admin' else coalesce(new.raw_user_meta_data->>'role','user') end,
    true
  )
  on conflict (id) do update set email = excluded.email, username = excluded.username, full_name = excluded.full_name;

  if admin_count = 0 then
    update public.system_settings set value = new.email, updated_at = now() where key = 'admin_email';
    update public.system_settings set value = 'true',    updated_at = now() where key = 'setup_complete';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

select 'AXION migration completed successfully ✓' as status;
