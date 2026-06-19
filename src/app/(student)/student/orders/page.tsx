"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, PackageOpen, XCircle } from "lucide-react";
import { getStudentOrders } from "@/features/student/api/store-api";
import type { StoreOrderItem } from "@/types/store";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatOrderDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getOrderItemCourseTitle(item: StoreOrderItem | undefined): string | null {
  if (!item) return null;
  return (
    item.course_title?.trim() ||
    item.course_offering_snapshot?.course_title?.trim() ||
    item.course?.title?.trim() ||
    null
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
      icon: <Clock3 className="size-3" />,
    },
    paid: {
      label: "Lunas",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
      icon: <CheckCircle2 className="size-3" />,
    },
    cancelled: {
      label: "Dibatalkan",
      className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
      icon: <XCircle className="size-3" />,
    },
  };

  const cfg = config[status] ?? {
    label: status,
    className: "bg-[var(--surface-soft)] text-[var(--muted-foreground)]",
    icon: null,
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function StudentOrdersPage() {
  const ordersQuery = useQuery({
    queryKey: ["student", "orders"],
    queryFn: () => getStudentOrders(),
  });

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="pb-3 border-b border-border/60">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Order Saya</h1>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Pantau status pembayaran dan akses course kamu.
        </p>
      </header>

      {/* Loading */}
      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--border)]" />
          ))}
        </div>
      ) : null}

      {/* Error */}
      {ordersQuery.isError ? (
        <article className="rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-4 text-sm text-[var(--danger-soft-foreground)]">
          Gagal memuat order. Silakan coba lagi.
        </article>
      ) : null}

      {/* Empty */}
      {ordersQuery.data && ordersQuery.data.length === 0 ? (
        <article className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <PackageOpen className="size-10 text-[var(--muted-foreground)]" />
          <div>
            <p className="font-semibold text-[var(--foreground)]">Belum ada order</p>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Temukan course menarik di katalog dan mulai belajar.
            </p>
          </div>
          <Link
            href="/student/catalog"
            className="inline-flex h-9 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition active:scale-95"
          >
            Jelajahi Course
          </Link>
        </article>
      ) : null}

      {/* Orders list */}
      <div className="space-y-3">
        {ordersQuery.data?.map((order) => (
          <article
            key={order.id}
            className="overflow-hidden rounded-2xl bg-[var(--card)] shadow-[0_8px_30px_rgba(15,23,42,0.025)] border border-border/30"
          >
            <div className="px-4 py-3.5">
              {/* Top row: order code + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--foreground)]">{order.order_code}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    {order.items.length} item
                    {order.created_at ? ` · ${formatOrderDate(order.created_at)}` : ""}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Course titles preview */}
              {order.items.length > 0 && getOrderItemCourseTitle(order.items[0]) ? (
                <p className="mt-2 line-clamp-1 text-xs text-[var(--muted-foreground)]">
                  {getOrderItemCourseTitle(order.items[0])}
                  {order.items.length > 1 ? ` +${order.items.length - 1} lainnya` : ""}
                </p>
              ) : null}

              {/* Bottom row: total + action */}
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                <p className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(order.grand_total)}</p>
                <Link
                  href={`/student/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] border border-border/30 transition hover:bg-[var(--surface-hover)] active:scale-95"
                >
                  Lihat Detail
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
