"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, MessageSquare, Pin, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminCourseForumPost,
  createEmptyAdminPaginationMeta,
  listAdminCourseForumPosts,
} from "@/features/admin/api/master-api";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { buildAdminCourseActivityForumDetailHref } from "@/features/admin/lib/course-activity";
import { formatDateTime } from "@/features/admin/lib/offering-utils";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";

interface AdminCourseActivityForumListPanelProps {
  courseId: number;
  courseTitle: string;
}

function buildExcerpt(content: string, maxLength = 140): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function AdminCourseActivityForumListPanel({
  courseId,
  courseTitle,
}: AdminCourseActivityForumListPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");

  const postsQuery = useQuery({
    queryKey: ["admin", "course", courseId, "forum", search, page],
    queryFn: () => listAdminCourseForumPosts(courseId, { search, page }),
    enabled: Number.isFinite(courseId) && courseId > 0,
  });

  const posts = useMemo(() => postsQuery.data?.items ?? [], [postsQuery.data?.items]);
  const postMeta = postsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);

  const closeCreateModal = () => {
    if (createPostMutation.isPending) {
      return;
    }

    setCreateModalOpen(false);
    setPostTitle("");
    setPostContent("");
  };

  const createPostMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) => createAdminCourseForumPost(courseId, payload),
    onSuccess: (post) => {
      setCreateModalOpen(false);
      setPostTitle("");
      setPostContent("");
      setPage(1);
      toast.success("Topik forum berhasil dibuat.");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum"],
      });
      router.push(buildAdminCourseActivityForumDetailHref(courseId, post.id));
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik forum belum bisa dibuat.");
    },
  });

  const handleCreatePost = () => {
    const normalizedTitle = postTitle.trim();
    const normalizedContent = postContent.trim();

    if (!normalizedTitle) {
      toast.error("Judul forum wajib diisi.");
      return;
    }

    if (!normalizedContent) {
      toast.error("Isi forum wajib diisi.");
      return;
    }

    createPostMutation.mutate({
      title: normalizedTitle,
      content: normalizedContent,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="gap-3 pb-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                <MessageSquare className="size-5" />
                <span>Forum Diskusi</span>
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Halaman ini menampilkan daftar topik untuk course master{" "}
                <span className="font-medium text-[var(--foreground)]">{courseTitle}</span>.
              </p>
            </div>

            <div className="flex min-w-[220px] flex-col items-stretch gap-3">
              <Button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
              >
                <PlusCircle className="size-4" />
                <span>Tambah Diskusi</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[var(--foreground)]">Daftar Topik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Cari judul atau isi topik"
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {postsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat daftar forum...
              </div>
            ) : null}

            {postsQuery.isError ? (
              <p className="text-sm text-[var(--danger-soft-foreground)]">Daftar forum belum bisa dimuat.</p>
            ) : null}

            {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                {search.trim()
                  ? "Tidak ada topik forum yang cocok dengan kata kunci pencarian."
                  : "Belum ada topik forum untuk course ini."}
              </div>
            ) : null}

            {posts.map((post) => {
              const detailHref = buildAdminCourseActivityForumDetailHref(courseId, post.id);
              const isOwnPost = post.user_id === currentUser?.id;

              return (
                <Link
                  key={post.id}
                  href={detailHref}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-left transition hover:bg-[var(--surface-hover)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {post.is_pinned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                        <Pin className="size-3" />
                        Pin
                      </span>
                    ) : null}
                    {isOwnPost ? (
                      <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                        Anda
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{post.title}</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--muted-foreground)]">
                    {buildExcerpt(post.content)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                    <span>{post.user?.fullname ?? "-"}</span>
                    <span>{formatDateTime(post.updated_at)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <MessageCircle className="size-3.5" />
                    {post.replies_count ?? 0} balasan
                  </div>
                </Link>
              );
            })}
          </div>

          {posts.length > 0 ? (
            <AdminPagination
              meta={postMeta}
              isLoading={postsQuery.isFetching}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          ) : null}
        </CardContent>
      </Card>

      <AdminModal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Tambah Diskusi Baru"
        description={`Buat topik forum baru untuk course ${courseTitle}.`}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="forum-title-modal">
              Judul Diskusi
            </label>
            <Input
              id="forum-title-modal"
              value={postTitle}
              onChange={(event) => setPostTitle(event.target.value)}
              placeholder="Contoh: Panduan diskusi assignment akhir"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="forum-content-modal">
              Isi Diskusi
            </label>
            <Textarea
              id="forum-content-modal"
              value={postContent}
              onChange={(event) => setPostContent(event.target.value)}
              placeholder="Tulis pengumuman, jawaban umum, atau panduan diskusi di sini."
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
      </AdminModal>
    </div>
  );
}
