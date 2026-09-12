import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        accent: "var(--color-accent)",
        canvas: "var(--color-background)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        ink: "var(--color-ink)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        tamil: "var(--font-tamil)",
      },
    },
  },
  plugins: [],
};

export default config;
