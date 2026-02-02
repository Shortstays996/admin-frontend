/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ssh-red': '#d11528',
        'ssh-dark-red': '#b01020',
      },
    },
  },
  plugins: [],
}

