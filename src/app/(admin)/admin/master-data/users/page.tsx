"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminRoles,
  getAdminUsers,
  updateAdminUser,
  type AdminUser,
  type UserPayload,
} from "@/features/admin/api/master-api";

interface UserFormState {
  role_id: string;
  fullname: string;
  email: string;
  password: string;
  password_confirmation: string;
  nisn: string;
  is_active: boolean;
  phone: string;
  address: string;
  school_origin: string;
  gender: "laki-laki" | "perempuan" | "";
  bio: string;
  date_of_birth: string;
}

const defaultForm: UserFormState = {
  role_id: "",
  fullname: "",
  email: "",
  password: "",
  password_confirmation: "",
  nisn: "",
  is_active: true,
  phone: "",
  address: "",
  school_origin: "",
  gender: "",
  bio: "",
  date_of_birth: "",
};

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function buildPayload(form: UserFormState, isEditing: boolean): UserPayload {
  const payload: UserPayload = {
    role_id: Number(form.role_id),
    fullname: form.fullname.trim(),
    email: form.email.trim(),
    is_active: form.is_active,
    nisn: form.nisn.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    school_origin: form.school_origin.trim() || null,
    gender: (form.gender || null) as "laki-laki" | "perempuan" | null,
    bio: form.bio.trim() || null,
    date_of_birth: form.date_of_birth || null,
  };

  if (!isEditing || form.password.trim()) {
    payload.password = form.password.trim();
    payload.password_confirmation = form.password_confirmation.trim();
  }

  return payload;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<UserFormState>(defaultForm);

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

  const sortedUsers = useMemo(
    () => [...(usersQuery.data ?? [])].sort((a, b) => b.id - a.id),
    [usersQuery.data],
  );

  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return sortedUsers;
    }

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

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const closeModal = () => {
    if (saveMutation.isPending) return;
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.role_id || !form.fullname.trim() || !form.email.trim()) {
        throw new Error("Role, nama, dan email wajib diisi");
      }

      const isEditing = Boolean(editingId);
      const payload = buildPayload(form, isEditing);

      if (!isEditing && (!payload.password || !payload.password_confirmation)) {
        throw new Error("Password dan konfirmasi password wajib diisi");
      }

      if (payload.password && payload.password !== payload.password_confirmation) {
        throw new Error("Konfirmasi password tidak sama");
      }

      if (editingId) {
        return updateAdminUser(editingId, payload);
      }

      return createAdminUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(editingId ? "User berhasil diperbarui" : "User berhasil ditambahkan");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(message || "User berhasil dihapus");
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const onEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setForm({
      role_id: String(user.role_id),
      fullname: user.fullname,
      email: user.email,
      password: "",
      password_confirmation: "",
      nisn: user.nisn ?? "",
      is_active: user.is_active,
      phone: user.phone ?? "",
      address: user.address ?? "",
      school_origin: user.school_origin ?? "",
      gender: user.gender ?? "",
      bio: user.bio ?? "",
      date_of_birth: user.date_of_birth ?? "",
    });
    setIsModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Kelola Users"
        description="Kelola akun user dan status akses agar role admin/student tetap konsisten."
      />

      <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--admin-border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">
                Daftar Users
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--admin-muted-foreground)]">
                Kelola profil user dan role akses dari satu modul.
              </p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--admin-muted-foreground)]">
                {filteredUsers.length} data
              </span>
            </div>

            <Button
              type="button"
              onClick={openCreateModal}
              size="lg"
              className="h-10 bg-[var(--admin-brand)] px-4 text-white hover:opacity-90"
            >
              <Plus className="size-4" />
              <span>Buat User</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--admin-muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari user..."
              className="h-9 border-[var(--admin-border)] bg-[var(--admin-surface-soft)] pl-9 text-[var(--admin-foreground)]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="min-w-full divide-y divide-[var(--admin-border)]">
              <thead className="bg-[var(--admin-surface-soft)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {usersQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--admin-muted-foreground)]">
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
                    <tr key={user.id} className="hover:bg-[var(--admin-surface-soft)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--admin-foreground)]">{user.fullname}</td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">
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
                            onClick={() => onEdit(user)}
                            className="border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                            aria-label={`Edit ${user.fullname}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              if (window.confirm(`Hapus user "${user.fullname}"?`)) {
                                deleteMutation.mutate(user.id);
                              }
                            }}
                            className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label={`Hapus ${user.fullname}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--admin-muted-foreground)]">
                      Belum ada data users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AdminModal
        open={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit User" : "Buat User"}
        description="Lengkapi data akun user, termasuk role dan status."
        maxWidthClassName="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role_id || undefined}
                onValueChange={(value) => setForm((prev) => ({ ...prev, role_id: value ?? "" }))}
              >
                <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {(rolesQuery.data ?? []).map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-fullname">Nama Lengkap</Label>
              <Input
                id="user-fullname"
                value={form.fullname}
                onChange={(event) => setForm((prev) => ({ ...prev, fullname: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-nisn">NISN</Label>
              <Input
                id="user-nisn"
                value={form.nisn}
                onChange={(event) => setForm((prev) => ({ ...prev, nisn: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password">{editingId ? "Password Baru (opsional)" : "Password"}</Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password-confirmation">Konfirmasi Password</Label>
              <Input
                id="user-password-confirmation"
                type="password"
                value={form.password_confirmation}
                onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-phone">No. Telepon</Label>
              <Input
                id="user-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-school">Asal Sekolah</Label>
              <Input
                id="user-school"
                value={form.school_origin}
                onChange={(event) => setForm((prev) => ({ ...prev, school_origin: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={form.gender || "unspecified"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    gender: (value === "unspecified" ? "" : value) as UserFormState["gender"],
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <SelectValue placeholder="Pilih gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Tidak diisi</SelectItem>
                  <SelectItem value="laki-laki">Laki-laki</SelectItem>
                  <SelectItem value="perempuan">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-date">Tanggal Lahir</Label>
              <Input
                id="user-date"
                type="date"
                value={form.date_of_birth}
                onChange={(event) => setForm((prev) => ({ ...prev, date_of_birth: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="user-address">Alamat</Label>
              <Input
                id="user-address"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="user-bio">Bio</Label>
              <Textarea
                id="user-bio"
                rows={3}
                value={form.bio}
                onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm text-[var(--admin-foreground)]">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            User aktif
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border)] pt-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[var(--admin-brand)] text-white hover:opacity-90"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingId ? "Simpan Perubahan" : "Simpan User"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>
    </section>
  );
}

