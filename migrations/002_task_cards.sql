-- 002: Task cards
-- A task is now one title on one calendar day. Every time entry (session) belongs to a task.
-- Tasks with the same title on different days share a thread_id so analytics can add them up.
--
-- Run ONCE in Supabase Dashboard -> SQL Editor. Back up first (Database -> Backups),
-- and set the time zone below to yours: it decides which day each existing entry belongs to.

begin;

set local timezone = 'Asia/Kolkata';

alter table public.tasks add column if not exists day date;
alter table public.tasks add column if not exists thread_id uuid;

-- 1. Work out a normalized title for every existing entry
create temp table _entry_groups on commit drop as
select
    e.id as entry_id,
    e.user_id,
    e.started_at::date as day,
    coalesce(t.title, nullif(trim(e.description), ''), 'Untitled 1') as title,
    lower(regexp_replace(trim(coalesce(t.title, nullif(trim(e.description), ''), 'Untitled 1')), '\s+', ' ', 'g')) as norm,
    e.project_id,
    e.task_id as old_task_id,
    e.started_at
from public.time_entries e
left join public.tasks t on t.id = e.task_id;

-- 2. One thread per (user, title)
create temp table _threads on commit drop as
select user_id, norm, uuid_generate_v4() as thread_id
from (select distinct user_id, norm from _entry_groups) s;

-- 3. One task per (user, day, title)
create temp table _new_tasks on commit drop as
select
    uuid_generate_v4() as id,
    g.user_id,
    g.day,
    g.norm,
    th.thread_id,
    (array_agg(g.title order by g.started_at desc))[1] as title,
    (array_agg(g.project_id order by g.started_at desc) filter (where g.project_id is not null))[1] as project_id,
    (array_agg(g.old_task_id order by g.started_at desc) filter (where g.old_task_id is not null))[1] as old_task_id,
    min(g.started_at) as first_at
from _entry_groups g
join _threads th on th.user_id = g.user_id and th.norm = g.norm
group by g.user_id, g.day, g.norm, th.thread_id;

insert into public.tasks (id, user_id, project_id, title, priority, estimate_seconds, day, thread_id, created_at)
select n.id, n.user_id, n.project_id, n.title,
       coalesce(o.priority, 'medium'), o.estimate_seconds,
       n.day, n.thread_id, n.first_at
from _new_tasks n
left join public.tasks o on o.id = n.old_task_id;

update public.time_entries e
set task_id = n.id,
    description = n.title,
    project_id = coalesce(e.project_id, n.project_id)
from _entry_groups g
join _new_tasks n on n.user_id = g.user_id and n.day = g.day and n.norm = g.norm
where e.id = g.entry_id;

-- 4. Old tasks that had entries have been replaced by the day tasks above
delete from public.tasks
where day is null
  and id in (select old_task_id from _entry_groups where old_task_id is not null);

-- 5. Old planned tasks with no entries: place them on the day they were created
delete from public.tasks o
where o.day is null
  and exists (
    select 1 from public.tasks x
    where x.user_id = o.user_id
      and lower(regexp_replace(trim(x.title), '\s+', ' ', 'g')) = lower(regexp_replace(trim(o.title), '\s+', ' ', 'g'))
      and ((x.day is not null and x.day = o.created_at::date)
           or (x.day is null and x.created_at::date = o.created_at::date and x.id < o.id))
  );

update public.tasks o
set day = o.created_at::date,
    thread_id = coalesce(
        (select th.thread_id from _threads th
         where th.user_id = o.user_id
           and th.norm = lower(regexp_replace(trim(o.title), '\s+', ' ', 'g'))),
        o.id)
where o.day is null;

-- 6. Lock in the new shape
alter table public.tasks alter column day set not null;
alter table public.tasks alter column day set default current_date;
alter table public.tasks alter column thread_id set not null;
alter table public.tasks drop column if exists status;

create unique index if not exists idx_tasks_one_title_per_day
    on public.tasks (user_id, day, lower(regexp_replace(trim(title), '\s+', ' ', 'g')));
create index if not exists idx_tasks_user_day on public.tasks (user_id, day desc);
create index if not exists idx_tasks_thread on public.tasks (user_id, thread_id);

-- Deleting a task deletes its sessions
alter table public.time_entries drop constraint if exists time_entries_task_id_fkey;
alter table public.time_entries
    add constraint time_entries_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade;
alter table public.time_entries alter column task_id set not null;

-- Realtime for tasks too, so new cards appear on every device
do $$
begin
    alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;

commit;
