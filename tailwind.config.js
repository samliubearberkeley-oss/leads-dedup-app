/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0f172a',
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
        'surface': '#1e293b',
        'surface-light': '#334155',
        'success': '#10b981',
        'warning': '#f59e0b',
        'danger': '#ef4444',
      },
      fontFamily: {
        'display': ['Clash Display', 'Inter', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
