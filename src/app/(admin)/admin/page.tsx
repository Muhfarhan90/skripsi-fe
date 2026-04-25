import Link from "next/link";
import { ArrowRight, BookOpenText, Database, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { OverviewMetricCard } from "@/features/admin/components/overview-metric-card";
import { adminOverviewMetrics } from "@/features/admin/data/master-data";

const recentActivities = [
  { id: "a-1", activity: "User baru terverifikasi", actor: "Sistem", time: "2 menit lalu" },
  { id: "a-2", activity: "Course Aljabar Dasar diperbarui", actor: "Rahmat Hidayat", time: "15 menit lalu" },
  { id: "a-3", activity: "Pembayaran ORD-2026-001 sukses", actor: "Payment Gateway", time: "27 menit lalu" },
  { id: "a-4", activity: "Voucher UTBK25 diaktifkan", actor: "Sari Wulandari", time: "1 jam lalu" },
];

export default function AdminPage() {
  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Dashboard Admin"
        description="Pantau ringkasan platform dan akses cepat ke modul utama manajemen LMS."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminOverviewMetrics.map((metric) => (
          <OverviewMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            note={metric.note}
            delta={metric.delta}
            deltaTone={metric.deltaTone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm xl:col-span-2">
          <CardHeader className="border-b border-[var(--admin-border)]">
            <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--admin-border)]">
                <thead className="bg-[var(--admin-surface-soft)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">Aktivitas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">Pelaku</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-[var(--admin-surface-soft)]">
                      <td className="px-4 py-3 text-sm text-[var(--admin-foreground)]">{activity.activity}</td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">{activity.actor}</td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">{activity.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]">
                <Database className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">Manajemen Data</CardTitle>
              <p className="text-sm text-[var(--admin-muted-foreground)]">
                Kelola users, categories, courses, dan vouchers dalam satu modul.
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/master-data/users"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--admin-brand)] hover:opacity-80"
              >
                Buka Data Users
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]">
                <ReceiptText className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">Transaksi</CardTitle>
              <p className="text-sm text-[var(--admin-muted-foreground)]">
                Pantau order, pembayaran, dan enrollment dari satu dashboard transaksi.
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/transactions"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--admin-brand)] hover:opacity-80"
              >
                Buka Data Transaksi
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex size-9 items-center justify-center rounded-lg bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]">
                <BookOpenText className="size-4" />
              </div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">Instructor Capability</CardTitle>
              <p className="text-sm text-[var(--admin-muted-foreground)]">
                Area admin juga memuat kebutuhan instructor untuk pengelolaan konten belajar.
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
