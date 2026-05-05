"use client";

import * as React from "react";
type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: "class" | string;
  defaultTheme?: Theme | "system";
  enableSystem?: boolean;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(rawTheme: string | null | undefined, enableSystem: boolean): Theme {
  if (rawTheme === "dark" || rawTheme === "light") return rawTheme;
  if (rawTheme === "system" && enableSystem) return getSystemTheme();
  return "light";
}

function applyThemeToDocument(attribute: string, theme: Theme) {
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  } else {
    root.setAttribute(attribute, theme);
  }

  root.style.colorScheme = theme;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const attribute = props.attribute ?? "class";
  const storageKey = props.storageKey ?? "dashboard-theme";
  const enableSystem = props.enableSystem ?? false;
  const defaultTheme = props.defaultTheme ?? "light";

  const [theme, setThemeState] = React.useState<Theme>(
    defaultTheme === "system" && enableSystem ? "light" : resolveTheme(defaultTheme, enableSystem),
  );

  React.useEffect(() => {
    const storedTheme = (() => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    })();

    const nextTheme = resolveTheme(storedTheme ?? defaultTheme, enableSystem);
    setThemeState(nextTheme);
    applyThemeToDocument(attribute, nextTheme);
  }, [attribute, defaultTheme, enableSystem, storageKey]);

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      setThemeState(nextTheme);
      applyThemeToDocument(attribute, nextTheme);

      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Ignore write failure (private mode, quota, etc).
      }
    },
    [attribute, storageKey],
  );

  const value = React.useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
