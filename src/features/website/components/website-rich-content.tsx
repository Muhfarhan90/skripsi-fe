import DOMPurify from "isomorphic-dompurify";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WebsiteRichContentProps {
  content: string | null | undefined;
  emptyText?: string;
  className?: string;
}

type WebsiteContentBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; content: string };

const HEADING_PATTERN = /^(#{1,3})\s+(.+)$/;
const LIST_ITEM_PATTERN = /^-\s+(.+)$/;
const QUOTE_PATTERN = /^>\s+(.+)$/;
const INLINE_PATTERN = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
const SAFE_LINK_PATTERN = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
const HTML_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const WEBSITE_PAGE_EDITOR_HELPER_TEXT =
  "Gunakan editor untuk heading, list, table, blockquote, dan link. Konten akan disimpan sebagai HTML yang aman untuk halaman statis.";

export const WEBSITE_PAGE_EDITOR_PLACEHOLDER =
  "Tulis konten halaman seperti Tentang Kami, Syarat & Ketentuan, atau Kebijakan Privasi di sini.";

function isExternalHttpLink(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function isAppRelativeLink(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

function isHtmlContent(content: string | null | undefined): content is string {
  return Boolean(content && HTML_PATTERN.test(content));
}

function sanitizeWebsiteHtml(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "a",
      "blockquote",
      "br",
      "code",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    ALLOWED_ATTR: ["colspan", "href", "rel", "rowspan", "scope", "target"],
  });
}

function renderInlineContent(text: string): ReactNode[] {
  const fragments: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const [token, , strongText, italicText, linkLabel, linkHref] = match;
    const tokenIndex = match.index ?? 0;

    if (tokenIndex > lastIndex) {
      fragments.push(text.slice(lastIndex, tokenIndex));
    }

    if (strongText) {
      fragments.push(
        <strong key={`${tokenIndex}-strong`} className="font-bold">
          {strongText}
        </strong>,
      );
    } else if (italicText) {
      fragments.push(
        <em key={`${tokenIndex}-italic`} className="italic">
          {italicText}
        </em>,
      );
    } else if (linkLabel && linkHref && SAFE_LINK_PATTERN.test(linkHref)) {
      fragments.push(
        isAppRelativeLink(linkHref) ? (
          <Link
            key={`${tokenIndex}-link`}
            href={linkHref}
            className="font-semibold text-[var(--primary)] underline underline-offset-4"
          >
            {linkLabel}
          </Link>
        ) : (
          <a
            key={`${tokenIndex}-link`}
            href={linkHref}
            target={isExternalHttpLink(linkHref) ? "_blank" : undefined}
            rel={isExternalHttpLink(linkHref) ? "noreferrer" : undefined}
            className="font-semibold text-[var(--primary)] underline underline-offset-4"
          >
            {linkLabel}
          </a>
        ),
      );
    } else {
      fragments.push(token);
    }

    lastIndex = tokenIndex + token.length;
  }

  if (lastIndex < text.length) {
    fragments.push(text.slice(lastIndex));
  }

  return fragments;
}

// Keep CMS pages flexible without rendering raw HTML from the database.
function parseWebsiteContent(content: string | null | undefined): WebsiteContentBlock[] {
  const normalized = content?.replace(/\r\n/g, "\n").trim() ?? "";

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return { type: "paragraph", content: "" } satisfies WebsiteContentBlock;
      }

      const headingMatch = lines.length === 1 ? lines[0].match(HEADING_PATTERN) : null;

      if (headingMatch) {
        return {
          type: "heading",
          level: Math.min(headingMatch[1].length, 3) as 1 | 2 | 3,
          content: headingMatch[2],
        } satisfies WebsiteContentBlock;
      }

      if (lines.every((line) => LIST_ITEM_PATTERN.test(line))) {
        return {
          type: "list",
          items: lines.map((line) => line.replace(LIST_ITEM_PATTERN, "$1")),
        } satisfies WebsiteContentBlock;
      }

      if (lines.every((line) => QUOTE_PATTERN.test(line))) {
        return {
          type: "quote",
          content: lines.map((line) => line.replace(QUOTE_PATTERN, "$1")).join(" "),
        } satisfies WebsiteContentBlock;
      }

      return {
        type: "paragraph",
        content: lines.join(" "),
      } satisfies WebsiteContentBlock;
    })
    .filter((block) => !(block.type === "paragraph" && !block.content));
}

export function WebsiteRichContent({
  content,
  emptyText = "Konten belum tersedia.",
  className,
}: WebsiteRichContentProps) {
  if (isHtmlContent(content)) {
    const sanitizedHtml = sanitizeWebsiteHtml(content);

    if (!sanitizedHtml.trim()) {
      return <p className={cn("text-sm leading-7 text-[var(--muted-foreground)]", className)}>{emptyText}</p>;
    }

    return (
      <div
        className={cn(
          "space-y-5 text-sm leading-8 text-[var(--foreground)] sm:text-base [&_a]:font-semibold [&_a]:text-[var(--primary)] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-[var(--border)] [&_blockquote]:bg-[var(--surface-soft)] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-[var(--muted-foreground)] [&_code]:rounded-sm [&_code]:bg-[var(--surface-soft)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_h1]:text-2xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:sm:text-3xl [&_h2]:text-xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:sm:text-2xl [&_h3]:text-lg [&_h3]:font-black [&_h3]:tracking-tight [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-[var(--border)] [&_pre]:bg-[var(--surface-soft)] [&_pre]:p-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-2xl [&_tbody_tr:nth-child(even)]:bg-[var(--surface-soft)]/60 [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface-soft)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  const blocks = parseWebsiteContent(content);

  if (blocks.length === 0) {
    return <p className={cn("text-sm leading-7 text-[var(--muted-foreground)]", className)}>{emptyText}</p>;
  }

  return (
    <div className={cn("space-y-5 text-sm leading-8 text-[var(--foreground)] sm:text-base", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h2 key={`${block.type}-${index}`} className="text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">
                {renderInlineContent(block.content)}
              </h2>
            );
          }

          if (block.level === 2) {
            return (
              <h3 key={`${block.type}-${index}`} className="text-xl font-black tracking-tight text-[var(--foreground)] sm:text-2xl">
                {renderInlineContent(block.content)}
              </h3>
            );
          }

          return (
            <h4 key={`${block.type}-${index}`} className="text-lg font-black tracking-tight text-[var(--foreground)]">
              {renderInlineContent(block.content)}
            </h4>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`} className="list-disc space-y-2 pl-6">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineContent(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 text-[var(--muted-foreground)]"
            >
              {renderInlineContent(block.content)}
            </blockquote>
          );
        }

        return <p key={`${block.type}-${index}`}>{renderInlineContent(block.content)}</p>;
      })}
    </div>
  );
}
