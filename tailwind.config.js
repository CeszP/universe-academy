/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          500: '#e63946',
          600: '#c1121f',
          700: '#9d0208',
          900: '#370617',
        },
        surface: {
          50:  '#f8f8f8',
          100: '#f0f0f0',
          200: '#e0e0e0',
          700: '#2a2a2a',
          800: '#1c1c1c',
          900: '#111111',
        }
      }
    },
  },
  plugins: [],
}
