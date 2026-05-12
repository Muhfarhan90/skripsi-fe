"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, Plus, RotateCcw, Search } from "lucide-react";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminAcademicPeriods, getAdminCourseOfferings } from "@/features/admin/api/master-api";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toTitleCase(value?: string | null): string {
  if (!value) return "-";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export default function AdminCourseOfferingsPage() {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const periodQuery = useQuery({
    queryKey: ["admin", "academic-periods", "filters"],
    queryFn: () => getAdminAcademicPeriods(),
  });

  const offeringQuery = useQuery({
    queryKey: ["admin", "course-offerings", periodFilter, statusFilter, searchKeyword],
    queryFn: () =>
      getAdminCourseOfferings({
        academic_period_id: periodFilter === "all" ? undefined : periodFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchKeyword.trim() || undefined,
      }),
  });

  const offerings = useMemo(() => [...(offeringQuery.data ?? [])].sort((a, b) => b.id - a.id), [offeringQuery.data]);
  const hasActiveFilters = periodFilter !== "all" || statusFilter !== "all" || searchKeyword.trim().length > 0;
  const periodOptions = useMemo(() => {
    const fromApi = (periodQuery.data ?? []).map((period) => {
      const labelChunks = [period.code?.trim(), period.name?.trim()].filter(Boolean);
      return {
        value: String(period.id),
        label: labelChunks.length > 0 ? labelChunks.join(" - ") : `Periode #${period.id}`,
      };
    });

    return [{ value: "all", label: "Semua Periode" }, ...fromApi];
  }, [periodQuery.data]);
  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Semua Status" },
      { value: "published", label: "Published" },
      { value: "draft", label: "Draft" },
      { value: "closed", label: "Closed" },
    ],
    [],
  );
  const selectedPeriodLabel = periodOptions.find((option) => option.value === periodFilter)?.label ?? "Semua Periode";
  const selectedStatusLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? "Semua Status";

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Daftar Course Offering"
        description="Kelola batch/offering per periode akademik dengan filter yang lebih cepat."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Data Offering</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Menampilkan {offerings.length} offering.
              </p>
            </div>

            <Button
              render={<Link href="/admin/course-offerings/new" />}
              type="button"
              size="default"
              className="h-9 rounded-lg bg-[var(--primary)] px-4 text-[var(--primary-foreground)] shadow-none hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>Buat Offering</span>
            </Button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]/70 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="space-y-1 xl:col-span-3">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Periode Akademik</p>
                <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value ?? "all")}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-xs">
                    <SelectValue>{selectedPeriodLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((periodOption) => (
                      <SelectItem key={periodOption.value} value={periodOption.value}>
                        {periodOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 xl:col-span-3">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Status</p>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-xs">
                    <SelectValue>{selectedStatusLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((statusOption) => (
                      <SelectItem key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 xl:col-span-4">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Pencarian</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-3 left-3 size-4 text-[var(--muted-foreground)]" />
                  <Input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="Cari nama offering, course, atau kode periode..."
                    className="h-10 rounded-xl border-[var(--border)] bg-[var(--card)] pl-10 text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="flex items-end justify-end xl:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-10 rounded-xl border-[var(--border)] bg-[var(--card)] px-4"
                  onClick={() => {
                    setPeriodFilter("all");
                    setStatusFilter("all");
                    setSearchKeyword("");
                  }}
                  disabled={!hasActiveFilters}
                >
                  <RotateCcw className="size-4" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-lg">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Periode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Peserta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Harga
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {offeringQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-7 text-center text-sm text-[var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat data offering...
                      </span>
                    </td>
                  </tr>
                ) : offeringQuery.isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-7 text-center text-sm text-red-600">
                      Gagal memuat data offering. Coba refresh halaman.
                    </td>
                  </tr>
                ) : offerings.length > 0 ? (
                  offerings.map((item) => {
                    const enrolledCount = Number(item.enrollments_count ?? 0);
                    const capacity = Number(item.capacity ?? 0);
                    const fillRate = capacity > 0 ? Math.round((enrolledCount / capacity) * 100) : 0;
                    const normalPrice = Number(item.price ?? 0);
                    const discountPrice = Number(item.discount_price ?? 0);
                    const finalPrice = discountPrice > 0 && discountPrice < normalPrice ? discountPrice : normalPrice;

                    return (
                      <tr key={item.id} className="hover:bg-[var(--surface-hover)]">
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium text-[var(--foreground)]">{item.title || item.course?.title || "-"}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{item.course?.category?.name ?? "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium text-[var(--foreground)]">{item.academic_period?.code ?? "-"}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {formatDateTime(item.enrollment_open_at)} - {formatDateTime(item.enrollment_close_at)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium text-[var(--foreground)]">
                            {enrolledCount} / {capacity}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">{fillRate}%</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)]">{formatCurrency(finalPrice)}</td>
                        <td className="px-4 py-3 text-sm">
                          <StatusBadge value={toTitleCase(item.status)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              render={<Link href={`/admin/course-offerings/${item.id}`} />}
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                              aria-label={`Lihat detail offering ${item.title ?? item.course?.title ?? item.id}`}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-7 text-center text-sm text-[var(--muted-foreground)]">
                      Data offering tidak ditemukan untuk filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
