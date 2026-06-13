"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { downloadAuthorizedFile } from "@/lib/api/browser-files";
import { resolvePublicFileUrl } from "@/lib/file-url";
import {
  createEmptyAdminPaginationMeta,
  listAdminTransactions,
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

function getTransactionMethodLabel(transaction: AdminOrderTransaction): string {
  const parts = [transaction.payment_method, transaction.payment_channel].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return parts.length > 0 ? parts.join(" / ") : "-";
}

export default function AdminTransactionsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

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
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                void downloadAuthorizedFile(exportHref, "transactions.csv");
              }}
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
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Order
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <p className="font-semibold">{transaction.order?.user?.fullname ?? "-"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {transaction.order?.user?.email ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {formatDateTime(transaction.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)] font-medium">
                        {transaction.order?.order_code ?? `Order #${transaction.order_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {getTransactionMethodLabel(transaction)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)] font-medium">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <StatusBadge value={formatStatusLabel(transaction.status)} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" colSpan={6}>
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
