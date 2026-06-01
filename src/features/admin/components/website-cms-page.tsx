"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Globe2, HelpCircle, Layers3, Link2, Loader2, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminFaqCategory,
  createAdminFaq,
  createAdminWebsitePage,
  createAdminWebsiteSocialLink,
  deleteAdminFaqCategory,
  deleteAdminFaq,
  deleteAdminWebsitePage,
  deleteAdminWebsiteSocialLink,
  getAdminWebsiteSettings,
  listAdminFaqCategories,
  listAdminFaqs,
  listAdminWebsitePages,
  listAdminWebsiteSections,
  listAdminWebsiteSocialLinks,
  updateAdminFaqCategory,
  updateAdminFaq,
  updateAdminWebsitePage,
  updateAdminWebsiteSection,
  updateAdminWebsiteSettings,
  updateAdminWebsiteSocialLink,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { TinyMceEditor } from "@/features/admin/components/tiny-mce-editor";
import {
  WEBSITE_PAGE_EDITOR_HELPER_TEXT,
  WEBSITE_PAGE_EDITOR_PLACEHOLDER,
  WebsiteRichContent,
} from "@/features/website/components/website-rich-content";
import {
  createDefaultWebsiteSettingInput,
  getWebsiteFeatureIconMeta,
  getWebsiteSocialIconMeta,
  resolveWebsiteSocialIcon,
  WEBSITE_FEATURE_ICON_OPTIONS,
  type WebsiteSocialIcon,
  WEBSITE_SOCIAL_ICON_OPTIONS,
} from "@/features/website/lib/website-settings";
import { ApiError } from "@/lib/api/client";
import type {
  WebsiteFaq,
  WebsiteFaqCategory,
  WebsiteFaqCategoryPayload,
  WebsiteFaqPayload,
  WebsiteFeatureIcon,
  WebsitePage,
  WebsitePagePayload,
  WebsiteSection,
  WebsiteSectionPayload,
  WebsiteSettingPayload,
  WebsiteSocialLink,
  WebsiteSocialLinkPayload,
} from "@/types/website";

type CmsTab = "general" | "landing" | "pages" | "faq" | "social";
type EditableSocialLink = WebsiteSocialLink;
type EditablePage = WebsitePage;
type EditableFaqCategory = WebsiteFaqCategory;
type EditableFaq = WebsiteFaq;
type EditableSection = WebsiteSection;

const CMS_TABS: Array<{ id: CmsTab; label: string; icon: typeof Globe2 }> = [
  { id: "general", label: "General", icon: Globe2 },
  { id: "landing", label: "Landing Page", icon: Layers3 },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "social", label: "Social Links", icon: Link2 },
];

let temporaryId = -1;

