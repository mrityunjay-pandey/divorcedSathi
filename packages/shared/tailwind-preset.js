/**
 * Shared Tailwind preset for DivorcedSathi.com.
 * Consumed by apps/web and apps/admin so both apps render the same design system.
 *
 * Kept as plain JS (not TS) because Tailwind loads config at build time via Node,
 * without a TS compilation step. Values are hand-mirrored from src/tokens.ts —
 * if you change one, change the other. (Module 1 note: a build-time codegen step
 * that generates this file from tokens.ts is a reasonable follow-up, not required
 * for MVP.)
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#F1F0FB",
          100: "#E2E0F5",
          200: "#C4C1EB",
          300: "#A19CDC",
          400: "#7D76C9",
          500: "#5D54B0",
          600: "#4A4291",
          700: "#3A3373",
          800: "#2A2554",
          900: "#1B1837",
        },
        secondary: {
          50: "#FBF6EC",
          100: "#F5E8CB",
          200: "#EAD196",
          300: "#DDB65E",
          400: "#C99A3A",
          500: "#AD7F28",
          600: "#8A651F",
          700: "#684C18",
          800: "#473310",
          900: "#2A1E09",
        },
        neutral: {
          0: "#FFFFFF",
          50: "#F8F8FA",
          100: "#F0F0F4",
          200: "#E1E1E9",
          300: "#C7C7D3",
          400: "#A3A3B5",
          500: "#7A7A90",
          600: "#5C5C70",
          700: "#43434F",
          800: "#2C2C36",
          900: "#17171D",
        },
        success: { 100: "#E4F5E9", 500: "#2F9E5B", 700: "#1F6E3E" },
        warning: { 100: "#FBF0DE", 500: "#C98A1F", 700: "#8A5E13" },
        danger: { 100: "#FBE7E7", 500: "#C4392F", 700: "#8A2820" },
        info: { 100: "#E7EEFB", 500: "#3563C4", 700: "#24468A" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(23, 23, 29, 0.06)",
        md: "0 4px 12px -2px rgba(23, 23, 29, 0.10)",
        lg: "0 12px 32px -8px rgba(23, 23, 29, 0.16)",
      },
    },
  },
};
