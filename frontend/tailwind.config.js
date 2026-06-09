/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          high  : "#e74c3c",
          medium: "#f39c12",
          low   : "#2ecc71"
        }
      }
    },
  },
  plugins: [],
}