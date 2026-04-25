export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "admin-theme";
export const DEFAULT_ADMIN_THEME: AdminTheme = "light";

export function isAdminTheme(value: unknown): value is AdminTheme {
  return value === "light" || value === "dark";
}
