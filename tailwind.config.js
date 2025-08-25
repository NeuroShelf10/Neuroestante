// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", lg: "2rem" } },
    extend: {
      maxWidth: { "7xl": "80rem" }, // 1280px
    },
  },
  safelist: [
    // Adicione aqui classes dinâmicas se você gerar strings tipo `bg-${cor}-500`
    // "bg-violet-50","text-violet-700","border-violet-100"
  ],
  plugins: [],
};
