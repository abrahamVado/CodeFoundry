// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        appBg: "#f3f5fb",          // whole app background
        sidebarBg: "#f7f8ff",      // left sidebar
        listBg: "#ffffff",         // list + content panels
        chipBg: "#f2f4ff",

        // Accent + interactive
        accent: "#57dab9ff",         // primary blue (like links / buttons)
        accentSoft: "#e4e8ff",
        accentHover: "#3fe6d0ff",

        // Text
        textMain: "#1d2234",
        textMuted: "#9aa0b5",
        textSoft: "#b9bed3",

        // Borders / separators
        borderSoft: "#e1e4f2",
        borderStrong: "#d3d7eb",

        // Semantic / labels
        warning: "#ffb74a",
        danger: "#ff6b6b",
        tagPurple: "#7c5cff",
        tagOrange: "#ff9f5b"
      },
      boxShadow: {
        card: "0 12px 30px rgba(31, 41, 80, 0.08)"
      },
      borderRadius: {
        xl2: "24px"
      }
    }
  },
  plugins: []
};
