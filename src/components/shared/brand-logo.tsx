"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type BrandMarkSize = "sm" | "md" | "lg";

const BRAND_MARK_SIZE_CLASS: Record<BrandMarkSize, string> = {
  sm: "size-9 rounded-xl text-xs",
  md: "size-10 rounded-xl text-sm",
  lg: "size-11 rounded-2xl text-sm",
};

interface BrandMarkProps {
  logoUrl?: string | null;
  fallbackText?: string;
  size?: BrandMarkSize;
  className?: string;
}

export function BrandMark({
  logoUrl,
  fallbackText = "LMS",
  size = "md",
  className,
}: BrandMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-[var(--secondary)] font-bold text-[var(--secondary-foreground)] shadow-sm",
        BRAND_MARK_SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        fallbackText
      )}
    </span>
  );
}

interface BrandLogoProps {
  href?: string;
  title: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  hideTextOnMobile?: boolean;
  size?: BrandMarkSize;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  markClassName?: string;
}

export function BrandLogo({
  href,
  title,
  subtitle,
  logoUrl,
  hideTextOnMobile = false,
  size = "md",
  className,
  titleClassName,
  subtitleClassName,
  markClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <BrandMark logoUrl={logoUrl} size={size} className={markClassName} />
      <span className={cn("min-w-0", hideTextOnMobile && "hidden sm:block")}>
        <span
          className={cn(
            "block truncate text-sm font-semibold leading-none text-[var(--foreground)]",
            titleClassName,
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]",
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn("flex shrink-0 items-center gap-3", className)}>
        {content}
      </Link>
    );
  }

  return <div className={cn("flex items-center gap-3", className)}>{content}</div>;
}
