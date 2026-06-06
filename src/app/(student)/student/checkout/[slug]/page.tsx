"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CreditCard, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createStudentOrder,
  getPublishedCourseBySlug,
} from "@/features/student/api/store-api";
import { ApiError } from "@/lib/api/client";
import { hasValidDiscount } from "@/features/student/lib/pricing";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

export default function StudentCheckoutPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [voucherCode, setVoucherCode] = useState("");
  const [note, setNote] = useState("");

  const courseQuery = useQuery({
    queryKey: ["store", "course-detail", slug],
    queryFn: () => getPublishedCourseBySlug(slug),
    enabled: slug.length > 0,
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const course = courseQuery.data;
      if (!course) {
        throw new Error("Course belum tersedia untuk checkout.");
      }

      return createStudentOrder({
        course_id: course.id,
        voucher_code: voucherCode.trim() || undefined,
        note: note.trim() || undefined,
        payment_method: "gateway",
      });
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["student", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["student", "enrollments"] });
      const paymentUrl = order.transactions.at(0)?.payment_url;

      if (paymentUrl) {
        toast.success("Checkout berhasil dibuat. Mengarahkan ke pembayaran Midtrans.");
        window.location.assign(paymentUrl);
        return;
      }

      toast.success("Checkout berhasil dibuat.");
      router.push(`/student/orders/${order.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error(error instanceof Error ? error.message : "Checkout gagal diproses");
    },
  });

  if (courseQuery.isLoading) {
    return <p className="text-sm text-[var(--muted-foreground)]">Menyiapkan checkout...</p>;
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Course tidak ditemukan atau gagal dimuat.</p>
        <Link href="/student/catalog" className="inline-flex text-sm text-[var(--primary)] hover:underline">
          Kembali ke katalog
        </Link>
      </section>
    );
  }

  const course = courseQuery.data;
  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Checkout Course</p>
        <h1 className="mt-1 text-xl font-bold text-[var(--foreground)]">Buat Order Course</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Periksa ringkasan pesanan. Pembayaran akan diproses otomatis melalui Midtrans.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <BookOpen className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Course
              </p>
              <h2 className="mt-1 text-base font-bold text-[var(--foreground)]">{course.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {course.description || "Deskripsi course belum tersedia."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <CreditCard className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Pembayaran Gateway</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Setelah order dibuat, kamu akan diarahkan ke halaman Midtrans untuk memilih dan menyelesaikan pembayaran.
                  Status order akan berubah otomatis saat pembayaran berhasil.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
              <CreditCard className="size-3.5" />
              Virtual Account
            </label>
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
              Kode bayar/VA akan dibuat oleh Midtrans setelah tombol checkout ditekan.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="note">
              Catatan
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              placeholder="Tambahkan catatan jika diperlukan"
            />
          </div>
        </article>

        <aside className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm lg:h-fit">
          <div>
            <p className="text-sm font-bold text-[var(--foreground)]">Ringkasan Pesanan</p>
            <div className="mt-3 space-y-3 rounded-xl bg-[var(--surface-soft)] p-3">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0 text-[var(--muted-foreground)]">{course.title}</span>
                <span className="shrink-0 font-medium text-[var(--foreground)]">{formatCurrency(activePrice)}</span>
              </div>
              {hasDiscount ? (
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>Harga normal</span>
                  <span className="line-through">{formatCurrency(course.price)}</span>
                </div>
              ) : null}
              <div className="border-t border-[var(--border)] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[var(--foreground)]">Estimasi total</span>
                  <span className="text-base font-bold text-[var(--primary)]">{formatCurrency(activePrice)}</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Total akhir bisa berubah jika voucher valid diterapkan.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]" htmlFor="voucher">
              <Tag className="size-3.5" />
              Kode Voucher
            </label>
            <input
              id="voucher"
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
              placeholder="Contoh: HEMAT10"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Voucher akan divalidasi saat pesanan dibuat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-70"
          >
            {checkoutMutation.isPending
              ? "Memproses..."
              : "Bayar dengan Midtrans"}
          </button>

          <Link
            href={`/student/catalog/${course.slug}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
          >
            Kembali ke detail course
          </Link>
        </aside>
      </div>
    </section>
  );
}
