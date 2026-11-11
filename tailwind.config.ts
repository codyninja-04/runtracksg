import type { Config } from 'tailwindcss'

// Palette from the spec: a pale mint page, white cards and one strong green.
// Red and blue are kept for heat only (hot run vs cool run), so when a colour
// shows up on a chart it always means temperature and nothing else.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F0FDF4',
        surface: '#FFFFFF',
        sunk: '#E6F4EA',
        line: '#D3E6D9',
        strong: '#B3D0BC',
        ink: '#0B1F14',
        muted: '#3D5747',
        faint: '#587361',
        primary: { DEFAULT: '#16A34A', hover: '#15803D', ink: '#14532D', soft: '#DCFCE7', wash: '#ECFDF3' },
        hot: { DEFAULT: '#DC2626', ink: '#B91C1C', soft: '#FEE2E2' },
        warm: { DEFAULT: '#F59E0B', ink: '#B45309', soft: '#FEF3C7' },
        cool: { DEFAULT: '#3B82F6', ink: '#1D4ED8', soft: '#DBEAFE' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 31, 20, 0.04), 0 8px 24px -16px rgba(11, 31, 20, 0.18)',
        lift: '0 2px 6px rgba(11, 31, 20, 0.06), 0 28px 56px -28px rgba(11, 31, 20, 0.36)',
        green: '0 10px 28px -12px rgba(22, 163, 74, 0.65)',
      },
      keyframes: {
        'rise-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        trace: { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
      },
      animation: {
        'rise-in': 'rise-in 0.35s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
        trace: 'trace 1.8s cubic-bezier(0.6, 0, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}

export default config
