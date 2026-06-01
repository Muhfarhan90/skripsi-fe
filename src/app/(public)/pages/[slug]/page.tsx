"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileText, Mail, MessageCircle, type LucideIcon } from "lucide-react";
import { getPublicWebsitePage, getPublicWebsiteSettings, getPublishedCourses } from "@/features/student/api/store-api";
import { PublicSiteHeader } from "@/features/website/components/public-site-header";
import { SiteFooter } from "@/features/website/components/site-footer";
import { WebsiteRichContent } from "@/features/website/components/website-rich-content";
import { createDefaultWebsiteSetting } from "@/features/website/lib/website-settings";

function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";

  if (!digits) {
    return null;
  }

  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

interface HelpContact {
  label: string;
  value: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const fallbackContacts = {
  email: "support@skripsilms.com",
  phone: "+62 812-3456-7890",
};

const fallbackPages = {
  "about-us": {
    title: "Tentang Kami",
    content:
      "SkripsiLMS menyediakan ekosistem belajar online yang menggabungkan course, materi, kuis, diskusi, progress belajar, dan sertifikat dalam satu platform.\n\nKami membantu siswa mempersiapkan diri menuju jenjang pendidikan berikutnya melalui alur belajar yang rapi, instructor yang mendampingi, dan konten pembelajaran yang dapat terus diperbarui melalui CMS.",
  },
  "help-center": {
    title: "Help Center",
    content:
      "Tim bantuan SkripsiLMS siap membantu kendala akun, akses course, pembayaran, forum diskusi, progress belajar, dan penerbitan sertifikat.\n\nSertakan detail kendala, nama akun, email terdaftar, dan course yang sedang diakses agar tim admin dapat menindaklanjuti lebih cepat.",
  },
  terms: {
    title: "Syarat & Ketentuan",
    content:
      "Dengan menggunakan SkripsiLMS, pengguna menyetujui ketentuan penggunaan platform, termasuk menjaga keamanan akun, menggunakan materi pembelajaran secara bertanggung jawab, dan mengikuti aturan pada setiap course.\n\nAkses course, sertifikat, forum diskusi, dan fitur pembelajaran mengikuti kebijakan yang berlaku pada platform.",
  },
  "privacy-policy": {
    title: "Kebijakan Privasi",
    content:
      "SkripsiLMS menggunakan data pengguna untuk mengelola akun, enrollment course, progress belajar, transaksi, notifikasi, dan penerbitan sertifikat.\n\nData kontak dapat digunakan untuk keperluan bantuan, verifikasi, dan komunikasi terkait layanan platform sesuai kebutuhan operasional.",
  },
} satisfies Record<string, { title: string; content: string }>;

export default function PublicCmsPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug ?? "");

  const websiteSettingsQuery = useQuery({
    queryKey: ["public", "website-settings"],
    queryFn: getPublicWebsiteSettings,
    staleTime: 5 * 60_000,
  });
  const courseQuery = useQuery({
    queryKey: ["store", "courses", "nav"],
    queryFn: getPublishedCourses,
    staleTime: 5 * 60_000,
  });
  const pageQuery = useQuery({
    queryKey: ["public", "website-page", slug],
    queryFn: () => getPublicWebsitePage(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });

  const websiteSettings = websiteSettingsQuery.data ?? createDefaultWebsiteSetting();
  const fallbackPage = fallbackPages[slug as keyof typeof fallbackPages];
  const page = pageQuery.data ?? fallbackPage;
  const isHelpCenter = slug === "help-center";
  const contactEmail = websiteSettings.contact_email?.trim() || fallbackContacts.email;
  const contactPhone = websiteSettings.contact_phone?.trim() || fallbackContacts.phone;
  const whatsAppNumber = normalizeWhatsAppNumber(contactPhone);
  const helpContacts = [
    whatsAppNumber
      ? {
          label: "WhatsApp",
          value: contactPhone,
          description: "Bantuan akun, akses course, pembayaran, dan sertifikat.",
          href: `https://wa.me/${whatsAppNumber}`,
          icon: MessageCircle,
        }
      : null,
    contactEmail
      ? {
          label: "Email",
          value: contactEmail,
          description: "Kirim detail kendala agar tim admin bisa menindaklanjuti.",
          href: `mailto:${contactEmail}`,
          icon: Mail,
        }
      : null,
  ].filter((contact): contact is HelpContact => Boolean(contact));

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <PublicSiteHeader settings={websiteSettings} courses={courseQuery.data ?? []} />

      <main className="px-4 py-8 sm:px-6 sm:py-12">
        {pageQuery.isLoading && !fallbackPage ? (
          <div className="mx-auto max-w-7xl space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-12 w-2/3 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--border)]" />
          </div>
        ) : page ? (
          <div className={`mx-auto max-w-7xl ${isHelpCenter ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
            <article className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <div className="bg-[radial-gradient(circle_at_top_left,rgba(15,122,90,0.16),transparent_34%),linear-gradient(135deg,#f7fbf9_0%,#edf5f2_55%,#fff7d6_100%)] px-6 py-10 sm:px-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--primary)]">
                  <FileText className="size-4" />
                  Informasi
                </span>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">{page.title}</h1>
              </div>
              <div className="px-6 py-8 sm:px-10">
                <WebsiteRichContent
                  content={page.content}
                  emptyText="Informasi lengkap tersedia melalui kanal resmi SkripsiLMS."
                />
              </div>
            </article>

            {isHelpCenter ? (
              <aside className="h-fit rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm lg:sticky lg:top-24">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--primary)]">Kontak Bantuan</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight">Butuh bantuan langsung?</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  Gunakan kontak resmi platform untuk kendala akun, course, pembayaran, atau sertifikat.
                </p>
                <div className="mt-6 space-y-3">
                  {helpContacts.length > 0 ? (
                    helpContacts.map((contact) => {
                      const Icon = contact.icon;

                      return (
                        <a
                          key={contact.label}
                          href={contact.href}
                          target={contact.href.startsWith("http") ? "_blank" : undefined}
                          rel={contact.href.startsWith("http") ? "noreferrer" : undefined}
                          className="group flex items-start gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:bg-white hover:shadow-md"
                        >
                          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                            <Icon className="size-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3 text-sm font-black text-[var(--foreground)]">
                              {contact.label}
                              <ArrowUpRight className="size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                            <span className="mt-1 block break-words text-sm font-semibold text-[var(--primary)]">{contact.value}</span>
                            <span className="mt-2 block text-xs leading-5 text-[var(--muted-foreground)]">{contact.description}</span>
                          </span>
                        </a>
                      );
                    })
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
                      Tim SkripsiLMS dapat dihubungi melalui kanal resmi platform.
                    </div>
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        ) : (
          <div className="mx-auto max-w-7xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold">Halaman tidak ditemukan</h1>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Halaman ini belum aktif atau slug tidak tersedia.
            </p>
          </div>
        )}
      </main>

      <SiteFooter settings={websiteSettings} />
    </div>
  );
}
