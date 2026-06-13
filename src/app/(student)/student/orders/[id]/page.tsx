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
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-xs text-muted-foreground">{order.order_code}</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Detail Order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status order: <span className="font-medium text-foreground">{order.status}</span>
        </p>
      </header>

      <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Item Pembelian</h2>
        <div className="mt-3 space-y-2">
          {order.items.map((item) => (
            <div
              key={item.course_offering_id ?? item.course_id ?? item.price}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-muted-foreground">{item.course?.title ?? `Course #${item.course_id}`}</span>
              <div className="text-right">
                {hasItemDiscount(item) ? (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatCurrency(item.course_offering?.price)}
                  </p>
                ) : null}
                <p className="font-medium text-foreground">
                  {formatCurrency(item.price)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-3 text-sm">
          <p className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </p>
          <p className="mt-1 flex items-center justify-between text-muted-foreground">
            <span>Diskon</span>
            <span>{formatCurrency(order.discount)}</span>
          </p>
          <p className="mt-1 flex items-center justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCurrency(order.grand_total)}</span>
          </p>
        </div>
      </article>

      {latestTransaction ? (
        <article className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            {isGatewayPayment ? "Pembayaran Online" : "Pembayaran Manual"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isGatewayPayment
              ? "Status pembayaran akan diperbarui setelah transaksi selesai."
              : "Data pembayaran dari proses checkout ditampilkan di bawah dan menunggu verifikasi admin."}
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Invoice: {latestTransaction.invoice_code}</p>
            <p>Status transaksi: {latestTransaction.status}</p>
            <p>
              Metode:{" "}
              {[latestTransaction.payment_method, latestTransaction.payment_channel]
                .filter(Boolean)
                .join(" / ") || "-"}
            </p>
            <p>Referensi: {latestTransaction.payment_reference ?? "-"}</p>
            {latestTransaction.payment_url && latestTransaction.status === "pending" ? (
              <p>
                Link pembayaran:{" "}
                <a
                  href={latestTransaction.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Bayar sekarang
                </a>
              </p>
            ) : null}

          </div>
        </article>
      ) : null}

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
