import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface OverviewMetricCardProps {
  label: string;
  value: string;
  note: string;
  delta: string;
  deltaTone: "positive" | "negative" | "neutral";
}

function getDeltaClass(deltaTone: "positive" | "negative" | "neutral") {
  if (deltaTone === "positive") return "bg-emerald-100 text-emerald-700";
  if (deltaTone === "negative") return "bg-red-100 text-red-700";
  return "bg-zinc-200 text-zinc-700";
}

export function OverviewMetricCard({ label, value, note, delta, deltaTone }: OverviewMetricCardProps) {
  return (
    <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
      <CardHeader className="flex items-start justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[var(--admin-muted-foreground)]">{label}</CardTitle>
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", getDeltaClass(deltaTone))}>
          {delta}
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold text-[var(--admin-foreground)]">{value}</p>
        <p className="text-xs text-[var(--admin-muted-foreground)]">{note}</p>
      </CardContent>
    </Card>
  );
}
