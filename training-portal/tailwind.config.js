/**** @type {import('tailwindcss').Config} ****/
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#ac7af7',
        secondary: '#f3ecfe',
      },
    },
  },
  plugins: [],
};