/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#18191a',
          surface: '#242526',
          hover: '#3a3b3c',
          border: '#3a3b3c',
          input: '#3a3b3c',
          text: '#e4e6eb',
          'text-muted': '#b0b3b8',
        }
      },
      keyframes: {
        'enter': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'leave': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
      },
      animation: {
        'enter': 'enter 0.2s ease-out',
        'leave': 'leave 0.15s ease-in forwards',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
