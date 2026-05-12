"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getAdminBreadcrumbs } from "@/features/admin/data/navigation";

interface AdminPageHeaderProps {
  title: string;
  description: string;
}

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <header className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--muted-foreground)]">
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
      <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">{description}</p>
    </header>
  );
}

