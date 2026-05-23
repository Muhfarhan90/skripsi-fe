"use client";

import { Bell } from "lucide-react";
import { NotificationHistoryList } from "@/features/notifications/components/notification-history-list";

export default function StudentNotificationsPage() {
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-sm">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <Bell className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Notifikasi</h1>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Riwayat pemberitahuan order, kelas, dan aktivitas belajar.
          </p>
        </div>
      </header>

      <NotificationHistoryList emptyHref="/student/catalog" emptyLabel="Jelajahi course" />
    </section>
  );
}
