"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  User,
  X,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { resolvePublicFileUrl } from "@/lib/file-url";
import type { AuthUser } from "@/types/auth";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";

// ── API helpers ───────────────────────────────────────────────────────────────

interface UpdateProfilePayload {
  fullname?: string;
  phone?: string;
  address?: string;
  bio?: string;
  gender?: "laki" | "perempuan" | null;
  date_of_birth?: string | null;
  avatar?: File | string | null;
}

function updateProfile(payload: UpdateProfilePayload) {
  const hasFile = payload.avatar instanceof File;

  if (hasFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (key === "avatar") {
          formData.append(key, val);
        } else {
          formData.append(key, String(val));
        }
      }
    });
    formData.append("_method", "PUT");

    return apiRequest<AuthUser>("/api/auth/me", {
      method: "POST",
      body: formData,
    });
  }

  const { avatar, ...jsonPayload } = payload;

  return apiRequest<AuthUser>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(jsonPayload),
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{value || "—"}</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminProfilePage() {
  const storeUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UpdateProfilePayload>({});

  // Re-fetch current user for fresh data
  const userQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(["auth", "me"], updatedUser);
      toast.success("Profil berhasil diperbarui");
      setIsEditing(false);
      setForm({});
    },
    onError: () => {
      toast.error("Gagal memperbarui profil. Coba lagi.");
    },
  });

  const user = userQuery.data ?? storeUser;

  const initials = user?.fullname?.trim().charAt(0).toUpperCase() || "A";
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const avatarPreviewUrl = useMemo(() => {
    const avatar = form.avatar;
    if (!avatar) return null;
    if (avatar instanceof File) return URL.createObjectURL(avatar);
    return resolvePublicFileUrl(avatar) ?? avatar;
  }, [form.avatar]);

  useEffect(() => {
    if (!(form.avatar instanceof File) || !avatarPreviewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(avatarPreviewUrl);
  }, [form.avatar, avatarPreviewUrl]);

  function startEdit() {
    setForm({
      fullname: user?.fullname ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? "",
      bio: user?.bio ?? "",
      gender: (user?.gender === "laki" || user?.gender === "perempuan") ? user.gender : null,
      date_of_birth: user?.date_of_birth ?? "",
      avatar: user?.avatar ?? null,
    });
    setIsEditing(true);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran berkas gambar maksimal 2MB.");
      return;
    }

    setForm((f) => ({ ...f, avatar: file }));
  }

  function cancelEdit() {
    setIsEditing(false);
    setForm({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullname?.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    updateMutation.mutate(form);
  }

  const roleLabel = user?.role_name === "admin" ? "Administrator" : user?.role_name === "instructor" ? "Instructor" : "Staf";

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Kelola Profil"
        description="Lihat dan perbarui informasi profil Anda untuk akun administrator/instructor."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start pb-8">
        {/* Left Column: Avatar & Summary Card */}
        <div className="space-y-4">
          <article className="overflow-hidden rounded-2xl bg-[var(--primary)] text-white shadow-md">
            {/* Header strip */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {user?.avatar ? (
                    <div
                      aria-label={user.fullname || "User Avatar"}
                      className="size-14 rounded-xl bg-cover bg-center bg-white/10 shadow-inner"
                      style={{ backgroundImage: `url("${resolvePublicFileUrl(user.avatar)}")` }}
                    />
                  ) : (
                    <span className="inline-flex size-14 items-center justify-center rounded-xl bg-white/20 text-xl font-bold text-white shadow-inner">
                      {initials}
                    </span>
                  )}
                  <span className="absolute -bottom-1 -right-1 inline-flex size-5 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-emerald-400">
                    <UserCheck className="size-3 text-white" />
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight truncate max-w-[180px]">
                    {user?.fullname ?? "—"}
                  </h2>
                  <p className="text-xs text-white/70 truncate max-w-[180px]">{user?.email ?? "—"}</p>
                  <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-white">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio summary */}
            {user?.bio ? (
              <div className="border-t border-white/10 bg-white/5 px-5 py-3 text-xs leading-relaxed text-white/80">
                {user.bio}
              </div>
            ) : null}
          </article>

          {/* Account metadata info */}
          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Informasi Akun</h3>
            <div className="divide-y divide-[var(--border)]">
              <div className="py-2.5 flex justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">Status Akun</span>
                <span className="font-semibold text-emerald-500">Aktif</span>
              </div>
              <div className="py-2.5 flex justify-between text-xs">
                <span className="text-[var(--muted-foreground)]">Role Pengguna</span>
                <span className="font-semibold text-[var(--foreground)]">{roleLabel}</span>
              </div>
              {joinDate ? (
                <div className="py-2.5 flex justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Bergabung Sejak</span>
                  <span className="font-medium text-[var(--foreground)]">{joinDate}</span>
                </div>
              ) : null}
            </div>
          </article>
        </div>

        {/* Right Column: Edit Form or Details Card */}
        <div className="space-y-4">
          {isEditing ? (
            <form
              onSubmit={handleSubmit}
              className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <p className="text-sm font-bold text-[var(--foreground)]">Ubah Informasi Profil</p>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex size-8 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                {/* Foto Profil */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Foto Profil
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {avatarPreviewUrl ? (
                        <div
                          className="size-14 rounded-xl bg-cover bg-center border border-[var(--border)] bg-[var(--surface-soft)] shadow-inner"
                          style={{ backgroundImage: `url("${avatarPreviewUrl}")` }}
                        />
                      ) : (
                        <span className="inline-flex size-14 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-xl font-bold text-[var(--primary)]">
                          {initials}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="inline-flex h-8 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
                      >
                        Pilih Gambar
                      </label>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Format JPG, PNG, atau WebP maksimal 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="fullname">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullname"
                    required
                    value={form.fullname ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
                    placeholder="Nama lengkap Anda"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="phone">
                    No. Telepon
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">Jenis Kelamin</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["laki", "perempuan"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, gender: g }))}
                        className={cn(
                          "h-9 rounded-xl border text-sm font-medium transition active:scale-95",
                          form.gender === g
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
                        )}
                      >
                        {g === "laki" ? "Laki-laki" : "Perempuan"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date of birth */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="dob">
                    Tanggal Lahir
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={form.date_of_birth ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="address">
                    Alamat
                  </label>
                  <input
                    id="address"
                    value={form.address ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
                    placeholder="Alamat domisili Anda"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="bio">
                    Biografi / Bio Singkat
                  </label>
                  <textarea
                    id="bio"
                    value={form.bio ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)] resize-none"
                    placeholder="Jelaskan secara singkat mengenai latar belakang atau spesialisasi Anda..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3.5">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-9 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-75"
                >
                  {updateMutation.isPending ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <p className="text-sm font-bold text-[var(--foreground)]">Informasi Profil</p>
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
                >
                  <Pencil className="size-3.5" />
                  Ubah Profil
                </button>
              </div>

              <div className="divide-y divide-[var(--border)] px-5">
                <InfoRow icon={User} label="Nama Lengkap" value={user?.fullname} />
                <InfoRow icon={Mail} label="Alamat Email" value={user?.email} />
                <InfoRow icon={Phone} label="No. Telepon" value={user?.phone} />
                <InfoRow
                  icon={User}
                  label="Jenis Kelamin"
                  value={user?.gender ? (user.gender === "laki" ? "Laki-laki" : "Perempuan") : null}
                />
                <InfoRow
                  icon={Calendar}
                  label="Tanggal Lahir"
                  value={
                    user?.date_of_birth
                      ? new Date(user.date_of_birth).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : null
                  }
                />
                <InfoRow icon={MapPin} label="Alamat" value={user?.address} />
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
