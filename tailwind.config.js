/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
          400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
          800: '#3730a3', 900: '#312e81',
        },
        ok: '#10b981',
        warn: '#f59e0b',
        err: '#ef4444',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 3px 0 rgba(0,0,0,0.06)',
        lifted: '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}
