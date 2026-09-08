/**
 * DivorcedSathi.com — Design Tokens
 *
 * Single source of truth for color, spacing, radius, shadow and typography
 * values. Consumed by the Tailwind preset (tailwind-preset.js) and directly
 * by components that need raw values (e.g. inline SVG, charts).
 *
 * Design intent: premium, mature, trustworthy — not a dating-app aesthetic.
 * Avoid saturated pinks/reds-as-primary, heart iconography as a UI metaphor,
 * or high-contrast "swipe" gradients.
 */

export const colors = {
  // Primary: deep indigo — stability, trust, maturity.
  primary: {
    50: "#F1F0FB",
    100: "#E2E0F5",
    200: "#C4C1EB",
    300: "#A19CDC",
    400: "#7D76C9",
    500: "#5D54B0", // base
    600: "#4A4291",
    700: "#3A3373",
    800: "#2A2554",
    900: "#1B1837",
  },
  // Secondary: warm gold — hope, new beginnings. Used sparingly (accents, badges).
  secondary: {
    50: "#FBF6EC",
    100: "#F5E8CB",
    200: "#EAD196",
    300: "#DDB65E",
    400: "#C99A3A",
    500: "#AD7F28", // base
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
} as const;

export const typography = {
  fontFamily: {
    sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
    serif: ["'Fraunces'", "ui-serif", "Georgia", "serif"], // headings — mature, editorial feel
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
} as const;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

export const shadow = {
  sm: "0 1px 2px 0 rgba(23, 23, 29, 0.06)",
  md: "0 4px 12px -2px rgba(23, 23, 29, 0.10)",
  lg: "0 12px 32px -8px rgba(23, 23, 29, 0.16)",
} as const;

export const tokens = { colors, typography, spacing, radius, shadow } as const;
export type DesignTokens = typeof tokens;
