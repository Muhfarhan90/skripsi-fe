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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

interface CourseLessonEditorPageProps {
  courseId: number;
  sectionId: number;
  lessonId?: number;
  returnTo?: string;
}

interface LessonFormState {
  title: string;
  type: "video" | "file";
  status: "published" | "archived";
  duration: string;
  lesson_url: string;
  lesson_file: File | null;
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
  status: "published",
  duration: "",
  lesson_url: "",
  lesson_file: null,
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
  const [sourceType, setSourceType] = useState<"link" | "upload">("link");
  const [hasInitializedSource, setHasInitializedSource] = useState(false);
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
        status: editingLesson.status === "archived" ? "archived" : "published",
        duration: String(editingLesson.duration ?? ""),
        lesson_url: editingLesson.lesson_url ?? "",
        lesson_file: null,
        description: editingLesson.description ?? "",
        is_preview: Boolean(editingLesson.is_preview),
      };
    }

    return DEFAULT_FORM;
  }, [editingLesson, isEditMode]);

  // Safely initialize sourceType from existing lesson url on edit
  if (isEditMode && editingLesson && !hasInitializedSource) {
    const isUploaded =
      editingLesson.lesson_url?.startsWith("/storage/") ||
      editingLesson.lesson_url?.startsWith("/uploads/");
    setSourceType(isUploaded ? "upload" : "link");
    setHasInitializedSource(true);
  }

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
      if (sourceType === "link" && !form.lesson_url.trim()) {
        throw new Error("URL materi wajib diisi");
      }
      if (sourceType === "upload" && !form.lesson_file && !form.lesson_url.trim()) {
        throw new Error("Berkas materi wajib diunggah");
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
        lesson_url: sourceType === "link" ? form.lesson_url.trim() : (form.lesson_file ? null : form.lesson_url),
        lesson_file: sourceType === "upload" ? form.lesson_file : null,
        description: form.description.trim() || null,
        is_preview: form.is_preview,
        status: form.status,
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
              <Label>Status Lesson</Label>
              <Select
                value={form.status}
                onValueChange={(value) => updateForm("status", (value as LessonFormState["status"]) ?? "published")}
              >
                <SelectTrigger className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--muted-foreground)]">
                Archived menyembunyikan lesson dari akses student baru tanpa menghapus histori belajar.
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Sumber Materi</Label>
              <div className="flex gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setSourceType("link")}
                  className={cn(
                    "flex-1 h-9 rounded-xl border text-sm font-semibold transition active:scale-95",
                    sourceType === "link"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  Tautan URL
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("upload")}
                  className={cn(
                    "flex-1 h-9 rounded-xl border text-sm font-semibold transition active:scale-95",
                    sourceType === "upload"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  Unggah Berkas
                </button>
              </div>
            </div>

            {sourceType === "link" ? (
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="lesson-url">URL Tautan Materi</Label>
                <Input
                  id="lesson-url"
                  value={form.lesson_url}
                  onChange={(event) => updateForm("lesson_url", event.target.value)}
                  placeholder="https://..."
                  className="border-[var(--border)] bg-[var(--card)]"
                />
              </div>
            ) : (
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="lesson-file">Unggah Berkas Materi</Label>
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-4">
                  <Input
                    id="lesson-file"
                    type="file"
                    accept={form.type === "video" ? "video/*" : ".pdf,.docx,.zip,.rar,.txt,.pptx"}
                    onChange={(event) => updateForm("lesson_file", event.target.files?.[0] ?? null)}
                    className="border-[var(--border)] bg-[var(--muted)]"
                  />
                  {form.lesson_file ? (
                    <p className="text-xs text-emerald-600 font-medium">
                      Berkas terpilih: {form.lesson_file.name} ({(form.lesson_file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  ) : form.lesson_url ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Berkas aktif saat ini:{" "}
                      <a
                        href={form.lesson_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--primary)] underline hover:brightness-95"
                      >
                        {form.lesson_url.split("/").pop()}
                      </a>
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Belum ada berkas yang diunggah. Maksimal berkas adalah 100MB.
                    </p>
                  )}
                </div>
              </div>
            )}

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

          <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
            <Label htmlFor="lesson-preview" className="text-sm text-[var(--foreground)]">
              Jadikan lesson ini sebagai preview
            </Label>
            <Switch
              id="lesson-preview"
              checked={form.is_preview}
              onCheckedChange={(checked) => updateForm("is_preview", checked)}
            />
          </div>

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
