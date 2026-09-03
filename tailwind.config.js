/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Ini sapu bersih semua file dalam folder src
    "./src/**/*.{js,ts,jsx,tsx,mdx}",

    // Ini backup kalau file kau duduk luar src
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brutal: {
          coral: "#FF6B55",
          coralDark: "#E85943",
          amber: "#FBBF24",
          amberDark: "#D97706",
          indigo: "#6366F1",
          indigoDark: "#4F46E5",
          mint: "#10B981",
          mintDark: "#059669",
          dark: "#121214",
          surface: "#1A1A1E",
          card: "#24242B",
          border: "#000000",
        },
      },
      boxShadow: {
        "brutal-sm": "2px 2px 0px 0px rgba(0,0,0,1)",
        "brutal": "3px 3px 0px 0px rgba(0,0,0,1)",
        "brutal-lg": "5px 5px 0px 0px rgba(0,0,0,1)",
        "brutal-white": "3px 3px 0px 0px rgba(255,255,255,0.25)",
        "brutal-white-sm": "2px 2px 0px 0px rgba(255,255,255,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};