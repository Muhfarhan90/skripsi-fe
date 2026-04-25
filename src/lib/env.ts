function requireEnv(name: "NEXT_PUBLIC_API_URL"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_API_URL");
}
