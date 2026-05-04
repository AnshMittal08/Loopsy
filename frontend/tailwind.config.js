/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Surfaces */
        "surface": "#F6F9FF",
        "surface-bright": "#FFFFFF",
        "surface-dim": "#D8E4F0",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-low": "#EEF4FC",
        "surface-container": "#E2EDF8",
        "surface-container-high": "#D4E4F4",
        "surface-container-highest": "#C4D8EE",
        "surface-variant": "#E2EDF8",
        "surface-tint": "#1E40AF",
        "background": "#F6F9FF",

        /* Text */
        "on-surface": "#0A1428",
        "on-surface-variant": "#374A60",
        "on-background": "#0A1428",
        "inverse-surface": "#0F2040",
        "inverse-on-surface": "#EEF4FC",

        /* Primary: Rich Navy */
        "primary": "#1E40AF",
        "primary-dim": "#1730A0",
        "primary-fixed": "#DBEAFE",
        "primary-fixed-dim": "#BFDBFE",
        "on-primary": "#FFFFFF",
        "on-primary-fixed": "#1E3A8A",
        "on-primary-fixed-variant": "#1E40AF",
        "primary-container": "#DBEAFE",
        "on-primary-container": "#1E3A8A",
        "inverse-primary": "#93C5FD",

        /* Secondary: Slate Blue */
        "secondary": "#4E6878",
        "secondary-dim": "#3A5060",
        "secondary-fixed": "#C8DDE8",
        "secondary-fixed-dim": "#A8C8D8",
        "on-secondary": "#FFFFFF",
        "on-secondary-fixed": "#0A2030",
        "on-secondary-fixed-variant": "#1A3048",
        "secondary-container": "#D8EAF4",
        "on-secondary-container": "#0A2030",

        /* Tertiary: Warm Amber */
        "tertiary": "#B45309",
        "tertiary-dim": "#92400E",
        "tertiary-fixed": "#FEF3C7",
        "tertiary-fixed-dim": "#FDE68A",
        "on-tertiary": "#FFFFFF",
        "on-tertiary-fixed": "#451A03",
        "on-tertiary-fixed-variant": "#78350F",
        "tertiary-container": "#FEF3C7",
        "on-tertiary-container": "#451A03",

        /* Error */
        "error": "#DC2626",
        "error-dim": "#B91C1C",
        "error-container": "#FEE2E2",
        "on-error": "#FFFFFF",
        "on-error-container": "#7F1D1D",

        /* Outline */
        "outline": "#5A7890",
        "outline-variant": "#A8C4D8",
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "md": "1.5rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      fontFamily: {
        "display": ["Fraunces", "serif"],
        "headline": ["Plus Jakarta Sans", "sans-serif"],
        "body": ["Plus Jakarta Sans", "sans-serif"],
        "label": ["Plus Jakarta Sans", "sans-serif"]
      }
    }
  },
  plugins: [],
}
