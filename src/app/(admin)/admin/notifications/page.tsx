"use client";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { NotificationHistoryList } from "@/features/notifications/components/notification-history-list";

export default function AdminNotificationsPage() {
  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Notifikasi"
        description="Pantau seluruh riwayat notifikasi operasional, termasuk pembayaran baru yang perlu direview."
      />

      <NotificationHistoryList emptyHref="/admin/orders" emptyLabel="Buka orders" />
    </section>
  );
}
