import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getDetailedTransactions } from "@/modules/library/lib/data";
import { AdminReturns } from "@/modules/library/ui/admin-returns";
import { SectionCard, TransactionsTable } from "@/modules/library/ui/library-cards";

export default async function AdminReturnPage() {
  const user = await requireRole("admin");
  const transactions = await getDetailedTransactions();
  const activeTransactions = transactions.filter(
    (item) => item.tanggal_kembali === null
  );
  const completedTransactions = transactions.filter(
    (item) => item.tanggal_kembali !== null
  );

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Pengembalian"
      description="Lihat transaksi yang sudah dikembalikan dan status akhir pengembalian."
      activeNav="Pengembalian"
    >
      <SectionCard
        title="Proses Pengembalian"
        subtitle="Pilih transaksi aktif, lalu catat kondisi tiap buku"
      >
        <AdminReturns transactions={activeTransactions} />
      </SectionCard>

      <SectionCard
        title="Pengembalian"
        subtitle="Transaksi yang telah selesai"
      >
        <TransactionsTable transactions={completedTransactions} />
      </SectionCard>
    </DashboardShell>
  );
}
