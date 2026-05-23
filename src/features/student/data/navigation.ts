import {
  Award,
  Bell,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export type StudentNavIcon =
  | "dashboard"
  | "catalog"
  | "enrollments"
  | "orders"
  | "certificates"
  | "notifications"
  | "profile";

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
  notifications: Bell,
  profile: UserCircle,
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
      {
        key: "enrollments",
        label: "Kelas Saya",
        href: "/student/enrollments",
        description: "Kelas yang sedang dipelajari dan selesai",
        icon: "enrollments",
      },
    ],
  },
  {
    key: "activity",
    title: "AKTIVITAS",
    items: [
      {
        key: "notifications",
        label: "Notifikasi",
        href: "/student/notifications",
        description: "Update order, kelas, dan aktivitas belajar",
        icon: "notifications",
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
  {
    key: "account",
    title: "AKUN",
    items: [
      {
        key: "profile",
        label: "Profil Saya",
        href: "/student/profile",
        description: "Kelola data dan informasi akun",
        icon: "profile",
      },
    ],
  },
];

export const STUDENT_MOBILE_BOTTOM_NAV = [
  {
    key: "dashboard",
    label: "Home",
    href: "/student",
    icon: "dashboard",
  },
  {
    key: "catalog",
    label: "Katalog",
    href: "/student/catalog",
    icon: "catalog",
  },
  {
    key: "enrollments",
    label: "Kelas",
    href: "/student/enrollments",
    icon: "enrollments",
  },
  {
    key: "notifications",
    label: "Inbox",
    href: "/student/notifications",
    icon: "notifications",
  },
  {
    key: "orders",
    label: "Order",
    href: "/student/orders",
    icon: "orders",
  },
] as const satisfies Array<{
  key: string;
  label: string;
  href: string;
  icon: StudentNavIcon;
}>;

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

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isStudentImmersiveRoute(pathname: string): boolean {
  return /^\/student\/enrollments\/\d+\/learn(\/.*)?$/.test(pathname);
}

export function getStudentMobileBackHref(pathname: string): string | null {
  if (/^\/student\/catalog\/[^/]+$/.test(pathname)) {
    return "/student/catalog";
  }

  if (/^\/student\/checkout\/[^/]+$/.test(pathname)) {
    const match = pathname.match(/^\/student\/checkout\/([^/]+)$/);
    return match ? `/student/catalog/${match[1]}` : "/student/catalog";
  }

  if (/^\/student\/orders\/\d+$/.test(pathname)) {
    return "/student/orders";
  }

  if (/^\/student\/enrollments\/\d+\/forum$/.test(pathname)) {
    const match = pathname.match(/^\/student\/enrollments\/(\d+)\/forum$/);
    return match ? `/student/enrollments/${match[1]}` : "/student/enrollments";
  }

  if (/^\/student\/enrollments\/\d+\/learn\/assignments\/\d+$/.test(pathname)) {
    const match = pathname.match(/^\/student\/enrollments\/(\d+)\/learn\/assignments\/\d+$/);
    return match ? `/student/enrollments/${match[1]}/learn?panel=assignments` : "/student/enrollments";
  }

  if (/^\/student\/enrollments\/\d+\/learn\/quizzes\/\d+$/.test(pathname)) {
    const match = pathname.match(/^\/student\/enrollments\/(\d+)\/learn\/quizzes\/\d+$/);
    return match ? `/student/enrollments/${match[1]}/learn?panel=quizzes` : "/student/enrollments";
  }

  if (/^\/student\/enrollments\/\d+\/learn$/.test(pathname)) {
    const match = pathname.match(/^\/student\/enrollments\/(\d+)\/learn$/);
    return match ? `/student/enrollments/${match[1]}` : "/student/enrollments";
  }

  if (/^\/student\/enrollments\/\d+$/.test(pathname)) {
    return "/student/enrollments";
  }

  return null;
}

export function getStudentPageTitle(pathname: string): string {
  if (/^\/student\/enrollments\/\d+\/learn\/assignments\/\d+$/.test(pathname)) {
    return "Assignment";
  }

  if (/^\/student\/enrollments\/\d+\/learn\/quizzes\/\d+$/.test(pathname)) {
    return "Quiz";
  }

  if (/^\/student\/enrollments\/\d+\/forum$/.test(pathname)) {
    return "Forum Diskusi";
  }

  if (/^\/student\/checkout\/[^/]+$/.test(pathname)) {
    return "Checkout";
  }

  if (pathname === "/student/profile") {
    return "Profil Saya";
  }

  const matched = flattenStudentNavigationItems().find((item) => isStudentItemActive(pathname, item.href));
  if (matched) {
    return matched.label;
  }

  if (pathname.includes("/learn")) {
    return "Belajar";
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
    if (/^\/student\/catalog\/[^/]+$/.test(pathname)) {
      breadcrumbs.push({ label: "Detail Course" });
    }
    return breadcrumbs;
  }

  if (pathname.startsWith("/student/checkout")) {
    breadcrumbs.push({ label: "Katalog", href: "/student/catalog" });
    breadcrumbs.push({ label: "Checkout" });
    return breadcrumbs;
  }

  if (pathname.startsWith("/student/enrollments")) {
    breadcrumbs.push({ label: "Kelas Saya", href: "/student/enrollments" });

    const isDetail = /^\/student\/enrollments\/\d+$/.test(pathname);
    const isLearn = /^\/student\/enrollments\/\d+\/learn$/.test(pathname);
    const isForum = /^\/student\/enrollments\/\d+\/forum$/.test(pathname);
    const isAssignment = /^\/student\/enrollments\/\d+\/learn\/assignments\/\d+$/.test(pathname);
    const isQuiz = /^\/student\/enrollments\/\d+\/learn\/quizzes\/\d+$/.test(pathname);

    if (isDetail) {
      breadcrumbs.push({ label: "Detail Kelas" });
    }

    if (isLearn) {
      breadcrumbs.push({ label: "Akses Materi" });
    }

    if (isForum) {
      breadcrumbs.push({ label: "Forum Diskusi" });
    }

    if (isAssignment) {
      breadcrumbs.push({ label: "Akses Materi", href: pathname.replace(/\/assignments\/\d+$/, "") });
      breadcrumbs.push({ label: "Assignment" });
    }

    if (isQuiz) {
      breadcrumbs.push({ label: "Akses Materi", href: pathname.replace(/\/quizzes\/\d+$/, "") });
      breadcrumbs.push({ label: "Quiz" });
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

  if (pathname === "/student/profile") {
    breadcrumbs.push({ label: "Profil Saya" });
    return breadcrumbs;
  }

  const matched = flattenStudentNavigationItems().find((item) => isStudentItemActive(pathname, item.href));
  if (matched) {
    breadcrumbs.push({ label: matched.label, href: matched.href });
    return breadcrumbs;
  }

  return breadcrumbs;
}
