import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        page: "var(--bg-page)",
        card: "var(--bg-card)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        brand: "var(--bg-brand)",
        success: "var(--bg-success)",
        danger: "var(--bg-danger)",
        warning: "var(--bg-warning)",
        info: "var(--bg-info)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        brand: "var(--text-brand)",
        success: "var(--text-success)",
        danger: "var(--text-danger)",
        warning: "var(--text-warning)",
        info: "var(--text-info)",
        "on-brand": "var(--text-on-brand)",
      },
      borderColor: {
        default: "var(--border-default)",
        hover: "var(--border-hover)",
        focus: "var(--border-focus)",
        success: "var(--border-success)",
        danger: "var(--border-danger)",
      },
      borderRadius: {
        badge: "6px",
        tile: "8px",
        card: "12px",
      },
      borderWidth: {
        "0.5": "0.5px",
        "3": "3px",
      },
    },
  },
  plugins: [],
};
export default config;
