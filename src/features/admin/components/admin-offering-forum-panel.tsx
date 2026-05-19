"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  MessageCircle,
  MessageSquare,
  Pin,
  PlusCircle,
  Search,
  Send,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminCourseForumPost,
  createAdminCourseForumReply,
  createEmptyAdminPaginationMeta,
  deleteAdminCourseForumPost,
  deleteAdminCourseForumReply,
  getAdminCourseForumPost,
  listAdminCourseForumPosts,
  toggleAdminCourseForumPostPin,
} from "@/features/admin/api/master-api";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { formatDateTime } from "@/features/admin/lib/offering-utils";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";

interface AdminOfferingForumPanelProps {
  courseId: number;
  courseTitle: string;
}

function getAvatarLabel(name: string | null | undefined): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "A";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) {
    return null;
  }

  if (avatar.startsWith("http://") || avatar.startsWith("https://") || avatar.startsWith("/")) {
    return avatar;
  }

  return `/storage/${avatar.replace(/^\/+/, "")}`;
}

function buildExcerpt(content: string, maxLength = 140): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function AdminOfferingForumPanel({
  courseId,
  courseTitle,
}: AdminOfferingForumPanelProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [postToDeleteId, setPostToDeleteId] = useState<number | null>(null);
  const [replyToDeleteId, setReplyToDeleteId] = useState<number | null>(null);

  const postsQuery = useQuery({
    queryKey: ["admin", "course", courseId, "forum", search, page],
    queryFn: () => listAdminCourseForumPosts(courseId, { search, page }),
    enabled: Number.isFinite(courseId) && courseId > 0,
  });

  const posts = useMemo(() => postsQuery.data?.items ?? [], [postsQuery.data?.items]);
  const postMeta = postsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const effectiveSelectedPostId = useMemo(() => {
    if (selectedPostId && posts.some((post) => post.id === selectedPostId)) {
      return selectedPostId;
    }

    return posts[0]?.id ?? null;
  }, [posts, selectedPostId]);

  const selectedPostQuery = useQuery({
    queryKey: ["admin", "course", courseId, "forum-post", effectiveSelectedPostId],
    queryFn: () => getAdminCourseForumPost(courseId, effectiveSelectedPostId as number),
    enabled: Number.isFinite(courseId) && courseId > 0 && Boolean(effectiveSelectedPostId),
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) => createAdminCourseForumPost(courseId, payload),
    onSuccess: (post) => {
      setPostTitle("");
      setPostContent("");
      setPage(1);
      setSelectedPostId(post.id);
      toast.success("Topik forum berhasil dibuat.");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum"],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik forum belum bisa dibuat.");
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: (payload: { content: string }) =>
      createAdminCourseForumReply(courseId, effectiveSelectedPostId as number, payload),
    onSuccess: () => {
      setReplyContent("");
      toast.success("Balasan forum berhasil dikirim.");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum-post", effectiveSelectedPostId],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Balasan forum belum bisa dikirim.");
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (postId: number) => toggleAdminCourseForumPostPin(courseId, postId),
    onSuccess: (post) => {
      toast.success(post.is_pinned ? "Post berhasil dipin." : "Post berhasil dilepas dari pin.");
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum-post", post.id],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Status pin post belum bisa diubah.");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => deleteAdminCourseForumPost(courseId, postId),
    onSuccess: () => {
      toast.success("Topik forum berhasil dihapus.");
      setPostToDeleteId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum"],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik forum belum bisa dihapus.");
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: number) => deleteAdminCourseForumReply(replyId),
    onSuccess: () => {
      toast.success("Balasan forum berhasil dihapus.");
      setReplyToDeleteId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "course", courseId, "forum-post", effectiveSelectedPostId],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Balasan forum belum bisa dihapus.");
    },
  });

  const selectedPost = selectedPostQuery.data ?? null;
  const replies = useMemo(() => selectedPost?.replies ?? [], [selectedPost?.replies]);

  const handleCreatePost = () => {
    const title = postTitle.trim();
    const content = postContent.trim();

    if (!title) {
      toast.error("Judul forum wajib diisi.");
      return;
    }

    if (!content) {
      toast.error("Isi forum wajib diisi.");
      return;
    }

    createPostMutation.mutate({ title, content });
  };

  const handleCreateReply = () => {
    if (!effectiveSelectedPostId) {
      toast.error("Pilih topik forum terlebih dahulu.");
      return;
    }

    const content = replyContent.trim();
    if (!content) {
      toast.error("Isi balasan wajib diisi.");
      return;
    }

    createReplyMutation.mutate({ content });
  };

  const selectedPostRepliesCount = replies.length;

  return (
    <div className="space-y-4">
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="gap-3 pb-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                <MessageSquare className="size-5" />
                <span>Forum Diskusi</span>
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Forum ini mengikuti course master <span className="font-medium text-[var(--foreground)]">{courseTitle}</span>,
                sehingga diskusi dibagikan ke seluruh offering dari course yang sama.
              </p>
            </div>

            <div className="grid min-w-[220px] gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm">
              <p className="text-[var(--muted-foreground)]">
                Total topik: <span className="font-semibold text-[var(--foreground)]">{postMeta.total}</span>
              </p>
              <p className="text-[var(--muted-foreground)]">
                Halaman:{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {postMeta.current_page} / {postMeta.last_page}
                </span>
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                <PlusCircle className="size-5" />
                <span>Buat Topik Admin/Instructor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={postTitle}
                onChange={(event) => setPostTitle(event.target.value)}
                placeholder="Contoh: Panduan diskusi assignment akhir"
              />
              <Textarea
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                placeholder="Tulis pengumuman, jawaban umum, atau panduan diskusi di sini."
                className="min-h-32"
              />
              <Button
                type="button"
                onClick={handleCreatePost}
                disabled={createPostMutation.isPending}
                className="w-full bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
              >
                {createPostMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Publikasikan Topik</span>
              </Button>
            </CardContent>
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
                    Belum ada topik forum untuk course ini.
                  </div>
                ) : null}

                {posts.map((post) => {
                  const isActive = post.id === effectiveSelectedPostId;
                  const isOwnPost = post.user_id === currentUser?.id;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPostId(post.id)}
                      className={[
                        "w-full rounded-xl border px-4 py-4 text-left transition",
                        isActive
                          ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                          : "border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)]",
                      ].join(" ")}
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
                    </button>
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
        </div>

        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Shield className="size-5" />
              <span>Panel Moderasi Forum</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!posts.length && !postsQuery.isLoading ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center">
                <MessageSquare className="size-10 text-[var(--primary)]" />
                <h3 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Belum Ada Topik</h3>
                <p className="mt-2 max-w-lg text-sm leading-7 text-[var(--muted-foreground)]">
                  Buat topik pertama untuk memulai diskusi atau tunggu student membuka percakapan.
                </p>
              </div>
            ) : selectedPostQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat detail topik forum...
              </div>
            ) : selectedPostQuery.isError || !selectedPost ? (
              <p className="text-sm text-[var(--danger-soft-foreground)]">Detail topik forum belum bisa dimuat.</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedPost.is_pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                            <Pin className="size-3" />
                            Post penting
                          </span>
                        ) : null}
                        {selectedPost.user_id === currentUser?.id ? (
                          <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                            Anda
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{selectedPost.title}</h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => togglePinMutation.mutate(selectedPost.id)}
                        disabled={togglePinMutation.isPending}
                      >
                        {togglePinMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Pin className="size-4" />}
                        <span>{selectedPost.is_pinned ? "Lepas Pin" : "Pin Post"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPostToDeleteId(selectedPost.id)}
                        className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="size-4" />
                        <span>Hapus Post</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                      {resolveAvatarUrl(selectedPost.user?.avatar) ? (
                        <div
                          aria-label={selectedPost.user?.fullname || "Admin"}
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${resolveAvatarUrl(selectedPost.user?.avatar)}")` }}
                        />
                      ) : (
                        getAvatarLabel(selectedPost.user?.fullname)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--foreground)]">{selectedPost.user?.fullname ?? "-"}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Dibuat {formatDateTime(selectedPost.created_at)} | Diupdate {formatDateTime(selectedPost.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
                    {selectedPost.content}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Balasan</h3>
                    <span className="text-sm text-[var(--muted-foreground)]">{selectedPostRepliesCount} balasan</span>
                  </div>

                  {replies.length ? (
                    <div className="space-y-3">
                      {replies.map((reply) => {
                        const replyAvatarUrl = resolveAvatarUrl(reply.user?.avatar);

                        return (
                          <article
                            key={reply.id}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                                  {replyAvatarUrl ? (
                                    <div
                                      aria-label={reply.user?.fullname || "User"}
                                      className="h-full w-full bg-cover bg-center"
                                      style={{ backgroundImage: `url("${replyAvatarUrl}")` }}
                                    />
                                  ) : (
                                    getAvatarLabel(reply.user?.fullname)
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-[var(--foreground)]">{reply.user?.fullname ?? "-"}</p>
                                    <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(reply.created_at)}</span>
                                  </div>
                                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setReplyToDeleteId(reply.id)}
                                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              >
                                <Trash2 className="size-4" />
                                <span>Hapus</span>
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                      Belum ada balasan untuk topik ini.
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-[var(--border)] p-5">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Balas Sebagai Admin/Instructor</h3>
                  <Textarea
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder="Tulis tanggapan, arahan, atau klarifikasi di sini."
                    className="min-h-28"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateReply}
                    disabled={createReplyMutation.isPending}
                    className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
                  >
                    {createReplyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    <span>Kirim Balasan</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmAlertDialog
        open={postToDeleteId !== null}
        title="Hapus topik forum?"
        description="Post dan seluruh balasannya akan hilang dari forum course ini."
        confirmLabel="Ya, hapus post"
        cancelLabel="Batal"
        confirmTone="danger"
        isPending={deletePostMutation.isPending}
        onClose={() => {
          if (deletePostMutation.isPending) return;
          setPostToDeleteId(null);
        }}
        onConfirm={() => {
          if (!postToDeleteId) return;
          deletePostMutation.mutate(postToDeleteId);
        }}
      />

      <ConfirmAlertDialog
        open={replyToDeleteId !== null}
        title="Hapus balasan forum?"
        description="Balasan ini akan dihapus dari topik forum."
        confirmLabel="Ya, hapus balasan"
        cancelLabel="Batal"
        confirmTone="danger"
        isPending={deleteReplyMutation.isPending}
        onClose={() => {
          if (deleteReplyMutation.isPending) return;
          setReplyToDeleteId(null);
        }}
        onConfirm={() => {
          if (!replyToDeleteId) return;
          deleteReplyMutation.mutate(replyToDeleteId);
        }}
      />
    </div>
  );
}
