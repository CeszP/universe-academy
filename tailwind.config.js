/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
      },
      colors: {
        // Morado principal
        universe: {
          300: "#c4a3e0",
          400: "#a87dcf",
          500: "#8c57be",
          600: "#502387",
          700: "#3d1a68",
          800: "#2a1249",
          900: "#1a0b30",
        },
        // Azul marino / royal
        navy: {
          400: "#6b82b8",
          500: "#4B6D84",
          600: "#3a5569",
          700: "#2a3d4f",
          800: "#1c2a36",
          900: "#181C66",
          950: "#0f1240",
        },
        // Púrpura rosado
        nebula: {
          300: "#d4a0d6",
          400: "#b97dbc",
          500: "#9e5aa1",
          600: "#945C97",
          700: "#723875",
          800: "#502554",
          900: "#301530",
        },
        // Fondo oscuro cosmos
        cosmos: {
          700: "#1e1e2e",
          800: "#16162a",
          900: "#0e0e1f",
          950: "#07070f",
        },
      },
      borderOpacity: { 8: "0.08" },
    },
  },
  plugins: [],
};
