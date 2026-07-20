/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
        display: ['Anton', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#222222',
          secondary: '#7B7B7B',
          tertiary: '#F8F8F8',
          white: '#ffffff',
          highlight: '#f3c623',
          stormy: '#006466',
          darkTeal: '#065a60',
          charcoal: '#1b3a4b',
          deepSpace: '#212f45',
          indigo: '#272640',
          midnight: '#312244',
          deepPurple: '#4d194d',
          lavender: '#d5cfe1',
          pbi: '#F2C811',
          positive: '#00FA9A',
          negative: '#FF6347',
        }
      },
      backgroundImage: {
        'ledger-pattern': 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
      }
    }
  },
  plugins: [],
}
