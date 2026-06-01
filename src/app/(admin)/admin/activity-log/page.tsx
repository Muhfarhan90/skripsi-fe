"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as indonesianLocale } from "date-fns/locale";
import { History, Search } from "lucide-react";
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
import {
  createEmptyAdminPaginationMeta,
  listAdminActivityLogs,
  type AdminActivityLog,
} from "@/features/admin/api/master-api";

const EMPTY_ACTIVITY_LOGS: AdminActivityLog[] = [];
const EVENT_FILTER_OPTIONS = [
  { value: "all", label: "Semua Event" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
] as const;

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: indonesianLocale,
  });
}

function formatEventLabel(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AdminActivityLogPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [page, setPage] = useState(1);

  const activityLogsQuery = useQuery({
    queryKey: ["admin", "activity-logs", page, searchKeyword, eventFilter],
    queryFn: () =>
      listAdminActivityLogs({
        page,
        search: searchKeyword.trim() || undefined,
        event: eventFilter === "all" ? undefined : eventFilter,
      }),
    staleTime: 15_000,
  });

  const activityLogs = activityLogsQuery.data?.items ?? EMPTY_ACTIVITY_LOGS;
  const activityLogMeta = activityLogsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const selectedEventLabel = useMemo(
    () => EVENT_FILTER_OPTIONS.find((option) => option.value === eventFilter)?.label ?? "Semua Event",
    [eventFilter],
  );

  const pageSummary = useMemo(() => {
    return activityLogs.reduce(
      (summary, activityLog) => {
        if (activityLog.event === "created") summary.created += 1;
        if (activityLog.event === "updated") summary.updated += 1;
        if (activityLog.event === "deleted") summary.deleted += 1;
        return summary;
      },
      { created: 0, updated: 0, deleted: 0 },
    );
  }, [activityLogs]);

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Activity Log"
        description="Lihat audit trail perubahan data admin untuk user, course, voucher, transaksi, dan modul operasional lain."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Total Log</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{activityLogMeta.total}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Total audit trail berdasarkan filter aktif.</p>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[var(--foreground)]">{pageSummary.updated}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Jumlah update pada halaman/filter saat ini.</p>
          </CardContent>
        </Card>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">Created / Deleted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {pageSummary.created} / {pageSummary.deleted}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Distribusi create dan delete pada halaman ini.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Riwayat Perubahan</CardTitle>
              <p className="text-sm text-[var(--muted-foreground)]">
                Audit trail per event berikut pelaku, entitas yang berubah, dan field yang terdampak.
              </p>
            </div>
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--primary)]">
              <History className="size-4" />
            </span>
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
                placeholder="Cari aktivitas, pelaku, nama entitas, atau field perubahan..."
                className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
              />
            </div>

            <Select
              value={eventFilter}
              onValueChange={(value) => {
                setEventFilter(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]">
                <SelectValue>{selectedEventLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EVENT_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {activityLogsQuery.isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Memuat activity log...</p>
          ) : null}

          {activityLogsQuery.isError ? (
            <p className="text-sm text-red-600">Gagal memuat data activity log.</p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aktivitas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Pelaku
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Entitas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {activityLogs.length > 0 ? (
                  activityLogs.map((activityLog) => (
                    <tr key={activityLog.id} className="align-top hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <p className="font-medium">{activityLog.activity}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                          {activityLog.changed_fields.length > 0
                            ? `Field: ${activityLog.changed_fields.join(", ")}`
                            : "Tidak ada field spesifik yang dicatat."}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{activityLog.actor}</td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <StatusBadge value={formatEventLabel(activityLog.event)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        <p className="font-medium">{activityLog.subject_label ?? "-"}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{activityLog.subject_name ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {formatRelativeTime(activityLog.occurred_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" colSpan={5}>
                      Belum ada activity log yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination meta={activityLogMeta} isLoading={activityLogsQuery.isLoading} onPageChange={setPage} />
        </CardContent>
      </Card>
    </section>
  );
}
