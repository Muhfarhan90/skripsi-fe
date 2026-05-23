"use client";

import dynamic from "next/dynamic";
import type { IAllProps } from "@tinymce/tinymce-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TinyMceReactEditor = dynamic<IAllProps>(
  async () => {
    const tinyMceReact = await import("@tinymce/tinymce-react");
    return tinyMceReact.Editor;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Loader2 className="size-4 animate-spin" />
          Memuat editor...
        </div>
      </div>
    ),
  },
);

interface TinyMceEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TinyMceEditor({
  value,
  onChange,
  placeholder = "Tulis konten halaman di sini.",
  disabled = false,
  className,
}: TinyMceEditorProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]", className)}>
      <TinyMceReactEditor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        licenseKey="gpl"
        value={value}
        disabled={disabled}
        scriptLoading={{ defer: true }}
        onEditorChange={onChange}
        init={{
          height: 420,
          menubar: false,
          branding: false,
          promotion: false,
          resize: true,
          statusbar: true,
          placeholder,
          plugins: "autolink lists link table preview searchreplace visualblocks wordcount code",
          toolbar:
            "undo redo | blocks | bold italic underline blockquote | bullist numlist | link table | removeformat code preview",
          block_formats: "Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4",
          content_style:
            "body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 14px; line-height: 1.7; margin: 16px; }",
        }}
      />
    </div>
  );
}
