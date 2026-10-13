/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:  '#1A2B4A',
          'navy-light': '#243560',
          'navy-dark':  '#111D33',
          orange: '#D94F1C',
          'orange-light': '#F4743B',
          'orange-dark':  '#A83710',
        },
      },
    },
  },
  plugins: [],
};
