/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EBF0F7",
          100: "#D1DDEF",
          200: "#A3BBD0",
          300: "#7599B1",
          400: "#4A7899",
          500: "#2B6CB0",
          600: "#1A365D",
          700: "#152D4E",
          800: "#10233F",
          900: "#0B1A30",
          950: "#071121",
        },
        accent: {
          DEFAULT: "#2B6CB0",
          light: "#3B82C4",
          dark: "#1E5A9E",
        },
        success: {
          DEFAULT: "#38A169",
          light: "#48BB78",
          dark: "#2F855A",
        },
        warning: {
          DEFAULT: "#D69E2E",
          light: "#ECC94B",
          dark: "#B7791F",
        },
        error: {
          DEFAULT: "#E53E3E",
          light: "#FC8181",
          dark: "#C53030",
        },
      },
      fontFamily: {
        heading: ['"DM Sans"', "system-ui", "sans-serif"],
        body: ['"Source Serif 4"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 300ms ease-out",
        "slide-right": "slideRight 200ms ease-out",
        blink: "blink 1s step-end infinite",
        "gradient-mesh": "gradientMesh 12s ease infinite",
        "fade-in-up": "fadeInUp 600ms ease-out both",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        gradientMesh: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
