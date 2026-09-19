import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        accent: "var(--color-accent)",
        canvas: "var(--color-canvas)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        ink: "var(--color-ink)",
        "ink-muted": "var(--color-ink-muted)",
        "ink-inverse": "var(--color-ink-inverse)",
        link: "var(--color-link)",
        status: {
          present: "var(--color-status-present)",
          absent: "var(--color-status-absent)",
          late: "var(--color-status-late)",
          holiday: "var(--color-status-holiday)",
          "fee-due": "var(--color-status-fee-due)",
          published: "var(--color-status-published)",
        },
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
