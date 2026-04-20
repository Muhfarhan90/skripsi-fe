import type { ApiEnvelope } from "@/types/auth";

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

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
}

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const url = `${getApiBaseUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
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
  const { token, headers, ...rest } = options;
  const url = `${getApiBaseUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
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
