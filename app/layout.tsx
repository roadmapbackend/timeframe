import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Timeframe',
  description: 'Minimalist, Notion-style daily time ledger',
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#191919' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-white dark:bg-[#191919] text-zinc-900 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
