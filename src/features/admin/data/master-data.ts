export interface OverviewMetric {
  label: string;
  value: string;
  note: string;
  delta: string;
  deltaTone: "positive" | "negative" | "neutral";
}

export interface DataTableColumn {
  key: string;
  label: string;
}

export interface DataTableRow {
  id: string;
  [key: string]: string;
}

export interface DataTableDefinition {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  actionLabel?: string;
  statusKey?: string;
  statusOptions?: string[];
  columns: DataTableColumn[];
  rows: DataTableRow[];
}

export interface TransactionHighlightCard {
  title: string;
  value: string;
  note: string;
}

export const adminOverviewMetrics: OverviewMetric[] = [
  {
    label: "Total Users",
    value: "1,240",
    note: "Akun aktif di seluruh role",
    delta: "+12.4%",
    deltaTone: "positive",
  },
  {
    label: "Total Courses",
    value: "86",
    note: "Course publish + draft",
    delta: "+4.2%",
    deltaTone: "positive",
  },
  {
    label: "Transaksi Bulan Ini",
    value: "412",
    note: "Order dengan status sukses",
    delta: "-1.8%",
    deltaTone: "negative",
  },
  {
    label: "Voucher Aktif",
    value: "9",
    note: "Voucher siap dipakai",
    delta: "Stabil",
    deltaTone: "neutral",
  },
];

export const transactionHighlightCards: TransactionHighlightCard[] = [
  {
    title: "Order Sukses",
    value: "412",
    note: "30 hari terakhir",
  },
  {
    title: "Pembayaran Pending",
    value: "37",
    note: "Butuh verifikasi",
  },
  {
    title: "Enrollment Baru",
    value: "289",
    note: "Sinkron otomatis dari payment",
  },
];

export const ordersTransactionData: DataTableDefinition = {
  title: "Orders",
  subtitle: "Pantau status order student dari checkout sampai completion.",
  searchPlaceholder: "Cari nomor order atau nama student...",
  statusKey: "status",
  statusOptions: ["Selesai", "Pending", "Dibatalkan"],
  columns: [
    { key: "orderNo", label: "Order No" },
    { key: "student", label: "Student" },
    { key: "items", label: "Item" },
    { key: "total", label: "Total" },
    { key: "status", label: "Status" },
  ],
  rows: [
    { id: "ord-001", orderNo: "ORD-2026-001", student: "Anisa Putri", items: "2 Course", total: "Rp420.000", status: "Selesai" },
    { id: "ord-002", orderNo: "ORD-2026-002", student: "Bima Pratama", items: "1 Course", total: "Rp180.000", status: "Pending" },
    { id: "ord-003", orderNo: "ORD-2026-003", student: "Nadia Nuraini", items: "3 Course", total: "Rp615.000", status: "Selesai" },
    { id: "ord-004", orderNo: "ORD-2026-004", student: "Dimas Saputra", items: "1 Course", total: "Rp220.000", status: "Dibatalkan" },
  ],
};

export const paymentsTransactionData: DataTableDefinition = {
  title: "Payments",
  subtitle: "Monitoring pembayaran dan proses verifikasi gateway.",
  searchPlaceholder: "Cari payment ref atau order no...",
  statusKey: "status",
  statusOptions: ["Paid", "Waiting", "Failed"],
  columns: [
    { key: "paymentRef", label: "Payment Ref" },
    { key: "orderNo", label: "Order No" },
    { key: "method", label: "Metode" },
    { key: "amount", label: "Nominal" },
    { key: "status", label: "Status" },
  ],
  rows: [
    { id: "pay-001", paymentRef: "PAY-77812", orderNo: "ORD-2026-001", method: "VA BCA", amount: "Rp420.000", status: "Paid" },
    { id: "pay-002", paymentRef: "PAY-77813", orderNo: "ORD-2026-002", method: "VA BNI", amount: "Rp180.000", status: "Waiting" },
    { id: "pay-003", paymentRef: "PAY-77814", orderNo: "ORD-2026-003", method: "QRIS", amount: "Rp615.000", status: "Paid" },
    { id: "pay-004", paymentRef: "PAY-77815", orderNo: "ORD-2026-004", method: "E-Wallet", amount: "Rp220.000", status: "Failed" },
  ],
};

export const enrollmentsTransactionData: DataTableDefinition = {
  title: "Enrollments",
  subtitle: "Sinkronisasi kepemilikan course berdasarkan pembayaran.",
  searchPlaceholder: "Cari student atau judul course...",
  statusKey: "status",
  statusOptions: ["Aktif", "Pending", "Diblokir"],
  columns: [
    { key: "student", label: "Student" },
    { key: "course", label: "Course" },
    { key: "sourceOrder", label: "Order No" },
    { key: "enrolledAt", label: "Tanggal" },
    { key: "status", label: "Status" },
  ],
  rows: [
    { id: "enr-001", student: "Anisa Putri", course: "Aljabar Dasar", sourceOrder: "ORD-2026-001", enrolledAt: "2026-04-23", status: "Aktif" },
    { id: "enr-002", student: "Nadia Nuraini", course: "Strategi UTBK Saintek", sourceOrder: "ORD-2026-003", enrolledAt: "2026-04-24", status: "Aktif" },
    { id: "enr-003", student: "Bima Pratama", course: "Kimia Organik Dasar", sourceOrder: "ORD-2026-002", enrolledAt: "2026-04-24", status: "Pending" },
    { id: "enr-004", student: "Dimas Saputra", course: "Fisika Mekanika I", sourceOrder: "ORD-2026-004", enrolledAt: "2026-04-24", status: "Diblokir" },
  ],
};
