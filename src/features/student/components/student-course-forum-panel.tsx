"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, MessageSquare, Pencil, Pin, PlusCircle, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  createStudentCourseForumPost,
  createStudentCourseForumReply,
  deleteStudentCourseForumPost,
  deleteStudentCourseForumReply,
  getStudentCourseForumPost,
  getStudentCourseForumPosts,
  updateStudentCourseForumPost,
  updateStudentCourseForumReply,
} from "@/features/student/api/store-api";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";
import { ApiError } from "@/lib/api/client";
import type { StoreForumPost, StoreForumReply } from "@/types/store";

interface StudentCourseForumPanelProps {
  basePath: string;
  courseId: number;
  courseTitle: string;
}

function buildForumHref(
  basePath: string,
  searchParams: URLSearchParams,
  options: {
    page?: number;
    postId?: number | null;
  },
): string {
  const params = new URLSearchParams(searchParams.toString());

  if (options.page && options.page > 1) {
    params.set("forumPage", String(options.page));
  } else {
    params.delete("forumPage");
  }

  if (options.postId && options.postId > 0) {
    params.set("forumPostId", String(options.postId));
  } else {
    params.delete("forumPostId");
  }

  const suffix = params.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function getAvatarLabel(name: string | null | undefined): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "S";
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

function buildExcerpt(content: string, maxLength = 120): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function StudentCourseForumPanel({
  basePath,
  courseId,
  courseTitle,
}: StudentCourseForumPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [postToDeleteId, setPostToDeleteId] = useState<number | null>(null);
  const [replyToDeleteId, setReplyToDeleteId] = useState<number | null>(null);

  const requestedPage = Number(searchParams.get("forumPage") ?? "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedPostId = Number(searchParams.get("forumPostId") ?? "0");
  const selectedPostIdFromUrl =
    Number.isFinite(requestedPostId) && requestedPostId > 0 ? requestedPostId : null;

  const postsQuery = useQuery({
    queryKey: ["student", "course", courseId, "forum", currentPage],
    queryFn: () => getStudentCourseForumPosts(courseId, currentPage),
    enabled: Number.isFinite(courseId) && courseId > 0,
  });

  const posts = useMemo(() => postsQuery.data?.items ?? [], [postsQuery.data?.items]);
  const postsMeta = postsQuery.data?.meta ?? null;
  const activePostId = useMemo(() => {
    if (selectedPostIdFromUrl && posts.some((post) => post.id === selectedPostIdFromUrl)) {
      return selectedPostIdFromUrl;
    }

    return posts[0]?.id ?? null;
  }, [posts, selectedPostIdFromUrl]);

  useEffect(() => {
    if (!postsQuery.isSuccess || !posts.length || !activePostId) {
      return;
    }

    if (activePostId === selectedPostIdFromUrl) {
      return;
    }

    const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
      page: currentPage,
      postId: activePostId,
    });
    router.replace(nextUrl, { scroll: false });
  }, [
    activePostId,
    basePath,
    currentPage,
    posts.length,
    postsQuery.isSuccess,
    router,
    searchParams,
    selectedPostIdFromUrl,
  ]);

  const selectedPostQuery = useQuery({
    queryKey: ["student", "course", courseId, "forum-post", activePostId],
    queryFn: () => getStudentCourseForumPost(courseId, activePostId as number),
    enabled: Number.isFinite(courseId) && courseId > 0 && Boolean(activePostId),
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) =>
      createStudentCourseForumPost(courseId, payload),
    onSuccess: (post) => {
      setPostTitle("");
      setPostContent("");
      toast.success("Topik diskusi berhasil dibuat.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
        page: 1,
        postId: post.id,
      });
      router.replace(nextUrl, { scroll: false });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik diskusi belum bisa dibuat.");
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: (payload: { postId: number; title: string; content: string }) =>
      updateStudentCourseForumPost(courseId, payload.postId, {
        title: payload.title,
        content: payload.content,
      }),
    onSuccess: (post) => {
      setEditingPostId(null);
      setEditPostTitle("");
      setEditPostContent("");
      toast.success("Topik diskusi berhasil diperbarui.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum-post", post.id],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik diskusi belum bisa diperbarui.");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => deleteStudentCourseForumPost(courseId, postId),
    onSuccess: (_, postId) => {
      const remainingPosts = posts.filter((post) => post.id !== postId);
      const nextPage = remainingPosts.length === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
      const nextPostId = remainingPosts[0]?.id ?? null;

      setEditingPostId(null);
      setEditPostTitle("");
      setEditPostContent("");
      setPostToDeleteId(null);
      toast.success("Topik diskusi berhasil dihapus.");

      const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
        page: nextPage,
        postId: nextPostId,
      });
      router.replace(nextUrl, { scroll: false });

      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      if (activePostId) {
        queryClient.invalidateQueries({
          queryKey: ["student", "course", courseId, "forum-post", activePostId],
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik diskusi belum bisa dihapus.");
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: (payload: { content: string }) =>
      createStudentCourseForumReply(courseId, activePostId as number, payload),
    onSuccess: () => {
      setReplyContent("");
      toast.success("Balasan berhasil dikirim.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum-post", activePostId],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Balasan belum bisa dikirim.");
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: (payload: { replyId: number; content: string }) =>
      updateStudentCourseForumReply(payload.replyId, {
        content: payload.content,
      }),
    onSuccess: () => {
      setEditingReplyId(null);
      setEditReplyContent("");
      toast.success("Balasan berhasil diperbarui.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      if (activePostId) {
        queryClient.invalidateQueries({
          queryKey: ["student", "course", courseId, "forum-post", activePostId],
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Balasan belum bisa diperbarui.");
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: number) => deleteStudentCourseForumReply(replyId),
    onSuccess: () => {
      setEditingReplyId(null);
      setEditReplyContent("");
      setReplyToDeleteId(null);
      toast.success("Balasan berhasil dihapus.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      if (activePostId) {
        queryClient.invalidateQueries({
          queryKey: ["student", "course", courseId, "forum-post", activePostId],
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Balasan belum bisa dihapus.");
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

  const handleCreateReply = () => {
    if (!activePostId) {
      toast.error("Pilih topik diskusi terlebih dahulu.");
      return;
    }

    const content = replyContent.trim();
    if (!content) {
      toast.error("Isi balasan wajib diisi.");
      return;
    }

    createReplyMutation.mutate({ content });
  };

  const openPostEditor = (post: StoreForumPost) => {
    setEditingReplyId(null);
    setEditReplyContent("");
    setEditingPostId(post.id);
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
  };

  const openReplyEditor = (reply: StoreForumReply) => {
    setEditingPostId(null);
    setEditPostTitle("");
    setEditPostContent("");
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const cancelPostEditing = () => {
    if (updatePostMutation.isPending) {
      return;
    }

    setEditingPostId(null);
    setEditPostTitle("");
    setEditPostContent("");
  };

  const cancelReplyEditing = () => {
    if (updateReplyMutation.isPending) {
      return;
    }

    setEditingReplyId(null);
    setEditReplyContent("");
  };

  const handleUpdatePost = () => {
    if (!selectedPost || editingPostId !== selectedPost.id) {
      return;
    }

    const title = editPostTitle.trim();
    const content = editPostContent.trim();

    if (!title) {
      toast.error("Judul diskusi wajib diisi.");
      return;
    }

    if (!content) {
      toast.error("Isi diskusi wajib diisi.");
      return;
    }

    updatePostMutation.mutate({
      postId: selectedPost.id,
      title,
      content,
    });
  };

  const handleUpdateReply = (replyId: number) => {
    const content = editReplyContent.trim();

    if (!content) {
      toast.error("Isi balasan wajib diisi.");
      return;
    }

    updateReplyMutation.mutate({
      replyId,
      content,
    });
  };

  const selectedPost = selectedPostQuery.data ?? null;
  const replyList = selectedPost?.replies ?? [];
  const isOwnSelectedPost = selectedPost?.user_id === currentUser?.id;
  const isEditingSelectedPost = selectedPost ? editingPostId === selectedPost.id : false;

  return (
    <div className="space-y-5">
      <header className="rounded-[24px] border border-border bg-card p-5 shadow-sm lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[var(--primary)] uppercase">
              Forum Diskusi
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-foreground">Diskusi Kelas {courseTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Tanyakan hal yang belum jelas, bagikan insight dari materi, atau bantu student lain
              memahami topik yang sedang dipelajari.
            </p>
          </div>

          <div className="grid min-w-[220px] gap-3 rounded-[20px] border border-border bg-[var(--surface-soft)] p-5 text-sm">
            <div>
              <p className="text-muted-foreground">Total topik</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{postsMeta?.total ?? posts.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Halaman aktif</p>
              <p className="mt-1 font-medium text-foreground">
                {postsMeta ? `${postsMeta.current_page} / ${postsMeta.last_page}` : "1 / 1"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <form
            className="rounded-[24px] border border-border bg-card p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreatePost();
            }}
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-[var(--primary)]" />
              <h3 className="text-lg font-semibold text-foreground">Buat Topik Baru</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tulis judul yang spesifik agar diskusi lebih mudah dijawab dan dicari kembali.
            </p>

            <div className="mt-4 space-y-3">
              <input
                value={postTitle}
                onChange={(event) => setPostTitle(event.target.value)}
                placeholder="Contoh: Bagaimana memahami function dengan lebih mudah?"
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-[var(--secondary)]"
              />
              <textarea
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                rows={5}
                placeholder="Tulis pertanyaan atau insight kamu di sini."
                className="w-full rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-[var(--secondary)]"
              />
            </div>

            <button
              type="submit"
              disabled={createPostMutation.isPending}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
            >
              {createPostMutation.isPending ? "Menyimpan..." : "Publikasikan Diskusi"}
            </button>
          </form>

          <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Daftar Diskusi</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pilih topik untuk membaca balasan atau ikut berdiskusi.
                </p>
              </div>
              <MessageSquare className="size-5 text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-3">
              {postsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat daftar diskusi...</p>
              ) : null}

              {postsQuery.isError ? (
                <p className="text-sm text-red-600">Daftar diskusi belum bisa dimuat.</p>
              ) : null}

              {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-[var(--surface-soft)] p-4 text-sm text-muted-foreground">
                  Belum ada topik diskusi. Kamu bisa menjadi student pertama yang memulai percakapan.
                </div>
              ) : null}

              {posts.map((post) => {
                const isActive = post.id === activePostId;
                const isOwnPost = post.user_id === currentUser?.id;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
                        page: currentPage,
                        postId: post.id,
                      });
                      router.replace(nextUrl, { scroll: false });
                    }}
                    className={[
                      "w-full rounded-2xl border px-4 py-4 text-left transition",
                      isActive
                        ? "border-[var(--secondary)] bg-[var(--secondary)]/10"
                        : "border-border bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)]",
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
                  </button>
                );
              })}
            </div>

            {postsMeta && postsMeta.last_page > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={postsMeta.current_page <= 1}
                  onClick={() => {
                    const nextUrl = buildForumHref(basePath, new URLSearchParams(searchParams.toString()), {
                      page: postsMeta.current_page - 1,
                      postId: null,
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
                      postId: null,
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

        <article className="rounded-[24px] border border-border bg-card p-5 shadow-sm lg:p-6">
          {!posts.length && !postsQuery.isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-[var(--surface-soft)] p-6 text-center">
              <Sparkles className="size-10 text-[var(--primary)]" />
              <h3 className="mt-4 text-2xl font-semibold text-foreground">Belum Ada Diskusi</h3>
              <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
                Topik forum untuk kelas ini masih kosong. Tulis pertanyaan, insight, atau kendala belajar
                agar diskusi kelas mulai berjalan.
              </p>
            </div>
          ) : selectedPostQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat detail diskusi...</p>
          ) : selectedPostQuery.isError || !selectedPost ? (
            <p className="text-sm text-red-600">Detail diskusi belum bisa dimuat.</p>
          ) : (
            <div className="space-y-6">
              <header className="rounded-[20px] border border-border bg-[var(--surface-soft)] p-5">
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
                        <span className="inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          Anda
                        </span>
                      ) : null}
                    </div>
                    {isEditingSelectedPost ? (
                      <input
                        value={editPostTitle}
                        onChange={(event) => setEditPostTitle(event.target.value)}
                        placeholder="Judul diskusi"
                        className="mt-3 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-[var(--secondary)]"
                      />
                    ) : (
                      <h3 className="mt-3 text-2xl font-semibold text-foreground">{selectedPost.title}</h3>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {isOwnSelectedPost ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingSelectedPost) {
                              cancelPostEditing();
                              return;
                            }
                            openPostEditor(selectedPost);
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-[var(--surface-hover)]"
                        >
                          <Pencil className="size-4" />
                          {isEditingSelectedPost ? "Batal Edit" : "Edit Post"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostToDeleteId(selectedPost.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 className="size-4" />
                          Hapus Post
                        </button>
                      </>
                    ) : null}

                    <div className="min-w-[160px] text-right text-xs text-muted-foreground">
                      <p>Dibuat {formatUtcDateTimeToJakarta(selectedPost.created_at)}</p>
                      <p className="mt-1">Diupdate {formatUtcDateTimeToJakarta(selectedPost.updated_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                    {resolveAvatarUrl(selectedPost.user?.avatar) ? (
                      <div
                        aria-label={selectedPost.user?.fullname || "Student"}
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${resolveAvatarUrl(selectedPost.user?.avatar)}")` }}
                      />
                    ) : (
                      getAvatarLabel(selectedPost.user?.fullname)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{selectedPost.user?.fullname || "Student"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {replyList.length} balasan di topik ini
                    </p>
                  </div>
                </div>

                {isEditingSelectedPost ? (
                  <div className="mt-5 space-y-3">
                    <textarea
                      value={editPostContent}
                      onChange={(event) => setEditPostContent(event.target.value)}
                      rows={6}
                      placeholder="Tulis isi diskusi di sini."
                      className="w-full rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-[var(--secondary)]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleUpdatePost}
                        disabled={updatePostMutation.isPending}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                      >
                        {updatePostMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelPostEditing}
                        disabled={updatePostMutation.isPending}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-hover)] disabled:opacity-70"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {selectedPost.content}
                  </div>
                )}
              </header>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Balasan Diskusi</h3>
                  <span className="text-sm text-muted-foreground">{replyList.length} balasan</span>
                </div>

                {replyList.length ? (
                  <div className="space-y-3">
                    {replyList.map((reply) => {
                      const replyAvatarUrl = resolveAvatarUrl(reply.user?.avatar);
                      const isOwnReply = reply.user_id === currentUser?.id;
                      const isEditingReply = editingReplyId === reply.id;

                      return (
                        <article
                          key={reply.id}
                          className="rounded-[20px] border border-border bg-[var(--surface-soft)] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
                              {replyAvatarUrl ? (
                                <div
                                  aria-label={reply.user?.fullname || "Student"}
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${replyAvatarUrl}")` }}
                                />
                              ) : (
                                getAvatarLabel(reply.user?.fullname)
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{reply.user?.fullname || "Student"}</p>
                                {isOwnReply ? (
                                  <span className="inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                    Anda
                                  </span>
                                ) : null}
                                <span className="text-xs text-muted-foreground">
                                  {formatUtcDateTimeToJakarta(reply.created_at)}
                                </span>
                              </div>

                              {isEditingReply ? (
                                <div className="mt-3 space-y-3">
                                  <textarea
                                    value={editReplyContent}
                                    onChange={(event) => setEditReplyContent(event.target.value)}
                                    rows={4}
                                    placeholder="Perbarui balasan kamu di sini."
                                    className="w-full rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-[var(--secondary)]"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReply(reply.id)}
                                      disabled={updateReplyMutation.isPending}
                                      className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                                    >
                                      {updateReplyMutation.isPending ? "Menyimpan..." : "Simpan Balasan"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelReplyEditing}
                                      disabled={updateReplyMutation.isPending}
                                      className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-hover)] disabled:opacity-70"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                                  {reply.content}
                                </p>
                              )}
                            </div>

                            {isOwnReply ? (
                              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditingReply) {
                                      cancelReplyEditing();
                                      return;
                                    }
                                    openReplyEditor(reply);
                                  }}
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition hover:bg-[var(--surface-hover)]"
                                >
                                  <Pencil className="size-3.5" />
                                  {isEditingReply ? "Batal" : "Edit"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReplyToDeleteId(reply.id)}
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                >
                                  <Trash2 className="size-3.5" />
                                  Hapus
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-border bg-[var(--surface-soft)] p-4 text-sm text-muted-foreground">
                    Belum ada balasan untuk topik ini. Kamu bisa menjadi orang pertama yang menanggapi.
                  </div>
                )}
              </section>

              <form
                className="rounded-[20px] border border-border bg-card p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateReply();
                }}
              >
                <h3 className="text-lg font-semibold text-foreground">Tulis Balasan</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Tanggapi dengan jelas dan tetap fokus pada materi kelas agar diskusi tetap bermanfaat.
                </p>
                <textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  rows={5}
                  placeholder="Tulis balasan kamu di sini."
                  className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-[var(--secondary)]"
                />
                <button
                  type="submit"
                  disabled={createReplyMutation.isPending}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-[var(--secondary)] px-4 text-sm font-semibold text-[var(--secondary-foreground)] transition hover:opacity-90 disabled:opacity-70"
                >
                  <Send className="size-4" />
                  {createReplyMutation.isPending ? "Mengirim..." : "Kirim Balasan"}
                </button>
              </form>
            </div>
          )}
        </article>
      </div>

      <ConfirmAlertDialog
        open={postToDeleteId !== null}
        title="Hapus topik diskusi?"
        description="Topik dan seluruh balasannya akan hilang dari forum kelas ini."
        confirmLabel="Ya, hapus topik"
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
        title="Hapus balasan?"
        description="Balasan ini akan dihapus dari topik diskusi."
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