function nextTemporaryId(): number {
  temporaryId -= 1;
  return temporaryId;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const firstError = error.errors ? Object.values(error.errors)[0]?.[0] : null;
    return firstError ? String(firstError) : error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function nullableText(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function toPositiveInteger(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.trunc(value);
}

function buildSettingsPayload(form: WebsiteSettingPayload): WebsiteSettingPayload {
  const siteName = normalizeText(form.site_name);
  const footerText = normalizeText(form.footer_text);

  if (!siteName) {
    throw new Error("Nama website wajib diisi");
  }

  if (!footerText) {
    throw new Error("Teks footer wajib diisi");
  }

  return {
    site_name: siteName,
    site_tagline: nullableText(form.site_tagline),
    logo_url: nullableText(form.logo_url),
    footer_text: footerText,
    contact_email: nullableText(form.contact_email),
    contact_phone: nullableText(form.contact_phone),
    address: nullableText(form.address),
  };
}

function buildSocialPayload(row: EditableSocialLink): WebsiteSocialLinkPayload {
  const label = normalizeText(row.label);
  const url = normalizeText(row.url);

  if (!label || !url) {
    throw new Error("Social link harus punya label dan URL");
  }

  return {
    label,
    url,
    icon: nullableText(row.icon),
    is_active: row.is_active,
  };
}

function buildPagePayload(row: EditablePage): WebsitePagePayload {
  const slug = normalizeText(row.slug);
  const title = normalizeText(row.title);

  if (!slug || !title) {
    throw new Error("Page harus punya slug dan title");
  }

  return {
    slug,
    title,
    content: nullableText(row.content),
    is_active: row.is_active,
  };
}

function buildFaqCategoryPayload(row: EditableFaqCategory): WebsiteFaqCategoryPayload {
  const name = normalizeText(row.name);

  if (!name) {
    throw new Error("Kategori FAQ harus punya nama");
  }

  return {
    name,
    is_active: row.is_active,
  };
}

function buildFaqPayload(row: EditableFaq): WebsiteFaqPayload {
  const question = normalizeText(row.question);
  const answer = normalizeText(row.answer);

  if (!question || !answer) {
    throw new Error("FAQ harus punya pertanyaan dan jawaban");
  }

  return {
    question,
    answer,
    faq_category_id: row.faq_category_id,
    sort_order: toPositiveInteger(row.sort_order, 1),
    is_active: row.is_active,
  };
}

function buildSectionPayload(section: EditableSection): WebsiteSectionPayload {
  return {
    section_key: normalizeText(section.section_key),
    eyebrow: nullableText(section.eyebrow),
    title: nullableText(section.title),
    subtitle: nullableText(section.subtitle),
    body: nullableText(section.body),
    image_url: nullableText(section.image_url),
    cta_label: nullableText(section.cta_label),
    cta_url: nullableText(section.cta_url),
    secondary_cta_label: nullableText(section.secondary_cta_label),
    secondary_cta_url: nullableText(section.secondary_cta_url),
    is_active: section.is_active,
    items: section.items
      .map((item) => ({
        title: nullableText(item.title),
        description: nullableText(item.description),
        icon: nullableText(item.icon),
      }))
      .filter((item) => item.title || item.description),
  };
}

function emptySocialLink(): EditableSocialLink {
  return {
    id: nextTemporaryId(),
    label: "",
    url: "",
    icon: null,
    is_active: true,
  };
}

function emptyPage(): EditablePage {
  return {
    id: nextTemporaryId(),
    slug: "",
    title: "",
    content: "",
    is_active: true,
  };
}

function emptyFaqCategory(): EditableFaqCategory {
  return {
    id: nextTemporaryId(),
    name: "",
    is_active: true,
  };
}

function emptyFaq(): EditableFaq {
  return {
    id: nextTemporaryId(),
    question: "",
    answer: "",
    faq_category_id: null,
    category_name: null,
    category: null,
    sort_order: 1,
    is_active: true,
  };
}

function emptySectionItem(sectionId: number): WebsiteSection["items"][number] {
  return {
    id: nextTemporaryId(),
    section_id: sectionId,
    title: "",
    description: "",
    icon: "book-open",
  };
}

function getLandingSectionLabel(section: EditableSection): string {
  switch (section.section_key) {
    case "hero":
      return "Hero";
    case "featured_courses":
      return "Featured Courses";
    case "features":
      return "Platform Features";
    case "learning_paths":
      return "Learning Paths";
    case "faq":
      return "FAQ Header";
    case "cta":
      return "Bottom CTA";
    default:
      return section.section_key;
  }
}

function getLandingSectionDescription(section: EditableSection): string {
  switch (section.section_key) {
    case "hero":
      return "Section pertama di landing page: badge, headline utama, deskripsi, dan CTA utama.";
    case "featured_courses":
      return "Header untuk daftar course unggulan. Daftar course tetap mengikuti data course yang published.";
    case "features":
      return "Section kartu keunggulan platform. Cocok untuk value proposition dan benefit utama.";
    case "learning_paths":
      return "Section alur belajar atau tahapan yang menjelaskan journey pengguna di platform.";
    case "faq":
      return "Header pembuka untuk blok FAQ publik. Item FAQ-nya dikelola terpisah di tab FAQ.";
    case "cta":
      return "Ajakan aksi di bagian bawah landing page untuk mendorong register atau login.";
    default:
      return section.section_key;
  }
}

// Always resolve the FAQ category label from category data.
// The numeric id is only for persistence, never for UI display.
function getFaqCategoryDisplayName(
  faq: Pick<EditableFaq, "faq_category_id" | "category" | "category_name">,
  categories: EditableFaqCategory[],
): string {
  if (faq.category?.name) {
    return faq.category.name;
  }

  if (faq.category_name) {
    return faq.category_name;
  }

  return categories.find((category) => category.id === faq.faq_category_id)?.name ?? "";
}

// Use section-aware placeholders so admin users understand the expected content of each landing block.
function getSectionFieldPlaceholder(
  section: EditableSection,
  field: "eyebrow" | "title" | "subtitle" | "body" | "image_url" | "cta_label" | "cta_url" | "secondary_cta_label" | "secondary_cta_url",
): string {
  const sectionKey = section.section_key;

  if (field === "eyebrow") {
    switch (sectionKey) {
      case "hero":
        return "Contoh: Platform Belajar Pre-University";
      case "featured_courses":
        return "Contoh: Course Pilihan";
      case "features":
        return "Contoh: Kenapa Belajar di Sini?";
      case "learning_paths":
        return "Contoh: Alur Belajar";
      case "faq":
        return "Contoh: FAQ";
      default:
        return "Badge atau label pendek section";
    }
  }

  if (field === "title") {
    switch (sectionKey) {
      case "hero":
        return "Contoh: Belajar lebih cepat,";
      case "featured_courses":
        return "Contoh: Mulai dari sini";
      case "features":
        return "Contoh: Semua yang kamu butuhkan, dalam satu platform";
      case "learning_paths":
        return "Contoh: Mulai dari jalur yang paling sesuai dengan targetmu";
      case "faq":
        return "Contoh: Pertanyaan yang sering ditanyakan";
      case "cta":
        return "Contoh: Siap mulai perjalanan belajarmu?";
      default:
        return "Judul utama section";
    }
  }

  if (field === "subtitle") {
    if (sectionKey === "hero") {
      return "Contoh: lebih terstruktur.";
    }

    return "Subjudul tambahan jika diperlukan";
  }

  if (field === "body") {
    switch (sectionKey) {
      case "hero":
        return "Jelaskan manfaat utama platform dalam 1-2 kalimat.";
      case "featured_courses":
        return "Deskripsi singkat sebelum user melihat daftar course unggulan.";
      case "features":
        return "Ringkas benefit utama platform yang akan diperkuat oleh cards di bawahnya.";
      case "learning_paths":
        return "Jelaskan alur belajar dari awal sampai selesai.";
      case "faq":
        return "Deskripsi singkat untuk mengarahkan user sebelum membaca FAQ.";
      case "cta":
        return "Dorong user untuk mengambil aksi setelah melihat isi landing page.";
      default:
        return "Deskripsi section";
    }
  }

  if (field === "image_url") {
    if (sectionKey === "hero") {
      return "https://... gambar hero landing page";
    }

    return "Opsional: URL gambar section";
  }

  if (field === "cta_label") {
    switch (sectionKey) {
      case "hero":
        return "Contoh: Mulai Belajar Gratis";
      case "featured_courses":
        return "Contoh: Lihat semua";
      case "cta":
        return "Contoh: Daftar Gratis Sekarang";
      default:
        return "Label tombol utama";
    }
  }

  if (field === "cta_url") {
    switch (sectionKey) {
      case "hero":
      case "cta":
        return "Contoh: /register";
      case "featured_courses":
        return "Contoh: /courses";
      default:
        return "Contoh: /courses atau https://...";
    }
  }

  if (field === "secondary_cta_label") {
    switch (sectionKey) {
      case "hero":
        return "Contoh: Lihat Course";
      case "cta":
        return "Contoh: Sudah punya akun? Masuk";
      default:
        return "Label tombol kedua";
    }
  }

  if (field === "secondary_cta_url") {
    switch (sectionKey) {
      case "hero":
        return "Contoh: /courses";
      case "cta":
        return "Contoh: /login";
      default:
        return "Contoh: /login atau https://...";
    }
  }

  return "";
}

function getSectionItemPlaceholder(section: EditableSection, field: "title" | "description"): string {
  const sectionKey = section.section_key;

  if (field === "title") {
    switch (sectionKey) {
      case "features":
        return "Contoh: Materi Terstruktur";
      case "learning_paths":
        return "Contoh: Pilih Course";
      case "cta":
        return "Contoh: Gratis untuk pelajar";
      default:
        return "Judul item";
    }
  }

  if (field === "description") {
    switch (sectionKey) {
      case "features":
        return "Jelaskan benefit item ini dalam 1-2 kalimat.";
      case "learning_paths":
        return "Jelaskan langkah atau fase belajar ini.";
      case "cta":
        return "Opsional untuk bullet CTA.";
      default:
        return "Deskripsi item";
    }
  }

  return "";
}

function tabButtonClass(isActive: boolean): string {
  return [
    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
    isActive
      ? "bg-[var(--primary)] text-white shadow-sm"
      : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
  ].join(" ");
}

export function WebsiteCmsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CmsTab>("general");
  const [settingsDraft, setSettingsDraft] = useState<WebsiteSettingPayload | null>(null);
  const [sectionsDraft, setSectionsDraft] = useState<EditableSection[] | null>(null);
  const [pagesDraft, setPagesDraft] = useState<EditablePage[] | null>(null);
  const [faqCategoriesDraft, setFaqCategoriesDraft] = useState<EditableFaqCategory[] | null>(null);
  const [faqsDraft, setFaqsDraft] = useState<EditableFaq[] | null>(null);
  const [socialDraft, setSocialDraft] = useState<EditableSocialLink[] | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["admin", "website-settings"],
    queryFn: getAdminWebsiteSettings,
  });

  const sectionsQuery = useQuery({
    queryKey: ["admin", "website-sections"],
    queryFn: () => listAdminWebsiteSections(),
  });

  const pagesQuery = useQuery({
    queryKey: ["admin", "website-pages"],
    queryFn: listAdminWebsitePages,
  });

  const faqsQuery = useQuery({
    queryKey: ["admin", "faqs"],
    queryFn: listAdminFaqs,
  });

  const faqCategoriesQuery = useQuery({
    queryKey: ["admin", "faq-categories"],
    queryFn: listAdminFaqCategories,
  });

  const socialQuery = useQuery({
    queryKey: ["admin", "website-social-links"],
    queryFn: listAdminWebsiteSocialLinks,
  });

  const settingsForm = useMemo<WebsiteSettingPayload>(
    () =>
      settingsDraft ??
      (settingsQuery.data
        ? {
            site_name: settingsQuery.data.site_name,
            site_tagline: settingsQuery.data.site_tagline,
            logo_url: settingsQuery.data.logo_url,
            footer_text: settingsQuery.data.footer_text,
            contact_email: settingsQuery.data.contact_email,
            contact_phone: settingsQuery.data.contact_phone,
            address: settingsQuery.data.address,
          }
        : createDefaultWebsiteSettingInput()),
    [settingsDraft, settingsQuery.data],
  );

  const sections = sectionsDraft ?? (sectionsQuery.data ? sectionsQuery.data.map((section) => ({ ...section, items: section.items.map((item) => ({ ...item })) })) : []);
  const pages = pagesDraft ?? (pagesQuery.data ? pagesQuery.data.map((page) => ({ ...page })) : []);
  const faqCategories = faqCategoriesDraft ?? (faqCategoriesQuery.data ? faqCategoriesQuery.data.map((category) => ({ ...category })) : []);
  const faqs = faqsDraft ?? (faqsQuery.data ? faqsQuery.data.map((faq) => ({ ...faq })) : []);
  const socialLinks = socialDraft ?? (socialQuery.data ? socialQuery.data.map((link) => ({ ...link })) : []);

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: WebsiteSettingPayload) => updateAdminWebsiteSettings(payload),
    onSuccess: (setting) => {
      queryClient.setQueryData(["admin", "website-settings"], setting);
      queryClient.invalidateQueries({ queryKey: ["public", "website-settings"] });
      setSettingsDraft(null);
      toast.success("General website settings berhasil disimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menyimpan general settings")),
  });

  const saveSectionsMutation = useMutation({
    mutationFn: async (rows: EditableSection[]) => {
      await Promise.all(rows.filter((row) => row.id > 0).map((row) => updateAdminWebsiteSection(row.id, buildSectionPayload(row))));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "website-sections"] });
      queryClient.invalidateQueries({ queryKey: ["public", "website-settings"] });
      setSectionsDraft(null);
      toast.success("Section CMS berhasil disimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menyimpan section CMS")),
  });

  const savePagesMutation = useMutation({
    mutationFn: async (rows: EditablePage[]) => {
      await Promise.all(
        rows.map((row) => (row.id > 0 ? updateAdminWebsitePage(row.id, buildPagePayload(row)) : createAdminWebsitePage(buildPagePayload(row)))),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "website-pages"] });
      setPagesDraft(null);
      toast.success("Pages CMS berhasil disimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menyimpan pages")),
  });

  const saveFaqCategoriesMutation = useMutation({
    mutationFn: async (rows: EditableFaqCategory[]) => {
      await Promise.all(
        rows.map((row) =>
          row.id > 0
            ? updateAdminFaqCategory(row.id, buildFaqCategoryPayload(row))
            : createAdminFaqCategory(buildFaqCategoryPayload(row)),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "faq-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
      queryClient.invalidateQueries({ queryKey: ["public", "website-settings"] });
      setFaqCategoriesDraft(null);
      toast.success("Kategori FAQ berhasil disimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menyimpan kategori FAQ")),
  });

  const saveFaqsMutation = useMutation({
    mutationFn: async (rows: EditableFaq[]) => {
      await Promise.all(
        rows.map((row) => (row.id > 0 ? updateAdminFaq(row.id, buildFaqPayload(row)) : createAdminFaq(buildFaqPayload(row)))),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
      queryClient.invalidateQueries({ queryKey: ["public", "website-settings"] });
      setFaqsDraft(null);
      toast.success("FAQ berhasil disimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menyimpan FAQ")),
  });

  const saveSocialMutation = useMutation({
    mutationFn: async (rows: EditableSocialLink[]) => {
      await Promise.all(
        rows.map((row) =>
          row.id > 0
            ? updateAdminWebsiteSocialLink(row.id, buildSocialPayload(row))
            : createAdminWebsiteSocialLink(buildSocialPayload(row)),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "website-social-links"] });
      queryClient.invalidateQueries({ queryKey: ["public", "website-settings"] });
      setSocialDraft(null);
      toast.success("Social links berhasil disimpan");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menyimpan social links")),
  });

  const deleteSocialMutation = useMutation({
    mutationFn: deleteAdminWebsiteSocialLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "website-social-links"] }),
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menghapus social link")),
  });

  const deletePageMutation = useMutation({
    mutationFn: deleteAdminWebsitePage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "website-pages"] }),
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menghapus page")),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: deleteAdminFaq,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] }),
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menghapus FAQ")),
  });

  const deleteFaqCategoryMutation = useMutation({
    mutationFn: deleteAdminFaqCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "faq-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Gagal menghapus kategori FAQ")),
  });

  const isLoading =
    settingsQuery.isLoading ||
    sectionsQuery.isLoading ||
    pagesQuery.isLoading ||
    faqCategoriesQuery.isLoading ||
    faqsQuery.isLoading ||
    socialQuery.isLoading;

  const updateSettingField = (field: keyof WebsiteSettingPayload, value: string) => {
    setSettingsDraft((prev) => ({ ...(prev ?? settingsForm), [field]: value }));
  };

  const updateSection = (sectionIndex: number, updater: (section: EditableSection) => EditableSection) => {
    setSectionsDraft((prev) => {
      const next = (prev ?? sections).map((section) => ({ ...section, items: section.items.map((item) => ({ ...item })) }));
      next[sectionIndex] = updater(next[sectionIndex]);
      return next;
    });
  };

  const updateSectionItem = (
    sectionIndex: number,
    itemIndex: number,
    updater: (item: EditableSection["items"][number]) => EditableSection["items"][number],
  ) => {
    updateSection(sectionIndex, (section) => {
      const nextItems = section.items.map((item) => ({ ...item }));
      nextItems[itemIndex] = updater(nextItems[itemIndex]);
      return { ...section, items: nextItems };
    });
  };

  const updateListRow = <T extends { id: number }>(
    rows: T[],
    setRows: (rows: T[]) => void,
    rowId: number,
    updater: (row: T) => T,
  ) => {
    setRows(rows.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Website CMS"
        description="Kelola identitas website, landing page, halaman CMS, FAQ, dan social links dari panel admin."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {CMS_TABS.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                className={tabButtonClass(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="size-4 animate-spin" />
          Memuat data CMS website...
        </div>
      ) : null}

      {activeTab === "general" ? (
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="border-b border-[var(--border)] pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">General</CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Identitas global website dan footer.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => settingsQuery.refetch()}>
                  <RefreshCcw className={settingsQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
                  Refresh
                </Button>
                <Button type="button" onClick={() => saveSettingsMutation.mutate(buildSettingsPayload(settingsForm))}>
                  {saveSettingsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Simpan General
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
            <Field label="Nama Website" id="site-name">
              <Input
                id="site-name"
                placeholder="Contoh: SkripsiLMS"
                value={settingsForm.site_name}
                onChange={(event) => updateSettingField("site_name", event.target.value)}
              />
            </Field>
            <Field label="Tagline" id="site-tagline">
              <Input
                id="site-tagline"
                placeholder="Contoh: Platform Belajar Pre-University"
                value={settingsForm.site_tagline ?? ""}
                onChange={(event) => updateSettingField("site_tagline", event.target.value)}
              />
            </Field>
            <Field label="Logo URL" id="logo-url">
              <Input
                id="logo-url"
                placeholder="https://..."
                value={settingsForm.logo_url ?? ""}
                onChange={(event) => updateSettingField("logo_url", event.target.value)}
              />
            </Field>
            <Field label="Footer Text" id="footer-text">
              <Input
                id="footer-text"
                placeholder="Copyright {year} {site_name}"
                value={settingsForm.footer_text}
                onChange={(event) => updateSettingField("footer_text", event.target.value)}
              />
            </Field>
            <Field label="Contact Email" id="contact-email">
              <Input
                id="contact-email"
                placeholder="support@domain.com"
                value={settingsForm.contact_email ?? ""}
                onChange={(event) => updateSettingField("contact_email", event.target.value)}
              />
            </Field>
            <Field label="Contact Phone" id="contact-phone">
              <Input
                id="contact-phone"
                placeholder="08xxxxxxxxxx"
                value={settingsForm.contact_phone ?? ""}
                onChange={(event) => updateSettingField("contact_phone", event.target.value)}
              />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Address" id="address">
                <Textarea
                  id="address"
                  placeholder="Alamat kantor, kampus, atau pusat bantuan."
                  value={settingsForm.address ?? ""}
                  onChange={(event) => updateSettingField("address", event.target.value)}
                  rows={3}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "landing" ? (
        <div className="space-y-4">
          <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardContent className="grid gap-3 p-5 text-sm leading-7 text-[var(--muted-foreground)] md:grid-cols-2 xl:grid-cols-3">
              <p><span className="font-semibold text-[var(--foreground)]">Hero:</span> badge, headline, deskripsi, gambar, dan 2 CTA utama.</p>
              <p><span className="font-semibold text-[var(--foreground)]">Featured Courses:</span> hanya header section; daftar course tetap mengambil data course published.</p>
              <p><span className="font-semibold text-[var(--foreground)]">Features:</span> isi value proposition platform lewat cards ber-icon.</p>
              <p><span className="font-semibold text-[var(--foreground)]">Learning Paths:</span> jelaskan urutan belajar dari pilih course sampai selesai.</p>
              <p><span className="font-semibold text-[var(--foreground)]">FAQ Header:</span> judul pembuka FAQ publik, sedangkan item FAQ dikelola di tab FAQ.</p>
              <p><span className="font-semibold text-[var(--foreground)]">Bottom CTA:</span> ajakan penutup di bagian bawah landing page berikut bullet benefit.</p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="button" onClick={() => saveSectionsMutation.mutate(sections)}>
              {saveSectionsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Simpan Section CMS
            </Button>
          </div>

          {sections.map((section, sectionIndex) => {
            return (
              <Card key={section.id} className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <CardHeader className="border-b border-[var(--border)] pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">{getLandingSectionLabel(section)}</CardTitle>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{getLandingSectionDescription(section)}</p>
                    </div>
                    <Switch
                      checked={section.is_active}
                      onCheckedChange={(checked) => updateSection(sectionIndex, (current) => ({ ...current, is_active: checked }))}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field label="Eyebrow" id={`section-eyebrow-${section.id}`}>
                      <Input
                        id={`section-eyebrow-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "eyebrow")}
                        value={section.eyebrow ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, eyebrow: event.target.value }))}
                      />
                    </Field>
                    <Field label="Title" id={`section-title-${section.id}`}>
                      <Input
                        id={`section-title-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "title")}
                        value={section.title ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, title: event.target.value }))}
                      />
                    </Field>
                    <Field label="Subtitle" id={`section-subtitle-${section.id}`}>
                      <Input
                        id={`section-subtitle-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "subtitle")}
                        value={section.subtitle ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, subtitle: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field label="Body" id={`section-body-${section.id}`}>
                    <Textarea
                      id={`section-body-${section.id}`}
                      placeholder={getSectionFieldPlaceholder(section, "body")}
                      value={section.body ?? ""}
                      rows={3}
                      onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, body: event.target.value }))}
                    />
                  </Field>
                  <Field label="Image URL" id={`section-image-url-${section.id}`}>
                    <Input
                      id={`section-image-url-${section.id}`}
                      placeholder={getSectionFieldPlaceholder(section, "image_url")}
                      value={section.image_url ?? ""}
                      onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, image_url: event.target.value }))}
                    />
                  </Field>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <Field label="CTA Label" id={`section-cta-label-${section.id}`}>
                      <Input
                        id={`section-cta-label-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "cta_label")}
                        value={section.cta_label ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, cta_label: event.target.value }))}
                      />
                    </Field>
                    <Field label="CTA URL" id={`section-cta-url-${section.id}`}>
                      <Input
                        id={`section-cta-url-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "cta_url")}
                        value={section.cta_url ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, cta_url: event.target.value }))}
                      />
                    </Field>
                    <Field label="Secondary CTA" id={`section-secondary-label-${section.id}`}>
                      <Input
                        id={`section-secondary-label-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "secondary_cta_label")}
                        value={section.secondary_cta_label ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, secondary_cta_label: event.target.value }))}
                      />
                    </Field>
                    <Field label="Secondary URL" id={`section-secondary-url-${section.id}`}>
                      <Input
                        id={`section-secondary-url-${section.id}`}
                        placeholder={getSectionFieldPlaceholder(section, "secondary_cta_url")}
                        value={section.secondary_cta_url ?? ""}
                        onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, secondary_cta_url: event.target.value }))}
                      />
                    </Field>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Section Items</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                        onClick={() =>
                          updateSection(sectionIndex, (current) => ({
                            ...current,
                            items: [...current.items, emptySectionItem(current.id)],
                          }))
                        }
                      >
                        <Plus className="size-3.5" />
                        Tambah Item
                      </Button>
                    </div>
                    {section.items.map((item, itemIndex) => {
                      const iconMeta = getWebsiteFeatureIconMeta((item.icon || "book-open") as WebsiteFeatureIcon);
                      const Icon = iconMeta.icon;

                      return (
                        <div key={item.id} className="rounded-lg border border-[var(--border)] p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className={`inline-flex size-9 items-center justify-center rounded-lg ${iconMeta.colorClass}`}>
                              <Icon className="size-4" />
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 w-8 px-0 text-[var(--danger-soft-foreground)]"
                              onClick={() =>
                                updateSection(sectionIndex, (current) => ({
                                  ...current,
                                  items: current.items.filter((candidate) => candidate.id !== item.id),
                                }))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
                            <Field label="Icon" id={`item-icon-${item.id}`}>
                              <Select
                                value={item.icon ?? "book-open"}
                                onValueChange={(value) => {
                                  if (value) updateSectionItem(sectionIndex, itemIndex, (current) => ({ ...current, icon: value }));
                                }}
                              >
                                <SelectTrigger id={`item-icon-${item.id}`} className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                                  <SelectValue placeholder="Pilih icon" />
                                </SelectTrigger>
                                <SelectContent>
                                  {WEBSITE_FEATURE_ICON_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field label="Title" id={`item-title-${item.id}`}>
                              <Input
                                id={`item-title-${item.id}`}
                                placeholder={getSectionItemPlaceholder(section, "title")}
                                value={item.title ?? ""}
                                onChange={(event) => updateSectionItem(sectionIndex, itemIndex, (current) => ({ ...current, title: event.target.value }))}
                              />
                            </Field>
                          </div>
                          <div className="mt-3">
                            <Field label="Description" id={`item-desc-${item.id}`}>
                              <Textarea
                                id={`item-desc-${item.id}`}
                                placeholder={getSectionItemPlaceholder(section, "description")}
                                value={item.description ?? ""}
                                rows={2}
                                onChange={(event) => updateSectionItem(sectionIndex, itemIndex, (current) => ({ ...current, description: event.target.value }))}
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {activeTab === "pages" ? (
        <EditableList
          title="Pages"
          description="Kelola halaman CMS seperti about-us, privacy-policy, dan terms dengan TinyMCE untuk konten visual."
          onAdd={() => setPagesDraft([...(pagesDraft ?? pages), emptyPage()])}
          onSave={() => savePagesMutation.mutate(pages)}
          isSaving={savePagesMutation.isPending}
        >
          {pages.map((page) => (
            <Card key={page.id} className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex justify-between gap-3">
                  <div className="grid flex-1 gap-3 lg:grid-cols-2">
                    <Field label="Slug" id={`page-slug-${page.id}`}>
                      <Input
                        id={`page-slug-${page.id}`}
                        placeholder="Contoh: about-us"
                        value={page.slug}
                        onChange={(event) => updateListRow(pages, setPagesDraft, page.id, (row) => ({ ...row, slug: event.target.value }))}
                      />
                    </Field>
                    <Field label="Title" id={`page-title-${page.id}`}>
                      <Input
                        id={`page-title-${page.id}`}
                        placeholder="Contoh: Tentang Kami"
                        value={page.title}
                        onChange={(event) => updateListRow(pages, setPagesDraft, page.id, (row) => ({ ...row, title: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <div className="flex h-10 items-center gap-3">
                    <Switch
                      checked={page.is_active}
                      onCheckedChange={(checked) => updateListRow(pages, setPagesDraft, page.id, (row) => ({ ...row, is_active: checked }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 px-0 text-[var(--danger-soft-foreground)]"
                      onClick={() => {
                        setPagesDraft(pages.filter((candidate) => candidate.id !== page.id));
                        if (page.id > 0) deletePageMutation.mutate(page.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <Field label="Content" id={`page-content-${page.id}`}>
                  <div className="space-y-3">
                    <TinyMceEditor
                      placeholder={WEBSITE_PAGE_EDITOR_PLACEHOLDER}
                      value={page.content ?? ""}
                      onChange={(value) => updateListRow(pages, setPagesDraft, page.id, (row) => ({ ...row, content: value }))}
                    />
                    <p className="text-xs leading-6 text-[var(--muted-foreground)]">{WEBSITE_PAGE_EDITOR_HELPER_TEXT}</p>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Preview Publik</p>
                      <WebsiteRichContent
                        content={page.content}
                        emptyText="Konten halaman akan tampil di sini setelah kamu mulai menulis."
                        className="mt-3"
                      />
                    </div>
                  </div>
                </Field>
              </CardContent>
            </Card>
          ))}
        </EditableList>
      ) : null}

      {activeTab === "faq" ? (
        <div className="space-y-4">
          <EditableList
            title="FAQ Categories"
            description="Master kategori untuk FAQ. Gunakan ini agar FAQ punya pengelompokan yang konsisten."
            onAdd={() => setFaqCategoriesDraft([...(faqCategoriesDraft ?? faqCategories), emptyFaqCategory()])}
            onSave={() => saveFaqCategoriesMutation.mutate(faqCategories)}
            isSaving={saveFaqCategoriesMutation.isPending}
            mergeContent
            contentClassName="space-y-4 p-4"
          >
            {faqCategories.length > 0 ? (
              faqCategories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                    <div className="grid flex-1 gap-3">
                      <Field label="Category Name" id={`faq-category-name-${category.id}`}>
                        <Input
                          id={`faq-category-name-${category.id}`}
                          placeholder="Contoh: Learning, Payment, Account"
                          value={category.name}
                          onChange={(event) =>
                            updateListRow(faqCategories, setFaqCategoriesDraft, category.id, (row) => ({ ...row, name: event.target.value }))
                          }
                        />
                      </Field>
                    </div>
                    <div className="flex h-10 shrink-0 items-center gap-3 lg:self-end">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={(checked) =>
                          updateListRow(faqCategories, setFaqCategoriesDraft, category.id, (row) => ({ ...row, is_active: checked }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9 px-0 text-[var(--danger-soft-foreground)]"
                        onClick={() => {
                          setFaqCategoriesDraft(faqCategories.filter((candidate) => candidate.id !== category.id));
                          setFaqsDraft(
                            faqs.map((faq) =>
                              faq.faq_category_id === category.id
                                ? { ...faq, faq_category_id: null, category_name: null, category: null }
                                : faq,
                            ),
                          );

                          if (category.id > 0) {
                            deleteFaqCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <ListEmptyState message="Belum ada kategori FAQ. Tambah kategori pertama agar setiap FAQ bisa dikelompokkan dengan rapi." />
            )}
          </EditableList>

          <EditableList
            title="FAQ"
            description="Kelola pertanyaan publik dan hubungkan tiap FAQ ke kategori master di atas."
            onAdd={() => setFaqsDraft([...(faqsDraft ?? faqs), emptyFaq()])}
            onSave={() => saveFaqsMutation.mutate(faqs)}
            isSaving={saveFaqsMutation.isPending}
            mergeContent
            contentClassName="space-y-4 p-4"
          >
            {faqs.length > 0 ? (
              faqs.map((faq) => (
                <div key={faq.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="space-y-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_120px_auto]">
                      <Field label="Question" id={`faq-question-${faq.id}`}>
                        <Input
                          id={`faq-question-${faq.id}`}
                          placeholder="Contoh: Apakah course bisa diakses lewat HP?"
                          value={faq.question}
                          onChange={(event) => updateListRow(faqs, setFaqsDraft, faq.id, (row) => ({ ...row, question: event.target.value }))}
                        />
                      </Field>
                      <Field label="Category" id={`faq-category-${faq.id}`}>
                        <Select
                          value={faq.faq_category_id ? String(faq.faq_category_id) : "none"}
                          onValueChange={(value) => {
                            const nextCategoryId = value === "none" ? null : Number(value);
                            const nextCategory = faqCategories.find((category) => category.id === nextCategoryId) ?? null;

                            updateListRow(faqs, setFaqsDraft, faq.id, (row) => ({
                              ...row,
                              faq_category_id: nextCategoryId,
                              category_name: nextCategory?.name ?? null,
                              category: nextCategory,
                            }));
                          }}
                        >
                          <SelectTrigger id={`faq-category-${faq.id}`} className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                            <SelectValue placeholder="Pilih kategori FAQ">
                              {getFaqCategoryDisplayName(faq, faqCategories) || undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Tanpa kategori</SelectItem>
                            {faqCategories.map((category) => (
                              <SelectItem key={category.id} value={String(category.id)}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Sort Order" id={`faq-sort-order-${faq.id}`}>
                        <Input
                          id={`faq-sort-order-${faq.id}`}
                          type="number"
                          min={1}
                          placeholder="1"
                          value={String(faq.sort_order ?? 1)}
                          onChange={(event) =>
                            updateListRow(faqs, setFaqsDraft, faq.id, (row) => ({
                              ...row,
                              sort_order: Math.max(1, Number(event.target.value) || 1),
                            }))
                          }
                        />
                      </Field>
                      <div className="flex h-10 items-center gap-3 lg:mt-7 lg:justify-self-end">
                        <Switch
                          checked={faq.is_active}
                          onCheckedChange={(checked) => updateListRow(faqs, setFaqsDraft, faq.id, (row) => ({ ...row, is_active: checked }))}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-9 px-0 text-[var(--danger-soft-foreground)]"
                          onClick={() => {
                            setFaqsDraft(faqs.filter((candidate) => candidate.id !== faq.id));
                            if (faq.id > 0) deleteFaqMutation.mutate(faq.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <Field label="Answer" id={`faq-answer-${faq.id}`}>
                      <Textarea
                        id={`faq-answer-${faq.id}`}
                        placeholder="Tulis jawaban singkat, jelas, dan langsung ke inti pertanyaan."
                        value={faq.answer}
                        rows={3}
                        onChange={(event) => updateListRow(faqs, setFaqsDraft, faq.id, (row) => ({ ...row, answer: event.target.value }))}
                      />
                    </Field>
                  </div>
                </div>
              ))
            ) : (
              <ListEmptyState message="Belum ada item FAQ. Tambahkan pertanyaan pertama setelah kategori siap dipakai." />
            )}
          </EditableList>
        </div>
      ) : null}

      {activeTab === "social" ? (
        <EditableList
          title="Social Links"
          description="Kelola link sosial media yang tampil di footer, termasuk icon yang akan dipakai."
          onAdd={() => setSocialDraft([...(socialDraft ?? socialLinks), emptySocialLink()])}
          onSave={() => saveSocialMutation.mutate(socialLinks)}
          isSaving={saveSocialMutation.isPending}
        >
          {socialLinks.map((link) => {
            const previewIconMeta = resolveWebsiteSocialIcon(link);
            const PreviewIcon = previewIconMeta.icon;
            const socialIconValue = WEBSITE_SOCIAL_ICON_OPTIONS.some((option) => option.value === link.icon?.trim().toLowerCase())
              ? (link.icon?.trim().toLowerCase() as WebsiteSocialIcon)
              : "auto";

            return (
              <Card key={link.id} className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--primary)]">
                        <PreviewIcon className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{link.label || "Social link baru"}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{link.url || "URL belum diisi"}</p>
                      </div>
                    </div>
                    <div className="flex h-10 items-center gap-3">
                      <Switch checked={link.is_active} onCheckedChange={(checked) => updateListRow(socialLinks, setSocialDraft, link.id, (row) => ({ ...row, is_active: checked }))} />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9 px-0 text-[var(--danger-soft-foreground)]"
                        onClick={() => {
                          setSocialDraft(socialLinks.filter((candidate) => candidate.id !== link.id));
                          if (link.id > 0) deleteSocialMutation.mutate(link.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
                    <Field label="Icon" id={`social-icon-${link.id}`}>
                      <Select
                        value={socialIconValue}
                        onValueChange={(value) =>
                          updateListRow(socialLinks, setSocialDraft, link.id, (row) => ({
                            ...row,
                            icon: value === "auto" ? null : value,
                          }))
                        }
                      >
                        <SelectTrigger id={`social-icon-${link.id}`} className="h-9 w-full border-[var(--border)] bg-[var(--card)]">
                          <SelectValue placeholder="Pilih icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {WEBSITE_SOCIAL_ICON_OPTIONS.map((option) => {
                            const iconMeta = getWebsiteSocialIconMeta(option.value);
                            const Icon = iconMeta.icon;

                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <span className="flex items-center gap-2">
                                  <Icon className="size-4" />
                                  {option.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Label" id={`social-label-${link.id}`}>
                      <Input
                        id={`social-label-${link.id}`}
                        placeholder="Contoh: Instagram Resmi"
                        value={link.label}
                        onChange={(event) => updateListRow(socialLinks, setSocialDraft, link.id, (row) => ({ ...row, label: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <Field label="URL" id={`social-url-${link.id}`}>
                    <Input
                      id={`social-url-${link.id}`}
                      placeholder="https://instagram.com/username"
                      value={link.url}
                      onChange={(event) => updateListRow(socialLinks, setSocialDraft, link.id, (row) => ({ ...row, url: event.target.value }))}
                    />
                  </Field>
                  <p className="text-xs leading-6 text-[var(--muted-foreground)]">
                    Biarkan icon di mode otomatis jika ingin mengikuti label atau domain URL secara otomatis.
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </EditableList>
      ) : null}
    </section>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ListEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
      {message}
    </div>
  );
}

function EditableList({
  title,
  description,
  onAdd,
  onSave,
  isSaving,
  children,
  mergeContent = false,
  contentClassName,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  onSave: () => void;
  isSaving: boolean;
  children: ReactNode;
  mergeContent?: boolean;
  contentClassName?: string;
}) {
  return (
    <div className="space-y-4">
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="border-b border-[var(--border)] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onAdd}>
                <Plus className="size-4" />
                Tambah
              </Button>
              <Button type="button" onClick={onSave}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Simpan
              </Button>
            </div>
          </div>
        </CardHeader>
        {mergeContent ? <CardContent className={contentClassName ?? "space-y-4 p-4"}>{children}</CardContent> : null}
      </Card>
      {mergeContent ? null : children}
    </div>
  );
}
