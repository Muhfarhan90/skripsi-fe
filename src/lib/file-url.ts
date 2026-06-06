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

  if (normalized.startsWith("/storage/")) {
    return normalized;
  }

  if (normalized.startsWith("storage/")) {
    return `/${normalized}`;
  }

  if (!normalized.includes("/") && !normalized.includes("\\")) {
    return null;
  }

  return `/storage/${normalized.replace(/^[\\/]+/, "").replace(/\\/g, "/")}`;
}
