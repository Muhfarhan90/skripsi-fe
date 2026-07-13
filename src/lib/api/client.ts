import type { ApiEnvelope, ApiPaginationMeta } from "@/types/auth";
import { getApiBaseUrl } from "@/lib/env";
import { getStoredAuthToken } from "@/features/auth/lib/token-storage";

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

function normalizeApiPath(endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (!path.startsWith("/api/")) {
    return path;
  }

  const relativePath = path.slice(5);

  if (relativePath === "auth/me") {
    return "/user";
  }

  if (relativePath.startsWith("auth/")) {
    return `/${relativePath}`;
  }

  if (relativePath.startsWith("public/")) {
    return `/${relativePath.slice("public/".length)}`;
  }

  if (relativePath.startsWith("student/")) {
    return `/${relativePath.slice("student/".length)}`;
  }

  return `/${relativePath}`;
}

export function resolveRequestUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  return `${getApiBaseUrl()}${normalizeApiPath(endpoint)}`;
}

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

export interface PaginatedApiResponse<T> {
  data: T;
  meta: ApiPaginationMeta;
}

function buildRequestHeaders(
  headers: HeadersInit | undefined,
  token: string | null | undefined,
  body: BodyInit | null | undefined,
): Headers {
  const requestHeaders = new Headers(headers);
  const resolvedToken = token === undefined ? getStoredAuthToken() : token;
  requestHeaders.set("Accept", "application/json");

  if (resolvedToken) {
    requestHeaders.set("Authorization", `Bearer ${resolvedToken}`);
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
    cache: rest.cache ?? "no-store",
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

function resolvePaginationMeta<T>(payload: ApiEnvelope<T> | null): ApiPaginationMeta {
  const fallbackCount = Array.isArray(payload?.data) ? payload.data.length : 0;

  return {
    current_page: payload?.meta?.current_page ?? 1,
    last_page: payload?.meta?.last_page ?? 1,
    per_page: payload?.meta?.per_page ?? fallbackCount,
    total: payload?.meta?.total ?? fallbackCount,
  };
}

export async function apiPaginatedRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<PaginatedApiResponse<T>> {
  const { token, headers, body, ...rest } = options;
  const url = resolveRequestUrl(endpoint);

  const response = await fetch(url, {
    ...rest,
    cache: rest.cache ?? "no-store",
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

  return {
    data: (payload.data as T) ?? ({} as T),
    meta: resolvePaginationMeta(payload),
  };
}

export async function apiMessageOnly(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<string> {
  const { token, headers, body, ...rest } = options;
  const url = resolveRequestUrl(endpoint);

  const response = await fetch(url, {
    ...rest,
    cache: rest.cache ?? "no-store",
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
