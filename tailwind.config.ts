import type { Config } from 'tailwindcss';

const withAlpha = (variable: string) =>
  `color-mix(in oklab, var(${variable}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // color-mix lets opacity modifiers (bg-muted/60, border-saffron/50) work with CSS variables
      colors: {
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        card: withAlpha('--card'),
        'card-foreground': withAlpha('--card-foreground'),
        muted: withAlpha('--muted'),
        'muted-foreground': withAlpha('--muted-foreground'),
        border: withAlpha('--border'),
        saffron: withAlpha('--saffron'),
        'saffron-foreground': withAlpha('--saffron-foreground'),
      },
      fontFamily: {
        display: [
          '"Clash Display"',
          '"Atkinson Hyperlegible"',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        sans: [
          '"Atkinson Hyperlegible"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
