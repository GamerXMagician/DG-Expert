/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Industrial / engineering palette
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#328fff',
          600: '#1b6ff5',
          700: '#1458e1',
          800: '#1747b6',
          900: '#193f8f',
          950: '#142757',
        },
        // Amber = caution / safety accent
        safety: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        steel: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d9e2',
          300: '#aeb8c9',
          400: '#8291aa',
          500: '#62728e',
          600: '#4d5b75',
          700: '#404a5f',
          800: '#374050',
          900: '#1f242f',
          950: '#131720',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
