"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Download,
  Loader2,
  ShoppingCart,
  Users,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminAcademicPeriods,
  getAdminSalesReportSummary,
  type AdminSalesReportFilters,
  type AdminSalesReportStatusBucket,
  type AdminSalesReportTopCourse,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { OverviewMetricCard } from "@/features/admin/components/overview-metric-card";
import { cn } from "@/lib/utils/cn";

interface ReportFilterState {
  from: string;
  to: string;
  academicPeriodId: string;
}

const DEFAULT_STATUS_BUCKETS: AdminSalesReportStatusBucket[] = [
  { status: "pending", label: "Pending", count: 0, amount: 0 },
  { status: "success", label: "Success", count: 0, amount: 0 },
  { status: "failed", label: "Failed", count: 0, amount: 0 },
];

function getJakartaDateParts(date = new Date()): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return { year, month, day };
}

function createDefaultFilters(): ReportFilterState {
  const { year, month, day } = getJakartaDateParts();

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
    academicPeriodId: "all",
  };
}

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function formatAcademicPeriodLabel(course: AdminSalesReportTopCourse): string {
  if (course.academic_period_code && course.academic_period_name) {
    return `${course.academic_period_code} - ${course.academic_period_name}`;
  }

  return course.academic_period_name || course.academic_period_code || "-";
}

function buildRangeLabel(filters: ReportFilterState): string {
  return `${filters.from} s/d ${filters.to}`;
}

function getStatusBucketAppearance(status: string): {
  icon: LucideIcon;
  cardClassName: string;
  iconWrapperClassName: string;
  iconClassName: string;
  amountClassName: string;
  countClassName: string;
} {
  switch (status.toLowerCase()) {
    case "success":
      return {
        icon: BadgeCheck,
        cardClassName: "border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-100/70",
        iconWrapperClassName: "border-emerald-200/80 bg-white/85",
        iconClassName: "text-emerald-600",
        amountClassName: "text-emerald-900",
        countClassName: "text-emerald-700/80",
      };
    case "failed":
      return {
        icon: XCircle,
        cardClassName: "border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-red-100/70",
        iconWrapperClassName: "border-rose-200/80 bg-white/85",
        iconClassName: "text-rose-600",
        amountClassName: "text-rose-900",
        countClassName: "text-rose-700/80",
      };
    case "pending":
    default:
      return {
        icon: Clock3,
        cardClassName: "border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-orange-100/70",
        iconWrapperClassName: "border-amber-200/80 bg-white/85",
        iconClassName: "text-amber-600",
        amountClassName: "text-amber-900",
        countClassName: "text-amber-700/80",
      };
  }
}

