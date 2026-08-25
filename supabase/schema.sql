-- Supabase schema for production deployment.
-- Create the Admin user in Supabase Auth first, then insert its profile with role = 'admin'.
-- Passwords are never stored in this database; Supabase Auth stores password hashes.

create extension if not exists pgcrypto;

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  initials text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  role text not null check (role in ('admin', 'supervisor', 'guru')),
  teacher_id uuid references public.teachers(id) on delete set null,
  position text not null default '',
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_teacher_role_check check (role <> 'guru' or teacher_id is not null)
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create unique index if not exists profiles_teacher_unique_idx on public.profiles (teacher_id) where teacher_id is not null;

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  period text not null,
  class_name text not null default '',
  subject text not null default '',
  topic text not null default '',
  observer text not null default '',
  observation_date date,
  status text not null default 'draft' check (status in ('draft', 'selesai')),
  current_stage text not null default 'pra-observasi' check (current_stage in ('pra-observasi', 'observasi', 'pasca-observasi')),
  pre_observation jsonb not null default '{}'::jsonb,
  observation jsonb not null default '{}'::jsonb,
  reflection jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  follow_ups jsonb not null default '[]'::jsonb,
  supervisor_note text not null default '',
  recommendation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_settings (
  id boolean primary key default true check (id),
  school_name text not null default 'SMKN Pasirian',
  default_period text not null default '2026',
  signature_city text not null default 'Pasirian',
  signature_detail text not null default 'Kepala Sekolah & Pendamping Sekolah',
  signature_name text not null default '',
  signature_position text not null default '',
  signature_image text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists assessments_touch_updated_at on public.assessments;
create trigger assessments_touch_updated_at before update on public.assessments for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch_updated_at on public.school_settings;
create trigger settings_touch_updated_at before update on public.school_settings for each row execute function public.touch_updated_at();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select teacher_id from public.profiles where id = auth.uid() and active = true;
$$;

alter table public.teachers enable row level security;
alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.school_settings enable row level security;

drop policy if exists teachers_select_by_role on public.teachers;
create policy teachers_select_by_role on public.teachers for select to authenticated
  using (public.current_role() in ('admin', 'supervisor') or id = public.current_teacher_id());

drop policy if exists teachers_manage_admin on public.teachers;
create policy teachers_manage_admin on public.teachers for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists profiles_manage_admin on public.profiles;
create policy profiles_manage_admin on public.profiles for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create or replace function public.complete_password_change()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set must_change_password = false where id = auth.uid();
$$;

revoke all on function public.complete_password_change() from public;
grant execute on function public.complete_password_change() to authenticated;

drop policy if exists assessments_select_by_role on public.assessments;
create policy assessments_select_by_role on public.assessments for select to authenticated
  using (public.current_role() in ('admin', 'supervisor') or teacher_id = public.current_teacher_id());

drop policy if exists assessments_manage_staff on public.assessments;
create policy assessments_manage_staff on public.assessments for all to authenticated
  using (public.current_role() in ('admin', 'supervisor'))
  with check (public.current_role() in ('admin', 'supervisor'));

drop policy if exists settings_select_staff on public.school_settings;
create policy settings_select_staff on public.school_settings for select to authenticated
  using (public.current_role() in ('admin', 'supervisor'));

drop policy if exists settings_manage_admin on public.school_settings;
create policy settings_manage_admin on public.school_settings for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Akun supervisor dibuat oleh Admin melalui Supabase Auth/Edge Function.
-- Username memakai nama depan, password awal: supervisorsmakenpas,
-- lalu profiles.must_change_password = true agar password wajib diganti.
-- Akun guru juga dibuat oleh Admin; profilnya harus memiliki role = 'guru' dan teacher_id.
