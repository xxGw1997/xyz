import { useTheme } from "./providers/theme-provider";
import { Button } from "./ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export default function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <>
      <Button onClick={toggleTheme} variant="ghost" size="icon">
        {theme === "dark" ? <MoonIcon /> : <SunIcon />}
      </Button>
    </>
  );
}
