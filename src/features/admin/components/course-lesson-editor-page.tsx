"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  createAdminLesson,
  getAdminCourseCurriculum,
  updateAdminLesson,
} from "@/features/admin/api/master-api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CourseLessonEditorPageProps {
  courseId: number;
  sectionId: number;
  lessonId?: number;
  returnTo?: string;
}

interface LessonFormState {
  title: string;
  type: "video" | "file";
  duration: string;
  lesson_url: string;
  description: string;
  is_preview: boolean;
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

const DEFAULT_FORM: LessonFormState = {
  title: "",
  type: "video",
  duration: "",
  lesson_url: "",
  description: "",
  is_preview: false,
};

export function CourseLessonEditorPage({
  courseId,
  sectionId,
  lessonId,
  returnTo,
}: CourseLessonEditorPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draftForm, setDraftForm] = useState<LessonFormState | null>(null);
  const isEditMode = typeof lessonId === "number";
  const fallbackReturnTo = `/admin/master-data/courses/${courseId}?step=curriculum`;
  const returnTarget = returnTo || fallbackReturnTo;

  const curriculumQuery = useQuery({
    queryKey: ["admin", "courses", "curriculum", courseId],
    queryFn: () => getAdminCourseCurriculum(courseId),
  });

  const selectedSection = useMemo(() => {
    return (curriculumQuery.data?.sections ?? []).find((section) => section.id === sectionId);
  }, [curriculumQuery.data?.sections, sectionId]);

  const editingLesson = useMemo(() => {
    if (!isEditMode || !lessonId) return null;
    return selectedSection?.lessons.find((lesson) => lesson.id === lessonId) ?? null;
  }, [isEditMode, lessonId, selectedSection]);

  const baseForm = useMemo<LessonFormState>(() => {
    if (isEditMode && editingLesson) {
      return {
        title: editingLesson.title,
        type: editingLesson.type,
        duration: String(editingLesson.duration ?? ""),
        lesson_url: editingLesson.lesson_url ?? "",
        description: editingLesson.description ?? "",
        is_preview: Boolean(editingLesson.is_preview),
      };
    }

    return DEFAULT_FORM;
  }, [editingLesson, isEditMode]);

  const form = draftForm ?? baseForm;

  const updateForm = <K extends keyof LessonFormState>(key: K, value: LessonFormState[K]) => {
    setDraftForm((prev) => ({
      ...(prev ?? baseForm),
      [key]: value,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) {
        throw new Error("Judul lesson wajib diisi");
      }
      if (!form.lesson_url.trim()) {
        throw new Error("URL materi wajib diisi");
      }
      if (form.duration.trim()) {
        const parsed = Number(form.duration);
        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error("Durasi lesson harus angka >= 0");
        }
      }

      const payload = {
        section_id: sectionId,
        title: form.title.trim(),
        type: form.type,
        duration: form.duration.trim() ? Number(form.duration) : null,
        lesson_url: form.lesson_url.trim() || null,
        description: form.description.trim() || null,
        is_preview: form.is_preview,
      };

      if (isEditMode && lessonId) {
        return updateAdminLesson(lessonId, payload);
      }

      return createAdminLesson(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", courseId] });
      toast.success(isEditMode ? "Lesson berhasil diperbarui" : "Lesson berhasil ditambahkan");
      router.push(returnTarget);
      router.refresh();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  if (curriculumQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title={isEditMode ? "Edit Lesson" : "Tambah Lesson"} description="Memuat data lesson..." />
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat detail lesson...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (curriculumQuery.isError || !selectedSection || (isEditMode && !editingLesson)) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          title={isEditMode ? "Edit Lesson" : "Tambah Lesson"}
          description="Data lesson tidak dapat dimuat."
        />
        <Button type="button" variant="outline" onClick={() => router.push(returnTarget)}>
          <ArrowLeft className="size-4" />
          <span>Kembali ke Curriculum</span>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title={isEditMode ? "Edit Lesson" : "Tambah Lesson"}
        description={`Section target: ${selectedSection.title}. Setelah simpan, Anda kembali ke kurikulum.`}
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="border-b border-[var(--border)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">
                {isEditMode ? "Perbarui Lesson" : "Lesson Baru"}
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Lengkapi data lesson, lalu simpan.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={() => router.push(returnTarget)}>
              <ArrowLeft className="size-4" />
              <span>Kembali</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lesson-title">Judul Lesson</Label>
              <Input
                id="lesson-title"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipe Lesson</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  updateForm("type", (value as "video" | "file") ?? "video")
                }
              >
                <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lesson-duration">Durasi (menit)</Label>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                value={form.duration}
                onChange={(event) => updateForm("duration", event.target.value)}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lesson-url">URL Materi</Label>
              <Input
                id="lesson-url"
                value={form.lesson_url}
                onChange={(event) => updateForm("lesson_url", event.target.value)}
                placeholder="https://..."
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="lesson-description">Deskripsi Lesson</Label>
              <Textarea
                id="lesson-description"
                rows={4}
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
          </div>

          <label
            htmlFor="lesson-preview"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]"
          >
            <Checkbox
              id="lesson-preview"
              checked={form.is_preview}
              onCheckedChange={(checked) => updateForm("is_preview", checked)}
            />
            Jadikan lesson ini sebagai preview
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(returnTarget)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{isEditMode ? "Simpan Perubahan" : "Simpan Lesson"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

