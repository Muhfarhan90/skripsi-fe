export type RoleBoundary = "student" | "admin";

export function normalizeRoleName(roleName: string | null | undefined): string | null {
  const normalized = roleName?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isStudentRole(
  roleName: string | null | undefined,
  roleId: number | null | undefined,
): boolean {
  const normalized = normalizeRoleName(roleName);

  if (normalized) {
    return normalized === "student" || normalized === "user";
  }

  return roleId === 3;
}

export function isAdminRole(
  roleName: string | null | undefined,
  roleId: number | null | undefined,
): boolean {
  const normalized = normalizeRoleName(roleName);

  if (normalized) {
    return normalized === "admin" || normalized === "instructor";
  }

  return roleId === 1 || roleId === 2;
}

export function isExactAdminRole(
  roleName: string | null | undefined,
  roleId: number | null | undefined,
): boolean {
  const normalized = normalizeRoleName(roleName);

  if (normalized) {
    return normalized === "admin";
  }

  return roleId === 1;
}

export function getRoleBoundary(
  roleId: number | null | undefined,
  roleName?: string | null,
): RoleBoundary | null {
  if (isStudentRole(roleName, roleId)) return "student";
  if (isAdminRole(roleName, roleId)) return "admin";
  return null;
}

export function getDefaultPathByRole(
  roleId: number | null | undefined,
  roleName?: string | null,
): string {
  const boundary = getRoleBoundary(roleId, roleName);
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
