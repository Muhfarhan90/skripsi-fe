"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageSquare, Pencil, Pin, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store/auth-store";
import {
  createStudentCourseForumReply,
  deleteStudentCourseForumPost,
  deleteStudentCourseForumReply,
  getStudentCourseForumPost,
  updateStudentCourseForumPost,
  updateStudentCourseForumReply,
} from "@/features/student/api/store-api";
import { formatUtcDateTimeToJakarta } from "@/features/student/lib/date-time";
import { buildStudentEnrollmentForumListHref } from "@/features/student/lib/forum";
import { ApiError } from "@/lib/api/client";
import type { StoreForumPost, StoreForumReply } from "@/types/store";

interface StudentCourseForumDetailPageProps {
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  postId: number;
  listHref?: string;
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

export function StudentCourseForumDetailPage({
  enrollmentId,
  courseId,
  courseTitle,
  postId,
  listHref,
}: StudentCourseForumDetailPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [replyContent, setReplyContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostContent, setEditPostContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [postToDeleteId, setPostToDeleteId] = useState<number | null>(null);
  const [replyToDeleteId, setReplyToDeleteId] = useState<number | null>(null);

  const resolvedListHref = listHref ?? buildStudentEnrollmentForumListHref(enrollmentId);

  const selectedPostQuery = useQuery({
    queryKey: ["student", "course", courseId, "forum-post", postId],
    queryFn: () => getStudentCourseForumPost(courseId, postId),
    enabled: Number.isFinite(courseId) && courseId > 0 && Number.isFinite(postId) && postId > 0,
  });

  const createReplyMutation = useMutation({
    mutationFn: (payload: { content: string }) =>
      createStudentCourseForumReply(courseId, postId, payload),
    onSuccess: () => {
      setReplyContent("");
      toast.success("Balasan berhasil dikirim.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum-post", postId],
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

  const updatePostMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) =>
      updateStudentCourseForumPost(courseId, postId, payload),
    onSuccess: () => {
      setEditingPostId(null);
      setEditPostTitle("");
      setEditPostContent("");
      toast.success("Topik diskusi berhasil diperbarui.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum-post", postId],
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
    mutationFn: () => deleteStudentCourseForumPost(courseId, postId),
    onSuccess: () => {
      toast.success("Topik diskusi berhasil dihapus.");
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum"],
      });
      queryClient.removeQueries({
        queryKey: ["student", "course", courseId, "forum-post", postId],
      });
      router.push(resolvedListHref, { scroll: false });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Topik diskusi belum bisa dihapus.");
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
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum-post", postId],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["student", "course", courseId, "forum-post", postId],
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }

      toast.error("Balasan belum bisa dihapus.");
    },
  });

  const selectedPost = selectedPostQuery.data ?? null;
  const replies = useMemo(() => selectedPost?.replies ?? [], [selectedPost?.replies]);
  const isOwnSelectedPost = selectedPost?.user_id === currentUser?.id;
  const isEditingSelectedPost = selectedPost ? editingPostId === selectedPost.id : false;

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

