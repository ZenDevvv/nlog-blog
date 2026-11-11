/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6EEB83", // Replace with your desired primary color
        darkBg: '#272727'
      },
      fontFamily: {
        serif: ['DM Serif Display', 'serif'],
        sans: ['Lexend Deca', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
