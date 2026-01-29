import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors (Branded Linen & Charcoal)
        light: {
          background: '#FBFBF4',
          surface: '#FFFFFF',
          sidebar: '#F5F5ED',
          border: '#E8E8D9',
          'text-primary': '#121212',
          'text-secondary': '#4A4A4A',
          'text-disabled': '#A8A89E',
        },
        // Dark mode colors (Branded Midnight Charcoal)
        dark: {
          background: '#121212',
          surface: '#1A1A1A',
          sidebar: '#161616',
          elevated: '#242424',
          border: '#2C2C2C',
          'text-primary': '#F4F4F0',
          'text-secondary': '#A8A8A8',
          'text-disabled': '#666666',
        },
        // Brand colors (Antique Gold)
        primary: {
          DEFAULT: '#C5A059',
          hover: '#AB8B4D',
          'hover-dark': '#D4B26C',
        },
        secondary: {
          DEFAULT: '#A88A4D',
        },
        warning: {
          DEFAULT: '#E39A35',
        },
        // Scripture reference colors (Branded Gold/Tan)
        scripture: {
          link: '#AB8B4D',
          'link-dark': '#C5A059',
          'hover-bg': '#F5F5ED',
          'hover-bg-dark': '#242424',
          'selection': '#E8E8D9',
          'selection-dark': '#3D3D3D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [
    typography,
  ],
}
