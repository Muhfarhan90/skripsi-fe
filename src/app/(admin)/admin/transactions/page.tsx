"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { resolvePublicFileUrl } from "@/lib/file-url";
import {
  createEmptyAdminPaginationMeta,
  listAdminTransactions,
  updateAdminTransaction,
  type AdminOrderTransaction,
} from "@/features/admin/api/master-api";

const EMPTY_TRANSACTIONS: AdminOrderTransaction[] = [];
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
] as const;

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
  const selectedStatusLabel = useMemo(
    () => STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.label ?? "Semua Status",
    [statusFilter],
  );
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    const search = searchKeyword.trim();

    if (search) {
      params.set("search", search);
    }

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    const query = params.toString();
    return query ? `/api/admin/transactions/export?${query}` : "/api/admin/transactions/export";
  }, [searchKeyword, statusFilter]);

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

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Payment Transactions</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">
                Monitoring pembayaran, bukti transfer, proses verifikasi, dan export laporan CSV.
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
                <SelectValue>{selectedStatusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
                        {(() => {
                          const paymentProofUrl = resolvePublicFileUrl(transaction.payment_proof);

                          if (paymentProofUrl) {
                            return (
                              <a
                                href={paymentProofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all underline underline-offset-2 hover:opacity-80"
                              >
                                Lihat Bukti
                              </a>
                            );
                          }

                          if (transaction.payment_proof) {
                            return <span className="break-all">{transaction.payment_proof}</span>;
                          }

                          return <span className="text-[var(--muted-foreground)]">-</span>;
                        })()}
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
