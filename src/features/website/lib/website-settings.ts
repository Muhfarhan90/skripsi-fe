import {
  AtSign,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Globe2,
  GraduationCap,
  Link2,
  MessageSquareText,
  Monitor,
  Send,
  Smartphone,
  SquarePlay,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { WebsiteFeatureIcon, WebsiteSetting, WebsiteSettingPayload, WebsiteSocialLink } from "@/types/website";

interface WebsiteFeatureIconMeta {
  value: WebsiteFeatureIcon;
  label: string;
  icon: LucideIcon;
  colorClass: string;
}

export type WebsiteSocialIcon =
  | "auto"
  | "instagram"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "twitter"
  | "telegram"
  | "website"
  | "custom";

interface WebsiteSocialIconMeta {
  value: WebsiteSocialIcon;
  label: string;
  icon: LucideIcon;
}

const WEBSITE_FEATURE_ICON_META: Record<WebsiteFeatureIcon, WebsiteFeatureIconMeta> = {
  "book-open": {
    value: "book-open",
    label: "Materi",
    icon: BookOpen,
    colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  "message-square-text": {
    value: "message-square-text",
    label: "Diskusi",
    icon: MessageSquareText,
    colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
  award: {
    value: "award",
    label: "Sertifikat",
    icon: Award,
    colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  smartphone: {
    value: "smartphone",
    label: "Mobile",
    icon: Smartphone,
    colorClass: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
  "graduation-cap": {
    value: "graduation-cap",
    label: "Progress",
    icon: GraduationCap,
    colorClass: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  },
  monitor: {
    value: "monitor",
    label: "Interaktif",
    icon: Monitor,
    colorClass: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
  },
};

const WEBSITE_SOCIAL_ICON_META: Record<WebsiteSocialIcon, WebsiteSocialIconMeta> = {
  auto: {
    value: "auto",
    label: "Otomatis dari platform",
    icon: Globe2,
  },
  instagram: {
    value: "instagram",
    label: "Instagram",
    icon: Camera,
  },
  facebook: {
    value: "facebook",
    label: "Facebook",
    icon: Users,
  },
  youtube: {
    value: "youtube",
    label: "YouTube",
    icon: SquarePlay,
  },
  linkedin: {
    value: "linkedin",
    label: "LinkedIn",
    icon: BriefcaseBusiness,
  },
  twitter: {
    value: "twitter",
    label: "Twitter / X",
    icon: AtSign,
  },
  telegram: {
    value: "telegram",
    label: "Telegram",
    icon: Send,
  },
  website: {
    value: "website",
    label: "Website",
    icon: Globe2,
  },
  custom: {
    value: "custom",
    label: "Custom / generic",
    icon: Link2,
  },
};

export const WEBSITE_FEATURE_ICON_OPTIONS = Object.values(WEBSITE_FEATURE_ICON_META).map(
  ({ value, label }) => ({
    value,
    label,
  }),
);

export const WEBSITE_SOCIAL_ICON_OPTIONS = Object.values(WEBSITE_SOCIAL_ICON_META).map(
  ({ value, label }) => ({
    value,
    label,
  }),
);

export function getWebsiteFeatureIconMeta(icon: WebsiteFeatureIcon): WebsiteFeatureIconMeta {
  return WEBSITE_FEATURE_ICON_META[icon] ?? WEBSITE_FEATURE_ICON_META["book-open"];
}

function normalizeSocialIconValue(value: string | null | undefined): WebsiteSocialIcon | null {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized === "x") {
    return "twitter";
  }

  if (normalized === "web" || normalized === "globe") {
    return "website";
  }

  return normalized in WEBSITE_SOCIAL_ICON_META ? (normalized as WebsiteSocialIcon) : null;
}

export function getWebsiteSocialIconMeta(icon: WebsiteSocialIcon): WebsiteSocialIconMeta {
  return WEBSITE_SOCIAL_ICON_META[icon] ?? WEBSITE_SOCIAL_ICON_META.auto;
}

function inferSocialIconFromText(value: string | null | undefined): WebsiteSocialIcon | null {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.includes("instagram")) {
    return "instagram";
  }

  if (normalized.includes("facebook")) {
    return "facebook";
  }

  if (normalized.includes("youtube")) {
    return "youtube";
  }

  if (normalized.includes("linkedin")) {
    return "linkedin";
  }

  if (normalized.includes("twitter") || normalized.includes("/x.com") || normalized.includes(" x ")) {
    return "twitter";
  }

  if (normalized.includes("telegram") || normalized.includes("t.me")) {
    return "telegram";
  }

  if (normalized.includes("http://") || normalized.includes("https://") || normalized.includes("www.")) {
    return "website";
  }

  return normalizeSocialIconValue(normalized);
}

// Prefer explicit icon selection from CMS, then fall back to label/url-based inference.
export function resolveWebsiteSocialIcon(link: Pick<WebsiteSocialLink, "label" | "url" | "icon">): WebsiteSocialIconMeta {
  const explicitIcon = normalizeSocialIconValue(link.icon);

  if (explicitIcon && explicitIcon !== "auto") {
    return getWebsiteSocialIconMeta(explicitIcon);
  }

  const inferredIcon = inferSocialIconFromText(link.label) ?? inferSocialIconFromText(link.url);

  if (inferredIcon) {
    return getWebsiteSocialIconMeta(inferredIcon);
  }

  return getWebsiteSocialIconMeta("custom");
}

export function createDefaultWebsiteSettingInput(): WebsiteSettingPayload {
  return {
    site_name: "Platform Belajar",
    site_tagline: "Platform Belajar Pre-University",
    logo_url: null,
    footer_text: "Copyright {year} {site_name} - Platform Belajar Pre-University",
    contact_email: null,
    contact_phone: null,
    address: null,
  };
}

export function createDefaultWebsiteSetting(): WebsiteSetting {
  return {
    id: 0,
    ...createDefaultWebsiteSettingInput(),
    hero_badge: "",
    hero_title: "",
    hero_highlight: "",
    hero_description: "",
    hero_image_url: null,
    hero_primary_cta_label: "",
    hero_primary_cta_url: "/register",
    hero_secondary_cta_label: "",
    hero_secondary_cta_url: "/courses",
    featured_courses_badge: "",
    featured_courses_title: "",
    featured_courses_description: "",
    features_badge: "",
    features_title: "",
    features_description: "",
    feature_items: [],
    learning_path_badge: "",
    learning_path_title: "",
    learning_path_description: "",
    learning_path_items: [],
    faq_badge: "",
    faq_title: "",
    faq_description: "",
    bottom_cta_title: "",
    bottom_cta_description: "",
    bottom_cta_primary_label: "",
    bottom_cta_primary_url: "/register",
    bottom_cta_secondary_label: "",
    bottom_cta_secondary_url: "/login",
    bottom_cta_bullets: [],
    social_links: [],
    footer_links: [],
    sections: [],
    faqs: [],
    created_at: null,
    updated_at: null,
  };
}

export function formatWebsiteFooterText(footerText: string, siteName: string): string {
  const template = footerText.trim() || "Copyright {year} {site_name}";

  return template
    .replace(/\{year\}/g, String(new Date().getFullYear()))
    .replace(/\{site_name\}/g, siteName);
}
