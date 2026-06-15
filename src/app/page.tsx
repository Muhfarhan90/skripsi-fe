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
  TrendingUp,
  Award,
  Monitor,
  MessageSquareText,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { getDefaultPathByRole, isStudentRole } from "@/features/auth/lib/roles";
import { getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";
import { buildStudentCheckoutLoginRedirect, buildStudentCheckoutPath } from "@/features/student/lib/checkout";
import { HeroMediaSlider, type HeroMediaSlide } from "@/features/website/components/hero-media-slider";
import { CourseCatalogCard } from "@/features/website/components/course-catalog-card";
import { SiteFooter } from "@/features/website/components/site-footer";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { resolvePublicFileUrl } from "@/lib/file-url";
import { createDefaultWebsiteSetting, getWebsiteFeatureIconMeta } from "@/features/website/lib/website-settings";

const STATIC_FEATURES = [
  {
    title: "Kurikulum Transisi Terarah",
    description: "Materi belajar dirancang khusus oleh akademisi untuk menjembatani materi sekolah menengah dengan standar kompetensi perkuliahan.",
    icon: BookOpen,
    colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    title: "Belajar Mandiri & Fleksibel",
    description: "Akses modul pembelajaran kapan saja dan di mana saja. Atur ritme belajar Anda sendiri secara mandiri tanpa batasan waktu.",
    icon: Monitor,
    colorClass: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
  },
  {
    title: "Evaluasi Kuis & Umpan Balik",
    description: "Uji pemahaman Anda melalui kuis interaktif di setiap akhir bab pelajaran dan dapatkan umpan balik instan atas performa Anda.",
    icon: MessageSquareText,
    colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
  {
    title: "Sertifikat Kelulusan Kelas",
    description: "Raih sertifikat kelulusan setelah menyelesaikan materi dan kuis sebagai portofolio kesiapan akademik Anda.",
    icon: Award,
    colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
];

const STATIC_STEPS = [
  {
    title: "Pilih Kelas",
    description: "Pilih kelas persiapan yang relevan dengan minat atau rumpun jurusan perguruan tinggi impian Anda.",
    icon: Search,
  },
  {
    title: "Pelajari Modul",
    description: "Pelajari materi video dan bacaan modul secara bertahap dengan pelacak kemajuan (progress tracker) otomatis.",
    icon: PlayCircle,
  },
  {
    title: "Selesaikan Kuis",
    description: "Kerjakan kuis evaluasi di setiap modul untuk menguji pemahaman konsep materi yang telah dipelajari.",
    icon: CheckCircle,
  },
  {
    title: "Dapatkan Sertifikat",
    description: "Raih sertifikat kelulusan resmi sebagai bukti valid atas kesiapan Anda dalam menempuh pendidikan tinggi.",
    icon: Award,
  },
];

const STATIC_FAQS = [
  {
    question: "Siapa saja yang dapat bergabung dan belajar di platform ini?",
    answer: "Program ini terbuka untuk seluruh siswa SMA/SMK/MA sederajat, gap year, maupun masyarakat umum yang ingin memantapkan fondasi akademik mereka sebelum memulai perkuliahan.",
  },
  {
    question: "Apakah kelas di platform ini berbayar?",
    answer: "Semua kelas persiapan pre-university dapat diakses secara gratis. Anda hanya perlu mendaftarkan akun untuk mulai mengakses seluruh modul dan kuis.",
  },
  {
    question: "Bagaimana sistem pembelajaran kelas berjalan?",
    answer: "Pembelajaran dilakukan secara mandiri (self-paced online learning). Anda bebas menentukan kapan ingin membaca modul, menonton video penjelasan, dan mengerjakan kuis.",
  },
  {
    question: "Bagaimana cara mendapatkan sertifikat kelulusan?",
    answer: "Sertifikat akan otomatis diterbitkan di dashboard Anda setelah Anda menyelesaikan seluruh materi modul kelas dan lulus nilai batas minimum kuis evaluasi.",
  },
];

function buildHeroSlides(
  websiteSettings: ReturnType<typeof createDefaultWebsiteSetting>,
  previewCourses: Awaited<ReturnType<typeof getPublishedCourses>>,
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
    imageUrl: resolvePublicFileUrl(websiteSettings.hero_image_url),
    eyebrow: websiteSettings.hero_badge || "Platform Persiapan Kuliah Pre-University",
    title: websiteSettings.hero_title
      ? `${websiteSettings.hero_title} ${websiteSettings.hero_highlight}`.trim()
      : "Persiapan Akademik Pre-University Terbaik",
    description: websiteSettings.hero_description || "Platform belajar pre-university terlengkap untuk membekali Anda dengan kompetensi dasar perkuliahan. Jembatani kesenjangan materi sekolah menengah dengan standar perguruan tinggi, ikuti modul interaktif, dan raih sertifikat kesiapan kuliah.",
    href: catalogHref,
    hrefLabel: websiteSettings.hero_primary_cta_label || "Buka katalog",
  });

  previewCourses.forEach((course) => {
    registerSlide({
      id: `course-${course.id}`,
      imageUrl: resolvePublicFileUrl(course.thumbnail),
      eyebrow: course.category_name || "Preview Course",
      title: course.title,
      description: course.instructor_name || course.description || "Course pilihan untuk mulai belajar.",
      href: `/courses/${course.slug}`,
      hrefLabel: "Detail course",
    });
  });

  return Array.from(slides.values()).slice(0, 6);
}

function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] animate-pulse">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="h-8 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="hidden gap-6 sm:flex">
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-9 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <main className="px-4 py-14 sm:px-6 lg:py-20 animate-pulse">
        <div className="mx-auto grid max-w-7xl items-center gap-10 xl:grid-cols-2">
          <div className="space-y-6">
            <div className="h-6 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-3">
              <div className="h-12 w-full rounded bg-slate-200 dark:bg-slate-800 sm:h-16" />
              <div className="h-12 w-3/4 rounded bg-slate-200 dark:bg-slate-800 sm:h-16" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="flex gap-4">
              <div className="h-12 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
          <div className="h-64 w-full rounded-3xl bg-slate-200 dark:bg-slate-800 sm:h-96" />
        </div>

        {/* Featured Courses Section Skeleton */}
        <section className="mx-auto max-w-7xl mt-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="aspect-video w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-full rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
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

  if (websiteSettingsQuery.isLoading || courseQuery.isLoading) {
    return <LandingPageSkeleton />;
  }

  const courses = courseQuery.data ?? [];
  const previewCourses = courses.slice(0, 4);
  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();

  const heroSlides = buildHeroSlides(websiteSettings, previewCourses, catalogHref);
  const featuredSectionClass = "relative overflow-hidden bg-white dark:bg-[var(--card)]";
  const featuresSectionClass = "relative overflow-hidden bg-[var(--surface-soft)]";
  const learningSectionClass = "relative overflow-hidden border-y border-[var(--border)]/60 bg-white dark:bg-[var(--card)]";
  const faqSectionClass = "relative overflow-hidden bg-[var(--surface-soft)]";
  const ctaSectionClass = "relative overflow-hidden bg-white dark:bg-[var(--card)]";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader
        settings={websiteSettings}
        courses={courses}
        showFeatures={true}
        showFaq={true}
      />

      <main>
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[var(--primary)]/10 via-[var(--primary)]/3 to-[var(--background)] dark:from-[var(--primary)]/20 dark:via-[var(--primary)]/3 dark:to-[var(--background)] px-4 py-14 sm:px-6 lg:py-20">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -left-40 size-[32rem] rounded-full bg-[var(--primary)]/15 blur-3xl dark:bg-[var(--primary)]/20" />
            <div className="absolute -right-40 top-10 size-[36rem] rounded-full bg-[var(--primary)]/10 blur-3xl dark:bg-[var(--primary)]/15" />
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)] xl:gap-14">
            <div className="relative z-10 min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-white/70 px-4 py-2 text-xs font-bold text-[var(--primary)] shadow-sm">
                <TrendingUp className="size-4" />
                {websiteSettings.hero_badge || "Platform Persiapan Kuliah Pre-University"}
              </span>

              <div className="mt-6">
                <h1 className="max-w-2xl text-3xl font-black leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl xl:text-6xl">
                  {websiteSettings.hero_title ? (
                    <>
                      {websiteSettings.hero_title}{" "}
                      {websiteSettings.hero_highlight && (
                        <span className="block text-[var(--primary)]">{websiteSettings.hero_highlight}</span>
                      )}
                    </>
                  ) : (
                    <>
                      Persiapan Akademik Pre-University Terbaik &{" "}
                      <span className="block text-[var(--primary)]">Sukses Transisi ke Kampus Impian</span>
                    </>
                  )}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
                  {websiteSettings.hero_description || "Platform belajar pre-university terlengkap untuk membekali Anda dengan kompetensi dasar perkuliahan. Jembatani kesenjangan materi sekolah menengah dengan standar perguruan tinggi, ikuti modul interaktif, dan raih sertifikat kesiapan kuliah."}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {isLoggedIn ? (
                  <>
                    <Link
                      href={catalogHref}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                    >
                      <BookOpen className="size-4" />
                      {websiteSettings.hero_primary_cta_label || "Jelajahi Course"}
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
                    <Link
                      href={websiteSettings.hero_primary_cta_url || "/register"}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
                    >
                      {websiteSettings.hero_primary_cta_label || "Mulai Belajar Sekarang"}
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      href={websiteSettings.hero_secondary_cta_url || "/login"}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-6 text-sm font-extrabold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white active:scale-95"
                    >
                      <PlayCircle className="size-4" />
                      {websiteSettings.hero_secondary_cta_label || "Masuk Ke Platform"}
                    </Link>
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
                  <span className="block text-sm font-extrabold text-[var(--foreground)]">Cari Kelas Persiapan Kuliah</span>
                  <span className="block truncate text-xs text-[var(--muted-foreground)]">Temukan materi pelajaran yang sesuai dengan program studi impian Anda</span>
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
            <div className="relative mx-auto max-w-7xl">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                    Katalog Kelas
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                    Materi Belajar Kesiapan Kuliah
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                    Pilihlah kelas persiapan yang sesuai dengan minat dan rumpun jurusan perguruan tinggi impian Anda.
                  </p>
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
                  const canCheckout = isStudentRole(user?.role_name, user?.role_id);
                  return (
                    <CourseCatalogCard
                      key={course.id}
                      actionHref={canCheckout ? buildStudentCheckoutPath(course.slug) : !isLoggedIn ? buildStudentCheckoutLoginRedirect(course.slug) : undefined}
                      actionLabel={canCheckout ? "Checkout" : !isLoggedIn ? "Masuk" : undefined}
                      course={course}
                      detailHref={`/courses/${course.slug}`}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section id="features" className={`${featuresSectionClass} px-4 py-14 sm:px-6`}>
          <div className="relative mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="lg:sticky lg:top-24">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                  {websiteSettings.features_badge || "Keunggulan Platform"}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {websiteSettings.features_title || "Metode Pembelajaran Terintegrasi"}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
                  {websiteSettings.features_description || "Kami menyediakan ekosistem belajar yang lengkap untuk memastikan kesiapan akademik Anda memasuki gerbang perguruan tinggi."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(websiteSettings.feature_items?.length > 0
                  ? websiteSettings.feature_items
                  : STATIC_FEATURES
                ).map((feat, index) => {
                  const Icon = 'icon' in feat && typeof feat.icon === 'string'
                    ? (getWebsiteFeatureIconMeta(feat.icon as any)?.icon || BookOpen)
                    : (feat.icon as any || BookOpen);
                  const colorClass = 'colorClass' in feat
                    ? (feat as any).colorClass
                    : ('icon' in feat && typeof feat.icon === 'string'
                        ? getWebsiteFeatureIconMeta(feat.icon as any)?.colorClass
                        : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400");

                  return (
                    <article
                      key={`${feat.title}-${index}`}
                      className="rounded-3xl bg-[var(--card)] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-border/30 transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <span className={`mb-5 inline-flex size-12 items-center justify-center rounded-2xl ${colorClass}`}>
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

        <section id="learning-paths" className={`${learningSectionClass} px-4 py-14 sm:px-6`}>
          <div className="relative mx-auto max-w-7xl">
            <div className="mb-12 text-center max-w-3xl mx-auto">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                {websiteSettings.learning_path_badge || "Alur Pembelajaran"}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                {websiteSettings.learning_path_title || "Bagaimana Cara Mulai Belajar?"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                {websiteSettings.learning_path_description || "Ikuti langkah terarah berikut untuk memaksimalkan persiapan akademik Anda menuju bangku kuliah."}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
              <div className="hidden lg:block absolute top-1/2 left-4 right-4 h-0.5 bg-gradient-to-r from-[var(--primary)]/20 via-[var(--primary)]/40 to-[var(--primary)]/20 -translate-y-1/2 z-0" />
              
              {(websiteSettings.learning_path_items?.length > 0
                ? websiteSettings.learning_path_items
                : STATIC_STEPS
              ).map((item, index) => {
                const Icon = 'icon' in item && typeof item.icon === 'string'
                  ? (getWebsiteFeatureIconMeta(item.icon as any)?.icon || BookOpen)
                  : (item.icon as any || BookOpen);

                return (
                  <article
                    key={`${item.title}-${index}`}
                    className="relative z-10 overflow-hidden rounded-3xl bg-[var(--card)] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-border/30 transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className="absolute right-5 top-5 text-5xl font-black text-[var(--primary)]/10">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="relative mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Icon className="size-5" />
                    </span>
                    <div className="relative">
                      <h3 className="text-base font-black">Langkah {index + 1}: {item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className={`${faqSectionClass} px-4 py-14 sm:px-6`}>
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">
                {websiteSettings.faq_badge || "Tanya Jawab"}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                {websiteSettings.faq_title || "Pertanyaan Umum"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
                {websiteSettings.faq_description || "Temukan jawaban atas beberapa pertanyaan umum yang sering diajukan mengenai platform persiapan kuliah pre-university."}
              </p>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {(websiteSettings.faqs && websiteSettings.faqs.length > 0
                ? websiteSettings.faqs
                : STATIC_FAQS
              ).map((faq, index) => (
                <details
                  key={faq.question}
                  className="group py-5 transition first:pt-0 last:pb-0"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <span>
                      <span className="block text-base font-bold leading-6 text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{faq.question}</span>
                    </span>
                    <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--primary)] transition group-open:rotate-180">
                      <ChevronDown className="size-4" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)] pr-12">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {!isLoggedIn ? (
          <section className="relative overflow-hidden bg-white dark:bg-[var(--card)] px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--primary)] shadow-2xl shadow-emerald-900/15">
              <div className="relative grid gap-8 px-6 py-10 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
                <div className="relative">
                  <h2 className="max-w-2xl text-2xl font-black tracking-tight sm:text-4xl">
                    {websiteSettings.bottom_cta_title || "Siap Melangkah Lebih Dekat ke Perguruan Tinggi?"}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
                    {websiteSettings.bottom_cta_description || "Jangan tunda persiapan akademik Anda. Gabung sekarang secara gratis bersama ribuan pelajar lainnya dan raih kampus impian Anda."}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-white/75">
                    {(websiteSettings.bottom_cta_bullets?.length > 0
                      ? websiteSettings.bottom_cta_bullets
                      : ["Akses Gratis Selamanya", "Sertifikat Kelulusan Resmi", "Materi Terstandar Pre-University"]
                    ).map((bullet, index) => (
                      <span key={index} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                        <CheckCircle className="size-3.5 text-white" />
                        {bullet}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="relative flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                    href={websiteSettings.bottom_cta_primary_url || "/register"}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[var(--primary)] shadow-lg transition hover:-translate-y-0.5 active:scale-95"
                  >
                    {websiteSettings.bottom_cta_primary_label || "Mulai Belajar Sekarang"}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href={websiteSettings.bottom_cta_secondary_url || "/login"}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-sm font-black text-white transition hover:bg-white/20 active:scale-95"
                  >
                    {websiteSettings.bottom_cta_secondary_label || "Masuk ke Platform"}
                  </Link>
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
