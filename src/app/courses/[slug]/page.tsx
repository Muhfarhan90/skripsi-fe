"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  MessageSquareText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicWebsiteSettings, getPublishedCourseBySlug } from "@/features/student/api/store-api";
import {
  buildStudentCheckoutLoginRedirect,
  buildStudentCheckoutPath,
} from "@/features/student/lib/checkout";
import { hasValidDiscount } from "@/features/student/lib/pricing";
import { SiteFooter } from "@/features/website/components/site-footer";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { getCourseInstructorHref } from "@/features/website/lib/public-instructors";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";
import { isStudentRole } from "@/features/auth/lib/roles";
import { useAuthStore } from "@/features/auth/store/auth-store";

function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseTextItems(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n|;/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function formatReviewAverage(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return numeric > 0 ? numeric.toFixed(1) : "0.0";
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const user = useAuthStore((state) => state.user);
  const catalogHref = isStudentRole(user?.role_name, user?.role_id) ? "/student/catalog" : "/courses";
  const slug = typeof params.slug === "string" ? params.slug : "";

  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });
  const courseQuery = useQuery({
    queryKey: ["store", "course-detail", slug],
    queryFn: () => getPublishedCourseBySlug(slug),
    enabled: slug.length > 0,
  });

  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();

  const handleCheckout = () => {
    const course = courseQuery.data;
    if (!course) {
      return;
    }

    if (!user) {
      router.push(buildStudentCheckoutLoginRedirect(course.slug));
      return;
    }

    if (!isStudentRole(user.role_name, user.role_id)) {
      toast.error("Fitur pembelian hanya tersedia untuk akun student");
      return;
    }

    router.push(buildStudentCheckoutPath(course.slug));
  };

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PublicSiteHeader settings={websiteSettings} />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-[var(--border)]" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_21rem]">
            <div className="h-96 animate-pulse rounded-lg bg-[var(--border)]" />
            <div className="h-72 animate-pulse rounded-lg bg-[var(--border)]" />
          </div>
        </main>
        <SiteFooter settings={websiteSettings} className="mt-12" />
      </div>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <PublicSiteHeader settings={websiteSettings} />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <section className="rounded-lg border border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] p-5 text-sm text-[var(--danger-soft-foreground)]">
            <p>Course tidak ditemukan atau gagal dimuat.</p>
            <Link href={catalogHref} className="mt-3 inline-flex items-center gap-2 font-semibold">
              <ArrowLeft className="size-4" />
              Kembali ke katalog
            </Link>
          </section>
        </main>
        <SiteFooter settings={websiteSettings} className="mt-12" />
      </div>
    );
  }

  const course = courseQuery.data;
  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
  const requirements = parseTextItems(course.requirements);
  const outcomes = parseTextItems(course.outcomes);
  const reviewCount = course.reviews_count ?? 0;
  const buyLabel = user ? "Beli sekarang" : "Masuk untuk beli";
  const instructorHref = getCourseInstructorHref(course);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader settings={websiteSettings} courses={[course]} />

      <main className="pb-24 md:pb-12">
        <section className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_23rem] lg:py-10">
            <div className="space-y-6">
              <Link
                href={catalogHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition hover:opacity-80"
              >
                <ArrowLeft className="size-4" />
                Kembali ke katalog
              </Link>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    {course.status}
                  </span>
                  {course.category_name ? (
                    <span className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)]">
                      {course.category_name}
                    </span>
                  ) : null}
                </div>

                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-semibold leading-tight tracking-normal text-[var(--foreground)] sm:text-4xl">
                    {course.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                    {course.description || "Deskripsi course belum tersedia."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                  {course.instructor_name ? (
                    instructorHref ? (
                      <Link
                        href={instructorHref}
                        className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 transition hover:border-[var(--primary)]/30 hover:text-[var(--primary)]"
                      >
                        <GraduationCap className="size-4 text-[var(--primary)]" />
                        {course.instructor_name}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                        <GraduationCap className="size-4 text-[var(--primary)]" />
                        {course.instructor_name}
                      </span>
                    )
                  ) : null}
                  <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                    <Star className="size-4 text-[var(--secondary)]" />
                    {formatReviewAverage(course.reviews_avg_rating)} rating
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2">
                    <MessageSquareText className="size-4 text-[var(--primary)]" />
                    {reviewCount} review
                  </span>
                </div>
              </div>
            </div>

            <aside className="hidden lg:block">
              <PurchasePanel
                thumbnail={course.thumbnail}
                title={course.title}
                hasDiscount={hasDiscount}
                price={course.price}
                activePrice={activePrice}
                checkoutLabel={buyLabel}
                onCheckout={handleCheckout}
              />
            </aside>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_23rem]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] lg:hidden">
              {course.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnail} alt={course.title} className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
                  <BookOpen className="size-12" />
                </div>
              )}
            </div>

            <ContentSection title="Tentang course">
              <p className="whitespace-pre-line text-sm leading-7 text-[var(--muted-foreground)]">
                {course.description || "Deskripsi course belum tersedia."}
              </p>
            </ContentSection>

            <ContentSection title="Yang akan dipelajari">
              {outcomes.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {outcomes.map((item, index) => (
                    <InfoItem key={`${item}-${index}`} text={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Outcome belum ditambahkan.</p>
              )}
            </ContentSection>

            <ContentSection title="Persiapan sebelum belajar">
              {requirements.length > 0 ? (
                <div className="space-y-3">
                  {requirements.map((item, index) => (
                    <InfoItem key={`${item}-${index}`} text={item} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Tidak ada requirement khusus untuk mengikuti course ini.
                </p>
              )}
            </ContentSection>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ContentSection title="Informasi kelas">
                <dl className="space-y-3 text-sm">
                  <InfoRow label="Status" value={course.status} />
                  <InfoRow label="Kategori" value={course.category_name || "-"} />
                  <InfoRow label="Instructor" value={course.instructor_name || "-"} />
                  <InfoRow label="Review" value={`${reviewCount} review`} />
                </dl>
              </ContentSection>
            </div>
          </aside>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] p-3 shadow-[0_-10px_28px_rgba(15,23,42,0.08)] md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {hasDiscount ? (
              <p className="text-xs text-[var(--muted-foreground)] line-through">{formatCurrency(course.price)}</p>
            ) : null}
            <p className="truncate text-lg font-semibold text-[var(--primary)]">{formatCurrency(activePrice)}</p>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
          >
            {buyLabel}
          </button>
        </div>
      </div>

      <SiteFooter settings={websiteSettings} />
    </div>
  );
}

function PurchasePanel({
  thumbnail,
  title,
  hasDiscount,
  price,
  activePrice,
  checkoutLabel,
  onCheckout,
}: {
  thumbnail: string | null;
  title: string;
  hasDiscount: boolean;
  price: number | null;
  activePrice: number;
  checkoutLabel: string;
  onCheckout: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={title} className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-[var(--surface-soft)] text-[var(--muted-foreground)]">
          <BookOpen className="size-12" />
        </div>
      )}

      <div className="space-y-4 p-5">
        <div>
          {hasDiscount ? (
            <p className="text-sm text-[var(--muted-foreground)] line-through">{formatCurrency(price)}</p>
          ) : null}
          <p className="text-2xl font-semibold text-[var(--primary)]">{formatCurrency(activePrice)}</p>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={onCheckout}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
          >
            <CreditCard className="size-4" />
            {checkoutLabel}
          </button>
        </div>

        <div className="space-y-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[var(--primary)]" />
            Akses materi setelah pembayaran berhasil.
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-[var(--primary)]" />
            Sertifikat tersedia jika syarat course selesai.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--foreground)]">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
      <span className="leading-6">{text}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
