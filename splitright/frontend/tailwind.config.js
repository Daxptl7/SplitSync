/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      colors: {
        brand: {
          deep: "#1E3A8A",
          dark: "#1D4ED8",
          main: "#3B82F6",
          light: "#60A5FA",
          pale: "#DBEAFE",
        },
        accent: {
          earth: "#8B6E4E",
          wheat: "#D4A574",
          cream: "#F4E8D1",
          sky: "#457B9D",
          sunset: "#E76F51",
          golden: "#F4A261",
        },
        surface: {
          bg: "#FAFAF5",
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          800: "#262626",
          900: "#171717",
        },
      },
      animation: {
        blob: "blob 7s infinite",
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
