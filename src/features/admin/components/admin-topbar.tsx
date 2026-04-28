"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import {
  getAdminBreadcrumbs,
  getAdminPageTitle,
  getAdminQuickNavigationItems,
  type AdminQuickNavigationItem,
} from "@/features/admin/data/navigation";
import { cn } from "@/lib/utils/cn";

type DashboardTheme = "light" | "dark";

interface AdminTopbarProps {
  fullName: string;
  email: string;
  pathname: string;
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
  pathname,
  theme,
  isSidebarCollapsed,
  onToggleTheme,
  onToggleSidebar,
  onOpenMobileSidebar,
}: AdminTopbarProps) {
  const router = useRouter();
  const logoutMutation = useLogoutAction();
  const breadcrumbs = getAdminBreadcrumbs(pathname);
  const pageTitle = getAdminPageTitle(pathname);
  const quickNavigationItems = useMemo(() => getAdminQuickNavigationItems(), []);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

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

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            {breadcrumbs.map((item, index) => (
              <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                {item.href ? (
                  <Link href={item.href} className="hover:text-[var(--primary)]">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-[var(--foreground)]">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <ChevronRight className="size-3" /> : null}
              </span>
            ))}
          </div>
          <p className="truncate text-sm font-semibold text-[var(--foreground)] sm:text-base">{pageTitle}</p>
        </div>

        <div className="relative hidden flex-1 lg:block">
          <div className="relative ml-auto w-full max-w-md">
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
          </div>

          {showSearchResults ? (
            <div className="absolute right-0 z-40 mt-2 w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg">
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

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
          aria-label={theme === "light" ? "Aktifkan dark mode" : "Aktifkan light mode"}
        >
          {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>

        <Popover>
          <PopoverTrigger
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-left transition hover:bg-[var(--surface-hover)]"
            aria-label="Buka menu profil admin"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-[var(--primary)] text-xs font-semibold text-white">
              {fullName.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-28 truncate text-xs font-semibold text-[var(--foreground)]">
                {fullName}
              </span>
              <span className="block max-w-28 truncate text-[11px] text-[var(--muted-foreground)]">
                Admin
              </span>
            </span>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-64 border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-lg"
          >
            <div className="space-y-1 border-b border-[var(--border)] px-2 pb-2">
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{email}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{formattedDate}</p>
            </div>

            <div className="space-y-1 pt-2">
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-hover)]"
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard Admin</span>
              </Link>

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

