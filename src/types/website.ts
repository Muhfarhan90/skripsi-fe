export type WebsiteFeatureIcon =
  | "book-open"
  | "message-square-text"
  | "award"
  | "smartphone"
  | "graduation-cap"
  | "monitor";

export interface WebsiteFeatureItem {
  icon: WebsiteFeatureIcon;
  title: string;
  description: string;
}

export interface WebsiteFooterLink {
  label: string;
  url: string;
}

export interface WebsiteSocialLink {
  id: number;
  platform: string;
  label: string;
  url: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebsitePage {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebsiteSectionItem {
  id: number;
  section_id: number;
  title: string | null;
  description: string | null;
  icon: string | null;
  url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebsiteSection {
  id: number;
  page_key: string;
  section_key: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  secondary_cta_label: string | null;
  secondary_cta_url: string | null;
  sort_order: number;
  is_active: boolean;
  items: WebsiteSectionItem[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebsiteFaqCategory {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebsiteFaq {
  id: number;
  question: string;
  answer: string;
  faq_category_id: number | null;
  category_name: string | null;
  category: WebsiteFaqCategory | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WebsiteSettingGlobal {
  id: number;
  site_name: string;
  site_tagline: string | null;
  logo_url: string | null;
  footer_text: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WebsiteHomeContent extends WebsiteSettingGlobal {
  hero_badge: string;
  hero_title: string;
  hero_highlight: string;
  hero_description: string;
  hero_image_url: string | null;
  hero_primary_cta_label: string;
  hero_primary_cta_url: string;
  hero_secondary_cta_label: string;
  hero_secondary_cta_url: string;
  featured_courses_badge: string;
  featured_courses_title: string;
  featured_courses_description: string;
  features_badge: string;
  features_title: string;
  features_description: string;
  feature_items: WebsiteFeatureItem[];
  learning_path_badge: string;
  learning_path_title: string;
  learning_path_description: string;
  learning_path_items: WebsiteFeatureItem[];
  faq_badge: string;
  faq_title: string;
  faq_description: string;
  bottom_cta_title: string;
  bottom_cta_description: string;
  bottom_cta_primary_label: string;
  bottom_cta_primary_url: string;
  bottom_cta_secondary_label: string;
  bottom_cta_secondary_url: string;
  bottom_cta_bullets: string[];
  social_links: WebsiteSocialLink[];
  footer_links: WebsiteFooterLink[];
  sections?: WebsiteSection[];
  faqs?: WebsiteFaq[];
}

export type WebsiteSetting = WebsiteHomeContent;

export type WebsiteSettingPayload = Omit<WebsiteSettingGlobal, "id" | "created_at" | "updated_at">;

export type WebsiteSocialLinkPayload = Omit<WebsiteSocialLink, "id" | "created_at" | "updated_at">;

export type WebsitePagePayload = Omit<WebsitePage, "id" | "created_at" | "updated_at">;

export type WebsiteSectionPayload = Omit<WebsiteSection, "id" | "created_at" | "updated_at" | "items"> & {
  items: Array<Omit<WebsiteSectionItem, "id" | "section_id" | "created_at" | "updated_at">>;
};

export type WebsiteFaqCategoryPayload = Omit<WebsiteFaqCategory, "id" | "created_at" | "updated_at">;

export type WebsiteFaqPayload = Omit<WebsiteFaq, "id" | "created_at" | "updated_at" | "category" | "category_name">;
