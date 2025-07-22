
import type {Config} from 'tailwindcss';

const config = {
  darkMode: 'media', // or 'class'
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
     extend: {
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
