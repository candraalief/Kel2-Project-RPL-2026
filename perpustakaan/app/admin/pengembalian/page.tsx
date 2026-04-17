import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getTransactions } from "@/modules/library/lib/data";
import { SectionCard, TransactionsTable } from "@/modules/library/ui/library-cards";

export default async function AdminReturnPage() {
  const user = await requireRole("admin");
  const transactions = await getTransactions();
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
        title="Pengembalian"
        subtitle="Transaksi yang telah selesai"
      >
        <TransactionsTable transactions={completedTransactions} />
      </SectionCard>
    </DashboardShell>
  );
}
