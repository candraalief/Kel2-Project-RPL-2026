import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSiswaTransactions } from "@/modules/library/lib/data";
import { SectionCard, TransactionsTable } from "@/modules/library/ui/library-cards";

export default async function SiswaHistoryPage() {
  const user = await requireRole("siswa");
  const transactions = await getSiswaTransactions(user.id);

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Riwayat Transaksi"
      description="Lihat seluruh riwayat peminjaman dan pengembalian yang tercatat untuk akunmu."
      activeNav="Riwayat"
    >
      <SectionCard title="Riwayat" subtitle="Semua transaksi siswa">
        <TransactionsTable transactions={transactions} />
      </SectionCard>
    </DashboardShell>
  );
}
