"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  Sun,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import {
  getAdminQuickNavigationItems,
  type AdminQuickNavigationItem,
} from "@/features/admin/data/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { resolvePublicFileUrl } from "@/lib/file-url";

type DashboardTheme = "light" | "dark";

interface AdminTopbarProps {
  fullName: string;
  email: string;
  roleName?: string | null;
  theme: DashboardTheme;
  isSidebarCollapsed: boolean;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

const MAX_QUICK_RESULTS = 6;

export function AdminTopbar({
  fullName,
  email,
  roleName,
  theme,
  isSidebarCollapsed,
  onToggleTheme,
  onToggleSidebar,
  onOpenMobileSidebar,
}: AdminTopbarProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutAction();
  const quickNavigationItems = useMemo(() => getAdminQuickNavigationItems(roleName), [roleName]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchResults = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return quickNavigationItems.slice(0, MAX_QUICK_RESULTS);
    }

    return quickNavigationItems
      .filter((item) => {
        const searchableText = [item.label, item.description, item.href, ...item.keywords]
          .join(" ")
          .toLowerCase();
        return searchableText.includes(keyword);
      })
      .slice(0, MAX_QUICK_RESULTS);
  }, [quickNavigationItems, searchKeyword]);

  // Keep topbar search focused on route shortcut navigation for fast admin workflows.
  const handleQuickNavigate = (item: AdminQuickNavigationItem) => {
    setSearchKeyword("");
    setShowSearchResults(false);
    router.push(item.href);
  };

  const handleSearchSubmit = () => {
    if (searchResults.length === 0) {
      return;
    }

    handleQuickNavigate(searchResults[0]);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)] backdrop-blur">
      <div className="mx-auto flex h-[74px] w-full max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] lg:hidden"
            aria-label="Buka sidebar"
          >
            <Menu className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] lg:inline-flex"
            aria-label={isSidebarCollapsed ? "Buka sidebar desktop" : "Tutup sidebar desktop"}
          >
            {isSidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        <div className="relative hidden flex-1 lg:block">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-[var(--muted-foreground)]" />
            <Input
              type="search"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSearchResults(false), 120);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSubmit();
                }

                if (event.key === "Escape") {
                  setShowSearchResults(false);
                }
              }}
              placeholder="Cari menu cepat admin..."
              className="h-9 border-[var(--border)] bg-[var(--card)] pl-9 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            {showSearchResults ? (
              <div className="absolute top-full left-0 z-40 mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map((item) => (
                      <button
                        key={`${item.href}-${item.label}`}
                        type="button"
                        onClick={() => handleQuickNavigate(item)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-[var(--surface-hover)]"
                      >
                        <span className="mt-0.5 inline-flex size-4 items-center justify-center text-[var(--muted-foreground)]">
                          <Search className="size-3" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                            {item.label}
                          </span>
                          <span className="block truncate text-xs text-[var(--muted-foreground)]">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-1.5 text-xs text-[var(--muted-foreground)]">
                    Tidak ada hasil untuk kata kunci tersebut.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <NotificationBell />

        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-[var(--surface-hover)]"
            aria-label="Buka menu profil admin"
          >
            {user?.avatar ? (
              <div
                className="size-9 rounded-full bg-cover bg-center bg-[var(--muted)] border border-[var(--border)] shadow-sm"
                style={{ backgroundImage: `url("${resolvePublicFileUrl(user.avatar)}")` }}
              />
            ) : (
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                {fullName.trim().charAt(0).toUpperCase() || "A"}
              </span>
            )}
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-32 truncate text-sm font-semibold text-[var(--foreground)]">{fullName}</span>
            </span>
            <ChevronDown className="hidden size-4 text-[var(--muted-foreground)] sm:block" />
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-64 border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-lg"
          >
            <div className="space-y-1 border-b border-[var(--border)] px-2 pb-2">
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{email}</p>
            </div>

            <div className="space-y-1 pt-2">
              <Link
                href="/admin/profile"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface-hover)]"
              >
                <User className="size-4" />
                <span>Kelola Profil</span>
              </Link>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-pressed={theme === "dark"}
                aria-label={theme === "dark" ? "Nonaktifkan dark mode" : "Aktifkan dark mode"}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface-hover)]"
              >
                <span className="inline-flex items-center gap-2">
                  {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                  <span>Dark Mode</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full border transition",
                    theme === "dark"
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-[var(--border)] bg-[var(--muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-4 rounded-full bg-white transition-transform",
                      theme === "dark" ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm transition",
                  logoutMutation.isPending
                    ? "cursor-not-allowed opacity-70"
                    : "border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90",
                )}
              >
                <LogOut className="size-4" />
                <span>{logoutMutation.isPending ? "Memproses logout..." : "Logout"}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

