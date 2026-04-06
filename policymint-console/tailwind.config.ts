import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        card: 'var(--bg-card)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        brand: 'var(--bg-brand)',
        success: 'var(--bg-success)',
        danger: 'var(--bg-danger)',
        warning: 'var(--bg-warning)',
        info: 'var(--bg-info)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        base: 'var(--radius-base)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      transitionDuration: {
        micro: '150ms',
        panel: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
