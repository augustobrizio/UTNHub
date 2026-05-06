import type { Config } from "tailwindcss";

/**
 * Design tokens del sistema "Kinetic Blueprint" del Stitch.
 *
 * Reglas duras (DESIGN.md):
 *  - prohibido usar borders 1px solid grises para secciones (usar tonal layering).
 *  - prohibido drop-shadows (usar glows con `box-shadow`).
 *  - el blanco puro #ffffff esta vetado, siempre usar `on-surface` (#dae2fd).
 *  - estados de los nodos: aprobado (#7dffa2), regular (#ffb950), cursable (#adc6ff).
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        outline: "#8d919b",
        "on-surface-variant": "#c3c6d1",
        "surface-container-low": "#131b2e",
        "surface-container-high": "#222a3d",
        primary: "#adc6ff",
        "surface-dim": "#0b1326",
        "on-background": "#dae2fd",
        "inverse-on-surface": "#283044",
        "surface-tint": "#adc6ff",
        error: "#ffb4ab",
        background: "#0b1326",
        "primary-fixed-dim": "#adc6ff",
        "on-surface": "#dae2fd",
        "on-secondary": "#003918",
        "on-primary-fixed": "#001a41",
        "tertiary-container": "#4f3200",
        "error-container": "#93000a",
        "on-secondary-container": "#00622e",
        "secondary-fixed": "#62ff96",
        "on-secondary-fixed-variant": "#005226",
        "tertiary-fixed-dim": "#ffb950",
        "on-tertiary-fixed-variant": "#624000",
        "on-primary": "#002e69",
        "outline-variant": "#434750",
        "secondary-fixed-dim": "#00e475",
        "on-error-container": "#ffdad6",
        "surface-container": "#171f33",
        "tertiary-fixed": "#ffddb3",
        "surface-container-lowest": "#060e20",
        "on-tertiary": "#452b00",
        "on-secondary-fixed": "#00210b",
        "on-tertiary-container": "#db9200",
        "surface-variant": "#2d3449",
        surface: "#0b1326",
        "on-primary-container": "#6fa1ff",
        "on-error": "#690005",
        "inverse-surface": "#dae2fd",
        "surface-bright": "#31394d",
        "secondary-container": "#05e777",
        secondary: "#7dffa2",
        "on-tertiary-fixed": "#291800",
        "primary-container": "#003678",
        tertiary: "#ffb950",
        "on-primary-fixed-variant": "#004494",
        "surface-container-highest": "#2d3449",
        "primary-fixed": "#d8e2ff",
        "inverse-primary": "#005ac1",
      },
      fontFamily: {
        headline: ["var(--font-manrope)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        label: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
