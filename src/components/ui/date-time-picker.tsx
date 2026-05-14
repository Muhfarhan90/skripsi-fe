"use client"

import { useMemo, useState } from "react"
import { format, isValid, parseISO, setHours, setMinutes } from "date-fns"
import { CalendarIcon, Clock3Icon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  defaultHour?: number
  defaultMinute?: number
  includeTime?: boolean
}

function parseValueToDate(value?: string): Date | undefined {
  if (!value) return undefined

  const normalized = value.trim().replace(" ", "T")
  if (!normalized) return undefined

  const parsedFromIso = parseISO(normalized)
  if (isValid(parsedFromIso)) {
    return parsedFromIso
  }

  const parsedFromDate = new Date(normalized)
  return isValid(parsedFromDate) ? parsedFromDate : undefined
}

function toLocalDateTimeString(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function toLocalDateString(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))

function DateTimePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal & jam",
  disabled = false,
  className,
  defaultHour = 8,
  defaultMinute = 0,
  includeTime = true,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const selectedDate = useMemo(() => parseValueToDate(value), [value])
  const selectedHour = selectedDate ? format(selectedDate, "HH") : ""
  const selectedMinute = selectedDate ? format(selectedDate, "mm") : ""

  const handleDateSelect = (nextDate?: Date) => {
    if (!nextDate) return

    if (!includeTime) {
      onChange(toLocalDateString(nextDate))
      return
    }

    const baseDate = selectedDate ?? new Date()
    const nextValue = setMinutes(
      setHours(nextDate, selectedDate ? baseDate.getHours() : defaultHour),
      selectedDate ? baseDate.getMinutes() : defaultMinute
    )

    onChange(toLocalDateTimeString(nextValue))
  }

  const handleHourChange = (nextHour: string | null) => {
    if (!selectedDate || !nextHour) return
    onChange(toLocalDateTimeString(setHours(selectedDate, Number(nextHour))))
  }

  const handleMinuteChange = (nextMinute: string | null) => {
    if (!selectedDate || !nextMinute) return
    onChange(toLocalDateTimeString(setMinutes(selectedDate, Number(nextMinute))))
  }

  const handleClear = () => {
    onChange("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-full justify-between border-input bg-background px-3 font-normal text-foreground",
          !selectedDate && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {selectedDate ? format(selectedDate, includeTime ? "dd MMM yyyy, HH:mm" : "dd MMM yyyy") : placeholder}
        </span>
        <CalendarIcon className="size-4 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn("p-0", includeTime ? "w-auto" : "max-w-[calc(100vw-2rem)] w-fit")}
      >
        <div className={cn("flex flex-col", includeTime && "gap-0 md:flex-row")}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
          />

          {includeTime ? (
            <div className="flex min-w-52 flex-col gap-3 border-t border-[var(--border)] p-3 md:border-t-0 md:border-l">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <Clock3Icon className="size-4 text-[var(--muted-foreground)]" />
                <span>Pilih Jam</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-[var(--muted-foreground)]">Jam</p>
                  <Select value={selectedHour} onValueChange={handleHourChange}>
                    <SelectTrigger
                      className="h-9 w-full border-[var(--border)] bg-[var(--card)]"
                      disabled={!selectedDate}
                    >
                      <SelectValue placeholder="HH" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-[var(--muted-foreground)]">Menit</p>
                  <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                    <SelectTrigger
                      className="h-9 w-full border-[var(--border)] bg-[var(--card)]"
                      disabled={!selectedDate}
                    >
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTE_OPTIONS.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-[var(--muted-foreground)]">
                {selectedDate
                  ? `Tersimpan: ${format(selectedDate, "dd MMM yyyy, HH:mm")}`
                  : "Pilih tanggal dulu, lalu atur jam dan menit."}
              </p>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!selectedDate}>
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  Selesai
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 border-t border-[var(--border)] p-3">
              <p className="min-w-0 text-xs text-[var(--muted-foreground)]">
                {selectedDate ? `Tersimpan: ${format(selectedDate, "dd MMM yyyy")}` : "Pilih tanggal."}
              </p>

              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!selectedDate}>
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  Selesai
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateTimePicker }
