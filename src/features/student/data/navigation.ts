import {
  Award,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

export type StudentNavIcon = "dashboard" | "catalog" | "enrollments" | "orders" | "certificates";

export interface StudentNavigationItem {
  key: string;
  label: string;
  href: string;
  description: string;
  icon: StudentNavIcon;
}

export interface StudentNavigationGroup {
  key: string;
  title: string;
  items: StudentNavigationItem[];
}

export interface StudentBreadcrumb {
  label: string;
  href?: string;
}

const STUDENT_ICON_MAP: Record<StudentNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  catalog: BookOpen,
  enrollments: GraduationCap,
  orders: ReceiptText,
  certificates: Award,
};

export const STUDENT_NAVIGATION: StudentNavigationGroup[] = [
  {
    key: "main",
    title: "MAIN MENU",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        href: "/student",
        description: "Ringkasan aktivitas belajar",
        icon: "dashboard",
      },
      {
        key: "catalog",
        label: "Katalog",
        href: "/student/catalog",
        description: "Cari course yang tersedia",
        icon: "catalog",
      },
    ],
  },
  {
    key: "learning",
    title: "BELAJAR",
    items: [
      {
        key: "enrollments",
        label: "Kelas Saya",
        href: "/student/enrollments",
        description: "Kelas yang sedang dipelajari dan selesai",
        icon: "enrollments",
      },
      {
        key: "orders",
        label: "Orders",
        href: "/student/orders",
        description: "Riwayat pembelian",
        icon: "orders",
      },
      {
        key: "certificates",
        label: "Certificates",
        href: "/student/certificates",
        description: "Unduh sertifikat course selesai",
        icon: "certificates",
      },
    ],
  },
];

export function resolveStudentIcon(icon: StudentNavIcon): LucideIcon {
  return STUDENT_ICON_MAP[icon];
}

export function flattenStudentNavigationItems(): StudentNavigationItem[] {
  return STUDENT_NAVIGATION.flatMap((group) => group.items);
}

export function isStudentItemActive(pathname: string, href: string): boolean {
  if (href === "/student") {
    return pathname === "/student";
  }

  if (href === "/student/catalog") {
    return pathname === "/student/catalog" || pathname.startsWith("/student/catalog/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getStudentPageTitle(pathname: string): string {
  const matched = flattenStudentNavigationItems().find((item) => isStudentItemActive(pathname, item.href));
  if (matched) {
    return matched.label;
  }

  if (pathname.includes("/learn")) {
    return "Belajar";
  }

  if (pathname.startsWith("/student/cart")) {
    return "Cart";
  }

  return "Student";
}

export function getStudentBreadcrumbs(pathname: string): StudentBreadcrumb[] {
  const breadcrumbs: StudentBreadcrumb[] = [{ label: "Dashboard", href: "/student" }];

  if (pathname === "/student") {
    return [{ label: "Dashboard" }];
  }

  if (pathname.startsWith("/student/catalog")) {
    breadcrumbs.push({ label: "Katalog", href: "/student/catalog" });
    return breadcrumbs;
  }

  if (pathname.startsWith("/student/enrollments")) {
    breadcrumbs.push({ label: "Kelas Saya", href: "/student/enrollments" });

    const isDetail = /^\/student\/enrollments\/\d+$/.test(pathname);
    const isLearn = /^\/student\/enrollments\/\d+\/learn$/.test(pathname);
    if (isDetail) {
      breadcrumbs.push({ label: "Detail Kelas" });
    }
    if (isLearn) {
      breadcrumbs.push({ label: "Akses Materi" });
    }

    return breadcrumbs;
  }

  if (pathname.startsWith("/student/orders")) {
    breadcrumbs.push({ label: "Orders", href: "/student/orders" });
    if (/^\/student\/orders\/\d+$/.test(pathname)) {
      breadcrumbs.push({ label: "Detail Order" });
    }
    return breadcrumbs;
  }

  if (pathname.startsWith("/student/certificates")) {
    breadcrumbs.push({ label: "Certificates", href: "/student/certificates" });
    return breadcrumbs;
  }

  if (pathname.startsWith("/student/cart")) {
    breadcrumbs.push({ label: "Cart" });
    return breadcrumbs;
  }

  return breadcrumbs;
}
