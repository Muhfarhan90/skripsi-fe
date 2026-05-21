import { cn } from "@/lib/utils/cn";

interface StatusBadgeProps {
  value: string;
}

function resolveStatusClass(value: string): string {
  const normalized = value.toLowerCase();

  if (normalized.includes("upcoming") || normalized.includes("submitted")) {
    return "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200";
  }

  if (
    normalized.includes("closed") ||
    normalized.includes("tidak wajib")
  ) {
    return "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-500/20 dark:text-zinc-200";
  }

  if (
    normalized.includes("nonaktif") ||
    normalized.includes("diblokir") ||
    normalized.includes("failed") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("dibatalkan") ||
    normalized.includes("archived")
  ) {
    return "border-red-200 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200";
  }

  if (
    normalized.includes("aktif") ||
    normalized.includes("active") ||
    normalized.includes("paid") ||
    normalized.includes("published") ||
    normalized.includes("selesai") ||
    normalized.includes("completed") ||
    normalized.includes("success") ||
    normalized.includes("approved") ||
    normalized.includes("wajib")
  ) {
    return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("planned") ||
    normalized.includes("draft") ||
    normalized.includes("revision required")
  ) {
    return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200";
  }

  return "border-red-200 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200";
}

export function StatusBadge({ value }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
        resolveStatusClass(value),
      )}
    >
      {value}
    </span>
  );
}
