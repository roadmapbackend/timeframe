export const STUDIO_PALETTE = [
  { name: 'Ultramarine', hex: '#2b4596', darkHex: '#5c7cfa' },
  { name: 'Verdigris Teal', hex: '#0f766e', darkHex: '#2dd4bf' },
  { name: 'Mulberry', hex: '#882962', darkHex: '#e879b9' },
  { name: 'Acid Moss', hex: '#6b7f1e', darkHex: '#a3c938' },
  { name: 'Vermilion', hex: '#d9482b', darkHex: '#f06543' },
  { name: 'Marigold', hex: '#c27803', darkHex: '#f5b73b' },
  { name: 'Cerulean', hex: '#0284c7', darkHex: '#38bdf8' },
  { name: 'Warm Graphite', hex: '#4a443f', darkHex: '#a8a096' },
];

export const NOTION_COLORS = STUDIO_PALETTE.map((c) => ({
  ...c,
  bg: `color-mix(in oklab, ${c.hex} 12%, transparent)`,
}));

export const STORAGE_KEY_TIMER = 'notion_active_timer_v1';
export const STORAGE_KEY_ENTRIES = 'notion_time_entries_backup_v1';
