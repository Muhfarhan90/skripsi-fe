"use client";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { NotificationHistoryList } from "@/features/notifications/components/notification-history-list";

export default function AdminNotificationsPage() {
  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Notifikasi"
        description="Pantau seluruh riwayat notifikasi penting untuk aktivitas platform dan course."
      />

      <NotificationHistoryList emptyHref="/admin" emptyLabel="Kembali ke dashboard" />
    </section>
  );
}
