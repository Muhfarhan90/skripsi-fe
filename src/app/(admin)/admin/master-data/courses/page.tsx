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
  createAdminCourse,
  deleteAdminCourse,
  getAdminCategories,
  getAdminCourses,
  getAdminUsers,
  updateAdminCourse,
  type AdminCourse,
  type CoursePayload,
} from "@/features/admin/api/master-api";

interface CourseFormState {
  title: string;
  category_id: string;
  instructor_id: string;
  price: string;
  discount_price: string;
  status: "draft" | "published" | "archived";
  description: string;
  requirements: string;
  outcomes: string;
}

const defaultForm: CourseFormState = {
  title: "",
  category_id: "",
  instructor_id: "",
  price: "",
  discount_price: "",
  status: "draft",
  description: "",
  requirements: "",
  outcomes: "",
};

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function toPayload(form: CourseFormState): CoursePayload {
  return {
    title: form.title.trim(),
    category_id: Number(form.category_id),
    instructor_id: Number(form.instructor_id),
    price: Number(form.price),
    discount_price: form.discount_price.trim() ? Number(form.discount_price) : null,
    status: form.status,
    description: form.description.trim() || null,
    requirements: form.requirements.trim() || null,
    outcomes: form.outcomes.trim() || null,
  };
}

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<CourseFormState>(defaultForm);

  const courseQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: getAdminCourses,
  });

  const categoryQuery = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getAdminCategories,
  });

  const userQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: getAdminUsers,
  });

  const categoryMap = useMemo(
    () => new Map((categoryQuery.data ?? []).map((category) => [category.id, category.name])),
    [categoryQuery.data],
  );

  const userMap = useMemo(
    () => new Map((userQuery.data ?? []).map((user) => [user.id, user.fullname])),
    [userQuery.data],
  );

  const sortedCourses = useMemo(
    () => [...(courseQuery.data ?? [])].sort((a, b) => b.id - a.id),
    [courseQuery.data],
  );

  const filteredCourses = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return sortedCourses;
    }

    return sortedCourses.filter((course) => {
      const categoryName = categoryMap.get(course.category_id) ?? "";
      const instructorName = userMap.get(course.instructor_id) ?? "";

      return [course.title, course.status, categoryName, instructorName].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [categoryMap, searchKeyword, sortedCourses, userMap]);

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
      if (!form.title.trim() || !form.category_id || !form.instructor_id || !form.price.trim()) {
        throw new Error("Judul, kategori, instructor, dan harga wajib diisi");
      }

      const payload = toPayload(form);
      if (Number.isNaN(payload.price)) {
        throw new Error("Harga harus berupa angka");
      }

      if (payload.discount_price !== null && Number.isNaN(payload.discount_price)) {
        throw new Error("Harga diskon harus berupa angka");
      }

      if (editingId) {
        return updateAdminCourse(editingId, payload);
      }

      return createAdminCourse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast.success(editingId ? "Course berhasil diperbarui" : "Course berhasil ditambahkan");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCourse,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast.success(message || "Course berhasil dihapus");
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const onEdit = (course: AdminCourse) => {
    setEditingId(course.id);
    setForm({
      title: course.title,
      category_id: String(course.category_id),
      instructor_id: String(course.instructor_id),
      price: String(course.price),
      discount_price: course.discount_price ? String(course.discount_price) : "",
      status: course.status,
      description: course.description ?? "",
      requirements: course.requirements ?? "",
      outcomes: course.outcomes ?? "",
    });
    setIsModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Kelola Courses"
        description="Kelola data course, kategori, dan instructor sebelum dipublikasikan ke student."
      />

      <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--admin-border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">
                Daftar Courses
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--admin-muted-foreground)]">
                Kelola metadata course lengkap dari satu tabel.
              </p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--admin-muted-foreground)]">
                {filteredCourses.length} data
              </span>
            </div>

            <Button
              type="button"
              onClick={openCreateModal}
              size="lg"
              className="h-10 bg-[var(--admin-brand)] px-4 text-white hover:opacity-90"
            >
              <Plus className="size-4" />
              <span>Buat Course</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--admin-muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari course..."
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
                    Judul
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Instructor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Harga
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
                {courseQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--admin-muted-foreground)]">
                      Memuat courses...
                    </td>
                  </tr>
                ) : courseQuery.isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-red-600">
                      Gagal memuat courses. Coba refresh halaman.
                    </td>
                  </tr>
                ) : filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-[var(--admin-surface-soft)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--admin-foreground)]">{course.title}</td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">
                        {categoryMap.get(course.category_id) ?? `Category ${course.category_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">
                        {userMap.get(course.instructor_id) ?? `User ${course.instructor_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">
                        Rp{Number(course.price).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge value={course.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onEdit(course)}
                            className="border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                            aria-label={`Edit ${course.title}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              if (window.confirm(`Hapus course "${course.title}"?`)) {
                                deleteMutation.mutate(course.id);
                              }
                            }}
                            className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label={`Hapus ${course.title}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--admin-muted-foreground)]">
                      Belum ada data courses.
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
        title={editingId ? "Edit Course" : "Buat Course"}
        description="Lengkapi informasi course sebelum disimpan."
        maxWidthClassName="max-w-5xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="course-title">Judul Course</Label>
              <Input
                id="course-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select
                value={form.category_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value ?? "" }))}
              >
                <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {(categoryQuery.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Instructor</Label>
              <Select
                value={form.instructor_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, instructor_id: value ?? "" }))}
              >
                <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <SelectValue placeholder="Pilih instructor" />
                </SelectTrigger>
                <SelectContent>
                  {(userQuery.data ?? []).map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.fullname} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-price">Harga</Label>
              <Input
                id="course-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-discount">Harga Diskon</Label>
              <Input
                id="course-discount"
                type="number"
                min={0}
                value={form.discount_price}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_price: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: (value as CourseFormState["status"]) ?? "draft" }))
                }
              >
                <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="course-description">Deskripsi</Label>
              <Textarea
                id="course-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-requirements">Requirements</Label>
              <Textarea
                id="course-requirements"
                rows={3}
                value={form.requirements}
                onChange={(event) => setForm((prev) => ({ ...prev, requirements: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-outcomes">Outcomes</Label>
              <Textarea
                id="course-outcomes"
                rows={3}
                value={form.outcomes}
                onChange={(event) => setForm((prev) => ({ ...prev, outcomes: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>
          </div>

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
              <span>{editingId ? "Simpan Perubahan" : "Simpan Course"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>
    </section>
  );
}

