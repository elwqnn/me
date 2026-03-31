import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "@/components/icons";

export function ThemeToggle() {
  const toggle = useCallback(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
      <Sun size={18} className="block dark:hidden" />
      <Moon size={18} className="hidden dark:block" />
    </Button>
  );
}
