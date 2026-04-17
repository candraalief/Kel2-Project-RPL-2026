import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getBooks, getSiswaTransactions } from "@/modules/library/lib/data";
import { MetricCard, SectionCard } from "@/modules/library/ui/library-cards";

export default async function SiswaDashboardPage() {
  const user = await requireRole("siswa");
  const [books, transactions] = await Promise.all([
    getBooks(),
    getSiswaTransactions(user.id),
  ]);

  const activeTransactions = transactions.filter((item) => item.tanggal_kembali === null);

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Beranda Siswa"
      description="Ringkasan akun siswa, koleksi buku yang tersedia, serta transaksi peminjaman yang sedang berjalan."
      activeNav="Beranda"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Buku tersedia" value={books.length} />
        <MetricCard label="Peminjaman aktif" value={activeTransactions.length} />
        <MetricCard label="Total riwayat" value={transactions.length} />
        <MetricCard label="Kelas" value={user.className ?? "-"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Status akun" subtitle="Informasi siswa">
          <div className="grid gap-2 text-sm leading-7 text-zinc-600">
            <p>Nama siswa: {user.name}</p>
            <p>Username / Email: {user.identifier}</p>
            <p>Kelas: {user.className ?? "-"}</p>
            <p>Status akun: aktif</p>
          </div>
        </SectionCard>

        <SectionCard title="Navigasi cepat" subtitle="Akses fitur siswa">
          <div className="grid gap-3 md:grid-cols-2">
            <QuickLink href="/siswa/absensi" title="Absensi siswa" />
            <QuickLink href="/siswa/katalog" title="Lihat katalog buku" />
            <QuickLink href="/siswa/peminjaman" title="Peminjaman aktif" />
            <QuickLink href="/siswa/riwayat" title="Riwayat transaksi" />
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function QuickLink({ href, title }: { href: string; title: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
    >
      {title}
    </a>
  );
}
