"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getStudentOrders } from "@/features/student/api/store-api";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StudentOrdersPage() {
  const ordersQuery = useQuery({
    queryKey: ["student", "orders"],
    queryFn: getStudentOrders,
  });

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Order Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau status pembayaran dan akses course Anda.
        </p>
      </header>

      {ordersQuery.isLoading ? <p className="text-sm text-muted-foreground">Memuat order...</p> : null}
      {ordersQuery.isError ? <p className="text-sm text-red-600">Gagal memuat order.</p> : null}

      <div className="space-y-3">
        {ordersQuery.data?.map((order) => (
          <article key={order.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{order.order_code}</h2>
                <p className="text-xs text-muted-foreground">
                  {order.items.length} item - {order.status}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(order.grand_total)}</p>
            </div>

            <Link
              href={`/student/orders/${order.id}`}
              className="mt-3 inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Lihat Detail
            </Link>
          </article>
        ))}
      </div>

      {ordersQuery.data && ordersQuery.data.length === 0 ? (
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Belum ada order.</p>
          <Link href="/student/catalog" className="mt-3 inline-flex text-sm text-primary hover:underline">
            Jelajahi course
          </Link>
        </article>
      ) : null}
    </section>
  );
}
