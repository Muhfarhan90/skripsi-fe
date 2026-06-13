"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudentOrderById } from "@/features/student/api/store-api";
import { resolvePublicFileUrl } from "@/lib/file-url";
import type { StoreOrderItem } from "@/types/store";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hasItemDiscount(item: StoreOrderItem): boolean {
  const originalPrice = Number(item.course_offering?.price ?? 0);
  const discountPrice = Number(item.course_offering?.discount_price ?? 0);
  const paidPrice = Number(item.price ?? 0);

  return originalPrice > 0 && discountPrice > 0 && discountPrice < originalPrice && paidPrice === discountPrice;
}

export default function StudentOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const orderQuery = useQuery({
    queryKey: ["student", "order", orderId],
    queryFn: () => getStudentOrderById(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  if (orderQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail order...</p>;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <p className="text-sm text-red-600">Order tidak ditemukan.</p>;
  }

  const order = orderQuery.data;
  const latestTransaction = order.transactions.at(0);
  const isGatewayPayment =
    latestTransaction?.payment_method === "midtrans" || Boolean(latestTransaction?.payment_url);

  return (
    <section className="space-y-6">
      <header className="pb-3 border-b border-border/60">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{order.order_code}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">Detail Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status order: <span className="font-semibold text-foreground capitalize">{order.status}</span>
        </p>
      </header>

      <div className={latestTransaction ? "grid gap-6 md:grid-cols-2" : "space-y-6"}>
        <article className="rounded-[1.2rem] bg-card p-6 shadow-[0_8px_30px_rgba(15,23,42,0.025)] border border-border/30 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Item Pembelian</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.course_offering_id ?? item.course_id ?? item.price}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="font-medium text-foreground">{item.course?.title ?? `Course #${item.course_id}`}</span>
                  <div className="text-right">
                    {hasItemDiscount(item) ? (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatCurrency(item.course_offering?.price)}
                      </p>
                    ) : null}
                    <p className="font-semibold text-foreground">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-border/60 pt-4 text-sm space-y-2">
            <p className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </p>
            <p className="flex items-center justify-between text-muted-foreground">
              <span>Diskon</span>
              <span className="font-medium">{formatCurrency(order.discount)}</span>
            </p>
            <div className="border-t border-dashed border-border/60 pt-2 flex items-center justify-between font-bold text-foreground text-base">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.grand_total)}</span>
            </div>
          </div>
        </article>

        {latestTransaction ? (
          <article className="space-y-4 rounded-[1.2rem] bg-card p-6 shadow-[0_8px_30px_rgba(15,23,42,0.025)] border border-border/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              {isGatewayPayment ? "Pembayaran Online" : "Pembayaran Manual"}
            </h2>
            <p className="text-sm text-muted-foreground leading-6">
              {isGatewayPayment
                ? "Status pembayaran akan diperbarui secara otomatis setelah pembayaran sukses diterima."
                : "Silakan tunggu verifikasi admin untuk pembayaran manual."}
            </p>
            <div className="border-t border-border/60 pt-4 space-y-3 text-sm text-muted-foreground">
              <p className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-semibold text-[var(--foreground)]">{latestTransaction.invoice_code}</span>
              </p>
              <p className="flex justify-between">
                <span>Status transaksi:</span>
                <span className="font-semibold text-[var(--foreground)] capitalize">{latestTransaction.status}</span>
              </p>
              <p className="flex justify-between">
                <span>Metode:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {[latestTransaction.payment_method, latestTransaction.payment_channel]
                    .filter(Boolean)
                    .join(" / ") || "-"}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Referensi:</span>
                <span className="font-semibold text-[var(--foreground)]">{latestTransaction.payment_reference ?? "-"}</span>
              </p>
              {latestTransaction.payment_url && latestTransaction.status === "pending" ? (
                <div className="border-t border-dashed border-border/60 pt-4 flex flex-col gap-2">
                  <span className="text-xs">Link Pembayaran Aktif:</span>
                  <a
                    href={latestTransaction.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Bayar Sekarang
                  </a>
                </div>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/student/orders" className="inline-flex text-sm text-primary hover:underline">
          Kembali ke daftar order
        </Link>
        {order.status === "completed" ? (
          <Link href="/student/enrollments" className="inline-flex text-sm text-primary hover:underline">
            Lihat kelas saya
          </Link>
        ) : null}
      </div>
    </section>
  );
}
