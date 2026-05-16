import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── Light-mode bright palette (Path B) ──────────────────────────────
        // Background surfaces — slate-50 / white / slate-100 lift
        bg:          '#F8FAFC',
        surface:     '#FFFFFF',
        'surface-2': '#F1F5F9',
        'surface-3': '#E2E8F0',
        // Brand
        primary:     '#4F46E5',  // indigo
        'primary-2': '#6366F1',
        secondary:   '#7C3AED',  // violet (kept for the brand mark + gradients)
        'secondary-2': '#A78BFA',
        accent:      '#06B6D4',  // cyan
        'accent-2':  '#22D3EE',
        spark:       '#F59E0B',  // amber (warm highlights, warnings)
        // Text on light
        ink:         '#0F172A',  // slate-900
        'ink-2':     '#334155',  // slate-700
        mute:        '#64748B',  // slate-500
        // Lines
        line:        'rgba(15, 23, 42, 0.08)',
        'line-2':    'rgba(15, 23, 42, 0.14)',
        // Semantic
        success:     '#22C55E',
        warning:     '#F59E0B',
        danger:      '#EF4444',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        serif:   ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        glow:        '0 10px 30px -8px rgba(79, 70, 229, 0.25)',
        'glow-lg':   '0 20px 60px -12px rgba(79, 70, 229, 0.35)',
        'glow-cyan': '0 10px 30px -8px rgba(6, 182, 212, 0.3)',
        'glow-violet': '0 10px 30px -8px rgba(124, 58, 237, 0.3)',
        soft:        '0 10px 30px rgba(15, 23, 42, 0.06)',
        'soft-lg':   '0 20px 60px rgba(15, 23, 42, 0.10)',
      },
      keyframes: {
        'spin-slow':       { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'dot-pulse':       { '0%, 100%': { boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.22)' }, '50%': { boxShadow: '0 0 0 6px rgba(79, 70, 229, 0)' } },
        'view-in':         { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shake:             { '0%, 100%': { transform: 'translateX(0)' }, '20%, 60%': { transform: 'translateX(-6px)' }, '40%, 80%': { transform: 'translateX(6px)' } },
        'pop-in':          { from: { opacity: '0', transform: 'scale(0.85)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'fade-in':         { from: { opacity: '0' }, to: { opacity: '1' } },
        'x-cycle':         {
          '0%, 100%': { transform: 'rotate(0deg)',  color: '#4F46E5' },
          '33%':      { transform: 'rotate(8deg)',  color: '#06B6D4' },
          '66%':      { transform: 'rotate(-8deg)', color: '#7C3AED' },
        },
        'pulse-soft':      { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.8)' } },
        bounce:            { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'float-slow':      { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(20px, -30px)' } },
        'gradient-shift':  { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        marquee:           { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'reveal-up':       { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'sweep-x':         { from: { transform: 'translateX(-105%)' }, to: { transform: 'translateX(105%)' } },
      },
      animation: {
        'spin-slow':      'spin-slow 16s linear infinite',
        'dot-pulse':      'dot-pulse 2.2s ease-in-out infinite',
        'view-in':        'view-in 0.4s ease forwards',
        shake:            'shake 0.4s',
        'pop-in':         'pop-in 0.4s cubic-bezier(0.25, 1.4, 0.5, 1)',
        'fade-in':        'fade-in 0.3s ease',
        'x-cycle':        'x-cycle 6s ease-in-out infinite',
        'pulse-soft':     'pulse-soft 2s ease-in-out infinite',
        bounce:           'bounce 1.2s ease infinite',
        'float-slow':     'float-slow 14s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        marquee:          'marquee 50s linear infinite',
        'reveal-up':      'reveal-up 0.7s cubic-bezier(0.2, 0.7, 0.1, 1) both',
        'sweep-x':        'sweep-x 1.4s cubic-bezier(0.7, 0, 0.3, 1) forwards',
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #4F46E5, #7C3AED, #06B6D4)',
        'gradient-indigo':   'linear-gradient(135deg, #4F46E5, #6366F1)',
        'gradient-violet':   'linear-gradient(135deg, #7C3AED, #A78BFA)',
        'gradient-cyan':     'linear-gradient(135deg, #06B6D4, #22D3EE)',
        // Mesh gradient — overlapping radials. Tile size matters less for these.
        mesh: `
          radial-gradient(at 15% 20%, rgba(79, 70, 229, 0.14) 0px, transparent 50%),
          radial-gradient(at 85% 15%, rgba(6, 182, 212, 0.12) 0px, transparent 50%),
          radial-gradient(at 50% 90%, rgba(124, 58, 237, 0.10) 0px, transparent 50%)
        `,
      },
    },
  },
  plugins: [],
};

export default config;
