import { getApiBaseUrl } from "@/lib/env";

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return value.startsWith("http://") || value.startsWith("https://");
}

export function resolvePublicFileUrl(path: string | null | undefined): string | null {
  const normalized = path?.trim();
  if (!normalized) {
    return null;
  }

  if (isHttpUrl(normalized)) {
    return normalized;
  }

  let resolvedPath = normalized;
  if (normalized.startsWith("/storage/")) {
    resolvedPath = normalized;
  } else if (normalized.startsWith("storage/")) {
    resolvedPath = `/${normalized}`;
  } else if (!normalized.includes("/") && !normalized.includes("\\")) {
    return null;
  } else {
    resolvedPath = `/storage/${normalized.replace(/^[\\/]+/, "").replace(/\\/g, "/")}`;
  }

  try {
    const apiBaseUrl = getApiBaseUrl();
    const appBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    return `${appBaseUrl}${resolvedPath}`;
  } catch (err) {
    return resolvedPath;
  }
}
