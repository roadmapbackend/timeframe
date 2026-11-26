import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Timeframe — Daily Time Ledger',
    short_name: 'Timeframe',
    description: 'Minimalist, Notion-style daily time ledger and focus tracker.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#191919',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
