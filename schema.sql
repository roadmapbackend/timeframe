-- Ledger-Ready Schema for Notion-Style Time Tracker (Supabase / PostgreSQL)
-- Paste into Supabase Dashboard -> SQL Editor -> New Query -> Run

create extension if not exists "uuid-ossp";

-- 1. Projects (muted color dot, optional billing, archivable)
create table if not exists public.projects (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
    name text not null,
    color text not null default '#787774',
    is_billable boolean not null default false,
    hourly_rate numeric(10, 2),
    is_archived boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tasks: one title on one calendar day (a card). Same title on other days shares thread_id.
create table if not exists public.tasks (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
    project_id uuid references public.projects(id) on delete set null,
    title text not null,
    priority text check (priority in ('low', 'medium', 'high')) default 'medium' not null,
    estimate_seconds integer check (estimate_seconds >= 0),
    day date not null default current_date,
    thread_id uuid not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists idx_tasks_one_title_per_day
    on public.tasks (user_id, day, lower(regexp_replace(trim(title), '\s+', ' ', 'g')));
create index if not exists idx_tasks_user_day on public.tasks (user_id, day desc);
create index if not exists idx_tasks_thread on public.tasks (user_id, thread_id);

-- 3. Time Entries = sessions of a task (ended_at IS NULL = currently running timer)
create table if not exists public.time_entries (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    project_id uuid references public.projects(id) on delete set null,
    description text not null default '',
    started_at timestamp with time zone not null,
    ended_at timestamp with time zone,
    duration_seconds integer check (duration_seconds >= 0),
    source text check (source in ('timer', 'manual', 'adjusted')) default 'manual' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enforce at most ONE running timer per user at the database level
create unique index if not exists idx_one_running_entry_per_user
    on public.time_entries (user_id)
    where ended_at is null;

-- Performance indexes for ledger & analytics queries
create index if not exists idx_time_entries_user_started on public.time_entries (user_id, started_at desc);
create index if not exists idx_time_entries_project on public.time_entries (project_id);
create index if not exists idx_time_entries_task on public.time_entries (task_id);
create index if not exists idx_tasks_user on public.tasks (user_id);
create index if not exists idx_projects_user on public.projects (user_id);

-- Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects"
    on public.projects for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
    on public.tasks for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users manage own time entries" on public.time_entries;
create policy "Users manage own time entries"
    on public.time_entries for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Enable Realtime for cross-device sync (safe to re-run)
do $$
begin
    alter publication supabase_realtime add table public.time_entries;
exception when duplicate_object then null;
end $$;

do $$
begin
    alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;