export function AdminSalesReportsPage() {
  const [filters, setFilters] = useState<ReportFilterState>(() => createDefaultFilters());

  const apiFilters = useMemo<AdminSalesReportFilters>(() => {
    return {
      from: filters.from,
      to: filters.to,
      academic_period_id: filters.academicPeriodId === "all" ? undefined : Number(filters.academicPeriodId),
    };
  }, [filters]);

  const reportQuery = useQuery({
    queryKey: [
      "admin",
      "reports",
      "sales-summary",
      apiFilters.from,
      apiFilters.to,
      apiFilters.academic_period_id ?? "all",
    ],
    queryFn: () => getAdminSalesReportSummary(apiFilters),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const academicPeriodsQuery = useQuery({
    queryKey: ["admin", "academic-periods", "reports", "options"],
    queryFn: () => getAdminAcademicPeriods({ per_page: 100 }),
    staleTime: 60_000,
  });

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }

    if (filters.academicPeriodId !== "all") {
      params.set("academic_period_id", filters.academicPeriodId);
    }

    const query = params.toString();
    return query ? `/api/admin/reports/sales/export?${query}` : "/api/admin/reports/sales/export";
  }, [filters]);

  const summary = reportQuery.data?.summary ?? {
    total_sales: 0,
    successful_transactions: 0,
    completed_orders: 0,
    unique_buyers: 0,
  };
  const statusBreakdown = reportQuery.data?.status_breakdown ?? DEFAULT_STATUS_BUCKETS;
  const topCourses = reportQuery.data?.top_courses ?? [];
  const periodOptions = academicPeriodsQuery.data ?? [];
  const activeRangeLabel = buildRangeLabel(filters);
  const isRefreshing = reportQuery.isFetching && !reportQuery.isLoading;

  return (
    <section className="space-y-5">
      {reportQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat ringkasan penjualan. Coba ubah filter atau muat ulang halaman.
        </div>
      ) : null}

      <AdminPageHeader
        title="Sales Reports"
        description="Pantau ringkasan penjualan class, status pembayaran, dan export CSV dari filter laporan yang aktif."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Filter Laporan</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Rentang aktif: {activeRangeLabel}
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
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_260px]">
          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Tanggal Mulai
            </label>
            <DatePicker
              value={filters.from}
              onChange={(value) => setFilters((prev) => ({ ...prev, from: value }))}
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Tanggal Akhir
            </label>
            <DatePicker
              value={filters.to}
              onChange={(value) => setFilters((prev) => ({ ...prev, to: value }))}
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Periode Akademik
            </label>
            <Select
              value={filters.academicPeriodId}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, academicPeriodId: value || "all" }))}
            >
              <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]">
                <SelectValue>{filters.academicPeriodId === "all" ? "Semua Period" : "Pilih period"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Period</SelectItem>
                {periodOptions.map((period) => (
                  <SelectItem key={period.id} value={String(period.id)}>
                    {period.code ? `${period.code} - ${period.name}` : period.name || `Period #${period.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {academicPeriodsQuery.isError ? (
              <p className="text-xs text-red-600">Gagal memuat daftar periode akademik.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportQuery.isLoading && !reportQuery.data
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]"
              />
            ))
          : (
              <>
                <OverviewMetricCard
                  label="Total Penjualan"
                  value={formatCurrency(summary.total_sales)}
                  note={`Revenue transaksi success pada ${activeRangeLabel}`}
                  icon={CircleDollarSign}
                  cardClassName="border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-100/80"
                  iconWrapperClassName="border-emerald-200/80 bg-white/85"
                  iconClassName="text-emerald-600"
                />
                <OverviewMetricCard
                  label="Transaksi Sukses"
                  value={String(summary.successful_transactions)}
                  note="Dihitung dari transaksi canonical per order."
                  icon={BadgeCheck}
                  cardClassName="border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-100/80"
                  iconWrapperClassName="border-sky-200/80 bg-white/85"
                  iconClassName="text-sky-600"
                />
                <OverviewMetricCard
                  label="Order Selesai"
                  value={String(summary.completed_orders)}
                  note="Order completed dengan pembayaran success."
                  icon={ShoppingCart}
                  cardClassName="border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-100/80"
                  iconWrapperClassName="border-amber-200/80 bg-white/85"
                  iconClassName="text-amber-600"
                />
                <OverviewMetricCard
                  label="Pembeli Unik"
                  value={String(summary.unique_buyers)}
                  note="Jumlah akun pembeli unik pada transaksi success."
                  icon={Users}
                  cardClassName="border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-orange-50"
                  iconWrapperClassName="border-rose-200/80 bg-white/85"
                  iconClassName="text-rose-600"
                />
              </>
            )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white shadow-sm">
          <CardHeader className="border-b border-slate-200/80">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm">
                <BarChart3 className="size-4 text-slate-700" />
              </span>
              Ringkasan Status Pembayaran
            </CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Perbandingan nominal dan jumlah transaksi canonical untuk setiap status pembayaran.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {statusBreakdown.map((bucket) => {
              const appearance = getStatusBucketAppearance(bucket.status);
              const Icon = appearance.icon;

              return (
                <div
                  key={bucket.status}
                  className={cn("rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5", appearance.cardClassName)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                          appearance.iconWrapperClassName,
                        )}
                      >
                        <Icon className={cn("size-4", appearance.iconClassName)} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{bucket.label}</p>
                        <p className={cn("mt-1 text-xs", appearance.countClassName)}>
                          {bucket.count} transaksi canonical
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold", appearance.amountClassName)}>
                        {formatCurrency(bucket.amount)}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Nominal total</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Top Selling Classes</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Diurutkan berdasarkan revenue tertinggi lalu jumlah unit terjual.
              </p>
            </div>

            {isRefreshing ? (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                <Loader2 className="size-3.5 animate-spin" />
                Menyinkronkan data...
              </span>
            ) : null}
          </CardHeader>

          <CardContent className="pt-4">
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Kelas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Instructor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Terjual
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Pembeli
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                  {topCourses.length > 0 ? (
                    topCourses.map((course) => (
                      <tr key={`${course.course_offering_id}-${course.course_id}`} className="hover:bg-[var(--surface-hover)]">
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                          <p className="font-medium">{course.course_title}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Offering #{course.course_offering_id ?? "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{course.instructor_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{formatAcademicPeriodLabel(course)}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{course.units_sold}</td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{course.unique_buyers}</td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                          {formatCurrency(course.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]" colSpan={6}>
                        Belum ada data top selling class untuk filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
