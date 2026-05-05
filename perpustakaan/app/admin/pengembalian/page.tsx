import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getDetailedTransactions } from "@/modules/library/lib/data";
import { AdminReturns } from "@/modules/library/ui/admin-returns";
import { SectionCard } from "@/modules/library/ui/library-cards";

export default async function AdminReturnPage() {
  const user = await requireRole("admin");
  const transactions = await getDetailedTransactions();
  const activeTransactions = transactions.filter(
    (item) => item.tanggal_kembali === null
  );
  const completedTransactions = transactions
    .filter((item) => item.tanggal_kembali !== null)
    .sort((a, b) => {
      const timeA = a.tanggal_kembali ? new Date(a.tanggal_kembali).getTime() : 0;
      const timeB = b.tanggal_kembali ? new Date(b.tanggal_kembali).getTime() : 0;

      return timeB - timeA;
    });

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Pengembalian"
      description="Proses pengembalian buku, catat kondisi eksemplar, dan pantau riwayat pengembalian."
      activeNav="Pengembalian"
    >
      <SectionCard
        title="Pengembalian Buku"
        subtitle="Transaksi yang belum dan sudah dikembalikan"
      >
        <AdminReturns
          transactions={activeTransactions}
          historyTransactions={completedTransactions}
        />
      </SectionCard>
    </DashboardShell>
  );
}
