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

/* Inline muted-dot project selector using semantic editorial tokens. */
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

  const handleCreate = async () => {
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border border-border hover:border-foreground/40 text-foreground transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
        title="Attach or change project"
      >
        {selected ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
              aria-hidden="true"
            />
            <span className="max-w-[88px] truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">+ project</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-52 z-40 rounded-md border border-border bg-card text-card-foreground shadow-lg p-2 space-y-1.5">
          {selected && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" aria-hidden="true" />
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
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors cursor-pointer ${
                  proj.id === selectedProjectId
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-foreground/85 hover:bg-muted/70'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: proj.color }}
                  aria-hidden="true"
                />
                <span className="truncate">{proj.name}</span>
              </button>
            ))}
          </div>

          {onCreateProject && (
            <div className="pt-1.5 border-t border-border flex items-center gap-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreate();
                  }
                }}
                placeholder="New project..."
                className="flex-1 text-xs px-2 py-1 bg-transparent border-b border-foreground/25 focus:border-saffron focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={handleCreate}
                aria-label="Create project"
                className="p-1.5 rounded bg-saffron text-saffron-foreground cursor-pointer hover:opacity-90"
              >
                <Plus className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
