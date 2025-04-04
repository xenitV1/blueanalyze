/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3355FF",
        secondary: "#1B2BDE",
        background: {
          light: "#F3F4F6",
          dark: "#1F2937"
        },
        card: {
          light: "#FFFFFF",
          dark: "#374151"
        },
        text: {
          light: "#1F2937",
          dark: "#F9FAFB"
        },
        white: "#FFFFFF", 
        gray: {
          950: "#0f172a",
          300: "#d1d5db",
        }
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      backdropFilter: {
        'glass': 'blur(4px)',
      },
    },
  },
  plugins: [],
} 