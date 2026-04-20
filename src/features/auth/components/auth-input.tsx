import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function AuthInput({ label, className, ...props }: AuthInputProps) {
  return (
    <label className="block space-y-1.5">
      <Label className="text-sm text-foreground">{label}</Label>
      <Input
        {...props}
        className={cn(
          "h-10 border-input bg-background focus-visible:border-primary focus-visible:ring-primary/25",
          className,
        )}
      />
    </label>
  );
}
