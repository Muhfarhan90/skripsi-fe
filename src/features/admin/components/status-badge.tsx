import { cn } from "@/lib/utils/cn";

interface StatusBadgeProps {
  value: string;
}

function resolveStatusClass(value: string): string {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("nonaktif") ||
    normalized.includes("diblokir") ||
    normalized.includes("failed") ||
    normalized.includes("dibatalkan") ||
    normalized.includes("archived")
  ) {
    return "border-red-200 bg-red-100 text-red-700";
  }

  if (
    normalized.includes("aktif") ||
    normalized.includes("paid") ||
    normalized.includes("published") ||
    normalized.includes("selesai")
  ) {
    return "border-emerald-200 bg-emerald-100 text-emerald-700";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("draft")
  ) {
    return "border-amber-200 bg-amber-100 text-amber-700";
  }

  return "border-red-200 bg-red-100 text-red-700";
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
