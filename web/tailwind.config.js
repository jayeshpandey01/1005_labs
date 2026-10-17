/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#0b0f19",
        surface: {
          DEFAULT: "#111827",
          hover: "#1f2937",
          muted: "#1e293b",
        },
        border: {
          dim: "#1f2937",
          glow: "#374151",
          active: "#06b6d4",
        },
        entity: {
          officer: "#06b6d4", // Cyan
          dealer: "#f59e0b",  // Amber
          visit: "#10b981",   // Emerald
          event: "#f43f5e",   // Rose
          nudge: "#a855f7",   // Purple
        },
        accent: {
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          purple: "#a855f7",
          blue: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};

