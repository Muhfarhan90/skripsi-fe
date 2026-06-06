import {
  Award,
  BarChart3,
  ClipboardList,
  BrainCircuit,
  BookOpenText,
  CalendarClock,
  CalendarRange,
  FolderKanban,
  History,
  PanelsTopLeft,
  LayoutDashboard,
  ReceiptText,
  Shapes,
  Star,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";
import { isExactAdminRole } from "@/features/auth/lib/roles";

export type AdminNavIcon =
  | "dashboard"
  | "users"
  | "categories"
  | "skills"
  | "courses"
  | "courseOfferings"
  | "academicPeriods"
  | "certificates"
  | "websiteCms"
  | "vouchers"
  | "transactions"
  | "orders"
  | "reports"
  | "activityLog"
  | "courseActivity"
  | "courseReviews";

export type AdminNavigationVisibility = "all" | "platform-admin";

export interface AdminNavigationLink {
  key: string;
  label: string;
  href: string;
  description: string;
  visibility?: AdminNavigationVisibility;
}

export interface AdminNavigationItem extends AdminNavigationLink {
  icon: AdminNavIcon;
  children?: AdminNavigationLink[];
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
  | "students"
  | "instructors"
  | "categories"
  | "skills"
  | "courses"
  | "vouchers";

const ADMIN_ICON_MAP: Record<AdminNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Shapes,
  categories: FolderKanban,
  skills: BrainCircuit,
  courses: BookOpenText,
  courseOfferings: CalendarRange,
  academicPeriods: CalendarClock,
  certificates: Award,
  websiteCms: PanelsTopLeft,
  vouchers: TicketPercent,
  transactions: ReceiptText,
  orders: ReceiptText,
  reports: BarChart3,
  activityLog: History,
  courseActivity: ClipboardList,
  courseReviews: Star,
};

const ADMIN_ENTITY_LABEL: Record<AdminMasterEntity, string> = {
  users: "User",
  students: "Siswa",
  instructors: "Instructor",
  categories: "Category",
  skills: "Skill",
  courses: "Course Master",
  vouchers: "Voucher",
};

const ADMIN_QUICK_ACTIONS: AdminQuickNavigationItem[] = [
  {
    label: "Tambah Siswa",
    href: "/admin/master-data/students/new",
    description: "Tambah akun siswa baru",
    keywords: ["create", "student", "siswa", "tambah", "akun"],
  },
  {
    label: "Tambah Instructor",
    href: "/admin/master-data/instructors/new",
    description: "Tambah akun instructor baru",
    keywords: ["create", "instructor", "pengajar", "tambah", "akun"],
  },
  {
    label: "Buat Course Master",
    href: "/admin/master-data/courses/new",
    description: "Tambah course master baru",
    keywords: ["create", "course", "kursus", "tambah"],
  },
  {
    label: "Kelola Skills",
    href: "/admin/master-data/skills",
    description: "Tambah dan rapikan badge skill course",
    keywords: ["skill", "skills", "badge", "tag"],
  },
  {
    label: "Kelola Offering",
    href: "/admin/academic-periods",
    description: "Pilih period lalu tambah offering",
    keywords: ["create", "offering", "batch", "periode", "academic"],
  },
  {
    label: "Buat Periode Akademik",
    href: "/admin/academic-periods/new",
    description: "Tambah periode akademik baru",
    keywords: ["periode", "academic", "calendar", "create", "offering"],
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
    key: "course-activity",
    title: "COURSE ACTIVITY",
    items: [
      {
        key: "course-activity",
        label: "Course Activity",
        href: "/admin/course-activity",
        description: "Workspace transaksional untuk instructor dan admin",
        icon: "courseActivity",
        children: [
          {
            key: "course-activity-forum",
            label: "Forum",
            href: "/admin/course-activity/forum",
            description: "Moderasi diskusi course lintas offering",
          },
          {
            key: "course-activity-assignment-reviews",
            label: "Assignment Review",
            href: "/admin/course-activity/assignment-reviews",
            description: "Tinjau submission assignment per offering",
          },
          {
            key: "course-activity-student-progress",
            label: "Student Progress",
            href: "/admin/course-activity/student-progress",
            description: "Pantau progres dan status siswa per offering",
          },
        ],
      },
      {
        key: "course-reviews",
        label: "Course Reviews",
        href: "/admin/course-reviews",
        description: "Moderasi rating dan ulasan student per course",
        icon: "courseReviews",
        visibility: "platform-admin",
      },
    ],
  },
  {
    key: "master-data",
    title: "MANAJEMEN DATA",
    items: [
      {
        key: "master-data-students",
        label: "Kelola Siswa",
        href: "/admin/master-data/students",
        description: "Kelola akun siswa, NISN, dan asal sekolah",
        icon: "users",
        visibility: "platform-admin",
      },
      {
        key: "master-data-instructors",
        label: "Kelola Instructor",
        href: "/admin/master-data/instructors",
        description: "Kelola akun instructor secara terpisah",
        icon: "users",
        visibility: "platform-admin",
      },
      {
        key: "master-data-categories",
        label: "Categories",
        href: "/admin/master-data/categories",
        description: "Kelola kategori course",
        icon: "categories",
        visibility: "platform-admin",
      },
      {
        key: "master-data-skills",
        label: "Skills",
        href: "/admin/master-data/skills",
        description: "Kelola badge skill course",
        icon: "skills",
        visibility: "platform-admin",
      },
      {
        key: "master-data-courses",
        label: "Course Master",
        href: "/admin/master-data/courses",
        description: "Kelola konten master course",
        icon: "courses",
        visibility: "platform-admin",
      },
      {
        key: "course-offerings",
        label: "Academic Periods",
        href: "/admin/academic-periods",
        description: "Kelola period dan offering course",
        icon: "academicPeriods",
        visibility: "platform-admin",
      },
      {
        key: "certificate-settings",
        label: "Certificate Settings",
        href: "/admin/certificate-settings",
        description: "Atur template dan metadata sertifikat",
        icon: "certificates",
        visibility: "platform-admin",
      },
      {
        key: "website-cms",
        label: "Website CMS",
        href: "/admin/website-cms",
        description: "Kelola footer, sosial media, dan konten landing page",
        icon: "websiteCms",
        visibility: "platform-admin",
      },
      {
        key: "master-data-vouchers",
        label: "Vouchers",
        href: "/admin/master-data/vouchers",
        description: "Kelola data voucher diskon",
        icon: "vouchers",
        visibility: "platform-admin",
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
        visibility: "platform-admin",
      },
      {
        key: "transactions-overview",
        label: "Transaksi",
        href: "/admin/transactions",
        description: "Order, pembayaran, dan enrollment",
        icon: "transactions",
        visibility: "platform-admin",
      },
      {
        key: "reports-overview",
        label: "Reports",
        href: "/admin/reports",
        description: "Ringkasan penjualan dan export laporan",
        icon: "reports",
        visibility: "platform-admin",
      },
    ],
  },
  {
    key: "monitoring",
    title: "MONITORING",
    items: [
      {
        key: "activity-log",
        label: "Activity Log",
        href: "/admin/activity-log",
        description: "Audit trail perubahan data admin",
        icon: "activityLog",
        visibility: "platform-admin",
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

function canAccessAdminNavigationItem(
  item: Pick<AdminNavigationLink, "visibility">,
  roleName?: string | null,
): boolean {
  if (item.visibility === "platform-admin") {
    return isExactAdminRole(roleName, null);
  }

  return true;
}

export function getAdminNavigation(roleName?: string | null): AdminNavigationGroup[] {
  return ADMIN_NAVIGATION.map((group) => ({
    ...group,
    items: group.items
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => canAccessAdminNavigationItem(child, roleName)),
      }))
      .filter(
        (item) =>
          canAccessAdminNavigationItem(item, roleName) &&
          (item.children === undefined || item.children.length > 0),
      ),
  })).filter((group) => group.items.length > 0);
}

export function flattenAdminNavigationItems(
  roleName?: string | null,
): Array<AdminNavigationItem | AdminNavigationLink> {
  return getAdminNavigation(roleName).flatMap((group) =>
    group.items.flatMap((item) => [item, ...(item.children ?? [])]),
  );
}

function flattenAllAdminNavigationItems(): Array<AdminNavigationItem | AdminNavigationLink> {
  return ADMIN_NAVIGATION.flatMap((group) =>
    group.items.flatMap((item) => [item, ...(item.children ?? [])]),
  );
}

export function getAdminQuickNavigationItems(roleName?: string | null): AdminQuickNavigationItem[] {
  const baseItems = flattenAdminNavigationItems(roleName).map<AdminQuickNavigationItem>((item) => ({
    label: item.label,
    href: item.href,
    description: item.description,
    keywords: [item.label, item.description, item.key],
  }));

  const extraItems = isExactAdminRole(roleName, null) ? ADMIN_QUICK_ACTIONS : [];

  return [...baseItems, ...extraItems];
}

export function isAdminItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  if (href === "/admin/academic-periods" && pathname.startsWith("/admin/course-offerings")) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findAdminNavigationItem(
  pathname: string,
): AdminNavigationItem | AdminNavigationLink | undefined {
  return flattenAllAdminNavigationItems().find((item) => isAdminItemActive(pathname, item.href));
}

function fallbackSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAdminRouteLabel(path: string): string | undefined {
  return flattenAllAdminNavigationItems().find((item) => item.href === path)?.label;
}

function isNumericIdSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

// Normalize dynamic admin forms so title/breadcrumb stays human-readable.
function resolveAdminDynamicRoute(pathname: string): AdminDynamicRouteMeta | undefined {
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);

  if (segments.length >= 1 && segments[0] === "course-offerings") {
    if (segments.length === 2 && isNumericIdSegment(segments[1])) {
      return {
        title: "Detail Course Offering",
        breadcrumbs: [
          { label: "Dashboard", href: "/admin" },
          { label: "Academic Periods", href: "/admin/academic-periods" },
          { label: "Detail Course Offering" },
        ],
      };
    }

    if (segments.length === 2 && segments[1] === "new") {
      return {
        title: "Buat Course Offering",
        breadcrumbs: [
          { label: "Dashboard", href: "/admin" },
          { label: "Academic Periods", href: "/admin/academic-periods" },
          { label: "Buat Course Offering" },
        ],
      };
    }
  }

  if (segments.length >= 1 && segments[0] === "academic-periods") {
    if (
      segments.length === 4 &&
      isNumericIdSegment(segments[1]) &&
      segments[2] === "offerings" &&
      segments[3] === "new"
    ) {
      const periodId = segments[1];
      return {
        title: "Buat Course Offering",
        breadcrumbs: [
          { label: "Dashboard", href: "/admin" },
          { label: "Academic Periods", href: "/admin/academic-periods" },
          { label: "Detail Academic Period", href: `/admin/academic-periods/${periodId}` },
          { label: "Buat Course Offering" },
        ],
      };
    }

    if (
      segments.length === 4 &&
      isNumericIdSegment(segments[1]) &&
      segments[2] === "offerings" &&
      isNumericIdSegment(segments[3])
    ) {
      const periodId = segments[1];
      return {
        title: "Detail Course Offering",
        breadcrumbs: [
          { label: "Dashboard", href: "/admin" },
          { label: "Academic Periods", href: "/admin/academic-periods" },
          { label: "Detail Academic Period", href: `/admin/academic-periods/${periodId}` },
          { label: "Detail Course Offering" },
        ],
      };
    }

    if (segments.length === 2 && isNumericIdSegment(segments[1])) {
      return {
        title: "Detail Academic Period",
        breadcrumbs: [
          { label: "Dashboard", href: "/admin" },
          { label: "Academic Periods", href: "/admin/academic-periods" },
          { label: "Detail Academic Period" },
        ],
      };
    }

    if (segments.length === 2 && segments[1] === "new") {
      return {
        title: "Buat Academic Period",
        breadcrumbs: [
          { label: "Dashboard", href: "/admin" },
          { label: "Academic Periods", href: "/admin/academic-periods" },
          { label: "Buat Academic Period" },
        ],
      };
    }
  }

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
  if (pathname.startsWith("/admin/notifications")) {
    return "Notifikasi";
  }

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

  if (pathname.startsWith("/admin/notifications")) {
    return [
      { label: "Dashboard", href: "/admin" },
      { label: "Notifikasi" },
    ];
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
