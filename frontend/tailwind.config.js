/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Threat level colors
        'threat-green': '#22c55e',
        'threat-yellow': '#eab308',
        'threat-orange': '#f97316',
        'threat-red': '#dc2626',
        // Risk zone colors
        'danger-critical': '#dc2626',
        'danger-high': '#ea580c',
        'danger-moderate': '#f59e0b',
        'danger-low': '#84cc16',
        'safe': '#22c55e',
      },
      fontFamily: {
        thai: ['Noto Sans Thai', 'Sarabun', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'danger-pulse': 'danger-pulse 2s infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' },
        },
        'danger-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '50%': { boxShadow: '0 0 0 15px rgba(220, 38, 38, 0)' },
        },
      },
      boxShadow: {
        'sos': '0 0 30px rgba(220, 38, 38, 0.5)',
        'safe': '0 0 20px rgba(34, 197, 94, 0.4)',
      },
    },
  },
  plugins: [],
}
