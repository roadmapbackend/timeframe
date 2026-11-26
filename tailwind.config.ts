import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        notion: {
          bg: {
            light: '#ffffff',
            dark: '#191919',
          },
          sidebar: {
            light: '#f7f7f5',
            dark: '#202020',
          },
          border: {
            light: 'rgba(55, 53, 47, 0.09)',
            dark: 'rgba(255, 255, 255, 0.09)',
          },
          hover: {
            light: 'rgba(55, 53, 47, 0.04)',
            dark: 'rgba(255, 255, 255, 0.055)',
          },
          text: {
            primary: '#37352f',
            secondary: '#787774',
            darkPrimary: '#d4d4d8',
            darkSecondary: '#9ca3af',
          },
          blue: '#2383e2',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
