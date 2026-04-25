import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComingSoonCardProps {
  title: string;
  description: string;
}

export function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <Card className="border border-zinc-200 bg-white">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-zinc-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-zinc-600">{description}</p>
        <p className="text-xs font-medium text-[#0F7A5A]">Status: Dalam persiapan implementasi backend integration.</p>
      </CardContent>
    </Card>
  );
}
