import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur md:p-12">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            Anda sedang offline
          </div>

          <div className="space-y-5">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Koneksi terputus, tapi aplikasi masih bisa dibuka.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Halaman yang membutuhkan data terbaru mungkin belum tersedia. Saat koneksi kembali,
              muat ulang aplikasi untuk mengambil sinkronisasi terbaru.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kembali ke beranda
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Lihat katalog
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
