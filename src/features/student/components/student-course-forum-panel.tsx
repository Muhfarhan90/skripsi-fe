"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, MessageSquare, Pin, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  createStudentCourseForumPost,
  getStudentCourseForumPosts,
} from "@/features/student/api/store-api";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";
import { StudentCourseForumDetailPage } from "@/features/student/components/student-course-forum-detail-page";
import { buildStudentEnrollmentForumDetailHref } from "@/features/student/lib/forum";
import { ApiError } from "@/lib/api/client";

interface StudentCourseForumPanelProps {
  basePath: string;
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  renderDetailInPlace?: boolean;
}

function buildForumHref(
  basePath: string,
  searchParams: URLSearchParams,
  options: {
    page?: number;
    search?: string;
    postId?: number | null;
  },
): string {
  const params = new URLSearchParams(searchParams.toString());
  const nextSearch = options.search ?? params.get("forumSearch") ?? "";

  if (nextSearch.trim()) {
    params.set("forumSearch", nextSearch);
  } else {
    params.delete("forumSearch");
  }

  if (options.page && options.page > 1) {
    params.set("forumPage", String(options.page));
  } else {
    params.delete("forumPage");
  }

  if (typeof options.postId === "number" && Number.isFinite(options.postId) && options.postId > 0) {
    params.set("forumPostId", String(Math.trunc(options.postId)));
  } else if (options.postId === null) {
    params.delete("forumPostId");
  }

  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function buildExcerpt(content: string, maxLength = 120): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function StudentCourseForumPanel({
  basePath,
  enrollmentId,
  courseId,
  courseTitle,
  renderDetailInPlace = false,
}: StudentCourseForumPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");

  const search = searchParams.get("forumSearch") ?? "";
  const requestedPage = Number(searchParams.get("forumPage") ?? "1");
  const requestedPostId = Number(searchParams.get("forumPostId") ?? "0");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const selectedPostId =
    renderDetailInPlace && Number.isFinite(requestedPostId) && requestedPostId > 0
      ? requestedPostId
      : null;

  const postsQuery = useQuery({
    queryKey: ["student", "course", courseId, "forum", search, currentPage],
    queryFn: () =>
      getStudentCourseForumPosts(courseId, {
        page: currentPage,
        search,
      }),
    enabled: Number.isFinite(courseId) && courseId > 0,
  });

  const posts = useMemo(() => postsQuery.data?.items ?? [], [postsQuery.data?.items]);
  const postsMeta = postsQuery.data?.meta ?? null;

  const closeCreateModal = () => {
    if (createPostMutation.isPending) {
      return;
    }

    setCreateModalOpen(false);
    setPostTitle("");
    setPostContent("");
  };

  const createPostMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) =>
      createStudentCourseForumPost(courseId, payload),
    onSuccess: (post) => {
      setCreateModalOpen(false);
      setPostTitle("");
      setPostContent("");
      toast.success("Topik diskusi berhasil dibuat.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      if (renderDetailInPlace) {
        const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
          page: 1,
          search: "",
          postId: post.id,
        });
        router.push(nextUrl, { scroll: false });
        return;
      }

      router.push(buildStudentEnrollmentForumDetailHref(enrollmentId, post.id));
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik diskusi belum bisa dibuat.");
    },
  });

  const handleCreatePost = () => {
    const title = postTitle.trim();
    const content = postContent.trim();

    if (!title) {
      toast.error("Judul diskusi wajib diisi.");
      return;
    }

    if (!content) {
      toast.error("Isi diskusi wajib diisi.");
      return;
    }

    createPostMutation.mutate({ title, content });
  };

  if (selectedPostId) {
    const listHref = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
      postId: null,
    });

    return (
      <StudentCourseForumDetailPage
        enrollmentId={enrollmentId}
        courseId={courseId}
        courseTitle={courseTitle}
        postId={selectedPostId}
        listHref={listHref}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <MessageSquare className="size-5 text-[var(--primary)]" />
            <span>Forum Diskusi</span>
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Halaman ini menampilkan daftar topik untuk kelas{" "}
            <span className="font-semibold text-foreground">{courseTitle}</span>.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90 self-start"
        >
          <PlusCircle className="size-4" />
          <span>Tambah Diskusi</span>
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Daftar Diskusi</h3>
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                const nextUrl = buildForumHref(
                  basePath,
                  new URLSearchParams(searchParams.toString()),
                  {
                    page: 1,
                    search: event.target.value,
                  },
                );
                router.replace(nextUrl, { scroll: false });
              }}
              placeholder="Cari judul atau isi diskusi"
              className="pl-9"
            />
          </div>

          {postsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat daftar diskusi...
            </div>
          ) : null}

          {postsQuery.isError ? (
            <p className="text-sm text-red-600">Daftar diskusi belum bisa dimuat.</p>
          ) : null}

          {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-[var(--surface-soft)] p-4 text-sm text-muted-foreground">
              {search.trim()
                ? "Tidak ada diskusi yang cocok dengan kata kunci pencarian."
                : "Belum ada topik diskusi. Kamu bisa menjadi student pertama yang memulai percakapan."}
            </div>
          ) : null}

          {posts.map((post) => {
            const detailHref = renderDetailInPlace
              ? buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
                  postId: post.id,
                })
              : buildStudentEnrollmentForumDetailHref(enrollmentId, post.id);
            const isOwnPost = post.user_id === currentUser?.id;

            return (
              <Link
                key={post.id}
                href={detailHref}
                className="block rounded-2xl border border-border bg-[var(--surface-soft)] px-4 py-4 text-left transition hover:bg-[var(--surface-hover)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {post.is_pinned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                      <Pin className="size-3" />
                      Pin
                    </span>
                  ) : null}
                  {isOwnPost ? (
                    <span className="inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Anda
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm font-semibold text-foreground">{post.title}</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {buildExcerpt(post.content)}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{post.user?.fullname || "Student"}</span>
                  <span>{formatUtcDateTimeToJakarta(post.updated_at || post.created_at)}</span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="size-3.5" />
                  {post.replies_count ?? 0} balasan
                </div>
              </Link>
            );
          })}

          {postsMeta && postsMeta.last_page > 1 ? (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <button
                type="button"
                disabled={postsMeta.current_page <= 1}
                onClick={() => {
                  const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
                    page: postsMeta.current_page - 1,
                  });
                  router.replace(nextUrl, { scroll: false });
                }}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <p className="text-xs text-muted-foreground">
                Halaman {postsMeta.current_page} dari {postsMeta.last_page}
              </p>
              <button
                type="button"
                disabled={postsMeta.current_page >= postsMeta.last_page}
                onClick={() => {
                  const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
                    page: postsMeta.current_page + 1,
                  });
                  router.replace(nextUrl, { scroll: false });
                }}
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <AppModal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Tambah Diskusi Baru"
        description={`Buat topik forum baru untuk kelas ${courseTitle}.`}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="student-forum-title-modal">
              Judul Diskusi
            </label>
            <Input
              id="student-forum-title-modal"
              value={postTitle}
              onChange={(event) => setPostTitle(event.target.value)}
              placeholder="Contoh: Bagaimana memahami function dengan lebih mudah?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="student-forum-content-modal">
              Isi Diskusi
            </label>
            <Textarea
              id="student-forum-content-modal"
              value={postContent}
              onChange={(event) => setPostContent(event.target.value)}
              placeholder="Tulis pertanyaan atau insight kamu di sini."
              className="min-h-40"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleCreatePost}
              disabled={createPostMutation.isPending}
              className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
            >
              {createPostMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              <span>Publikasikan Diskusi</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeCreateModal}
              disabled={createPostMutation.isPending}
            >
              <span>Batal</span>
            </Button>
          </div>
        </div>
      </AppModal>
    </div>
  );
}
