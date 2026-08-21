-- Skema cloud-ready untuk fase berikutnya.
-- Frontend MVP menggunakan localStorage agar dapat langsung dijalankan.

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  initials text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id),
  period text not null,
  class_name text not null default '',
  subject text not null default '',
  topic text not null default '',
  observer text not null default '',
  observation_date date,
  status text not null default 'draft' check (status in ('draft', 'selesai')),
  current_stage text not null default 'pra-observasi',
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

alter table public.teachers enable row level security;
alter table public.assessments enable row level security;

-- Tambahkan policy berbasis peran setelah Supabase Auth sekolah dikonfigurasi.
