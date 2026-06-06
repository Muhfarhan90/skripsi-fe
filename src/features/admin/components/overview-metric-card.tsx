import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface OverviewMetricCardProps {
  label: string;
  value: string;
  note: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  cardClassName?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
}

function getDeltaClass(deltaTone: "positive" | "negative" | "neutral") {
  if (deltaTone === "positive") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200";
  if (deltaTone === "negative") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700/40 dark:text-zinc-200";
}

export function OverviewMetricCard({
  label,
  value,
  note,
  delta,
  deltaTone = "neutral",
  icon: Icon,
  cardClassName,
  iconWrapperClassName,
  iconClassName,
}: OverviewMetricCardProps) {
  return (
    <Card className={cn("border border-[var(--border)] bg-[var(--card)] shadow-sm", cardClassName)}>
      <CardHeader className="flex items-start justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">{label}</CardTitle>
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm",
              iconWrapperClassName,
            )}
          >
            <Icon className={cn("size-4", iconClassName)} />
          </span>
        ) : delta ? (
          <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", getDeltaClass(deltaTone))}>
            {delta}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{note}</p>
      </CardContent>
    </Card>
  );
}

