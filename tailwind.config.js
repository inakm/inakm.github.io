/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      colors: {
        brand: {
          primary: '#222222',
          secondary: '#7B7B7B',
          tertiary: '#F8F8F8',
          white: '#ffffff',
          highlight: '#f3c623'
        }
      }
    }
  },
  plugins: [],
}
