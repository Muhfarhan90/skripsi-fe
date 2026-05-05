"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { deleteAdminUser, getAdminRoles, getAdminUsers } from "@/features/admin/api/master-api";

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: number; fullname: string } | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: getAdminUsers,
  });

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: getAdminRoles,
  });

  const roleNameMap = useMemo(
    () => new Map((rolesQuery.data ?? []).map((role) => [role.id, role.name])),
    [rolesQuery.data],
  );

  const sortedUsers = useMemo(() => [...(usersQuery.data ?? [])].sort((a, b) => b.id - a.id), [usersQuery.data]);

  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return sortedUsers;

    return sortedUsers.filter((user) => {
      const roleLabel = roleNameMap.get(user.role_id) ?? "";
      const searchableParts = [
        user.fullname,
        user.email,
        user.nisn ?? "",
        user.phone ?? "",
        roleLabel,
        user.is_active ? "aktif" : "nonaktif",
      ];

      return searchableParts.some((value) => value.toLowerCase().includes(keyword));
    });
  }, [roleNameMap, searchKeyword, sortedUsers]);

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
      <AdminPageHeader
        title="Kelola Users"
        description="Kelola akun user dan status akses agar role admin/student tetap konsisten."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Users</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Kelola profil user dan role akses dari satu modul.
              </p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {filteredUsers.length} data
              </span>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => router.push("/admin/master-data/users/new")}
              className="h-10 bg-[var(--primary)] px-4 text-[var(--primary-foreground)] hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>Buat User</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari user..."
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
            />
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
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Role
                  </th>
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
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      Memuat users...
                    </td>
                  </tr>
                ) : usersQuery.isError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">
                      Gagal memuat users. Coba refresh halaman.
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{user.fullname}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {roleNameMap.get(user.role_id) ?? `Role ${user.role_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge value={user.is_active ? "Aktif" : "Nonaktif"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => router.push(`/admin/master-data/users/${user.id}/edit`)}
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
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      Belum ada data users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

