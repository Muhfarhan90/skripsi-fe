"use client";

import { useEffect } from "react";
import { registerAppServiceWorker } from "@/lib/service-worker";
import { getPublicWebsiteSettings } from "@/features/student/api/store-api";
import type { WebsiteSetting } from "@/types/website";

const PWA_HEAD_LINKS = [
  {
    key: "manifest",
    rel: "manifest",
    href: "/manifest.webmanifest",
  },
  {
    key: "shortcut",
    rel: "shortcut icon",
    href: "/favicon.ico",
  },
  {
    key: "favicon",
    rel: "icon",
    href: "/favicon.ico",
    sizes: "any",
    type: "image/png",
  },
  {
    key: "icon-192",
    rel: "icon",
    href: "/app-icon-192.png",
    sizes: "192x192",
    type: "image/png",
  },
  {
    key: "icon-512",
    rel: "icon",
    href: "/app-icon-512.png",
    sizes: "512x512",
    type: "image/png",
  },
  {
    key: "apple-touch",
    rel: "apple-touch-icon",
    href: "/apple-touch-icon.png",
    sizes: "180x180",
    type: "image/png",
  },
] as const;

function logPwaDebug(message: string, detail?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (detail === undefined) {
    console.warn(`[PWA] ${message}`);
    return;
  }

  console.warn(`[PWA] ${message}`, detail);
}

function createVersionedPwaPath(path: string, version: string | null): string {
  const normalizedVersion = version?.trim();

  if (!normalizedVersion) {
    return path;
  }

  return `${path}?${new URLSearchParams({ v: normalizedVersion }).toString()}`;
}

function findExistingPwaLink(linkConfig: (typeof PWA_HEAD_LINKS)[number]): HTMLLinkElement | null {
  const sizes = "sizes" in linkConfig ? linkConfig.sizes : undefined;
  const links = Array.from(document.head.querySelectorAll<HTMLLinkElement>("link"));

  return (
    links.find((link) => {
      const rel = link.getAttribute("rel");
      const linkSizes = link.getAttribute("sizes");
      const href = link.getAttribute("href")?.split("?")[0];
      const isManagedLink = link.getAttribute("data-cms-pwa") === linkConfig.key;
      const isMatchingLink =
        rel === linkConfig.rel &&
        href === linkConfig.href &&
        (!sizes || linkSizes === sizes);

      return isManagedLink || isMatchingLink;
    }) ?? null
  );
}

function upsertPwaHeadLink(linkConfig: (typeof PWA_HEAD_LINKS)[number], version: string | null) {
  const sizes = "sizes" in linkConfig ? linkConfig.sizes : undefined;
  const type = "type" in linkConfig ? linkConfig.type : undefined;
  const link = findExistingPwaLink(linkConfig) ?? document.createElement("link");

  link.dataset.cmsPwa = linkConfig.key;
  link.rel = linkConfig.rel;
  link.href = createVersionedPwaPath(linkConfig.href, version);

  if (sizes) {
    link.setAttribute("sizes", sizes);
  } else {
    link.removeAttribute("sizes");
  }

  if (type) {
    link.type = type;
  } else {
    link.removeAttribute("type");
  }

  if (!link.parentElement) {
    document.head.appendChild(link);
  }
}

function updatePwaHeadLinks(settings: WebsiteSetting) {
  const version = settings.updated_at || settings.logo_url || null;
  PWA_HEAD_LINKS.forEach((linkConfig) => upsertPwaHeadLink(linkConfig, version));
}

export function PwaBootstrap() {
  useEffect(() => {
    let isCancelled = false;

    void registerAppServiceWorker()
      .then((registration) => {
        if (isCancelled || !registration) {
          return;
        }

        logPwaDebug("Service worker registered.", registration.scope);
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        logPwaDebug("Service worker registration failed.", error);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void getPublicWebsiteSettings()
      .then((settings) => {
        if (isCancelled) {
          return;
        }

        updatePwaHeadLinks(settings);
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        logPwaDebug("Failed to refresh PWA head links.", error);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return null;
}
