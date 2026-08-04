import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#2A1B12",
          light: "#5B4636",
          lighter: "#8C7461",
        },
        cream: {
          50: "#FDF9F2",
          100: "#FAF2E4",
          200: "#F2E4CC",
          300: "#E9D5B5",
          400: "#D9BE92",
          500: "#C4A377",
        },
        surface: {
          DEFAULT: "#FAF2E4",
          50: "#FDF9F2",
          100: "#FAF2E4",
          200: "#F2E4CC",
        },
        brand: {
          50: "#fbf1ec",
          100: "#f6e0d3",
          200: "#edc0a7",
          300: "#e09a76",
          400: "#d27045",
          500: "#C4542A",
          600: "#a6411f",
          700: "#8a3419",
          800: "#6f2914",
          900: "#571f10",
        },
        gold: {
          50: "#FDF6E8",
          100: "#F9E9C5",
          200: "#F3D99E",
          300: "#EBC775",
          400: "#E0B454",
          500: "#D4A14B",
          600: "#B8883A",
          700: "#9A6F2E",
          800: "#7A5723",
          900: "#5A3F19",
        },
        sage: {
          50: "#f4f6f0",
          100: "#e8ece2",
          200: "#d1d8c5",
          300: "#b5c4a3",
          400: "#8FA073",
          500: "#6B7F5E",
          600: "#55684A",
          700: "#3F4D38",
          800: "#2A3525",
          900: "#1A211A",
        },
        success: {
          50: "#f0fdf4",
          500: "#22c55e",
          600: "#16a34a",
        },
        danger: {
          50: "#fef2f2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
        warning: {
          50: "#fffbeb",
          500: "#f59e0b",
          600: "#d97706",
        },
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        body: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-inter)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", "0.875rem"],
        xs: ["0.75rem", "1rem"],
        sm: ["0.8125rem", "1.25rem"],
        base: ["1rem", "1.5rem"],
        lg: ["1.125rem", "1.75rem"],
        xl: ["1.25rem", "1.75rem"],
        "2xl": ["1.5rem", "2rem"],
        "3xl": ["1.875rem", "2.375rem"],
        "4xl": ["2.25rem", "2.75rem"],
        "5xl": ["3rem", "3.5rem"],
        "6xl": ["3.75rem", "4.25rem"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "24px",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        card: "0 1px 4px 0 rgba(15, 23, 42, 0.08), 0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        elevated: "0 4px 12px 0 rgba(15, 23, 42, 0.1), 0 2px 4px 0 rgba(15, 23, 42, 0.06)",
        popover: "0 8px 24px 0 rgba(15, 23, 42, 0.12)",
      },
      spacing: {
        safe: "var(--sal)",
      },
      height: {
        "safe-bottom": "calc(100% + var(--sab))",
      },
      paddingTop: {
        safe: "var(--sat)",
      },
      paddingRight: {
        safe: "var(--sar)",
      },
      paddingBottom: {
        safe: "var(--sab)",
      },
      paddingLeft: {
        safe: "var(--sal)",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "prep-pulse": "prep-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "prep-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