    updatePostMutation.mutate({ title, content });
  };

  const handleUpdateReply = (replyId: number) => {
    const content = editReplyContent.trim();

    if (!content) {
      toast.error("Isi balasan wajib diisi.");
      return;
    }

    updateReplyMutation.mutate({ replyId, content });
  };

  const handleCreateReply = () => {
    const content = replyContent.trim();

    if (!content) {
      toast.error("Isi balasan wajib diisi.");
      return;
    }

    createReplyMutation.mutate({ content });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-[var(--foreground)]">
            <MessageSquare className="size-5 text-[var(--primary)]" />
            <span>Detail Diskusi</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Course: <span className="font-semibold text-[var(--foreground)]">{courseTitle}</span>
          </p>
        </div>

        <Button render={<Link href={resolvedListHref} />} type="button" variant="outline">
          <ArrowLeft className="size-4" />
          <span>Kembali ke daftar diskusi</span>
        </Button>
      </div>

      <div className="space-y-4">
          {selectedPostQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Memuat detail diskusi...
            </div>
          ) : selectedPostQuery.isError || !selectedPost ? (
            <p className="text-sm text-red-600">Detail diskusi belum bisa dimuat.</p>
          ) : (
            <div className="space-y-6">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPost.is_pinned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                          <Pin className="size-3" />
                          Post penting
                        </span>
                      ) : null}
                      {isOwnSelectedPost ? (
                        <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                          Anda
                        </span>
                      ) : null}
                    </div>
                    {isEditingSelectedPost ? (
                      <Input
                        value={editPostTitle}
                        onChange={(event) => setEditPostTitle(event.target.value)}
                        placeholder="Judul diskusi"
                        className="mt-3 w-full min-w-[320px] border-slate-300 bg-white shadow-sm focus-visible:border-slate-400 sm:min-w-[460px]"
                      />
                    ) : (
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{selectedPost.title}</h3>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start justify-end gap-2">
                    {isOwnSelectedPost ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (isEditingSelectedPost) {
                              cancelPostEditing();
                              return;
                            }
                            openPostEditor(selectedPost);
                          }}
                        >
                          <Pencil className="size-4" />
                          <span>{isEditingSelectedPost ? "Batal Edit" : "Edit Post"}</span>
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
                      </>
                    ) : null}
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
                    <p className="font-medium text-[var(--foreground)]">{selectedPost.user?.fullname || "Student"}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Dibuat {formatUtcDateTimeToJakarta(selectedPost.created_at)} | Diupdate {formatUtcDateTimeToJakarta(selectedPost.updated_at)}
                    </p>
                  </div>
                </div>

                {isEditingSelectedPost ? (
                  <div className="mt-5 space-y-3">
                    <Textarea
                      value={editPostContent}
                      onChange={(event) => setEditPostContent(event.target.value)}
                      placeholder="Perbarui isi diskusi di sini."
                      className="min-h-36 border-slate-300 bg-white shadow-sm focus-visible:border-slate-400"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={handleUpdatePost}
                        disabled={updatePostMutation.isPending}
                        className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
                      >
                        {updatePostMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>Simpan Perubahan</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelPostEditing}
                        disabled={updatePostMutation.isPending}
                      >
                        <span>Batal</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
                    {selectedPost.content}
                  </div>
                )}
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Balasan Diskusi</h3>
                  <span className="text-sm text-[var(--muted-foreground)]">{replies.length} balasan</span>
                </div>

                {replies.length ? (
                  <div className="space-y-3">
                    {replies.map((reply) => {
                      const replyAvatarUrl = resolveAvatarUrl(reply.user?.avatar);
                      const isOwnReply = reply.user_id === currentUser?.id;
                      const isEditingReply = editingReplyId === reply.id;

                      return (
                        <article
                          key={reply.id}
                          className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] p-4"
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
                                <p className="font-medium text-[var(--foreground)]">{reply.user?.fullname || "Student"}</p>
                                {isOwnReply ? (
                                  <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                                    Anda
                                  </span>
                                ) : null}
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  {formatUtcDateTimeToJakarta(reply.created_at)}
                                </span>
                              </div>

                              {isEditingReply ? (
                                <div className="mt-3 space-y-3">
                                  <Textarea
                                    value={editReplyContent}
                                    onChange={(event) => setEditReplyContent(event.target.value)}
                                    placeholder="Perbarui balasan kamu di sini."
                                    className="min-h-28 border-slate-300 bg-white shadow-sm focus-visible:border-slate-400"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      onClick={() => handleUpdateReply(reply.id)}
                                      disabled={updateReplyMutation.isPending}
                                      className="bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
                                    >
                                      {updateReplyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                                      <span>Simpan Balasan</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={cancelReplyEditing}
                                      disabled={updateReplyMutation.isPending}
                                    >
                                      <span>Batal</span>
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
                                  {reply.content}
                                </p>
                              )}
                            </div>

                            {isOwnReply ? (
                              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (isEditingReply) {
                                      cancelReplyEditing();
                                      return;
                                    }
                                    openReplyEditor(reply);
                                  }}
                                >
                                  <Pencil className="size-4" />
                                  <span>{isEditingReply ? "Batal" : "Edit"}</span>
                                </Button>
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
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-foreground)]">
                    Belum ada balasan untuk topik ini. Kamu bisa menjadi orang pertama yang menanggapi.
                  </div>
                )}
              </section>

              <form
                className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateReply();
                }}
              >
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Tulis Balasan</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  Tanggapi dengan jelas dan tetap fokus pada materi kelas agar diskusi tetap bermanfaat.
                </p>
                <Textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  placeholder="Tulis balasan kamu di sini."
                  className="mt-4 min-h-32"
                />
                <Button
                  type="submit"
                  disabled={createReplyMutation.isPending}
                  className="mt-4 bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
                >
                  {createReplyMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  <span>{createReplyMutation.isPending ? "Mengirim..." : "Kirim Balasan"}</span>
                </Button>
              </form>
            </div>
          )}
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
          deletePostMutation.mutate();
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
    </section>
  );
}
