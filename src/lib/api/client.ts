import type { ApiEnvelope } from "@/types/auth";
import { getApiBaseUrl } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[] | number[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[] | number[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function resolveRequestUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  if (endpoint.startsWith("/api/")) {
    return endpoint;
  }

  return `${getApiBaseUrl()}${endpoint}`;
}

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

function buildRequestHeaders(
  headers: HeadersInit | undefined,
  token: string | null | undefined,
  body: BodyInit | null | undefined,
): Headers {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const hasBody = body !== undefined && body !== null;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const shouldSetJsonContentType = hasBody && !isFormData && !requestHeaders.has("Content-Type");

  if (shouldSetJsonContentType) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return requestHeaders;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;
  const url = resolveRequestUrl(endpoint);

  const response = await fetch(url, {
    ...rest,
    body,
    headers: buildRequestHeaders(headers, token, body),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    throw new ApiError(
      payload?.message ?? fallbackMessage,
      response.status,
      payload?.errors,
    );
  }

  return (payload.data as T) ?? ({} as T);
}

export async function apiMessageOnly(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<string> {
  const { token, headers, body, ...rest } = options;
  const url = resolveRequestUrl(endpoint);

  const response = await fetch(url, {
    ...rest,
    body,
    headers: buildRequestHeaders(headers, token, body),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<unknown> | null;

  if (!response.ok || !payload?.success) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    throw new ApiError(
      payload?.message ?? fallbackMessage,
      response.status,
      payload?.errors,
    );
  }

  return payload.message;
}
