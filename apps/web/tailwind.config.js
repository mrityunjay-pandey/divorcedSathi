/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@divorcedsathi/shared/tailwind-preset.js")],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
