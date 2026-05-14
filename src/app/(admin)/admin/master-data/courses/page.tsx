"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import {
  deleteAdminCourse,
  getAdminCategories,
  getAdminCourses,
  getAdminUsers,
} from "@/features/admin/api/master-api";

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<{ id: number; title: string } | null>(null);

  const courseQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: () => getAdminCourses(),
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

  const userMap = useMemo(() => new Map((userQuery.data ?? []).map((user) => [user.id, user.fullname])), [userQuery.data]);

  const sortedCourses = useMemo(
    () => [...(courseQuery.data ?? [])].sort((a, b) => b.id - a.id),
    [courseQuery.data],
  );

  const filteredCourses = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return sortedCourses;

    return sortedCourses.filter((course) => {
      const categoryName = categoryMap.get(course.category_id) ?? "";
      const instructorName = userMap.get(course.instructor_id) ?? "";
      const skillNames = course.skills.map((skill) => skill.name).join(" ");

      return [course.title, categoryName, instructorName, skillNames].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [categoryMap, searchKeyword, sortedCourses, userMap]);

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCourse,
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast.success(message || "Course berhasil dihapus");
      setConfirmDeleteCourse(null);
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
        title="Kelola Course Master"
        description="Kelola konten course utama, kategori, dan instructor sebelum dibuatkan offering."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Course Master</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Kelola metadata course master dari satu tabel.</p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {filteredCourses.length} data
              </span>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => router.push("/admin/master-data/courses/new")}
              className="h-10 bg-[var(--primary)] px-4 text-[var(--primary-foreground)] hover:brightness-95"
            >
              <Plus className="size-4" />
              <span>Buat Course Master</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari course..."
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
                    Thumbnail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Judul
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Skill
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Instructor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {courseQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
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
                    <tr key={course.id} className="align-top hover:bg-[var(--surface-hover)]">
                      <td className="px-4 py-3">
                        <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--muted)]">
                          {course.thumbnail ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="h-full w-full object-cover"
                              />
                            </>
                          ) : (
                            <span className="px-2 text-center text-[11px] text-[var(--muted-foreground)]">No thumbnail</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{course.title}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {categoryMap.get(course.category_id) ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {course.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {course.skills.map((skill) => (
                              <Badge key={skill.id} variant="success">
                                {skill.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--muted-foreground)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {userMap.get(course.instructor_id) ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => router.push(`/admin/master-data/courses/${course.id}`)}
                            className="border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                            aria-label={`Detail ${course.title}`}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              setConfirmDeleteCourse({
                                id: course.id,
                                title: course.title,
                              });
                            }}
                            className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
                            aria-label={`Hapus ${course.title}`}
                          >
                            {deletingId === course.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                      Belum ada data courses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmAlertDialog
        open={confirmDeleteCourse !== null}
        title="Hapus Course"
        description={
          confirmDeleteCourse
            ? `Course "${confirmDeleteCourse.title}" akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`
            : ""
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isPending={deleteMutation.isPending}
        onClose={() => {
          if (deleteMutation.isPending) return;
          setConfirmDeleteCourse(null);
        }}
        onConfirm={() => {
          if (!confirmDeleteCourse) return;
          deleteMutation.mutate(confirmDeleteCourse.id);
        }}
      />
    </section>
  );
}

