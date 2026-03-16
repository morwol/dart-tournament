/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // font-sans → Inter Variable (body text, labels, navigation)
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // font-display → Barlow Condensed (score displays, tournament titles)
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
