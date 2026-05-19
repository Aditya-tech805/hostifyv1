import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── Dark-mode editorial palette ─────────────────────────────────────
        // The page is dark; surfaces step up via elevation (bg → surface → -2 → -3).
        // Brand accents are tuned a touch brighter for contrast on the dark bg.
        bg:          '#0A0B14',  // page — near-black with a hint of blue
        surface:     '#14151F',  // raised: cards, sticky bars
        'surface-2': '#1C1D2A',  // more raised: dramatic sections, inputs
        'surface-3': '#28293A',  // most raised: hover, popovers
        // Brand — unchanged hues so the identity carries, tuned for dark contrast
        primary:     '#6366F1',  // indigo-500 (a step lighter than 600 for dark legibility)
        'primary-2': '#818CF8',
        secondary:   '#A78BFA',  // violet-400
        'secondary-2': '#C4B5FD',
        accent:      '#22D3EE',  // cyan-400
        'accent-2':  '#67E8F9',
        spark:       '#FBBF24',  // amber-400
        // Text on dark — cream off-white primary, slate ramp for hierarchy
        ink:         '#F5F3EE',  // warm cream (vs pure white — softer on the eye)
        'ink-2':     '#CBD5E1',  // slate-300
        mute:        '#94A3B8',  // slate-400
        // Lines — light alpha over the dark bg
        line:        'rgba(245, 243, 238, 0.08)',
        'line-2':    'rgba(245, 243, 238, 0.16)',
        // Semantic — slightly brighter for dark
        success:     '#34D399',
        warning:     '#FBBF24',
        danger:      '#F87171',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        serif:   ['var(--font-serif)', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Brand-tinted glows — read well against the dark canvas
        glow:          '0 10px 30px -8px rgba(99, 102, 241, 0.45)',
        'glow-lg':     '0 20px 60px -12px rgba(99, 102, 241, 0.55)',
        'glow-cyan':   '0 10px 30px -8px rgba(34, 211, 238, 0.45)',
        'glow-violet': '0 10px 30px -8px rgba(167, 139, 250, 0.45)',
        // Soft = pure black falloff — adds depth on dark surfaces
        soft:          '0 10px 30px rgba(0, 0, 0, 0.35)',
        'soft-lg':     '0 24px 60px rgba(0, 0, 0, 0.55)',
      },
      keyframes: {
        'spin-slow':       { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'dot-pulse':       { '0%, 100%': { boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.22)' }, '50%': { boxShadow: '0 0 0 6px rgba(79, 70, 229, 0)' } },
        'view-in':         { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shake:             { '0%, 100%': { transform: 'translateX(0)' }, '20%, 60%': { transform: 'translateX(-6px)' }, '40%, 80%': { transform: 'translateX(6px)' } },
        'pop-in':          { from: { opacity: '0', transform: 'scale(0.85)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'fade-in':         { from: { opacity: '0' }, to: { opacity: '1' } },
        // x-cycle keyframe + animation removed: previously rotated the X in
        // INNOVATRIX +/- 8 degrees, which at tight tracking caused the X
        // to overlap the preceding I and read as INNOVATRX. The hero is
        // now one continuous wordmark with a gradient-shift animation.
        'pulse-soft':      { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.5', transform: 'scale(0.8)' } },
        bounce:            { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'float-slow':      { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(20px, -30px)' } },
        'gradient-shift':  { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        marquee:           { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'reveal-up':       { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'sweep-x':         { from: { transform: 'translateX(-105%)' }, to: { transform: 'translateX(105%)' } },
        'slide-in':        { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        // Prize-ceremony animations
        'champion-rise':   {
          '0%':   { opacity: '0', transform: 'translateY(60px) scale(0.7)' },
          '60%':  { opacity: '1', transform: 'translateY(-8px) scale(1.04)' },
          '100%': { opacity: '1', transform: 'translateY(0)    scale(1)' },
        },
        'confetti-fall': {
          '0%':   { opacity: '0', transform: 'translate3d(0, -10vh, 0) rotate(0deg)' },
          '10%':  { opacity: '1' },
          '100%': { opacity: '1', transform: 'translate3d(var(--confetti-x, 0), 110vh, 0) rotate(720deg)' },
        },
        'leaderboard-row': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'medal-shimmer': {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%':      { filter: 'brightness(1.25)' },
        },
      },
      animation: {
        'spin-slow':      'spin-slow 16s linear infinite',
        'dot-pulse':      'dot-pulse 2.2s ease-in-out infinite',
        'view-in':        'view-in 0.4s ease forwards',
        shake:            'shake 0.4s',
        'pop-in':         'pop-in 0.4s cubic-bezier(0.25, 1.4, 0.5, 1)',
        'fade-in':        'fade-in 0.3s ease',
        'pulse-soft':     'pulse-soft 2s ease-in-out infinite',
        bounce:           'bounce 1.2s ease infinite',
        'float-slow':     'float-slow 14s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        marquee:          'marquee 50s linear infinite',
        'reveal-up':      'reveal-up 0.7s cubic-bezier(0.2, 0.7, 0.1, 1) both',
        'sweep-x':        'sweep-x 1.4s cubic-bezier(0.7, 0, 0.3, 1) forwards',
        'slide-in':       'slide-in 0.7s cubic-bezier(0.2, 0.7, 0.1, 1) both',
        'champion-rise':  'champion-rise 1.2s cubic-bezier(0.2, 1.4, 0.4, 1) both',
        'confetti-fall':  'confetti-fall var(--confetti-dur, 3.5s) ease-in var(--confetti-delay, 0s) infinite',
        'leaderboard-row':'leaderboard-row 0.5s ease-out both',
        'medal-shimmer':  'medal-shimmer 2.2s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #6366F1, #A78BFA, #22D3EE)',
        'gradient-indigo':   'linear-gradient(135deg, #6366F1, #818CF8)',
        'gradient-violet':   'linear-gradient(135deg, #A78BFA, #C4B5FD)',
        'gradient-cyan':     'linear-gradient(135deg, #22D3EE, #67E8F9)',
        // Mesh gradient — soft brand glows behind the dark canvas
        mesh: `
          radial-gradient(at 15% 20%, rgba(99, 102, 241, 0.22) 0px, transparent 50%),
          radial-gradient(at 85% 15%, rgba(34, 211, 238, 0.18) 0px, transparent 50%),
          radial-gradient(at 50% 90%, rgba(167, 139, 250, 0.16) 0px, transparent 50%)
        `,
      },
    },
  },
  plugins: [],
};

export default config;
