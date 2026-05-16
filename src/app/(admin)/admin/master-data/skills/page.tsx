"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { StatusBadge } from "@/features/admin/components/status-badge";
import {
  createAdminSkill,
  createEmptyAdminPaginationMeta,
  deleteAdminSkill,
  listAdminSkills,
  updateAdminSkill,
  type AdminSkill,
} from "@/features/admin/api/master-api";

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

export default function AdminSkillsPage() {
  const queryClient = useQueryClient();
  const [editingSkill, setEditingSkill] = useState<AdminSkill | null>(null);
  const [confirmDeleteSkill, setConfirmDeleteSkill] = useState<AdminSkill | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    name: "",
    is_active: true,
  });

  const skillQuery = useQuery({
    queryKey: ["admin", "skills", "list", page, searchKeyword],
    queryFn: () =>
      listAdminSkills({
        page,
        search: searchKeyword.trim() || undefined,
      }),
  });
  const skills = skillQuery.data?.items ?? [];
  const skillMeta = skillQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);

  const resetForm = () => {
    setEditingSkill(null);
    setForm({
      name: "",
      is_active: true,
    });
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
      if (!form.name.trim()) {
        throw new Error("Nama skill wajib diisi");
      }

      if (editingSkill) {
        return updateAdminSkill(editingSkill.id, {
          name: form.name.trim(),
          is_active: form.is_active,
        });
      }

      return createAdminSkill({
        name: form.name.trim(),
        is_active: form.is_active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.success(editingSkill ? "Skill berhasil diperbarui" : "Skill berhasil ditambahkan");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSkill,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "skills"] });
      toast.success(message || "Skill berhasil dihapus");
      setConfirmDeleteSkill(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const onEdit = (skill: AdminSkill) => {
    setEditingSkill(skill);
    setForm({
      name: skill.name,
      is_active: skill.is_active,
    });
    setIsModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Kelola Skills"
        description="Atur daftar skill yang bisa dipakai sebagai badge pada course."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Skills</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Tambah, edit, nonaktifkan, dan hapus master skill untuk badge course.
              </p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {skillMeta.total} data
              </span>
            </div>

            <Button
              type="button"
              onClick={openCreateModal}
              size="lg"
              className="h-10 bg-[var(--primary)] px-4 text-[var(--primary-foreground)] hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>Buat Skill</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Cari skill..."
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table className="rounded-b-lg">
            <TableHeader className="bg-[var(--muted)]">
              <TableRow className="hover:bg-[var(--muted)]">
                <TableHead>Skill</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dipakai Course</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-[var(--card)]">
              {skillQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-7 text-center text-sm text-[var(--muted-foreground)]">
                    Memuat skills...
                  </TableCell>
                </TableRow>
              ) : skillQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-7 text-center text-sm text-red-600">
                    Gagal memuat skills. Coba refresh halaman.
                  </TableCell>
                </TableRow>
              ) : skills.length > 0 ? (
                skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="text-sm font-medium text-[var(--foreground)]">{skill.name}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{skill.slug}</TableCell>
                    <TableCell className="text-sm">
                      <StatusBadge value={skill.is_active ? "Aktif" : "Nonaktif"} />
                    </TableCell>
                    <TableCell className="text-sm text-[var(--foreground)]">{skill.courses_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onEdit(skill)}
                          className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                          aria-label={`Edit ${skill.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setConfirmDeleteSkill(skill)}
                          className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                          aria-label={`Hapus ${skill.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-7 text-center text-sm text-[var(--muted-foreground)]">
                    Belum ada data skills.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <AdminPagination meta={skillMeta} isLoading={skillQuery.isLoading} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AdminModal
        open={isModalOpen}
        onClose={closeModal}
        title={editingSkill ? "Edit Skill" : "Buat Skill"}
        description="Skill ini akan muncul sebagai opsi badge saat admin mengedit course."
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="space-y-1.5">
              <Label htmlFor="skill-name" className="text-sm font-medium text-[var(--foreground)]">
                Nama Skill
              </Label>
              <Input
                id="skill-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Contoh: Problem Solving"
                className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Skill aktif</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Skill aktif akan muncul di selector course.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingSkill ? "Simpan Perubahan" : "Simpan Skill"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>

      <ConfirmAlertDialog
        open={confirmDeleteSkill !== null}
        title="Hapus Skill"
        description={
          confirmDeleteSkill
            ? `Skill "${confirmDeleteSkill.name}" akan dihapus permanen jika belum dipakai oleh course mana pun.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteSkill(null);
        }}
        onConfirm={() => {
          if (!confirmDeleteSkill) return;
          deleteMutation.mutate(confirmDeleteSkill.id);
        }}
      />
    </section>
  );
}
