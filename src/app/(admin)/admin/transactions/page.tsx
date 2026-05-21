"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { ApiError } from "@/lib/api/client";
import {
  createEmptyAdminPaginationMeta,
  listAdminTransactions,
  updateAdminTransaction,
  type AdminOrderTransaction,
} from "@/features/admin/api/master-api";

const EMPTY_TRANSACTIONS: AdminOrderTransaction[] = [];

function formatCurrency(amount: number | string | null | undefined): string {
  const normalized = Number(amount ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(normalized) ? normalized : 0);
}

function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function getTransactionMethodLabel(transaction: AdminOrderTransaction): string {
  const parts = [transaction.payment_method, transaction.payment_channel].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return parts.length > 0 ? parts.join(" / ") : "-";
}

function getTransactionReferenceLabel(transaction: AdminOrderTransaction): string {
  return transaction.payment_reference || transaction.external_id || transaction.invoice_code;
}

export default function AdminTransactionsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ["admin", "transactions", "list", page, searchKeyword, statusFilter],
    queryFn: () =>
      listAdminTransactions({
        page,
        search: searchKeyword.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });
  const transactions = transactionsQuery.data?.items ?? EMPTY_TRANSACTIONS;
  const transactionMeta = transactionsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);

  const pageSummary = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        if (transaction.status === "pending") summary.pending += 1;
        if (transaction.status === "success") summary.success += 1;
        if (transaction.status === "failed") summary.failed += 1;
        return summary;
      },
      { pending: 0, success: 0, failed: 0 },
    );
  }, [transactions]);

  const updateTransactionMutation = useMutation({
    mutationFn: ({ transactionId, status }: { transactionId: number; status: "success" | "failed" }) =>
      updateAdminTransaction(transactionId, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "transactions"] });
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
        title="Transaksi Pembayaran"
        description="Pantau transaksi pembayaran siswa dengan data API yang sama alurnya seperti list order."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{transactionMeta.total}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Total data transaksi pembayaran.</p>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Pending Verifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{pageSummary.pending}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Jumlah transaksi pending pada halaman/filter ini.</p>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Berhasil Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{pageSummary.success}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Jumlah transaksi success pada halaman/filter ini.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-3 border-b border-[var(--border)] pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">Payment Transactions</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Monitoring pembayaran, bukti transfer, dan proses verifikasi transaksi.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-[var(--muted-foreground)]" />
              <Input
                value={searchKeyword}
                onChange={(event) => {
                  setSearchKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari payment ref, invoice, order code, atau nama student..."
                className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {transactionsQuery.isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Memuat transaksi pembayaran...</p>
          ) : null}

          {transactionsQuery.isError ? (
            <p className="text-sm text-red-600">Gagal memuat data transaksi pembayaran.</p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Payment Ref
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Order / Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Metode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Nominal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Bukti Pembayaran
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <p className="font-medium">{getTransactionReferenceLabel(transaction)}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{transaction.invoice_code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <p className="font-medium">{transaction.order?.order_code ?? `Order #${transaction.order_id}`}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {transaction.order?.user?.fullname ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {getTransactionMethodLabel(transaction)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <StatusBadge value={formatStatusLabel(transaction.status)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {transaction.payment_proof ? (
                          isHttpUrl(transaction.payment_proof) ? (
                            <a
                              href={transaction.payment_proof}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all underline underline-offset-2 hover:opacity-80"
                            >
                              Lihat Bukti
                            </a>
                          ) : (
                            <span className="break-all">{transaction.payment_proof}</span>
                          )
                        ) : (
                          <span className="text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {transaction.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateTransactionMutation.mutate({
                                  transactionId: transaction.id,
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
                                  transactionId: transaction.id,
                                  status: "failed",
                                })
                              }
                              disabled={updateTransactionMutation.isPending}
                              className="inline-flex h-8 items-center rounded-md border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" colSpan={7}>
                      Data transaksi tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination meta={transactionMeta} isLoading={transactionsQuery.isLoading} onPageChange={setPage} />
        </CardContent>
      </Card>
    </section>
  );
}
