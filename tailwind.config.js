/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        control: {
          dark: '#0f172a',
          base: '#1e293b',
          surface: '#334155',
          border: '#475569',
          muted: '#64748b',
        },
        alert: {
          warning: '#f59e0b',
          warningDark: '#b45309',
          critical: '#dc2626',
          criticalDark: '#991b1b',
          info: '#3b82f6',
          infoDark: '#1d4ed8',
          success: '#10b981',
          successDark: '#047857',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.1)',
            boxShadow: '0 0 20px 10px rgba(220, 38, 38, 0)',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
