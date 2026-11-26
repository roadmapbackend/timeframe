'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project } from '@/types';
import { Plus, X } from 'lucide-react';

interface ProjectDotPickerProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
  onCreateProject?: (name: string) => Promise<Project | null>;
}

export function ProjectDotPicker({
  projects,
  selectedProjectId,
  onSelect,
  onCreateProject,
}: ProjectDotPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const activeProjects = projects.filter((p) => !p.is_archived);
  const selected = projects.find((p) => p.id === selectedProjectId) || null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !onCreateProject) return;
    const created = await onCreateProject(newName.trim());
    if (created) {
      onSelect(created.id);
      setNewName('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
        title="Attach or change project"
      >
        {selected ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span className="max-w-[80px] truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-zinc-400">+ project</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-48 z-40 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#202020] shadow-lg p-1.5 space-y-1">
          {selected && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-1.5 px-2 py-1 rounded text-[11px] text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-3 h-3" />
              <span>Clear project</span>
            </button>
          )}

          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {activeProjects.map((proj) => (
              <button
                key={proj.id}
                type="button"
                onClick={() => {
                  onSelect(proj.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-xs text-left transition-colors ${
                  proj.id === selectedProjectId
                    ? 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: proj.color }}
                />
                <span className="truncate">{proj.name}</span>
              </button>
            ))}
          </div>

          {onCreateProject && (
            <form onSubmit={handleCreate} className="pt-1 border-t border-zinc-100 dark:border-zinc-800 flex items-center space-x-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New project..."
                className="flex-1 text-[11px] px-1.5 py-1 bg-transparent border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="p-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                title="Create project"
              >
                <Plus className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
