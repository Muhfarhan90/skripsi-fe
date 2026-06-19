"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { getAdminOrderById } from "@/features/admin/api/master-api";
import type { AdminOrderItem, AdminOrderTransaction } from "@/features/admin/api/master-api";

function formatCurrency(amount: number | string | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getOrderItemCourseTitle(item: AdminOrderItem): string {
  return (
    item.course_title?.trim() ||
    item.course_offering_snapshot?.course_title?.trim() ||
    item.course?.title?.trim() ||
    `Course #${item.course_id ?? "-"}`
  );
}

function getOrderItemPeriodLabel(item: AdminOrderItem): string | null {
  const code = item.period_code?.trim() || item.course_offering_snapshot?.period_code?.trim();
  const name = item.period_name?.trim() || item.course_offering_snapshot?.period_name?.trim();
  const chunks = [code, name].filter(Boolean);
  return chunks.length > 0 ? chunks.join(" - ") : null;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);

  const orderQuery = useQuery({
    queryKey: ["admin", "orders", "detail", orderId],
    queryFn: () => getAdminOrderById(orderId),
    enabled: Number.isFinite(orderId) && orderId > 0,
  });

  const order = orderQuery.data;
  const latestTransaction = order?.transactions?.at(-1) ?? order?.transactions?.[0] ?? null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminPageHeader
          title="Detail Order"
          description="Lihat order, item course, dan status pembayaran."
        />
        <Button render={<Link href="/admin/orders" />} type="button" variant="outline">
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
      </div>

      {orderQuery.isLoading ? (
        <p className="text-sm text-[var(--muted-foreground)]">Memuat detail order...</p>
      ) : null}

      {orderQuery.isError ? (
        <p className="text-sm text-red-600">Gagal memuat detail order.</p>
      ) : null}

      {order ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardHeader className="border-b border-[var(--border)] pb-4">
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                  Informasi Order
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <DetailItem label="Kode Order" value={order.order_code} />
                <DetailItem label="Status Order" value={<StatusBadge value={formatStatus(order.status)} />} />
                <DetailItem label="Student" value={order.user?.fullname ?? `User #${order.user_id}`} />
                <DetailItem label="Email Student" value={order.user?.email ?? "-"} />
                <DetailItem label="Tanggal Order" value={formatDateTime(order.created_at)} />
                <DetailItem label="Catatan" value={order.note || "-"} />
              </CardContent>
            </Card>

            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardHeader className="border-b border-[var(--border)] pb-4">
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                  Ringkasan Pembayaran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-sm">
                <AmountRow label="Subtotal" value={order.subtotal} />
                <AmountRow label="Diskon" value={order.discount} />
                <div className="border-t border-[var(--border)] pt-3">
                  <AmountRow label="Total" value={order.grand_total} strong />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Item Course</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Course
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Harga
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {order.items.map((item, index) => (
                      <tr key={`${item.course_offering_id ?? item.course_id}-${item.price}-${index}`}>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                          <div className="space-y-1">
                            <p className="font-medium">{getOrderItemCourseTitle(item)}</p>
                            {getOrderItemPeriodLabel(item) ? (
                              <p className="text-xs text-[var(--muted-foreground)]">{getOrderItemPeriodLabel(item)}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-[var(--foreground)]">
                          {formatCurrency(item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                Transaksi Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {latestTransaction ? (
                <TransactionPanel transaction={latestTransaction} />
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Belum ada transaksi pembayaran.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="text-sm font-medium text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number | string | null | undefined;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
        {label}
      </span>
      <span className={strong ? "font-bold text-[var(--primary)]" : "font-medium text-[var(--foreground)]"}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function TransactionPanel({ transaction }: { transaction: AdminOrderTransaction }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <DetailItem label="Status Transaksi" value={<StatusBadge value={formatStatus(transaction.status)} />} />
      <DetailItem label="Nominal" value={formatCurrency(transaction.amount)} />
      <DetailItem label="Dibayar Pada" value={formatDateTime(transaction.paid_at)} />
      <DetailItem label="Kedaluwarsa" value={formatDateTime(transaction.expired_at)} />
    </div>
  );
}
