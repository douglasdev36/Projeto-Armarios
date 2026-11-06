import { useEffect, useState } from "react";

export type ColorTheme = "emerald" | "blue" | "violet" | "rose" | "orange";

export const COLOR_PALETTES: Record<ColorTheme, { name: string; hsl: string; hex: string; bgClass: string }> = {
  emerald: { name: "Verde Esmeralda", hsl: "145 63% 49%", hex: "#22c55e", bgClass: "bg-emerald-500" },
  blue: { name: "Azul", hsl: "217 91% 60%", hex: "#3b82f6", bgClass: "bg-blue-500" },
  violet: { name: "Roxo", hsl: "262 83% 58%", hex: "#8b5cf6", bgClass: "bg-violet-500" },
  rose: { name: "Rosa / Vermelho", hsl: "343 89% 60%", hex: "#f43f5e", bgClass: "bg-rose-500" },
  orange: { name: "Laranja", hsl: "24 95% 53%", hex: "#f97316", bgClass: "bg-orange-500" },
};

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as "light" | "dark";
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  const [primaryColor, setPrimaryColorState] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      const savedColor = localStorage.getItem("primaryColor") as ColorTheme;
      if (savedColor && COLOR_PALETTES[savedColor]) return savedColor;
    }
    return "emerald";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const palette = COLOR_PALETTES[primaryColor] || COLOR_PALETTES.emerald;
    root.style.setProperty("--primary", palette.hsl);
    root.style.setProperty("--ring", palette.hsl);
    root.style.setProperty("--sidebar-primary", palette.hsl);
    root.style.setProperty("--badge-success", palette.hsl);
    localStorage.setItem("primaryColor", primaryColor);
  }, [primaryColor]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const changePrimaryColor = (color: ColorTheme) => {
    setPrimaryColorState(color);
  };

  return { 
    theme, 
    setTheme, 
    toggleTheme, 
    isDark: theme === "dark",
    primaryColor,
    changePrimaryColor,
    colorPalettes: COLOR_PALETTES
  };
}
