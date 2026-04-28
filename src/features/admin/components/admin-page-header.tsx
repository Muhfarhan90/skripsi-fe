interface AdminPageHeaderProps {
  title: string;
  description: string;
}

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  return (
    <header className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <span className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        Admin Panel
      </span>
      <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">{description}</p>
    </header>
  );
}

