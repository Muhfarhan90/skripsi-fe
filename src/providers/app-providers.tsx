"use client";

import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange storageKey="dashboard-theme">
        {children}
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryProvider>
  );
}
