import { ApiError, resolveRequestUrl } from "@/lib/api/client";
import { getStoredAuthToken } from "@/features/auth/lib/token-storage";

function extractFilenameFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).trim();
  }

  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return filenameMatch?.[1]?.trim() || null;
}

async function buildResponseError(response: Response): Promise<Error> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      errors?: Record<string, string[] | number[]>;
    } | null;

    return new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      payload?.errors,
    );
  }

  const message = (await response.text().catch(() => "")).trim();
  return new Error(message || `Request failed with status ${response.status}`);
}

export async function fetchAuthorizedResource(
  endpoint: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getStoredAuthToken();

  if (!token) {
    throw new Error("Sesi login tidak ditemukan.");
  }

  const response = await fetch(resolveRequestUrl(endpoint), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw await buildResponseError(response);
  }

  return response;
}

export async function downloadAuthorizedFile(
  endpoint: string,
  fallbackFileName = "download",
): Promise<void> {
  const response = await fetchAuthorizedResource(endpoint);
  const blob = await response.blob();
  const fileName =
    extractFilenameFromDisposition(response.headers.get("content-disposition")) ??
    fallbackFileName;

  downloadBlobFile(blob, fileName);
}

export function downloadBlobFile(blob: Blob, fileName: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
}

export async function createAuthorizedHtmlObjectUrl(endpoint: string): Promise<string> {
  const response = await fetchAuthorizedResource(endpoint, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await response.text();
  const blob = new Blob([html], { type: "text/html" });
  return window.URL.createObjectURL(blob);
}
