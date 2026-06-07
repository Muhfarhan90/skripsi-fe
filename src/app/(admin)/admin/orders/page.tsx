"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Eye, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { downloadAuthorizedFile } from "@/lib/api/browser-files";
import {
  createEmptyAdminPaginationMeta,
  listAdminOrders,
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

export default function AdminOrdersPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);

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
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                void downloadAuthorizedFile(exportHref, "orders.csv");
              }}
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
                    Pembayaran
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Detail
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
                          const latestTransaction = order.transactions?.at(-1) ?? order.transactions?.[0];

                          if (!latestTransaction) {
                            return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
                          }

                          return (
                            <StatusBadge value={formatOrderStatus(latestTransaction.status)} />
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                        <Button
                          render={<Link href={`/admin/orders/${order.id}`} />}
                          type="button"
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="size-4" />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" colSpan={7}>
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
