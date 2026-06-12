"use client";

import { useEffect } from "react";

export function PublicThemeLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  }, []);

  return null;
}
