import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:"#eef6ff",100:"#d9eaff",200:"#bcd9ff",300:"#8ec0ff",400:"#599dff",500:"#3378f6",600:"#1d56eb",700:"#1843d8",800:"#1a38af",900:"#1b338a",950:"#152153" },
      },
      fontFamily: { sans: ["ui-sans-serif","system-ui","Segoe UI","Roboto","Helvetica Neue","Arial"] },
      boxShadow: { card: "0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)" },
    },
  },
  plugins: [],
};
export default config;
