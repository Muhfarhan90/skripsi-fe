import {
  BookOpenText,
  FolderKanban,
  LayoutDashboard,
  ReceiptText,
  Shapes,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";

export type AdminNavIcon =
  | "dashboard"
  | "users"
  | "categories"
  | "courses"
  | "vouchers"
  | "transactions"
  | "orders";

export interface AdminNavigationItem {
  key: string;
  label: string;
  href: string;
  description: string;
  icon: AdminNavIcon;
}

export interface AdminNavigationGroup {
  key: string;
  title: string;
  items: AdminNavigationItem[];
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

export interface AdminQuickNavigationItem {
  label: string;
  href: string;
  description: string;
  keywords: string[];
}

type AdminMasterEntity =
  | "users"
  | "categories"
  | "courses"
  | "vouchers";

const ADMIN_ICON_MAP: Record<AdminNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Shapes,
  categories: FolderKanban,
  courses: BookOpenText,
  vouchers: TicketPercent,
  transactions: ReceiptText,
  orders: ReceiptText,
};

const ADMIN_ENTITY_LABEL: Record<AdminMasterEntity, string> = {
  users: "User",
  categories: "Category",
  courses: "Course",
  vouchers: "Voucher",
};

const ADMIN_QUICK_ACTIONS: AdminQuickNavigationItem[] = [
  {
    label: "Buat User",
    href: "/admin/master-data/users/new",
    description: "Tambah akun user baru",
    keywords: ["create", "user", "tambah", "akun"],
  },
  {
    label: "Buat Course",
    href: "/admin/master-data/courses/new",
    description: "Tambah course baru",
    keywords: ["create", "course", "kursus", "tambah"],
  },
];

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  {
    key: "main",
    title: "MAIN MENU",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/admin",
        description: "Ringkasan performa platform",
        icon: "dashboard",
      },
    ],
  },
  {
    key: "master-data",
    title: "MANAJEMEN DATA",
    items: [
      {
        key: "master-data-users",
        label: "Users",
        href: "/admin/master-data/users",
        description: "Kelola akun student dan admin",
        icon: "users",
      },
      {
        key: "master-data-categories",
        label: "Categories",
        href: "/admin/master-data/categories",
        description: "Kelola kategori course",
        icon: "categories",
      },
      {
        key: "master-data-courses",
        label: "Courses",
        href: "/admin/master-data/courses",
        description: "Kelola struktur data course",
        icon: "courses",
      },
      {
        key: "master-data-vouchers",
        label: "Vouchers",
        href: "/admin/master-data/vouchers",
        description: "Kelola data voucher diskon",
        icon: "vouchers",
      },
    ],
  },
  {
    key: "transactions",
    title: "TRANSAKSI",
    items: [
      {
        key: "orders-overview",
        label: "Orders",
        href: "/admin/orders",
        description: "Kelola order pembelian course siswa",
        icon: "orders",
      },
      {
        key: "transactions-overview",
        label: "Transaksi",
        href: "/admin/transactions",
        description: "Order, pembayaran, dan enrollment",
        icon: "transactions",
      },
    ],
  },
];

interface AdminDynamicRouteMeta {
  breadcrumbs: AdminBreadcrumb[];
  title: string;
}

export function resolveAdminIcon(icon: AdminNavIcon): LucideIcon {
  return ADMIN_ICON_MAP[icon];
}

export function flattenAdminNavigationItems(): AdminNavigationItem[] {
  return ADMIN_NAVIGATION.flatMap((group) => group.items);
}

export function getAdminQuickNavigationItems(): AdminQuickNavigationItem[] {
  const baseItems = flattenAdminNavigationItems().map<AdminQuickNavigationItem>((item) => ({
    label: item.label,
    href: item.href,
    description: item.description,
    keywords: [item.label, item.description, item.key],
  }));

  return [...baseItems, ...ADMIN_QUICK_ACTIONS];
}

