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
        // Light mode colors
        light: {
          background: '#F5F5F7',
          surface: '#FFFFFF',
          sidebar: '#F0F2F5',
          border: '#D6D9E0',
          'text-primary': '#1F2430',
          'text-secondary': '#5C6578',
          'text-disabled': '#A4A9B6',
        },
        // Dark mode colors
        dark: {
          background: '#111218',
          surface: '#181A22',
          sidebar: '#151720',
          elevated: '#1F2230',
          border: '#2C3040',
          'text-primary': '#F4F5F8',
          'text-secondary': '#B3B8C7',
          'text-disabled': '#707585',
        },
        // Brand colors
        primary: {
          DEFAULT: '#2F5D9C',
          hover: '#264A7A',
          'hover-dark': '#3668AD',
        },
        secondary: {
          DEFAULT: '#2E8B57',
        },
        warning: {
          DEFAULT: '#E39A35',
        },
        // Scripture reference colors
        scripture: {
          link: '#2F5D9C',
          'link-dark': '#6FA8FF',
          'hover-bg': '#E3ECF8',
          'hover-bg-dark': '#273552',
          'selection': '#C9DBFF',
          'selection-dark': '#3257A8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
