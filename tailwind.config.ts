import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:        '#0a0a0f',
        surface:   '#16161e',
        'surface-2': '#1f1f29',
        line:      'rgba(245, 243, 238, 0.08)',
        'line-2':  'rgba(245, 243, 238, 0.14)',
        primary:   '#7c3aed',
        'primary-2': '#a78bfa',
        accent:    '#84cc16',
        'accent-2': '#bef264',
        spark:     '#f97316',
        ink:       '#f5f3ee',
        'ink-2':   '#d4d4d8',
        mute:      '#6b7280',
        danger:    '#ef4444',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        'spin-slow':  { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'dot-pulse':  { '0%, 100%': { boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.22)' }, '50%': { boxShadow: '0 0 0 6px rgba(124, 58, 237, 0)' } },
        'view-in':    { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shake:        { '0%, 100%': { transform: 'translateX(0)' }, '20%, 60%': { transform: 'translateX(-6px)' }, '40%, 80%': { transform: 'translateX(6px)' } },
        'pop-in':     { from: { opacity: '0', transform: 'scale(0.85)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
        'x-cycle':    {
          '0%, 100%': { transform: 'rotate(0deg)',  color: '#7c3aed' },
          '33%':      { transform: 'rotate(8deg)',  color: '#84cc16' },
          '66%':      { transform: 'rotate(-8deg)', color: '#f97316' },
        },
        'pulse-soft': { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.8)' } },
        bounce:       { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: {
        'spin-slow':  'spin-slow 16s linear infinite',
        'dot-pulse':  'dot-pulse 2.2s ease-in-out infinite',
        'view-in':    'view-in 0.4s ease forwards',
        shake:        'shake 0.4s',
        'pop-in':     'pop-in 0.4s cubic-bezier(0.25, 1.4, 0.5, 1)',
        'fade-in':    'fade-in 0.3s ease',
        'x-cycle':    'x-cycle 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        bounce:       'bounce 1.2s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;
