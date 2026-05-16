"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import type { DataTableDefinition } from "@/features/admin/data/master-data";
import { StatusBadge } from "@/features/admin/components/status-badge";

interface DataTableCardProps {
  data: DataTableDefinition;
}

export function DataTableCard({ data }: DataTableCardProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return data.rows.filter((row) => {
      // Keep filtering logic explicit so it stays beginner-friendly.
      const passStatusFilter =
        !data.statusKey ||
        selectedStatus === "all" ||
        row[data.statusKey] === selectedStatus;

      if (!passStatusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return data.columns.some((column) => row[column.key].toLowerCase().includes(keyword));
    });
  }, [data.columns, data.rows, data.statusKey, searchKeyword, selectedStatus]);
  const lastPage = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const currentPage = Math.min(Math.max(page, 1), lastPage);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows]);

  const paginationMeta = useMemo(
    () => ({
      current_page: currentPage,
      last_page: lastPage,
      per_page: pageSize,
      total: filteredRows.length,
    }),
    [currentPage, filteredRows.length, lastPage],
  );

  return (
    <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <CardHeader className="space-y-3 border-b border-[var(--border)] pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[var(--foreground)]">{data.title}</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">{data.subtitle}</p>
          </div>

          {data.actionLabel ? (
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-[var(--primary-foreground)] transition hover:brightness-95"
            >
              <Plus className="size-4" />
              {data.actionLabel}
            </button>
          ) : null}
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
              placeholder={data.searchPlaceholder}
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>

          {data.statusKey && data.statusOptions ? (
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value ?? "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {data.statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--muted)]">
              <tr>
                {data.columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--surface-hover)]">
                    {data.columns.map((column) => (
                      <td key={`${row.id}-${column.key}`} className="px-4 py-3 text-sm text-[var(--foreground)]">
                        {column.key === data.statusKey ? <StatusBadge value={row[column.key]} /> : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]" colSpan={data.columns.length}>
                    Data tidak ditemukan berdasarkan filter saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination meta={paginationMeta} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
}

