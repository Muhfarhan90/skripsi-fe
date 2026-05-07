"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { getStudentOrderById, submitStudentPayment } from "@/features/student/api/store-api";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StudentOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProof, setPaymentProof] = useState("");

  const orderId = Number(params.id);

  const orderQuery = useQuery({
    queryKey: ["student", "order", orderId],
    queryFn: () => getStudentOrderById(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitStudentPayment(orderId, {
        payment_reference: paymentReference || undefined,
        payment_proof: paymentProof || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["student", "orders"] });
      toast.success("Bukti pembayaran berhasil dikirim");
      setPaymentReference("");
      setPaymentProof("");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal mengirim bukti pembayaran");
    },
  });

  if (orderQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat detail order...</p>;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <p className="text-sm text-red-600">Order tidak ditemukan.</p>;
  }

  const order = orderQuery.data;
  const latestTransaction = order.transactions.at(0);

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
            <div key={item.course_id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.course?.title ?? `Course #${item.course_id}`}</span>
              <span className="font-medium text-foreground">{formatCurrency(item.price)}</span>
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

      {order.status === "pending" ? (
        <article className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Pembayaran Manual</h2>
          <p className="text-sm text-muted-foreground">
            Silakan transfer sesuai nominal total. Setelah itu kirim referensi pembayaran dan bukti transfer.
          </p>

          <div className="space-y-2">
            <label htmlFor="reference" className="text-xs text-muted-foreground">
              Referensi Pembayaran (Opsional)
            </label>
            <input
              id="reference"
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="proof" className="text-xs text-muted-foreground">
              Bukti Pembayaran (Link/File Path)
            </label>
            <input
              id="proof"
              value={paymentProof}
              onChange={(event) => setPaymentProof(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
          >
            Kirim Bukti Pembayaran
          </button>
        </article>
      ) : null}

      {latestTransaction ? (
        <article className="rounded-lg border border-border bg-card p-5 shadow-sm text-sm text-muted-foreground">
          <p>Invoice: {latestTransaction.invoice_code}</p>
          <p>Status transaksi: {latestTransaction.status}</p>
          <p>Metode: {latestTransaction.payment_method ?? "-"}</p>
        </article>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/student/orders" className="inline-flex text-sm text-primary hover:underline">
          Kembali ke daftar order
        </Link>
        {order.status === "completed" ? (
          <Link href="/student/enrollments" className="inline-flex text-sm text-primary hover:underline">
            Lihat enrollment
          </Link>
        ) : null}
      </div>
    </section>
  );
}
