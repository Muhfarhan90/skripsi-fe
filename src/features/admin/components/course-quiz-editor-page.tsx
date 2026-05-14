"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  createAdminCourseSectionQuiz,
  getAdminCourseCurriculum,
} from "@/features/admin/api/master-api";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface CourseQuizEditorPageProps {
  courseId: number;
  sectionId: number;
  returnTo?: string;
}

interface QuizFormState {
  title: string;
  description: string;
  duration: string;
  passing_score: string;
  weight: string;
  max_attempts: string;
  open_at: string;
  close_at: string;
  is_active: boolean;
  is_random: boolean;
}

const DEFAULT_FORM: QuizFormState = {
  title: "",
  description: "",
  duration: "",
  passing_score: "",
  weight: "",
  max_attempts: "",
  open_at: "",
  close_at: "",
  is_active: true,
  is_random: false,
};

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function toNonNegativeNumberOrZero(raw: string): number {
  if (!raw.trim()) return 0;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function isInvalidOptionalNumber(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0;
}

function toApiDateTimeOrNull(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:00`;
}

export function CourseQuizEditorPage({ courseId, sectionId, returnTo }: CourseQuizEditorPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuizFormState>(DEFAULT_FORM);
  const fallbackReturnTo = `/admin/master-data/courses/${courseId}?step=curriculum`;
  const returnTarget = returnTo || fallbackReturnTo;

  const curriculumQuery = useQuery({
    queryKey: ["admin", "courses", "curriculum", courseId],
    queryFn: () => getAdminCourseCurriculum(courseId),
  });

  const selectedSection = useMemo(() => {
    return (curriculumQuery.data?.sections ?? []).find((section) => section.id === sectionId);
  }, [curriculumQuery.data?.sections, sectionId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) {
        throw new Error("Judul quiz wajib diisi");
      }
      if (
        isInvalidOptionalNumber(form.duration) ||
        isInvalidOptionalNumber(form.passing_score) ||
        isInvalidOptionalNumber(form.weight) ||
        isInvalidOptionalNumber(form.max_attempts)
      ) {
        throw new Error("Durasi, passing score, weight, dan max attempts harus angka >= 0");
      }
      if (form.open_at && form.close_at && new Date(form.close_at) < new Date(form.open_at)) {
        throw new Error("Waktu tutup quiz harus lebih besar atau sama dengan waktu buka quiz");
      }

      return createAdminCourseSectionQuiz(courseId, sectionId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        duration: toNonNegativeNumberOrZero(form.duration),
        passing_score: toNonNegativeNumberOrZero(form.passing_score),
        weight: toNonNegativeNumberOrZero(form.weight),
        max_attempts: toNonNegativeNumberOrZero(form.max_attempts),
        open_at: toApiDateTimeOrNull(form.open_at),
        close_at: toApiDateTimeOrNull(form.close_at),
        is_active: form.is_active,
        is_random: form.is_random,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "quizzes", courseId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "courses", "curriculum", courseId] });
      toast.success("Quiz berhasil ditambahkan");
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
        <AdminPageHeader title="Tambah Quiz" description="Memuat data section..." />
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
            <Loader2 className="size-4 animate-spin" />
            Memuat data section...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (curriculumQuery.isError || !selectedSection) {
    return (
      <section className="space-y-5">
        <AdminPageHeader title="Tambah Quiz" description="Section untuk quiz ini tidak ditemukan." />
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
        title="Tambah Quiz"
        description={`Section target: ${selectedSection.title}. Setelah simpan, kembali ke halaman kurikulum.`}
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="border-b border-[var(--border)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--foreground)]">Quiz Baru</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Lengkapi metadata quiz sebelum lanjut mengelola question dan option.
              </p>
            </div>

            <Button type="button" variant="outline" onClick={() => router.push(returnTarget)}>
              <ArrowLeft className="size-4" />
              <span>Kembali</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="quiz-title">Judul Quiz</Label>
              <Input
                id="quiz-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="quiz-description">Deskripsi</Label>
              <Textarea
                id="quiz-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-duration">Durasi (menit)</Label>
              <Input
                id="quiz-duration"
                type="number"
                min={0}
                value={form.duration}
                onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-passing-score">Passing Score</Label>
              <Input
                id="quiz-passing-score"
                type="number"
                min={0}
                value={form.passing_score}
                onChange={(event) => setForm((prev) => ({ ...prev, passing_score: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-weight">Weight</Label>
              <Input
                id="quiz-weight"
                type="number"
                min={0}
                value={form.weight}
                onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-max-attempts">Max Attempts</Label>
              <Input
                id="quiz-max-attempts"
                type="number"
                min={0}
                value={form.max_attempts}
                onChange={(event) => setForm((prev) => ({ ...prev, max_attempts: event.target.value }))}
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-open-at">Quiz Buka (Tanggal & Jam)</Label>
              <DateTimePicker
                value={form.open_at}
                onChange={(value) => setForm((prev) => ({ ...prev, open_at: value }))}
                placeholder="Pilih waktu buka quiz"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quiz-close-at">Quiz Tutup (Tanggal & Jam)</Label>
              <DateTimePicker
                value={form.close_at}
                onChange={(value) => setForm((prev) => ({ ...prev, close_at: value }))}
                placeholder="Pilih waktu tutup quiz"
                className="border-[var(--border)] bg-[var(--card)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Label htmlFor="quiz-is-active" className="text-sm text-[var(--foreground)]">
                Quiz aktif
              </Label>
              <Switch
                id="quiz-is-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
              <Label htmlFor="quiz-is-random" className="text-sm text-[var(--foreground)]">
                Soal diacak
              </Label>
              <Switch
                id="quiz-is-random"
                checked={form.is_random}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_random: checked }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button type="button" variant="outline" onClick={() => router.push(returnTarget)} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>Simpan Quiz</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
