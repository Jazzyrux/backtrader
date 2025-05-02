/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trading': {
          'up': '#26a69a',
          'down': '#ef5350',
        },
      },
    },
  },
  plugins: [],
} 