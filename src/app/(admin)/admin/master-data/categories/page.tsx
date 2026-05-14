"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
  type AdminCategory,
} from "@/features/admin/api/master-api";

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<AdminCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const categoryQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getAdminCategories,
  });

  const sortedCategories = useMemo(
    () => [...(categoryQuery.data ?? [])].sort((a, b) => b.id - a.id),
    [categoryQuery.data],
  );

  const filteredCategories = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return sortedCategories;
    }

    return sortedCategories.filter((category) =>
      [category.name, category.slug, category.description ?? ""].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    );
  }, [searchKeyword, sortedCategories]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", description: "" });
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
        throw new Error("Nama kategori wajib diisi");
      }

      if (editingId) {
        return updateAdminCategory(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
      }

      return createAdminCategory({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success(editingId ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCategory,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success(message || "Kategori berhasil dihapus");
      setConfirmDeleteCategory(null);
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const onEdit = (category: AdminCategory) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description ?? "",
    });
    setIsModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Kelola Categories"
        description="Atur kategori course untuk menjaga struktur katalog dan filter student."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                Daftar Categories
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Tambah, edit, dan hapus kategori dari satu tabel manajemen.
              </p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {filteredCategories.length} data
              </span>
            </div>

            <Button
              type="button"
              onClick={openCreateModal}
              size="lg"
              className="h-10 bg-[var(--primary)] px-4 text-[var(--primary-foreground)] hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>Buat Category</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari category..."
              className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9 text-[var(--foreground)]"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="min-w-full divide-y divide-[var(--border)]">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Deskripsi
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {categoryQuery.isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      Memuat categories...
                    </td>
                  </tr>
                ) : categoryQuery.isError ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-red-600">
                      Gagal memuat categories. Coba refresh halaman.
                    </td>
                  </tr>
                ) : filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{category.name}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{category.slug}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {category.description || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onEdit(category)}
                            className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              setConfirmDeleteCategory(category);
                            }}
                            className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                            aria-label={`Hapus ${category.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      Belum ada data categories.
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
        title={editingId ? "Edit Category" : "Buat Category"}
        description="Isi data kategori, lalu simpan perubahan."
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[var(--foreground)]" htmlFor="category-name">Nama</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Contoh: Matematika Dasar"
                className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[var(--foreground)]" htmlFor="category-description">
                Deskripsi
              </Label>
              <Textarea
                id="category-description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Deskripsi kategori..."
                className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
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
              <span>{editingId ? "Simpan Perubahan" : "Simpan Category"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>

      <ConfirmAlertDialog
        open={confirmDeleteCategory !== null}
        title="Hapus Category"
        description={
          confirmDeleteCategory
            ? `Category "${confirmDeleteCategory.name}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteCategory(null);
        }}
        onConfirm={() => {
          if (!confirmDeleteCategory) return;
          deleteMutation.mutate(confirmDeleteCategory.id);
        }}
      />
    </section>
  );
}


