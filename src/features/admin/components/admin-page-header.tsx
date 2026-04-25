interface AdminPageHeaderProps {
  title: string;
  description: string;
}

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  return (
    <header className="rounded-lg border border-[var(--admin-border)] bg-gradient-to-b from-[var(--admin-surface)] to-[var(--admin-surface-soft)] p-5 shadow-sm">
      <span className="inline-flex rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
        Admin Panel
      </span>
      <h2 className="mt-3 text-xl font-semibold text-[var(--admin-foreground)]">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-[var(--admin-muted-foreground)]">{description}</p>
    </header>
  );
}
