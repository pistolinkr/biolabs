import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  className?: string;
}

/** System / light / dark — synced with `next-themes` and `html.light` / `html.dark`. */
export default function ThemeSelector({ className }: ThemeSelectorProps) {
  const { t } = useTranslation("common");
  const { systemTheme, setTheme } = useTheme();

  return (
    <select
      value={systemTheme ?? "system"}
      onChange={(e) => setTheme(e.target.value)}
      aria-label={t("theme.system")}
      className={cn(
        "min-w-[120px] border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground focus:border-accent focus:outline-none",
        className,
      )}
    >
      <option value="system">{t("theme.system")}</option>
      <option value="dark">{t("theme.dark")}</option>
      <option value="light">{t("theme.light")}</option>
    </select>
  );
}
