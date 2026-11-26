import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Time Tracker',
  description: 'Minimalist, ultra-clean time tracking application',
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
