export function buildStudentCheckoutPath(slug: string): string {
  return `/student/checkout/${slug}`;
}

export function buildStudentCheckoutLoginRedirect(slug: string): string {
  return `/login?redirect=${encodeURIComponent(buildStudentCheckoutPath(slug))}`;
}
