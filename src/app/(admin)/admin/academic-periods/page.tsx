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
import { getAdminAcademicPeriods } from "@/features/admin/api/master-api";

function formatDate(value?: string | null): string {
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

export default function AdminAcademicPeriodsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const periodQuery = useQuery({
    queryKey: ["admin", "academic-periods", statusFilter, searchKeyword],
    queryFn: () =>
      getAdminAcademicPeriods({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchKeyword.trim() || undefined,
      }),
  });

  const periods = useMemo(() => [...(periodQuery.data ?? [])].sort((a, b) => b.id - a.id), [periodQuery.data]);
  const hasActiveFilters = statusFilter !== "all" || searchKeyword.trim().length > 0;
  const statusOptions = useMemo(
    () => [
      { value: "all", label: "Semua Status" },
      { value: "active", label: "Active" },
      { value: "planned", label: "Planned" },
      { value: "upcoming", label: "Upcoming" },
      { value: "closed", label: "Closed" },
    ],
    [],
  );
  const selectedStatusLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? "Semua Status";

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Daftar Academic Period"
        description="Kelola kalender akademik untuk seluruh course offering."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Data Periode Akademik</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Menampilkan {periods.length} periode.</p>
            </div>

            <Button
              render={<Link href="/admin/academic-periods/new" />}
              type="button"
              size="default"
              className="h-9 rounded-lg bg-[var(--primary)] px-4 text-[var(--primary-foreground)] shadow-none hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>Tambah Periode</span>
            </Button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]/70 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
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

              <div className="space-y-1 xl:col-span-7">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Pencarian</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-3 left-3 size-4 text-[var(--muted-foreground)]" />
                  <Input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="Cari kode atau nama periode..."
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
                    Kode Periode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Tanggal Mulai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Tanggal Selesai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Enrollment Window
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Offering
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {periodQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-7 text-center text-sm text-[var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat data periode...
                      </span>
                    </td>
                  </tr>
                ) : periodQuery.isError ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-7 text-center text-sm text-red-600">
                      Gagal memuat data periode. Coba refresh halaman.
                    </td>
                  </tr>
                ) : periods.length > 0 ? (
                  periods.map((period) => (
                    <tr key={period.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{period.code ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{period.name ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{formatDate(period.start_at)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{formatDate(period.end_at)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {formatDate(period.enrollment_open_at)} - {formatDate(period.enrollment_close_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge value={toTitleCase(period.status)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{period.course_offerings_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            render={<Link href={`/admin/academic-periods/${period.id}`} />}
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                            aria-label={`Lihat detail periode ${period.code ?? period.id}`}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-7 text-center text-sm text-[var(--muted-foreground)]">
                      Data periode akademik tidak ditemukan.
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
