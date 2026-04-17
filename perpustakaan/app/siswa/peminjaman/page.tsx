import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSiswaTransactions } from "@/modules/library/lib/data";
import { SectionCard, TransactionsTable } from "@/modules/library/ui/library-cards";

export default async function SiswaBorrowingPage() {
  const user = await requireRole("siswa");
  const transactions = await getSiswaTransactions(user.id);
  const activeTransactions = transactions.filter((item) => item.tanggal_kembali === null);

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Peminjaman Saya"
      description="Daftar buku yang sedang kamu pinjam dan status jatuh temponya."
      activeNav="Peminjaman"
    >
      <SectionCard title="Peminjaman aktif" subtitle="Transaksi yang masih berjalan">
        <TransactionsTable transactions={activeTransactions} />
      </SectionCard>
    </DashboardShell>
  );
}
