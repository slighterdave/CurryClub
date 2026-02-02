/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indian: {
          saffron: '#FF9933',
          turmeric: '#FFBF00',
          gold: '#FFD700',
          rust: '#B7410E',
          clay: '#D4722C',
          spice: '#C14911',
          curry: '#CC7722',
          terracotta: '#E27B58',
          maroon: '#800020',
          cream: '#FFF8DC',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
}
