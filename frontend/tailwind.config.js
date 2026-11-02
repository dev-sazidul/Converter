/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132421",
        muted: "#5C6F6B",
        line: "#D7E2DF",
        paper: "#F3F6F5",
        primary: {
          DEFAULT: "#0C5F5A",
          dark: "#084843",
          soft: "#E7F4F2",
        },
        danger: {
          DEFAULT: "#9F1C1C",
          soft: "#FDECEC",
        },
        success: {
          DEFAULT: "#067647",
          soft: "#E7F6EE",
        },
        soon: {
          DEFAULT: "#8A5A12",
          soft: "#FBF3E4",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(19, 36, 33, 0.04), 0 12px 32px rgba(19, 36, 33, 0.05)",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};
