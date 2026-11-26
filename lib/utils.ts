import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, TaskPriority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats seconds into human-readable e.g. "1h 45m" or "32m"
 */
export function formatReadableDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${safe}s`;
}

/**
 * Parses flexible duration strings: "1h45", "1h 45m", "1:45", "105m", "1.75", "1.75h"
 * Returns total seconds, or null if unparseable.
 */
export function parseDurationInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // 1h45, 1h 45m, 2h, 45m
  const hmMatch = s.match(/^(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+)m?)?$/);
  if (hmMatch && (hmMatch[1] || hmMatch[2])) {
    // Only match plain digits as minutes if there's an 'm' or 'h', or handle plain numbers below
    if (s.includes('h') || s.includes('m')) {
      const h = hmMatch[1] ? parseFloat(hmMatch[1]) : 0;
      const m = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
      const total = Math.round(h * 3600 + m * 60);
      return total > 0 ? total : null;
    }
  }

  // HH:MM (e.g. 1:45 -> 1h 45m)
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (m < 60) {
      const total = h * 3600 + m * 60;
      return total > 0 ? total : null;
    }
  }

  // Decimal hours like "1.75" or integer minutes like "45"
  if (/^\d+\.\d+$/.test(s)) {
    const hours = parseFloat(s);
    const total = Math.round(hours * 3600);
    return total > 0 ? total : null;
  }

  if (/^\d+$/.test(s)) {
    const mins = parseInt(s, 10);
    return mins > 0 ? mins * 60 : null;
  }

  return null;
}

export interface ParsedQuickAdd {
  description: string;
  durationSeconds: number | null;
  projectId: string | null;
  projectName: string | null;
  priority: TaskPriority;
  endedAt: Date;
}

/**
 * Parses natural-language quick-add: "Deep work 1h45 #research !high yesterday"
 */
export function parseQuickAddInput(
  raw: string,
  projects: Project[]
): ParsedQuickAdd {
  let text = raw.trim();
  let durationSeconds: number | null = null;
  let projectId: string | null = null;
  let projectName: string | null = null;
  let priority: TaskPriority = 'medium';
  const endedAt = new Date();

  // 1. Extract #project tag
  const tagMatch = text.match(/#([a-zA-Z0-9_-]+)/);
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    const matched = projects.find(
      (p) => !p.is_archived && p.name.toLowerCase() === tag
    );
    if (matched) {
      projectId = matched.id;
      projectName = matched.name;
    } else {
      projectName = tagMatch[1];
    }
    text = text.replace(tagMatch[0], ' ');
  }

  // 2. Extract !priority
  const prioMatch = text.match(/!(low|medium|high)\b/i);
  if (prioMatch) {
    priority = prioMatch[1].toLowerCase() as TaskPriority;
    text = text.replace(prioMatch[0], ' ');
  }

  // 3. Extract date keyword (yesterday / today)
  if (/\byesterday\b/i.test(text)) {
    endedAt.setDate(endedAt.getDate() - 1);
    text = text.replace(/\byesterday\b/i, ' ');
  } else if (/\btoday\b/i.test(text)) {
    text = text.replace(/\btoday\b/i, ' ');
  }

  // 4. Extract duration token (1h45, 1h 45m, 1:45, 105m, 1.75h)
  const durRegex = /\b(\d+h\s*\d+m?|\d+(?:\.\d+)?h|\d+m|\d+:\d{2})\b/i;
  const durMatch = text.match(durRegex);
  if (durMatch) {
    durationSeconds = parseDurationInput(durMatch[1]);
    text = text.replace(durMatch[0], ' ');
  }

  const description = text.replace(/\s+/g, ' ').trim();

  return {
    description,
    durationSeconds,
    projectId,
    projectName,
    priority,
    endedAt,
  };
}

export function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getLocalDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
