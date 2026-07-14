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
          0: "var(--s0)",
          1: "var(--s1)",
          2: "var(--s2)",
          3: "var(--s3)",
          4: "var(--s4)",
        },
        brand: {
          pink:   "var(--pink)",
          blue:   "var(--blue)",
          cyan:   "var(--cyan)",
          green:  "var(--green)",
          orange: "var(--orange)",
          purple: "var(--purple)",
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
