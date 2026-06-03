import type { Config } from "tailwindcss";

// Dark, clinical/scientific aesthetic. Mobile-first design tokens.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design-token layer — clinical dark theme.
        ink: {
          DEFAULT: "#0a0f14", // app background
          raised: "#111922", // cards / surfaces
          line: "#1f2c38", // hairline borders
        },
        clinical: {
          // Primary accent — a calm scientific teal.
          50: "#e6fbf7",
          100: "#c0f4ea",
          300: "#5fe0c8",
          400: "#2fd0b2",
          500: "#13b89a",
          600: "#0e9580",
          700: "#0b7365",
        },
        signal: {
          good: "#34d399",
          warn: "#fbbf24",
          bad: "#f87171",
          info: "#60a5fa",
        },
        muted: "#7c8b99",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
