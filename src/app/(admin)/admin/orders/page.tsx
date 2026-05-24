"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { ApiError } from "@/lib/api/client";
import {
  createEmptyAdminPaginationMeta,
  listAdminOrders,
  updateAdminTransaction,
} from "@/features/admin/api/master-api";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatOrderStatus(status: string): string {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default function AdminOrdersPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", "list", page, searchKeyword],
    queryFn: () =>
      listAdminOrders({
        page,
        search: searchKeyword.trim() || undefined,
      }),
  });
  const orders = ordersQuery.data?.items ?? [];
  const orderMeta = ordersQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    const search = searchKeyword.trim();

    if (search) {
      params.set("search", search);
    }

    const query = params.toString();
    return query ? `/api/admin/orders/export?${query}` : "/api/admin/orders/export";
  }, [searchKeyword]);

  const updateTransactionMutation = useMutation({
    mutationFn: ({ transactionId, status }: { transactionId: number; status: "success" | "failed" }) =>
      updateAdminTransaction(transactionId, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success(
        variables.status === "success"
          ? "Pembayaran berhasil dikonfirmasi"
          : "Pembayaran ditandai gagal",
      );
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Gagal memperbarui status pembayaran");
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Orders"
        description="Daftar order pembelian course dari siswa."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="border-b border-[var(--border)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Order List</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Export laporan order sesuai kata kunci pencarian yang sedang aktif.
              </p>
            </div>

            <Button
              render={<a href={exportHref} />}
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-[var(--muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Cari order code atau nama student..."
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {ordersQuery.isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Memuat order...</p>
          ) : null}

          {ordersQuery.isError ? (
            <p className="text-sm text-red-600">Gagal memuat data order.</p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Order Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Konfirmasi Pembayaran
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{order.order_code}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {order.user?.fullname ?? `User #${order.user_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{order.items.length} course</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{formatCurrency(order.grand_total)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <StatusBadge value={formatOrderStatus(order.status)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {(() => {
                          const pendingTransaction = order.transactions?.find(
                            (transaction) => transaction.status === "pending",
                          );

                          if (!pendingTransaction || order.status !== "pending") {
                            return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
                          }

                          return (
                            <div className="space-y-2">
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Ref: {pendingTransaction.payment_reference || "-"}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Proof:{" "}
                                {pendingTransaction.payment_proof ? (
                                  isHttpUrl(pendingTransaction.payment_proof) ? (
                                    <a
                                      href={pendingTransaction.payment_proof}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="break-all text-[var(--foreground)] underline underline-offset-2 hover:opacity-80"
                                    >
                                      {pendingTransaction.payment_proof}
                                    </a>
                                  ) : (
                                    <span className="break-all text-[var(--foreground)]">
                                      {pendingTransaction.payment_proof}
                                    </span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTransactionMutation.mutate({
                                      transactionId: pendingTransaction.id,
                                      status: "success",
                                    })
                                  }
                                  disabled={updateTransactionMutation.isPending}
                                  className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-70"
                                >
                                  Konfirmasi
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTransactionMutation.mutate({
                                      transactionId: pendingTransaction.id,
                                      status: "failed",
                                    })
                                  }
                                  disabled={updateTransactionMutation.isPending}
                                  className="inline-flex h-8 items-center rounded-md border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                                >
                                  Tolak
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" colSpan={6}>
                      Data order tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination meta={orderMeta} isLoading={ordersQuery.isLoading} onPageChange={setPage} />
        </CardContent>
      </Card>
    </section>
  );
}
