/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./app.js"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        // Hace que `font-sans` use Cal Sans en primer lugar
        sans: ["\"Cal Sans\"", "system-ui", "sans-serif"],
        display: ["\"Zen Dots\"", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

