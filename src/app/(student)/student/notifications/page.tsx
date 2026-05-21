"use client";

import { NotificationHistoryList } from "@/features/notifications/components/notification-history-list";

export default function StudentNotificationsPage() {
  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Notifikasi Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lihat seluruh riwayat pemberitahuan penting terkait order, kelas, dan aktivitas belajar Anda.
        </p>
      </header>

      <NotificationHistoryList emptyHref="/student/catalog" emptyLabel="Jelajahi course" />
    </section>
  );
}
