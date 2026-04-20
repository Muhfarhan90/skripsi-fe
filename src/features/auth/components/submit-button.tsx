import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function SubmitButton({ loading, children, className, ...props }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading || props.disabled}
      className={cn(
        "h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
      {...props}
    >
      {loading ? "Memproses..." : children}
    </Button>
  );
}
