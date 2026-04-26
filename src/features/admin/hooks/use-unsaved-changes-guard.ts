"use client";

import { useCallback, useEffect } from "react";

const UNSAVED_CHANGES_MESSAGE = "Perubahan belum disimpan. Tetap keluar?";

export function useUnsavedChangesGuard(shouldBlock: boolean) {
  const confirmLeave = useCallback(() => {
    if (!shouldBlock) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  }, [shouldBlock]);

  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock]);

  useEffect(() => {
    if (!shouldBlock) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const nextUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.href === currentUrl.href) return;

      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [confirmLeave, shouldBlock]);

  useEffect(() => {
    if (!shouldBlock) return;

    const handlePopState = () => {
      if (!confirmLeave()) {
        window.history.go(1);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [confirmLeave, shouldBlock]);

  return { confirmLeave };
}
