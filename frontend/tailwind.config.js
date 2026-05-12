/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gachon-blue': '#003876',
        'red-flag': '#e74c3c',
      }
    },
  },
  plugins: [],
}