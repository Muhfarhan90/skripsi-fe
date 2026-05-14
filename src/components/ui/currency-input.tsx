"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value: string
  onValueChange: (value: string) => void
  prefix?: string
}

function formatThousands(value: string): string {
  if (!value) return ""

  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

function CurrencyInput({
  value,
  onValueChange,
  prefix = "Rp",
  className,
  disabled,
  placeholder,
  ...props
}: CurrencyInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/\D/g, "")
    onValueChange(digitsOnly)
  }

  return (
    <div
      className={cn(
        "flex h-9 w-full items-center overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span className="px-3 text-sm font-medium text-foreground">{prefix}</span>
      <span className="h-full w-px bg-border" />
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={formatThousands(value)}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className="h-full rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  )
}

export { CurrencyInput }
