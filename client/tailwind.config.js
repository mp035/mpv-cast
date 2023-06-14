/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  safelist: [
    'btn-primary',
    'btn-secondary',
    'btn-accent',
    'btn-neutral',
    'progress-primary',
    'progress-secondary',
  ],
}

