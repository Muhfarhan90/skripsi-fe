import { redirect } from "next/navigation";

interface StudentEnrollmentForumRedirectPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function StudentEnrollmentForumRedirectPage({
  params,
  searchParams,
}: StudentEnrollmentForumRedirectPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextParams = new URLSearchParams();

  nextParams.set("tab", "forum");

  const page = readSingleValue(resolvedSearchParams.page);
  const postId = readSingleValue(resolvedSearchParams.postId);

  if (page) {
    nextParams.set("forumPage", page);
  }

  if (postId) {
    nextParams.set("forumPostId", postId);
  }

  redirect(`/student/enrollments/${id}/learn?${nextParams.toString()}`);
}
