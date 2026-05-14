"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { deleteAdminAcademicPeriod, getAdminAcademicPeriods } from "@/features/admin/api/master-api";
import { formatDate } from "@/features/admin/lib/offering-utils";

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

export default function AdminAcademicPeriodsPage() {
  const queryClient = useQueryClient();
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState<{ id: number; label: string } | null>(null);

  const periodQuery = useQuery({
    queryKey: ["admin", "academic-periods", activityFilter, searchKeyword],
    queryFn: () =>
      getAdminAcademicPeriods({
        is_active: activityFilter === "all" ? undefined : activityFilter === "active",
        search: searchKeyword.trim() || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminAcademicPeriod,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-periods"] });
      toast.success(message || "Periode akademik berhasil dihapus");
      setConfirmDeletePeriod(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const periods = useMemo(() => [...(periodQuery.data ?? [])].sort((a, b) => b.id - a.id), [periodQuery.data]);
  const hasActiveFilters = activityFilter !== "all" || searchKeyword.trim().length > 0;
  const activityOptions = useMemo(
    () => [
      { value: "all", label: "Semua Aktivasi" },
      { value: "active", label: "Aktif" },
      { value: "inactive", label: "Nonaktif" },
    ],
    [],
  );
  const selectedActivityLabel =
    activityOptions.find((option) => option.value === activityFilter)?.label ?? "Semua Aktivasi";

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Academic Periods"
        description="Mulai dari periode akademik, lalu kelola course offering dari detail period yang dipilih."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Data Periode Akademik</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Pilih satu period untuk mengelola offering yang ada di dalamnya.
              </p>
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
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">Aktivasi</p>
                <Select value={activityFilter} onValueChange={(value) => setActivityFilter(value ?? "all")}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-xs">
                    <SelectValue>{selectedActivityLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activityOptions.map((activityOption) => (
                      <SelectItem key={activityOption.value} value={activityOption.value}>
                        {activityOption.label}
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
                    setActivityFilter("all");
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
          <Table className="rounded-b-lg">
            <TableHeader className="bg-[var(--muted)]">
              <TableRow className="hover:bg-[var(--muted)]">
                <TableHead>Kode Periode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Window Belajar</TableHead>
                <TableHead>Window Pendaftaran</TableHead>
                <TableHead>Aktivasi</TableHead>
                <TableHead>Offering</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-[var(--card)]">
              {periodQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-7 text-center text-sm text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Memuat data periode...
                    </span>
                  </TableCell>
                </TableRow>
              ) : periodQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-7 text-center text-sm text-red-600">
                    Gagal memuat data periode. Coba refresh halaman.
                  </TableCell>
                </TableRow>
              ) : periods.length > 0 ? (
                periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="text-sm font-medium text-[var(--foreground)]">{period.code ?? "-"}</TableCell>
                    <TableCell className="text-sm text-[var(--foreground)]">{period.name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-[var(--foreground)]">
                      {formatDate(period.start_at)} - {formatDate(period.end_at)}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--foreground)]">
                      {formatDate(period.enrollment_open_at)} - {formatDate(period.enrollment_close_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <StatusBadge value={period.is_active ? "Aktif" : "Nonaktif"} />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-[var(--foreground)]">{period.course_offerings_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          render={<Link href={`/admin/academic-periods/${period.id}`} />}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-[var(--border)] bg-[var(--card)]"
                        >
                          <Pencil className="size-4" />
                          <span>Kelola</span>
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            setConfirmDeletePeriod({
                              id: period.id,
                              label: period.code ?? period.name ?? `Periode ${period.id}`,
                            });
                          }}
                          className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                          aria-label={`Hapus periode ${period.code ?? period.id}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-7 text-center text-sm text-[var(--muted-foreground)]">
                    Data periode akademik tidak ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmAlertDialog
        open={confirmDeletePeriod !== null}
        title="Hapus Academic Period"
        description={
          confirmDeletePeriod
            ? `Periode "${confirmDeletePeriod.label}" akan dihapus permanen jika belum memiliki course offering.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeletePeriod(null);
        }}
        onConfirm={() => {
          if (!confirmDeletePeriod) return;
          deleteMutation.mutate(confirmDeletePeriod.id);
        }}
      />
    </section>
  );
}
