import { theme } from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./**/*.{html,js}",
  ],
  theme: {
    extend: {
      colors: {
        'slate-blue': '#334155',
        'sage-green': '#86efac',
        'charcoal': '#1f2937',
        'cloud-white': '#f8fafc',
      },
      fontFamily: {
        'playfair': ['"Playfair Display"', 'serif'],
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
        'open-sans': ['"Open Sans"', 'sans-serif'],
      },
    },
  },
}
