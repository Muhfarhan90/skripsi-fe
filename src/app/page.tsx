"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  LayoutDashboard,
  PlayCircle,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getDefaultPathByRole, isStudentRole } from "@/features/auth/lib/roles";
import { getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";
import { formatDiscountBadge, hasValidDiscount } from "@/features/student/lib/pricing";
import { HeroMediaSlider, type HeroMediaSlide } from "@/features/website/components/hero-media-slider";
import { SiteFooter } from "@/features/website/components/site-footer";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { getCourseInstructorHref, getPublicInstructorInitials } from "@/features/website/lib/public-instructors";
import {
  createDefaultWebsiteSetting,
  getWebsiteFeatureIconMeta,
} from "@/features/website/lib/website-settings";

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function buildHeroSlides(
  websiteSettings: ReturnType<typeof createDefaultWebsiteSetting>,
  previewCourses: Awaited<ReturnType<typeof getPublishedCourses>>,
  heroTitle: string,
  catalogHref: string,
): HeroMediaSlide[] {
  const slides = new Map<string, HeroMediaSlide>();

  const registerSlide = (slide: HeroMediaSlide) => {
    const key = slide.imageUrl?.trim();
    if (!key || slides.has(key)) {
      return;
    }

    slides.set(key, slide);
  };

  registerSlide({
    id: "hero-primary",
    imageUrl: websiteSettings.hero_image_url,
    eyebrow: websiteSettings.hero_badge || "Highlight",
    title: heroTitle,
    description: websiteSettings.hero_description || websiteSettings.site_tagline,
    href: catalogHref,
    hrefLabel: "Buka katalog",
  });

  previewCourses.forEach((course) => {
    registerSlide({
      id: `course-${course.id}`,
      imageUrl: course.thumbnail,
      eyebrow: course.category_name || "Preview Course",
      title: course.title,
      description: course.instructor_name || course.description || "Course pilihan untuk mulai belajar.",
      href: `/courses/${course.slug}`,
      hrefLabel: "Detail course",
    });
  });

  return Array.from(slides.values()).slice(0, 6);
}

export default function RootPage() {
  const user = useAuthStore((state) => state.user);

  const isLoggedIn = Boolean(user);
  const dashboardHref = getDefaultPathByRole(user?.role_id, user?.role_name);
  const catalogHref = isStudentRole(user?.role_name, user?.role_id) ? "/student/catalog" : "/courses";

  const courseQuery = useQuery({
    queryKey: ["store", "courses", "preview"],
    queryFn: getPublishedCourses,
    staleTime: 5 * 60_000,
  });
  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });

  const courses = courseQuery.data ?? [];
  const previewCourses = courses.slice(0, 4);
  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();
  const faqItems = (websiteSettings.faqs ?? []).slice(0, 6);

  const heroTitle = websiteSettings.hero_title || websiteSettings.site_name;
  const hasHeroCopy = Boolean(heroTitle || websiteSettings.hero_highlight || websiteSettings.hero_description);
  const hasFeatures = websiteSettings.feature_items.length > 0;
  const hasLearningPaths = websiteSettings.learning_path_items.length > 0;
  const hasFaq = faqItems.length > 0;
  const hasCta = Boolean(websiteSettings.bottom_cta_title || websiteSettings.bottom_cta_description);
  const heroSlides = buildHeroSlides(websiteSettings, previewCourses, heroTitle, catalogHref);
  const featuredSectionClass = "relative overflow-hidden border-y border-[var(--border)]/70 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(15,122,90,0.045)_22%,rgba(217,175,0,0.09)_100%)]";
  const featuresSectionClass = "relative overflow-hidden bg-[linear-gradient(135deg,#f9fcfb_0%,#edf7f2_58%,#ffffff_100%)]";
  const learningSectionClass = "relative overflow-hidden border-y border-[var(--border)]/60 bg-[linear-gradient(135deg,#fffdf4_0%,#fef5d6_28%,#f5fbf8_100%)]";
  const faqSectionClass = "relative overflow-hidden bg-[linear-gradient(180deg,#f6fafb_0%,#eef5f6_100%)]";
  const ctaSectionClass = "relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(15,122,90,0.07)_100%)]";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader
        settings={websiteSettings}
        courses={courses}
        showFeatures={hasFeatures}
        showFaq={hasFaq}
      />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-[radial-gradient(circle_at_top_left,rgba(15,122,90,0.16),transparent_34%),linear-gradient(135deg,#f7fbf9_0%,#edf5f2_45%,#fff7d6_100%)] px-4 py-14 sm:px-6 lg:py-20">
          <div className="pointer-events-none absolute right-[-8rem] top-10 size-80 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-10rem] left-[-6rem] size-96 rounded-full bg-[var(--primary)]/15 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)] xl:gap-14">
            <div className="relative z-10 min-w-0">
              {websiteSettings.hero_badge ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-white/70 px-4 py-2 text-xs font-bold text-[var(--primary)] shadow-sm">
                  <TrendingUp className="size-4" />
                  {websiteSettings.hero_badge}
                </span>
              ) : null}

              {hasHeroCopy ? (
                <div className="mt-6">
                  <h1 className="max-w-2xl text-3xl font-black leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl xl:text-6xl">
                    {heroTitle}
                    {websiteSettings.hero_highlight ? (
                      <span className="block text-[var(--primary)]">{websiteSettings.hero_highlight}</span>
                    ) : null}
                  </h1>
                  {websiteSettings.hero_description ? (
                    <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
                      {websiteSettings.hero_description}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={catalogHref}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                    >
                      <BookOpen className="size-4" />
                      Jelajahi Course
                    </Link>
                    <Link
                      href={dashboardHref}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-6 text-sm font-extrabold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white active:scale-95"
                    >
                      <LayoutDashboard className="size-4" />
                      Lanjut ke Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    {websiteSettings.hero_primary_cta_label ? (
                      <Link
                        href={websiteSettings.hero_primary_cta_url || "/register"}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                      >
                        {websiteSettings.hero_primary_cta_label}
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : null}
                    {websiteSettings.hero_secondary_cta_label ? (
                      <Link
                        href={websiteSettings.hero_secondary_cta_url || catalogHref}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-6 text-sm font-extrabold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white active:scale-95"
                      >
                        <PlayCircle className="size-4" />
                        {websiteSettings.hero_secondary_cta_label}
                      </Link>
                    ) : null}
                  </>
                )}
              </div>

              <Link
                href={catalogHref}
                className="mt-8 flex max-w-2xl items-center gap-3 rounded-3xl border border-[var(--border)] bg-white/85 p-3 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--primary)]">
                  <Search className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-[var(--foreground)]">Cari course atau instructor</span>
                  <span className="block truncate text-xs text-[var(--muted-foreground)]">Masuk ke katalog untuk menemukan kelas yang tersedia</span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-[var(--primary)]" />
              </Link>
            </div>

            <div className="relative z-0 mx-auto w-full max-w-[33rem] xl:ml-auto">
              <HeroMediaSlider slides={heroSlides} siteName={websiteSettings.site_name} />
            </div>
          </div>
        </section>

        {previewCourses.length > 0 ? (
          <section className={`${featuredSectionClass} px-4 py-14 sm:px-6`}>
            <div className="pointer-events-none absolute left-[-6rem] top-10 size-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute right-[-7rem] bottom-0 size-72 rounded-full bg-[var(--secondary)]/12 blur-3xl" />
            <div className="relative mx-auto max-w-7xl rounded-[2.25rem] border border-white/70 bg-white/72 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {websiteSettings.featured_courses_badge ? (
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                      {websiteSettings.featured_courses_badge}
                    </p>
                  ) : null}
                  {websiteSettings.featured_courses_title ? (
                    <h2 className="mt-2 text-xl font-black tracking-tight sm:text-4xl">
                      {websiteSettings.featured_courses_title}
                    </h2>
                  ) : null}
                  {websiteSettings.featured_courses_description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                      {websiteSettings.featured_courses_description}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={catalogHref}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-extrabold text-[var(--primary)] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Lihat semua
                  <ArrowRight className="size-4" />
                </Link>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {previewCourses.map((course) => {
                  const hasDiscount = hasValidDiscount(course.price, course.discount_price);
                  const activePrice = hasDiscount ? Number(course.discount_price ?? 0) : Number(course.price ?? 0);
                  const rating = Number(course.reviews_avg_rating ?? 0);
                  const reviewCount = course.reviews_count ?? 0;
                  const instructorHref = getCourseInstructorHref(course);

                  return (
                    <article
                      key={course.id}
                      className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--primary)]/12 to-[var(--secondary)]/20">
                        {course.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail} alt={course.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="size-12 text-[var(--primary)]/30" />
                          </div>
                        )}
                        {hasDiscount ? (
                          <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-[10px] font-black text-white shadow">
                            {formatDiscountBadge(course.price, course.discount_price)}
                          </span>
                        ) : null}
                        {course.instructor_name ? (
                          <span className="absolute -bottom-6 right-4 inline-flex size-12 items-center justify-center rounded-full border-4 border-white bg-[var(--primary)] text-xs font-black text-white shadow-lg">
                            {getPublicInstructorInitials(course.instructor_name)}
                          </span>
                        ) : null}
                      </div>

                      <div className="p-5 pt-8">
                        {course.category_name ? (
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--primary)]">
                            {course.category_name}
                          </p>
                        ) : null}
                        <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug transition group-hover:text-[var(--primary)]">
                          {course.title}
                        </h3>
                        {course.instructor_name ? (
                          instructorHref ? (
                            <Link
                              href={instructorHref}
                              className="mt-2 inline-flex text-xs font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)]"
                            >
                              {course.instructor_name}
                            </Link>
                          ) : (
                            <p className="mt-2 text-xs font-semibold text-[var(--muted-foreground)]">{course.instructor_name}</p>
                          )
                        ) : null}
                        {reviewCount > 0 ? (
                          <div className="mt-3 flex items-center gap-1.5">
                            <span className="text-xs font-black text-amber-500">{rating.toFixed(1)}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`size-3 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-[var(--border)] text-[var(--border)]"}`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] text-[var(--muted-foreground)]">({reviewCount})</span>
                          </div>
                        ) : null}
                        {course.description ? (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">{course.description}</p>
                        ) : null}
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div>
                            {hasDiscount ? (
                              <p className="text-[11px] text-[var(--muted-foreground)] line-through">{formatCurrency(course.price)}</p>
                            ) : null}
                            <p className="text-base font-black text-[var(--secondary)]">{formatCurrency(activePrice)}</p>
                          </div>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="inline-flex h-9 items-center rounded-full bg-[var(--primary)] px-4 text-xs font-black text-white transition hover:opacity-90 active:scale-95"
                          >
                            Detail
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {hasFeatures ? (
          <section id="features" className={`${featuresSectionClass} px-4 py-14 sm:px-6`}>
            <div className="pointer-events-none absolute right-[-8rem] top-8 size-72 rounded-full bg-[var(--primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute left-[-8rem] bottom-0 size-80 rounded-full bg-[#9fd3bd]/20 blur-3xl" />
            <div className="relative mx-auto max-w-7xl rounded-[2.25rem] border border-[var(--border)]/70 bg-white/70 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)] backdrop-blur sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div className="lg:sticky lg:top-24">
                  {websiteSettings.features_badge ? (
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                      {websiteSettings.features_badge}
                    </p>
                  ) : null}
                  {websiteSettings.features_title ? (
                    <h2 className="mt-2 text-xl font-black tracking-tight sm:text-4xl">{websiteSettings.features_title}</h2>
                  ) : null}
                  {websiteSettings.features_description ? (
                    <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">{websiteSettings.features_description}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {websiteSettings.feature_items.map((feat, index) => {
                    const iconMeta = getWebsiteFeatureIconMeta(feat.icon);
                    const Icon = iconMeta.icon;

                    return (
                      <article
                        key={`${feat.title}-${index}`}
                        className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <span className={`mb-5 inline-flex size-12 items-center justify-center rounded-2xl ${iconMeta.colorClass}`}>
                          <Icon className="size-5" />
                        </span>
                        <h3 className="text-base font-black">{feat.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{feat.description}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {hasLearningPaths ? (
          <section id="learning-paths" className={`${learningSectionClass} px-4 py-14 sm:px-6`}>
            <div className="pointer-events-none absolute left-[-5rem] top-12 size-64 rounded-full bg-[var(--secondary)]/14 blur-3xl" />
            <div className="pointer-events-none absolute right-[-7rem] bottom-4 size-80 rounded-full bg-[var(--primary)]/9 blur-3xl" />
            <div className="relative mx-auto max-w-7xl rounded-[2.25rem] border border-white/70 bg-white/76 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
              <div className="mb-8 max-w-3xl">
                {websiteSettings.learning_path_badge ? (
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                    {websiteSettings.learning_path_badge}
                  </p>
                ) : null}
                {websiteSettings.learning_path_title ? (
                  <h2 className="mt-2 text-xl font-black tracking-tight sm:text-4xl">{websiteSettings.learning_path_title}</h2>
                ) : null}
                {websiteSettings.learning_path_description ? (
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{websiteSettings.learning_path_description}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {websiteSettings.learning_path_items.map((item, index) => {
                  const iconMeta = getWebsiteFeatureIconMeta(item.icon);
                  const Icon = iconMeta.icon;

                  return (
                    <article
                      key={`${item.title}-${index}`}
                      className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <span className="absolute right-5 top-5 text-5xl font-black text-[var(--primary)]/10">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={`relative mb-6 inline-flex size-12 items-center justify-center rounded-2xl ${iconMeta.colorClass}`}>
                        <Icon className="size-5" />
                      </span>
                      <div className="relative">
                        <h3 className="text-base font-black">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {hasFaq ? (
          <section id="faq" className={`${faqSectionClass} px-4 py-14 sm:px-6`}>
            <div className="pointer-events-none absolute right-[-6rem] top-10 size-72 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute left-[-7rem] bottom-0 size-80 rounded-full bg-[var(--primary)]/8 blur-3xl" />
            <div className="relative mx-auto grid max-w-7xl gap-8 rounded-[2.25rem] border border-[var(--border)]/60 bg-white/72 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)] backdrop-blur sm:p-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                {websiteSettings.faq_badge ? (
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                    {websiteSettings.faq_badge}
                  </p>
                ) : null}
                {websiteSettings.faq_title ? (
                  <h2 className="mt-2 text-xl font-black tracking-tight sm:text-4xl">{websiteSettings.faq_title}</h2>
                ) : null}
                {websiteSettings.faq_description ? (
                  <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">{websiteSettings.faq_description}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                {faqItems.map((faq, index) => (
                  <details
                    key={faq.id || faq.question}
                    className="group rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition open:shadow-lg"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                      <span>
                        {faq.category?.name || faq.category_name ? (
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                            {faq.category?.name ?? faq.category_name}
                          </span>
                        ) : null}
                        <span className="block text-base font-black leading-6">{faq.question}</span>
                      </span>
                      <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--primary)] transition group-open:rotate-180">
                        <ChevronDown className="size-4" />
                      </span>
                    </summary>
                    <p className="mt-4 border-t border-[var(--border)] pt-4 text-sm leading-7 text-[var(--muted-foreground)]">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {hasCta && !isLoggedIn ? (
          <section className={`${ctaSectionClass} px-4 py-14 sm:px-6`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0)_100%)]" />
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--primary)] shadow-2xl shadow-emerald-900/15">
              <div className="relative grid gap-8 px-6 py-10 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
                <div className="pointer-events-none absolute right-0 top-0 size-72 rounded-full bg-white/10 blur-3xl" />
                <div className="relative">
                  {websiteSettings.bottom_cta_title ? (
                    <h2 className="max-w-2xl text-2xl font-black tracking-tight sm:text-4xl">{websiteSettings.bottom_cta_title}</h2>
                  ) : null}
                  {websiteSettings.bottom_cta_description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{websiteSettings.bottom_cta_description}</p>
                  ) : null}
                  {websiteSettings.bottom_cta_bullets.length > 0 ? (
                    <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-white/75">
                      {websiteSettings.bottom_cta_bullets.map((item) => (
                        <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                          <CheckCircle className="size-3.5 text-white" />
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="relative flex flex-col gap-3 sm:flex-row lg:flex-col">
                  {websiteSettings.bottom_cta_primary_label ? (
                    <Link
                      href={websiteSettings.bottom_cta_primary_url || "/register"}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[var(--primary)] shadow-lg transition hover:-translate-y-0.5 active:scale-95"
                    >
                      {websiteSettings.bottom_cta_primary_label}
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                  {websiteSettings.bottom_cta_secondary_label ? (
                    <Link
                      href={websiteSettings.bottom_cta_secondary_url || "/login"}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/20 active:scale-95"
                    >
                      {websiteSettings.bottom_cta_secondary_label}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter settings={websiteSettings} />
    </div>
  );
}
