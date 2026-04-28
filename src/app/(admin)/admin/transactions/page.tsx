import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { DataTableCard } from "@/features/admin/components/data-table-card";
import {
  enrollmentsTransactionData,
  ordersTransactionData,
  paymentsTransactionData,
  transactionHighlightCards,
} from "@/features/admin/data/master-data";

export default function AdminTransactionsPage() {
  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Data Transaksi"
        description="Pantau seluruh alur transaksi dari order, pembayaran, hingga enrollment."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {transactionHighlightCards.map((card) => (
          <Card key={card.title} className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-[var(--foreground)]">{card.value}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{card.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTableCard data={ordersTransactionData} />
      <DataTableCard data={paymentsTransactionData} />
      <DataTableCard data={enrollmentsTransactionData} />
    </section>
  );
}

