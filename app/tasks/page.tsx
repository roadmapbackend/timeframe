'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ProjectDotPicker } from '@/components/projects/ProjectDotPicker';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { formatReadableDuration, parseDurationInput } from '@/lib/utils';
import { TaskPriority, TaskStatus } from '@/types';
import { Play, Plus, Trash2, Archive, ArrowLeft } from 'lucide-react';

export default function TasksPage() {
  const router = useRouter();
  const { tasks, isLoading, createTask, deleteTask, cycleStatus } = useTasks();
  const { projects, createProject, updateProject } = useProjects();
  const { entries, isCloudConnected, startTimer } = useTimeEntries();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimateInput, setEstimateInput] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Aggregate actual logged seconds per task_id
  const actualByTask = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      if (e.task_id && e.duration_seconds) {
        map.set(e.task_id, (map.get(e.task_id) || 0) + e.duration_seconds);
      }
    });
    return map;
  }, [entries]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const estimateSeconds = estimateInput.trim()
      ? parseDurationInput(estimateInput.trim())
      : null;

    await createTask({
      title: title.trim(),
      projectId,
      priority,
      estimateSeconds,
    });
    setTitle('');
    setEstimateInput('');
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim());
    setNewProjectName('');
  };

  const handleStartTaskTimer = async (task: {
    id: string;
    title: string;
    project_id: string | null;
  }) => {
    await startTimer(task.title, task.project_id, task.id);
    router.push('/');
  };

  const statusBadge = (status: TaskStatus) => {
    if (status === 'done') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (status === 'in_progress') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  };

  const statusLabel = (status: TaskStatus) =>
    status === 'in_progress' ? 'In progress' : status === 'done' ? 'Done' : 'To do';

  const visibleProjects = projects.filter((p) => showArchived || !p.is_archived);

  return (
    <div className="flex min-h-screen">
      <Sidebar isCloudConnected={isCloudConnected} />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Tasks & Projects" />

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-8">
          <div className="flex items-center md:hidden">
            <Link
              href="/"
              className="inline-flex items-center space-x-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Ledger</span>
            </Link>
          </div>

          {/* Projects Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Projects
              </h2>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {showArchived ? 'Hide archived' : 'Show archived'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {visibleProjects.map((proj) => (
                <div
                  key={proj.id}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs ${
                    proj.is_archived
                      ? 'border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: proj.color }}
                  />
                  <span>{proj.name}</span>
                  <button
                    onClick={() =>
                      updateProject(proj.id, { is_archived: !proj.is_archived })
                    }
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 pl-1"
                    title={proj.is_archived ? 'Unarchive project' : 'Archive project'}
                  >
                    <Archive className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddProject} className="inline-flex items-center space-x-1">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="+ New project"
                  className="text-xs px-2 py-1 border border-dashed border-zinc-300 dark:border-zinc-700 rounded bg-transparent focus:outline-none focus:border-zinc-500 w-32"
                />
                {newProjectName.trim() && (
                  <button
                    type="submit"
                    className="p-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>
          </section>

          {/* Tasks Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tasks ({tasks.length})
            </h2>

            {/* Add Task Bar */}
            <form
              onSubmit={handleAddTask}
              className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#191919] rounded-md px-3 py-2 flex flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a task (e.g. Draft Q4 architecture doc)..."
                className="flex-1 min-w-[180px] text-xs bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100"
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
                className="text-[11px] px-1.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-[#191919] text-zinc-600 dark:text-zinc-300 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <input
                type="text"
                value={estimateInput}
                onChange={(e) => setEstimateInput(e.target.value)}
                placeholder="Est (e.g. 2h)"
                className="w-24 text-[11px] font-mono px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded bg-transparent focus:outline-none text-zinc-800 dark:text-zinc-200"
              />

              <button
                type="submit"
                className="px-3 py-1 rounded text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
              >
                Add Task
              </button>
            </form>

            {/* Tasks Table */}
            {isLoading ? (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-md p-8 text-center text-xs text-zinc-400">
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md p-10 text-center text-xs text-zinc-400">
                No tasks yet. Create one above to track estimates vs actual hours.
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-[#191919]">
                <div className="grid grid-cols-12 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3.5 py-2 bg-zinc-50 dark:bg-[#202020] border-b border-zinc-200 dark:border-zinc-800">
                  <div className="col-span-5">Task</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Priority</div>
                  <div className="col-span-3 text-right">Actual / Est</div>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {tasks.map((task) => {
                    const proj = task.project_id
                      ? projects.find((p) => p.id === task.project_id)
                      : null;
                    const actualSecs = actualByTask.get(task.id) || 0;

                    return (
                      <div
                        key={task.id}
                        className="grid grid-cols-12 items-center px-3.5 py-2 text-xs hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 group"
                      >
                        <div className="col-span-5 flex items-center space-x-2 pr-2 min-w-0">
                          {proj && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: proj.color }}
                              title={proj.name}
                            />
                          )}
                          <span
                            className={`truncate font-medium ${
                              task.status === 'done'
                                ? 'line-through text-zinc-400'
                                : 'text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <button
                            onClick={() => cycleStatus(task)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge(
                              task.status
                            )}`}
                            title="Click to cycle status"
                          >
                            {statusLabel(task.status)}
                          </button>
                        </div>

                        <div className="col-span-2 text-[11px] text-zinc-500 capitalize">
                          {task.priority}
                        </div>

                        <div className="col-span-3 flex items-center justify-end space-x-2 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                          <span>
                            {actualSecs > 0 ? formatReadableDuration(actualSecs) : '0m'}
                            {task.estimate_seconds
                              ? ` / ${formatReadableDuration(task.estimate_seconds)}`
                              : ''}
                          </span>
                          <button
                            onClick={() => handleStartTaskTimer(task)}
                            className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded"
                            title="Start timer for this task"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 rounded transition-opacity"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
