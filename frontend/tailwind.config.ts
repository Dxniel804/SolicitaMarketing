import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vm: {
          bg: "#F5F7FB",
          surface: "#FFFFFF",
          ink: "#0B1220",
          inkSoft: "#182238",
          muted: "#6B7280",
          primary: "#2952E3",
          primaryDark: "#1B3ACB",
          accent: "#E84C3D",
          sidebar: "#0E1730",
        },
      },
      backgroundImage: {
        "vm-gradient": "linear-gradient(135deg, #6D5BF7 0%, #3B82F6 55%, #22D3EE 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
