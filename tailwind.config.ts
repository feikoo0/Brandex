import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Braindex OS core palette — mirrors CSS vars in globals.css
        surface: {
          0: "#0a0a0c",
          1: "#111114",
          2: "#17171a",
          3: "#1e1e22",
          4: "#26262b",
        },
        brand: {
          pink:   "#ff2d55",
          blue:   "#3a7bd5",
          cyan:   "#32d2f5",
          green:  "#34c759",
          orange: "#ff9f0a",
          purple: "#bf5af2",
        },
        border: "rgba(255,255,255,0.07)",
      },
      fontFamily: {
        sans: [
          '"Product Sans"',
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        pill: "99px",
        card: "20px",
        modal: "28px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "scale(0.94) translateY(-8px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in":  "fade-in 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        "slide-in": "slide-in 0.18s ease",
      },
    },
  },
  plugins: [],
};

export default config;
