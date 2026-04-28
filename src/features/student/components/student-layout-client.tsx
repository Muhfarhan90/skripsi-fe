"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface StudentLayoutClientProps {
  fullName: string;
  children: React.ReactNode;
}

export function StudentLayoutClient({ fullName, children }: StudentLayoutClientProps) {
  const { theme, setTheme } = useTheme();
  const activeTheme = theme === "dark" ? "dark" : "light";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Student Area</p>
            <p className="truncate text-xs text-muted-foreground">{fullName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(activeTheme === "light" ? "dark" : "light")}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:bg-muted"
              aria-label={activeTheme === "light" ? "Aktifkan dark mode" : "Aktifkan light mode"}
            >
              {activeTheme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>

            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Beranda
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
