/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Young Serif', 'Georgia', 'serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#161210',
          50: '#1e1a16',
          100: '#262119',
          200: '#312a22',
          300: '#3d342a',
          400: '#4a3f33',
        },
        accent: {
          DEFAULT: '#c08b5f',
          light: '#d4a47d',
          dark: '#a6754c',
          cyan: '#7d9a76', // repurposed: muted sage for "live" states
        },
        neon: {
          purple: '#c08b5f', // mapped to accent for compatibility
          cyan: '#7d9a76',   // sage green
          pink: '#b87a6b',   // muted terracotta
        },
        cream: {
          DEFAULT: '#e4dcd2',
          dim: '#a69a8c',
          muted: '#7a6f63',
        },
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #a6754c, #c08b5f)',
        'gradient-neon-hover': 'linear-gradient(135deg, #c08b5f, #d4a47d)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'eq-1': 'eq1 0.8s ease-in-out infinite',
        'eq-2': 'eq2 0.6s ease-in-out infinite',
        'eq-3': 'eq3 0.9s ease-in-out infinite',
        'vinyl-spin': 'vinylSpin 4s linear infinite',
      },
      keyframes: {
        eq1: {
          '0%, 100%': { height: '30%' },
          '50%': { height: '100%' },
        },
        eq2: {
          '0%, 100%': { height: '60%' },
          '50%': { height: '20%' },
        },
        eq3: {
          '0%, 100%': { height: '45%' },
          '50%': { height: '90%' },
        },
        vinylSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
