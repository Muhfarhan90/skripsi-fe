import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function AuthInput({ label, className, ...props }: AuthInputProps) {
  const generatedId = useId();
  const inputId = props.id ?? `auth-input-${generatedId}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-sm text-foreground">
        {label}
      </Label>
      <Input
        {...props}
        id={inputId}
        className={cn(
          "h-10 border-input bg-background focus-visible:border-primary focus-visible:ring-primary/25",
          className,
        )}
      />
    </div>
  );
}
