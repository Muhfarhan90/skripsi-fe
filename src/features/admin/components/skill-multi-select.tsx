"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AdminSkill } from "@/features/admin/api/master-api";
import { cn } from "@/lib/utils";

interface SkillMultiSelectProps {
  skills: AdminSkill[];
  value: string[];
  onChange: (nextValue: string[]) => void;
  onCreateSkill?: (name: string) => Promise<AdminSkill>;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  placeholder?: string;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function SkillMultiSelect({
  skills,
  value,
  onChange,
  onCreateSkill,
  disabled = false,
  isLoading = false,
  className,
  placeholder = "Pilih atau cari skill",
}: SkillMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const normalizedQuery = normalizeSearch(searchValue);
  const selectedIds = useMemo(() => new Set(value), [value]);
  const visibleSkills = useMemo(
    () =>
      skills
        .filter((skill) => skill.is_active || selectedIds.has(String(skill.id)))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [selectedIds, skills],
  );
  const filteredSkills = useMemo(() => {
    if (!normalizedQuery) return visibleSkills;

    return visibleSkills.filter((skill) =>
      [skill.name, skill.slug].some((field) => field.toLowerCase().includes(normalizedQuery)),
    );
  }, [normalizedQuery, visibleSkills]);
  const selectedSkills = useMemo(
    () => visibleSkills.filter((skill) => selectedIds.has(String(skill.id))),
    [selectedIds, visibleSkills],
  );
  const hasExactMatch = visibleSkills.some((skill) => skill.name.trim().toLowerCase() === normalizedQuery);
  const showCreateAction = Boolean(onCreateSkill && normalizedQuery && !hasExactMatch);

  const toggleSkill = (skillId: string) => {
    if (selectedIds.has(skillId)) {
      onChange(value.filter((item) => item !== skillId));
      return;
    }

    onChange([...value, skillId]);
  };

  const removeSkill = (skillId: string) => {
    onChange(value.filter((item) => item !== skillId));
  };

  const handleCreateSkill = async () => {
    if (!onCreateSkill) return;

    const skillName = searchValue.trim();
    if (!skillName) return;

    setIsCreating(true);

    try {
      const createdSkill = await onCreateSkill(skillName);
      const nextSkillId = String(createdSkill.id);

      if (!selectedIds.has(nextSkillId)) {
        onChange([...value, nextSkillId]);
      }

      setSearchValue("");
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const triggerLabel =
    selectedSkills.length > 0
      ? `${selectedSkills.length} skill dipilih`
      : isLoading
        ? "Memuat skill..."
        : placeholder;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-sm transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            disabled && "cursor-not-allowed opacity-60",
            selectedSkills.length === 0 && "text-[var(--muted-foreground)]",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 text-[var(--muted-foreground)]" />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[min(34rem,calc(100vw-2rem))] border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--muted-foreground)]" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Cari skill atau buat skill baru..."
                className="h-9 border-[var(--border)] bg-[var(--surface-soft)] pl-9"
              />
            </div>

            {showCreateAction ? (
              <button
                type="button"
                onClick={() => void handleCreateSkill()}
                disabled={isCreating}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                <span>Tambah skill &quot;{searchValue.trim()}&quot;</span>
              </button>
            ) : null}

            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {filteredSkills.length > 0 ? (
                filteredSkills.map((skill) => {
                  const skillId = String(skill.id);
                  const isSelected = selectedIds.has(skillId);
                  const isInactive = !skill.is_active;

                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skillId)}
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                    >
                      <Checkbox checked={isSelected} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-[var(--foreground)]">{skill.name}</span>
                          {isInactive ? <Badge variant="warning">Nonaktif</Badge> : null}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">{skill.slug}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--muted-foreground)]">
                  Tidak ada skill yang cocok dengan pencarian ini.
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedSkills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map((skill) => (
            <Badge key={skill.id} variant={skill.is_active ? "success" : "warning"} className="gap-1.5 pr-1">
              <span>{skill.name}</span>
              <button
                type="button"
                onClick={() => removeSkill(String(skill.id))}
                className="inline-flex size-4 items-center justify-center rounded-full transition hover:bg-black/10"
                aria-label={`Hapus skill ${skill.name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
