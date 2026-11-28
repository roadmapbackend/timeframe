import type { Metadata, Viewport } from 'next';
import { Agentation } from 'agentation';
import { EditorialNav } from '@/components/layout/EditorialNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Timeframe',
  description: 'A quiet daily time ledger for focused work.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Timeframe',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0b09' },
  ],
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Newsreader:ital,opsz,wght@0,6..72,400..500;1,6..72,400..500&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased bg-background text-foreground selection:bg-saffron/20">
        <EditorialNav />
        {children}
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