export function isAdminItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findAdminNavigationItem(pathname: string): AdminNavigationItem | undefined {
  return flattenAdminNavigationItems().find((item) => isAdminItemActive(pathname, item.href));
}

function fallbackSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAdminRouteLabel(path: string): string | undefined {
  return flattenAdminNavigationItems().find((item) => item.href === path)?.label;
}

function isNumericIdSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

// Normalize dynamic admin forms so title/breadcrumb stays human-readable.
function resolveAdminDynamicRoute(pathname: string): AdminDynamicRouteMeta | undefined {
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);

  if (segments.length < 3 || segments[0] !== "master-data") {
    return undefined;
  }

  const entity = segments[1] as AdminMasterEntity;
  const entityLabel = ADMIN_ENTITY_LABEL[entity];
  if (!entityLabel) {
    return undefined;
  }

  const entityHref = `/admin/master-data/${entity}`;
  const entityNavLabel = getAdminRouteLabel(entityHref) ?? fallbackSegmentLabel(entity);

  if (entity === "courses" && segments.length === 3 && isNumericIdSegment(segments[2])) {
    return {
      title: "Detail Course",
      breadcrumbs: [
        { label: "Dashboard", href: "/admin" },
        { label: entityNavLabel, href: entityHref },
        { label: "Detail Course" },
      ],
    };
  }

  if (
    entity === "courses" &&
    segments.length === 5 &&
    isNumericIdSegment(segments[2]) &&
    segments[3] === "quizzes" &&
    isNumericIdSegment(segments[4])
  ) {
    const courseId = segments[2];
    return {
      title: "Detail Quiz",
      breadcrumbs: [
        { label: "Dashboard", href: "/admin" },
        { label: entityNavLabel, href: entityHref },
        { label: "Detail Course", href: `/admin/master-data/courses/${courseId}` },
        { label: "Detail Quiz" },
      ],
    };
  }

  if (segments.length === 3 && segments[2] === "new") {
    return {
      title: `Buat ${entityLabel}`,
      breadcrumbs: [
        { label: "Dashboard", href: "/admin" },
        { label: entityNavLabel, href: entityHref },
        { label: `Buat ${entityLabel}` },
      ],
    };
  }

  if (segments.length === 4 && isNumericIdSegment(segments[2]) && segments[3] === "edit") {
    return {
      title: `Edit ${entityLabel}`,
      breadcrumbs: [
        { label: "Dashboard", href: "/admin" },
        { label: entityNavLabel, href: entityHref },
        { label: `Edit ${entityLabel}` },
      ],
    };
  }

  return undefined;
}

export function getAdminPageTitle(pathname: string): string {
  const routeLabel = getAdminRouteLabel(pathname);
  if (routeLabel) {
    return routeLabel;
  }

  const dynamicRoute = resolveAdminDynamicRoute(pathname);
  if (dynamicRoute) {
    return dynamicRoute.title;
  }

  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return "Dashboard";
  }

  return fallbackSegmentLabel(segments[segments.length - 1]);
}

export function getAdminBreadcrumbs(pathname: string): AdminBreadcrumb[] {
  if (pathname === "/admin") {
    return [{ label: "Dashboard" }];
  }

  const dynamicRoute = resolveAdminDynamicRoute(pathname);
  if (dynamicRoute) {
    return dynamicRoute.breadcrumbs;
  }

  const breadcrumbs: AdminBreadcrumb[] = [{ label: "Dashboard", href: "/admin" }];
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);

  let currentPath = "/admin";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const routeLabel = getAdminRouteLabel(currentPath);
    const isLast = index === segments.length - 1;

    // Skip intermediary technical segments that do not have explicit nav labels.
    if (!routeLabel && !isLast) {
      return;
    }

    const resolvedLabel = routeLabel ?? fallbackSegmentLabel(segment);

    breadcrumbs.push({
      label: resolvedLabel,
      href: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}
