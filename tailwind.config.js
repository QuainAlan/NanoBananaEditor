/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
        line: { DEFAULT: v('border'), strong: v('border-strong') },
        ink: { DEFAULT: v('text'), 2: v('text-2') },
        muted: v('muted'),
        accent: { DEFAULT: v('accent'), 2: v('accent-2'), fg: v('accent-fg'), text: v('accent-text') },
        mask: v('mask'),
        danger: v('danger'),
        success: v('success'),
        info: v('info'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px -12px rgb(0 0 0 / 0.25)',
        pop: '0 12px 40px -12px rgb(0 0 0 / 0.45)',
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.5), 0 8px 30px -8px rgb(var(--c-accent) / 0.5)',
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        'marching-ants': 'marching-ants 0.5s linear infinite',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'marching-ants': { '0%': { 'stroke-dashoffset': '0' }, '100%': { 'stroke-dashoffset': '10' } },
      },
    },
  },
  plugins: [],
};
