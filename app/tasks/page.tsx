'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDotPicker } from '@/components/projects/ProjectDotPicker';
import { useProjects } from '@/hooks/useProjects';
import { useTracker } from '@/hooks/useTracker';
import { formatDayLabel, formatReadableDuration, parseDurationInput, todayKey } from '@/lib/utils';
import { STUDIO_PALETTE } from '@/lib/constants';
import { Task, TaskPriority } from '@/types';
import { Play, Plus, Archive, Trash2 } from 'lucide-react';

export default function TasksPage() {
  const router = useRouter();
  const tr = useTracker();
  const { projects, createProject, updateProject, deleteProject } = useProjects();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimateInput, setEstimateInput] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // One row per thread (the same task across days), newest activity first
  const threads = useMemo(() => {
    const seconds = new Map<string, number>();
    tr.allEntries.forEach((e) => {
      if (e.task_id) seconds.set(e.task_id, (seconds.get(e.task_id) || 0) + (e.duration_seconds || 0));
    });
    const groups = new Map<string, { latest: Task; days: number; seconds: number }>();
    [...tr.tasks]
      .sort((a, b) => b.day.localeCompare(a.day) || b.created_at.localeCompare(a.created_at))
      .forEach((t) => {
        const g = groups.get(t.thread_id);
        const secs = seconds.get(t.id) || 0;
        if (!g) groups.set(t.thread_id, { latest: t, days: 1, seconds: secs });
        else {
          g.days += 1;
          g.seconds += secs;
        }
      });
    return Array.from(groups.values());
  }, [tr.tasks, tr.allEntries]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const estimateSeconds = estimateInput.trim() ? parseDurationInput(estimateInput.trim()) : null;
    await tr.createTask({ title: title.trim(), day: todayKey(), projectId, priority, estimateSeconds });
    setTitle('');
    setEstimateInput('');
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim());
    setNewProjectName('');
  };

  const handleResume = async (task: Task) => {
    const target = await tr.resumeTask(task);
    router.push(target ? `/?task=${target.id}` : '/');
  };

  const visibleProjects = projects.filter((p) => showArchived || !p.is_archived);
  const fieldClass =
    'rounded-lg bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-saffron/40';

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-5xl px-5 sm:px-8 py-8 sm:py-12 space-y-10">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks & projects</h1>

        {/* Projects */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Projects</h2>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {visibleProjects.map((proj) => (
              <div
                key={proj.id}
                className={`inline-flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 md:pl-4 md:pr-2.5 md:py-2 rounded-full text-xs md:text-sm ${
                  proj.is_archived ? 'bg-muted/50 text-muted-foreground' : 'bg-muted'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const idx = STUDIO_PALETTE.findIndex((c) => c.hex === proj.color);
                    const nextColor = STUDIO_PALETTE[(idx + 1) % STUDIO_PALETTE.length].hex;
                    updateProject(proj.id, { color: nextColor });
                  }}
                  className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0 cursor-pointer hover:scale-125 transition-transform"
                  style={{ backgroundColor: proj.color }}
                  title="Click to cycle project color"
                  aria-label={`Change color for ${proj.name}`}
                />
                <span className="font-medium">{proj.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateProject(proj.id, {
                      is_billable: !proj.is_billable,
                      hourly_rate: proj.hourly_rate ?? 1000,
                    })
                  }
                  className={`px-2 py-0.5 rounded-full text-xs cursor-pointer ${
                    proj.is_billable ? 'text-saffron font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={proj.is_billable ? 'Billable (click to toggle)' : 'Mark billable'}
                >
                  {proj.is_billable ? 'Billable' : '$'}
                </button>
                <button
                  type="button"
                  onClick={() => updateProject(proj.id, { is_archived: !proj.is_archived })}
                  aria-label={proj.is_archived ? 'Unarchive project' : 'Archive project'}
                  title={proj.is_archived ? 'Unarchive' : 'Archive'}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5 md:w-4 md:h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setProjectToDelete({ id: proj.id, name: proj.name })}
                  aria-label={`Delete ${proj.name}`}
                  title="Delete project (keeps logged tasks & time)"
                  className="p-1.5 rounded-full text-muted-foreground hover:text-saffron cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" aria-hidden="true" />
                </button>
              </div>
            ))}

            <form onSubmit={handleAddProject} className="inline-flex items-center gap-1.5">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="+ New project"
                className="text-xs md:text-sm px-3.5 py-1.5 md:py-2 rounded-full bg-transparent hover:bg-muted focus:bg-muted focus:outline-none w-36 md:w-40 placeholder:text-muted-foreground"
              />
              {newProjectName.trim() && (
                <button
                  type="submit"
                  aria-label="Add project"
                  className="p-1.5 rounded-full bg-saffron text-saffron-foreground cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </form>
          </div>
        </section>

        {/* Tasks */}
        <section className="space-y-4">
          <form
            onSubmit={handleAddTask}
            className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Plan a task for today…"
              className="flex-1 min-w-[180px] text-sm bg-transparent px-1 focus:outline-none placeholder:text-muted-foreground/70"
            />
            <ProjectDotPicker
              projects={projects}
              selectedProjectId={projectId}
              onSelect={setProjectId}
              onCreateProject={createProject}
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              aria-label="Task priority"
              className={`${fieldClass} py-1.5 text-xs cursor-pointer`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="text"
              value={estimateInput}
              onChange={(e) => setEstimateInput(e.target.value)}
              placeholder="Est. 2h"
              className={`${fieldClass} py-1.5 text-xs font-mono w-24`}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full text-xs font-medium bg-saffron text-saffron-foreground hover:opacity-90 cursor-pointer"
            >
              Add
            </button>
          </form>

          {tr.tasksLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {threads.map(({ latest, days, seconds }) => {
                const proj = latest.project_id ? projects.find((p) => p.id === latest.project_id) : null;
                const est = latest.estimate_seconds;
                return (
                  <div
                    key={latest.thread_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/?task=${latest.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/?task=${latest.id}`)}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 cursor-pointer hover:border-foreground/20 hover:shadow-sm transition-[box-shadow,border-color]"
                    style={
                      proj
                        ? { borderLeftWidth: '3px', borderLeftColor: proj.color }
                        : undefined
                    }
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: proj?.color || 'var(--border)' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm md:text-base font-medium truncate">{latest.title}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {[
                          proj?.name,
                          latest.priority !== 'medium' ? `${latest.priority} priority` : null,
                          latest.day === todayKey() ? 'today' : `last ${formatDayLabel(latest.day)}`,
                          days > 1 ? `${days} days` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs md:text-sm tabular-nums ${est && seconds > est ? 'text-saffron' : 'text-foreground/85'}`}
                    >
                      {formatReadableDuration(seconds)}
                      {est ? <span className="text-muted-foreground"> / {formatReadableDuration(est)}</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResume(latest);
                      }}
                      aria-label={`Resume ${latest.title}`}
                      title="Resume today"
                      className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-saffron hover:text-saffron-foreground cursor-pointer sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Play className="w-3 h-3 fill-current translate-x-[1px]" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {projectToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-lg shadow-xl p-6 space-y-5">
            <div className="space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground block">
                ( Delete project )
              </span>
              <h2 className="font-display text-xl font-medium text-foreground">
                Delete &ldquo;{projectToDelete.name}&rdquo;?
              </h2>
              <p className="text-sm text-muted-foreground">
                Your logged tasks and time entries will be kept—only the project tag is removed.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = projectToDelete.id;
                  setProjectToDelete(null);
                  await deleteProject(id);
                }}
                className="px-4 py-2 rounded-full text-xs md:text-sm font-medium bg-saffron text-saffron-foreground hover:opacity-90 cursor-pointer"
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
