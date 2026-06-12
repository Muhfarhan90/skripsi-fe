"use client";

import Link from "next/link";
import { BookOpen, CreditCard, Star } from "lucide-react";
import { formatDiscountBadge, hasValidDiscount } from "@/features/student/lib/pricing";
import type { StoreCourse } from "@/types/store";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

interface CourseCatalogCardProps {
  actionHref?: string;
  actionLabel?: string;
  course: StoreCourse;
  detailHref: string;
  onAction?: () => void;
}

export function CourseCatalogCard({
  actionHref,
  actionLabel,
  course,
  detailHref,
  onAction,
}: CourseCatalogCardProps) {
  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
  const rating = Number(course.reviews_avg_rating ?? 0);
  const reviewCount = course.reviews_count ?? 0;

  return (
    <article className="group self-start overflow-hidden rounded-3xl border border-[var(--border)]/60 bg-[var(--card)] shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_34px_-10px_rgba(15,122,90,0.12)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/15">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="size-12 text-[var(--primary)]/30" />
          </div>
        )}

        <div className="absolute inset-x-0 top-3 flex items-center justify-between px-3">
          {course.category_name ? (
            <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              {course.category_name}
            </span>
          ) : (
            <span />
          )}
          {hasDiscount ? (
            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black text-white shadow-md shadow-rose-950/20">
              {formatDiscountBadge(course.price, course.discount_price)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-base font-extrabold leading-snug text-[var(--foreground)] transition-colors duration-250 group-hover:text-[var(--primary)]">
            {course.title}
          </h2>
          <div className="shrink-0 pt-0.5">
            {reviewCount > 0 ? (
              <div className="flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-extrabold text-[var(--foreground)]">{rating.toFixed(1)}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--muted-foreground)]">({reviewCount})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Star className="size-3 text-[var(--border)]" />
                <span className="text-xs text-[var(--muted-foreground)]">Baru</span>
              </div>
            )}
          </div>
        </div>

        {course.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {course.description}
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--border)]/40 p-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            {hasDiscount ? (
              <p className="text-[10px] font-medium leading-none text-[var(--muted-foreground)] line-through">{formatCurrency(course.price)}</p>
            ) : null}
            <p className="text-base font-extrabold leading-tight text-[var(--primary)]">{formatCurrency(activePrice)}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={detailHref}
              className="inline-flex h-8 items-center rounded-full border border-[var(--border)]/70 bg-[var(--surface-soft)] px-3.5 text-xs font-bold text-[var(--foreground)] transition-all hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--surface-hover)] active:scale-95"
            >
              Detail
            </Link>
            {actionLabel ? (
              actionHref ? (
                <Link
                  href={actionHref}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--primary)] px-4.5 text-xs font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow active:scale-95"
                >
                  <CreditCard className="size-3.5" />
                  {actionLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onAction}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--primary)] px-4.5 text-xs font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-95 hover:shadow active:scale-95"
                >
                  <CreditCard className="size-3.5" />
                  {actionLabel}
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
