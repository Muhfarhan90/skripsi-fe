export type RoleBoundary = "student" | "admin";

export function getRoleBoundary(
  roleId: number | null | undefined,
): RoleBoundary | null {
  if (roleId === 3) return "student";
  if (roleId === 1 || roleId === 2) return "admin";
  return null;
}

export function getDefaultPathByRole(
  roleId: number | null | undefined,
): string {
  const boundary = getRoleBoundary(roleId);
  if (boundary === "admin") return "/admin";
  if (boundary === "student") return "/student";
  return "/";
}

export function getSafeInternalRedirectPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("://")) return null;
  return raw;
}
