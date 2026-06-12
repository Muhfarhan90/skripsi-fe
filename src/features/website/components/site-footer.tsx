import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { cn } from "@/lib/utils";
import { formatWebsiteFooterText, resolveWebsiteSocialIcon } from "@/features/website/lib/website-settings";
import type { WebsiteHomeContent } from "@/types/website";

interface SiteFooterProps {
  settings: Pick<
    WebsiteHomeContent,
    | "site_name"
    | "site_tagline"
    | "logo_url"
    | "footer_text"
    | "contact_email"
    | "contact_phone"
    | "address"
    | "social_links"
    | "footer_links"
  >;
  className?: string;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function SiteFooter({ settings, className }: SiteFooterProps) {
  const footerText = formatWebsiteFooterText(settings.footer_text, settings.site_name);
  const contactEmail = settings.contact_email?.trim() || "";
  const contactPhone = settings.contact_phone?.trim() || "";
  const contactAddress = settings.address?.trim() || "";
  const footerDescription = settings.site_tagline?.trim() || "";
  const hasContact = Boolean(contactEmail || contactPhone || contactAddress);

  return (
    <footer
      className={cn(
        "relative w-full overflow-hidden border-t border-[var(--border)] bg-[#071915] px-4 py-10 text-white sm:px-6",
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-[var(--primary)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 size-96 rounded-full bg-[var(--secondary)]/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/10 backdrop-blur sm:p-8 lg:grid-cols-[1.15fr_0.75fr_0.9fr_0.75fr]">
          <div>
            <BrandLogo
              title={settings.site_name}
              subtitle={settings.site_tagline}
              logoUrl={settings.logo_url}
              size="lg"
              titleClassName="text-lg font-black tracking-tight text-white"
              subtitleClassName="text-sm text-white/60"
            />

            {footerDescription ? (
              <div className="mt-6 max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <p className="text-sm leading-7 text-white/70">{footerDescription}</p>
              </div>
            ) : null}

          </div>

          {settings.footer_links.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Informasi</p>
              <div className="mt-5 grid gap-2">
                {settings.footer_links.map((link) => (
                  isExternalUrl(link.url) ? (
                    <a
                      key={`${link.label}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      {link.label}
                      <ArrowUpRight className="size-4 opacity-0 transition group-hover:opacity-100" />
                    </a>
                  ) : (
                    <Link
                      key={`${link.label}-${link.url}`}
                      href={link.url}
                      className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      {link.label}
                      <ArrowUpRight className="size-4 opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  )
                ))}
              </div>
            </div>
          ) : null}

          {hasContact ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Kontak</p>
              <div className="mt-5 space-y-4">
                {contactEmail ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Email</p>
                    <a href={`mailto:${contactEmail}`} className="min-w-0 break-all text-sm text-white/75 transition hover:text-white">
                      {contactEmail}
                    </a>
                  </div>
                ) : null}
                {contactPhone ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Telepon</p>
                    <a href={`tel:${contactPhone}`} className="text-sm text-white/75 transition hover:text-white">
                      {contactPhone}
                    </a>
                  </div>
                ) : null}
                {contactAddress ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Alamat</p>
                    <p className="text-sm leading-6 text-white/75">{contactAddress}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {settings.social_links.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Sosial Media</p>
              <div className="mt-5 grid gap-3">
                {settings.social_links.map((link) => {
                  const iconMeta = resolveWebsiteSocialIcon(link);
                  const Icon = iconMeta.icon;

                  return (
                    <a
                      key={`${link.label}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/75 transition hover:-translate-y-0.5 hover:bg-white/[0.09] hover:text-white"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white px-2 py-2 shadow-sm">
                          <Icon className="size-5 text-[var(--primary)]" />
                        </span>
                        <span className="truncate">{link.label}</span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-[var(--secondary)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-white/10 pt-5 text-xs text-white/45">
          <p>{footerText}</p>
        </div>
      </div>
    </footer>
  );
}
