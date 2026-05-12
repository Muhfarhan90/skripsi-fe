"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  checkoutCart,
  getStudentCart,
  removeCourseFromCart,
} from "@/features/student/api/store-api";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StudentCartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [voucherCode, setVoucherCode] = useState("");
  const [note, setNote] = useState("");

  const cartQuery = useQuery({
    queryKey: ["student", "cart"],
    queryFn: getStudentCart,
  });

  const removeMutation = useMutation({
    mutationFn: (courseId: number) => removeCourseFromCart(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "cart"] });
      toast.success("Item dihapus dari cart");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Gagal menghapus item dari cart");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      checkoutCart({
        voucher_code: voucherCode || undefined,
        note: note || undefined,
        payment_method: "manual",
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["student", "cart"] });
      queryClient.invalidateQueries({ queryKey: ["student", "orders"] });
      toast.success("Checkout berhasil. Silakan lanjutkan pembayaran.");
      router.push(`/student/orders/${order.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error("Checkout gagal");
    },
  });

  const cart = cartQuery.data;

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Cart Course</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review item yang ingin dibeli sebelum checkout.
        </p>
      </header>

      {cartQuery.isLoading ? <p className="text-sm text-muted-foreground">Memuat cart...</p> : null}
      {cartQuery.isError ? <p className="text-sm text-red-600">Gagal memuat cart.</p> : null}

      {!cart || cart.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Cart masih kosong.</p>
          <Link href="/student/catalog" className="mt-3 inline-flex text-sm text-primary hover:underline">
            Jelajahi course
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.items.map((item) => (
              <article key={item.course_id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">
                  {item.course?.title ?? `Course #${item.course_id}`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(item.price)}</p>

                <button
                  type="button"
                  onClick={() => removeMutation.mutate(item.course_id)}
                  disabled={removeMutation.isPending}
                  className="mt-3 inline-flex h-8 items-center rounded-md border border-red-200 px-3 text-xs text-red-700 transition hover:bg-red-50 disabled:opacity-70"
                >
                  Hapus
                </button>
              </article>
            ))}
          </div>

          <aside className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Ringkasan Checkout</h3>

            <div className="space-y-1 text-sm">
              <p className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </p>
              <p className="flex items-center justify-between text-muted-foreground">
                <span>Diskon</span>
                <span>{formatCurrency(cart.discount)}</span>
              </p>
              <p className="flex items-center justify-between font-medium text-foreground">
                <span>Total</span>
                <span>{formatCurrency(cart.grand_total)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground" htmlFor="voucher">
                Kode Voucher
              </label>
              <input
                id="voucher"
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value)}
                placeholder="Contoh: HEMAT10"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground" htmlFor="note">
                Catatan (Opsional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="button"
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
            >
              Checkout (Manual Payment)
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
