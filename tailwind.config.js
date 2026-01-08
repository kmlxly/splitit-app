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
      },
    },
  },
  plugins: [],
};