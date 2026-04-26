"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
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
  type AdminUser,
  createAdminUser,
  getAdminRoles,
  getAdminUserById,
  updateAdminUser,
  type UserPayload,
} from "@/features/admin/api/master-api";
import { useUnsavedChangesGuard } from "@/features/admin/hooks/use-unsaved-changes-guard";

type UserFormMode = "create" | "edit";

interface AdminUserFormPageProps {
  mode: UserFormMode;
  userId?: number;
}

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

type UserFormErrors = Partial<Record<keyof UserFormState | "form", string>>;

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

function mapUserToFormState(user: AdminUser): UserFormState {
  return {
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
  };
}

// Build payload terstandar agar form create dan edit memakai kontrak API yang sama.
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

// Validasi lokal diprioritaskan untuk feedback cepat sebelum request ke server.
function validateUserForm(form: UserFormState, isEditing: boolean): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!form.role_id) errors.role_id = "Role wajib dipilih";
  if (!form.fullname.trim()) errors.fullname = "Nama lengkap wajib diisi";
  if (!form.email.trim()) errors.email = "Email wajib diisi";

  if (!isEditing && !form.password.trim()) {
    errors.password = "Password wajib diisi untuk user baru";
  }

  const hasPasswordInput = Boolean(form.password.trim() || form.password_confirmation.trim());
  if (hasPasswordInput && form.password.trim() !== form.password_confirmation.trim()) {
    errors.password_confirmation = "Konfirmasi password tidak sama";
  }

  return errors;
}

// Mapping error API -> error form supaya pesan field dari backend tetap terbaca jelas.
function mapApiError(error: unknown): UserFormErrors {
  if (!(error instanceof ApiError)) {
    return {
      form: error instanceof Error ? error.message : "Terjadi kesalahan tak terduga",
    };
  }

  const fieldErrors: UserFormErrors = {};
  const knownKeys = new Set<keyof UserFormState>(Object.keys(defaultForm) as Array<keyof UserFormState>);

  if (error.errors) {
    Object.entries(error.errors).forEach(([key, value]) => {
      const firstMessage = Array.isArray(value) ? String(value[0]) : String(value);
      if (!firstMessage) return;

      if (knownKeys.has(key as keyof UserFormState)) {
        fieldErrors[key as keyof UserFormState] = firstMessage;
      } else if (!fieldErrors.form) {
        fieldErrors.form = firstMessage;
      }
    });
  }

  if (!fieldErrors.form) {
    fieldErrors.form = error.message;
  }

  return fieldErrors;
}

export function AdminUserFormPage({ mode, userId }: AdminUserFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEditing = mode === "edit";
  const [draftForm, setDraftForm] = useState<UserFormState | null>(null);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});

  const rolesQuery = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: getAdminRoles,
  });

  const userDetailQuery = useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: () => getAdminUserById(userId as number),
    enabled: isEditing && Boolean(userId),
  });

  const baseForm = useMemo<UserFormState>(() => {
    if (isEditing && userDetailQuery.data) {
      return mapUserToFormState(userDetailQuery.data);
    }

    return defaultForm;
  }, [isEditing, userDetailQuery.data]);

  const form = draftForm ?? baseForm;
  const roleLabelMap = useMemo(() => {
    return new Map((rolesQuery.data ?? []).map((role) => [String(role.id), role.name]));
  }, [rolesQuery.data]);
  const selectedRoleLabel = form.role_id ? roleLabelMap.get(form.role_id) : undefined;

  const setForm = (updater: (prev: UserFormState) => UserFormState) => {
    setDraftForm((prev) => updater(prev ?? baseForm));
  };

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseForm), [baseForm, form]);
  const { confirmLeave } = useUnsavedChangesGuard(isDirty);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form, isEditing);
      if (isEditing) {
        return updateAdminUser(userId as number, payload);
      }
      return createAdminUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(isEditing ? "User berhasil diperbarui" : "User berhasil ditambahkan");
      router.push("/admin/master-data/users");
      router.refresh();
    },
    onError: (error) => {
      const nextErrors = mapApiError(error);
      setFormErrors(nextErrors);
      toast.error(nextErrors.form ?? "Gagal menyimpan data user");
    },
  });

  const handleSave = () => {
    const validationErrors = validateUserForm(form, isEditing);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    saveMutation.mutate();
  };

  const handleCancel = () => {
    if (!confirmLeave()) return;
    router.push("/admin/master-data/users");
  };

  if (isEditing && userDetailQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Edit User" description="Memuat detail user..." />
        <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--admin-muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat data user...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isEditing && userDetailQuery.isError) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          title="Edit User"
          description="Data user tidak dapat dimuat. Coba kembali ke daftar user."
        />
        <Card className="border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm text-red-700">Gagal memuat data user untuk proses edit.</p>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/master-data/users")}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke daftar user</span>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={isEditing ? "Edit User" : "Buat User"}
        description="Form terpisah untuk mempercepat input data user dalam jumlah besar."
      />

      <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
        <CardHeader className="border-b border-[var(--admin-border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">
                {isEditing ? "Perbarui Data User" : "Tambah Data User Baru"}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--admin-muted-foreground)]">
                Lengkapi data akun, profil, dan status akses user.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={handleCancel}>
              <ArrowLeft className="size-4" />
              <span>Kembali ke Daftar</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5">
          {formErrors.form ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{formErrors.form}</span>
            </div>
          ) : null}

          <section className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--admin-foreground)]">Akses & Identitas</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.role_id || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, role_id: value ?? "" }))}
                >
                  <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                    <SelectValue placeholder="Pilih role">{selectedRoleLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(rolesQuery.data ?? []).map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.role_id ? <p className="text-xs text-red-600">{formErrors.role_id}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-fullname">Nama Lengkap</Label>
                <Input
                  id="user-fullname"
                  value={form.fullname}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullname: event.target.value }))}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
                {formErrors.fullname ? <p className="text-xs text-red-600">{formErrors.fullname}</p> : null}
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
                {formErrors.email ? <p className="text-xs text-red-600">{formErrors.email}</p> : null}
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
                <Label htmlFor="user-password">{isEditing ? "Password Baru (opsional)" : "Password"}</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
                />
                {formErrors.password ? <p className="text-xs text-red-600">{formErrors.password}</p> : null}
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
                {formErrors.password_confirmation ? (
                  <p className="text-xs text-red-600">{formErrors.password_confirmation}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--admin-foreground)]">Profil Akademik</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <DatePicker
                  value={form.date_of_birth}
                  onChange={(value) => setForm((prev) => ({ ...prev, date_of_birth: value }))}
                  placeholder="Pilih tanggal lahir"
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
          </section>

          <label
            htmlFor="user-is-active"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm text-[var(--admin-foreground)]"
          >
            <Checkbox
              id="user-is-active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
            User aktif
          </label>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-20">
        <div className="flex items-center justify-end gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 shadow-lg">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[var(--admin-brand)] text-white hover:opacity-90"
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>{isEditing ? "Simpan Perubahan" : "Simpan User"}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
