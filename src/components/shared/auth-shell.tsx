import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerHref?: string;
  className?: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerHref,
  className,
}: AuthShellProps) {
  return (
    <Card className={cn("w-full max-w-md border border-border/70 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-foreground">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}

        {footerText && footerLinkText && footerHref ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {footerText}{" "}
            <Link href={footerHref} className="font-medium text-primary hover:underline">
              {footerLinkText}
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
