import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComingSoonCardProps {
  title: string;
  description: string;
}

export function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <Card className="border border-[var(--border)] bg-[var(--card)]">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-[var(--foreground)]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
        <p className="text-xs font-medium text-[var(--primary)]">Status: Dalam persiapan implementasi backend integration.</p>
      </CardContent>
    </Card>
  );
}
