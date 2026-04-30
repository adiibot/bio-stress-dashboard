import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
        },
        tier1: "#10b981", // emerald 500
        tier2: "#f59e0b", // amber 500
        tier3: "#f97316", // orange 500
        tier4: "#e11d48", // rose 600
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        serif: ["Newsreader", "ui-serif", "Georgia", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(15,23,42,0.04)",
        cardHover: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
