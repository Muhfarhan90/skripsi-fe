"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  createEmptyAdminPaginationMeta,
  deleteAdminUser,
  listAdminUsers,
  type AdminUser,
} from "@/features/admin/api/master-api";

type UserManagementScope = "students" | "instructors";

const EMPTY_USERS: AdminUser[] = [];

const USER_SCOPE_CONFIG: Record<
  UserManagementScope,
  {
    title: string;
    description: string;
    listTitle: string;
    listDescription: string;
    createLabel: string;
    createHref: string;
    searchPlaceholder: string;
    emptyState: string;
    roleGroup: "students" | "instructors";
    editHref: (id: number) => string;
  }
> = {
  students: {
    title: "Kelola Siswa",
    description: "Pantau siswa yang mendaftar atau membeli course, termasuk analisis sekolah asal dan NISN mereka.",
    listTitle: "Daftar Siswa",
    listDescription: "Fokus pada data siswa untuk analisis sekolah asal, identitas akademik, dan aktivitas order.",
    createLabel: "Tambah Siswa",
    createHref: "/admin/master-data/students/new",
    searchPlaceholder: "Cari nama, email, NISN, atau sekolah...",
    emptyState: "Belum ada data siswa.",
    roleGroup: "students",
    editHref: (id) => `/admin/master-data/students/${id}/edit`,
  },
  instructors: {
    title: "Kelola Instructor",
    description: "Kelola akun instructor secara terpisah dari siswa agar operasional pengajar lebih rapi.",
    listTitle: "Daftar Instructor",
    listDescription: "Akun admin tidak dicampur di sini karena pengelolaan profil admin dilakukan dari halaman profil masing-masing.",
    createLabel: "Tambah Instructor",
    createHref: "/admin/master-data/instructors/new",
    searchPlaceholder: "Cari nama, email, atau telepon...",
    emptyState: "Belum ada data instructor.",
    roleGroup: "instructors",
    editHref: (id) => `/admin/master-data/instructors/${id}/edit`,
  },
};

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function formatRoleLabel(roleName: string | null | undefined): string {
  const normalized = roleName?.trim().toLowerCase();

  if (normalized === "user") return "Siswa";
  if (normalized === "admin") return "Admin";
  if (normalized === "instructor") return "Instructor";

  return roleName?.trim() || "-";
}

interface AdminUserManagementPageProps {
  scope: UserManagementScope;
}

export function AdminUserManagementPage({ scope }: AdminUserManagementPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const config = USER_SCOPE_CONFIG[scope];
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: number; fullname: string } | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", "directory", scope, page, searchKeyword],
    queryFn: () =>
      listAdminUsers({
        page,
        search: searchKeyword.trim() || undefined,
        role_group: config.roleGroup,
      }),
  });

  const users = usersQuery.data?.items ?? EMPTY_USERS;
  const userMeta = usersQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const schoolsOnPage = useMemo(() => {
    if (scope !== "students") return 0;

    return new Set(
      users
        .map((user) => user.school_origin?.trim())
        .filter((school): school is string => Boolean(school)),
    ).size;
  }, [scope, users]);
  const usersWithNisn = useMemo(() => {
    if (scope !== "students") return 0;
    return users.filter((user) => Boolean(user.nisn?.trim())).length;
  }, [scope, users]);
  const totalOrdersOnPage = useMemo(() => {
    if (scope !== "students") return 0;
    return users.reduce((total, user) => total + Number(user.orders_count ?? 0), 0);
  }, [scope, users]);

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(message || "User berhasil dihapus");
      setConfirmDeleteUser(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  return (
    <section className="space-y-5">
      <AdminPageHeader title={config.title} description={config.description} />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">{config.listTitle}</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{config.listDescription}</p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {userMeta.total} data
              </span>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => router.push(config.createHref)}
              className="h-10 bg-[var(--primary)] px-4 text-[var(--primary-foreground)] hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>{config.createLabel}</span>
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--muted-foreground)]" />
              <Input
                value={searchKeyword}
                onChange={(event) => {
                  setSearchKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder={config.searchPlaceholder}
                className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
              />
            </div>

            {scope === "students" ? (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                  {schoolsOnPage} sekolah di halaman ini
                </span>
                <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {usersWithNisn} siswa punya NISN
                </span>
                <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  {totalOrdersOnPage} total order siswa
                </span>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-lg">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Email
                  </th>
                  {scope === "students" ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        NISN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Asal Sekolah
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Order
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                        Telepon
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={scope === "students" ? 7 : 6} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      Memuat data...
                    </td>
                  </tr>
                ) : usersQuery.isError ? (
                  <tr>
                    <td colSpan={scope === "students" ? 7 : 6} className="px-4 py-6 text-center text-sm text-red-600">
                      Gagal memuat data. Coba refresh halaman.
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{user.fullname}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{user.email}</td>
                      {scope === "students" ? (
                        <>
                          <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{user.nisn || "-"}</td>
                          <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{user.school_origin || "-"}</td>
                          <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{Number(user.orders_count ?? 0)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{formatRoleLabel(user.role_name)}</td>
                          <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{user.phone || "-"}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge value={user.is_active ? "Aktif" : "Nonaktif"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => router.push(config.editHref(user.id))}
                            className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                            aria-label={`Edit ${user.fullname}`}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              setConfirmDeleteUser({
                                id: user.id,
                                fullname: user.fullname,
                              });
                            }}
                            className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                            aria-label={`Hapus ${user.fullname}`}
                          >
                            {deletingId === user.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={scope === "students" ? 7 : 6} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      {config.emptyState}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination meta={userMeta} isLoading={usersQuery.isLoading} onPageChange={setPage} />
        </CardContent>
      </Card>

      <ConfirmAlertDialog
        open={confirmDeleteUser !== null}
        title="Hapus User"
        description={
          confirmDeleteUser
            ? `User "${confirmDeleteUser.fullname}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteUser(null);
        }}
        onConfirm={() => {
          if (!confirmDeleteUser) return;
          deleteMutation.mutate(confirmDeleteUser.id);
        }}
      />
    </section>
  );
}
