"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Pencil,
  Phone,
  Save,
  Sun,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/features/auth/api/auth-api";
import { useLogoutAction } from "@/features/auth/hooks/use-logout-action";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useTheme } from "@/providers/theme-provider";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { resolvePublicFileUrl } from "@/lib/file-url";
import type { AuthUser } from "@/types/auth";

// ── API helpers ───────────────────────────────────────────────────────────────

interface UpdateProfilePayload {
  fullname?: string;
  phone?: string;
  address?: string;
  bio?: string;
  gender?: "laki" | "perempuan" | null;
  date_of_birth?: string | null;
  school_origin?: string | null;
  nisn?: string | null;
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
    <div className="flex items-start gap-3 py-3">
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

export default function StudentProfilePage() {
  const { theme, setTheme } = useTheme();
  const storeUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutMutation = useLogoutAction();
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

  const initials = user?.fullname?.trim().charAt(0).toUpperCase() || "S";
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
      gender: user?.gender ?? null,
      date_of_birth: user?.date_of_birth ?? "",
      school_origin: user?.school_origin ?? "",
      nisn: user?.nisn ?? "",
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

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] lg:grid-rows-[auto_1fr] gap-4 lg:gap-6 items-start pb-8">
      {/* Block A: Avatar + name card */}
      <div className="space-y-4 order-1 lg:col-start-1 lg:row-start-1 lg:col-span-1">
        <article className="overflow-hidden rounded-2xl bg-[var(--primary)] text-white shadow-md">
          {/* Header strip */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {user?.avatar ? (
                    <div
                      aria-label={user.fullname || "User Avatar"}
                      className="size-16 rounded-2xl bg-cover bg-center bg-white/10 shadow-inner"
                      style={{ backgroundImage: `url("${resolvePublicFileUrl(user.avatar)}")` }}
                    />
                  ) : (
                    <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white shadow-inner">
                      {initials}
                    </span>
                  )}
                  <span className="absolute -bottom-1 -right-1 inline-flex size-5 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-emerald-400">
                    <CheckCircle2 className="size-3 text-white" />
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">
                    {user?.fullname ?? "—"}
                  </h1>
                  <p className="text-sm text-white/70">{user?.email ?? "—"}</p>
                  {joinDate ? (
                    <p className="mt-0.5 text-xs text-white/50">Bergabung {joinDate}</p>
                  ) : null}
                </div>
              </div>

              {/* Edit button */}
              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3 text-xs font-semibold text-white transition hover:bg-white/25 active:scale-95"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              ) : null}
            </div>

            {/* Bio */}
            {user?.bio && !isEditing ? (
              <p className="mt-3 text-sm leading-relaxed text-white/80">{user.bio}</p>
            ) : null}
          </div>
        </article>
      </div>

      {/* Block B: Settings & actions (placed at bottom on mobile, below avatar on desktop) */}
      {!isEditing ? (
        <div className="order-3 lg:col-start-1 lg:row-start-2 lg:col-span-1">
          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-bold text-[var(--foreground)]">Pengaturan</p>
            </div>
            <div className="divide-y divide-[var(--border)] px-4">
              {/* Theme toggle */}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex w-full items-center justify-between py-3.5 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                    {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">Tampilan</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {theme === "dark" ? "Mode Gelap aktif" : "Mode Terang aktif"}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full border transition",
                    theme === "dark"
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-[var(--border)] bg-[var(--muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-5 rounded-full bg-white shadow transition-transform",
                      theme === "dark" ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </span>
              </button>

              {/* Logout */}
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] px-3.5 py-3 text-[var(--danger-soft-foreground)] transition hover:opacity-90 active:scale-[0.99] disabled:opacity-70"
                >
                  <LogOut className="size-4 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">Keluar</p>
                    <p className="text-xs opacity-75">
                      {logoutMutation.isPending ? "Memproses..." : "Logout dari semua perangkat"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {/* Block C: Edit Form or Account Info (Main details) */}
      <div className="space-y-4 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:col-span-1">
        {/* ── Edit form ────────────────────────────────────────── */}
        {isEditing ? (
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-bold text-[var(--foreground)]">Edit Profil</p>
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex size-8 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-4">
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
                  value={form.fullname ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Nama lengkap kamu"
                />
                <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                  * Nama ini akan digunakan pada sertifikat kelulusan course Anda. Pastikan ejaan nama lengkap dan gelar (jika ada) sudah benar.
                </p>
              </div>

              {/* NISN */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="nisn">
                  NISN
                </label>
                <input
                  id="nisn"
                  value={form.nisn ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nisn: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Nomor Induk Siswa Nasional"
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
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>

              {/* School origin */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="school">
                  Asal Sekolah
                </label>
                <input
                  id="school"
                  value={form.school_origin ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, school_origin: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Nama sekolah / institusi"
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
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Kota / alamat lengkap"
                />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]" htmlFor="bio">
                  Bio <span className="font-normal text-[var(--muted-foreground)]">(opsional)</span>
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={form.bio ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-none"
                  placeholder="Ceritakan sedikit tentang dirimu..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-70"
              >
                <Save className="size-4" />
                {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        ) : null}

        {/* ── Info detail ──────────────────────────────────────── */}
        {!isEditing ? (
          <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-bold text-[var(--foreground)]">Informasi Akun</p>
            </div>
            <div className="divide-y divide-[var(--border)] px-4">
              <InfoRow icon={Mail} label="Email" value={user?.email} />
              <InfoRow icon={Phone} label="No. Telepon" value={user?.phone} />
              <InfoRow
                icon={User}
                label="Jenis Kelamin"
                value={user?.gender === "laki" ? "Laki-laki" : user?.gender === "perempuan" ? "Perempuan" : null}
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
              <InfoRow icon={BookOpen} label="Asal Sekolah" value={user?.school_origin} />
              <InfoRow icon={MapPin} label="Alamat" value={user?.address} />
              <InfoRow icon={User} label="NISN" value={user?.nisn} />
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
