import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getDetailedTransactions } from "@/modules/library/lib/data";
import { AdminReturns } from "@/modules/library/ui/admin-returns";
import { SectionCard, TransactionsTable } from "@/modules/library/ui/library-cards";

export default async function AdminBorrowingPage() {
  const user = await requireRole("admin");
  const transactions = await getDetailedTransactions();
  const activeTransactions = transactions.filter((item) => item.tanggal_kembali === null);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Peminjaman"
      description="Pantau transaksi peminjaman aktif dan status jatuh tempo anggota."
      activeNav="Peminjaman"
    >
      <SectionCard
        title="Transaksi aktif"
        subtitle="Peminjaman yang belum dikembalikan"
      >
        <TransactionsTable transactions={activeTransactions} />
      </SectionCard>

      <SectionCard
        title="Detail Pengembalian"
        subtitle="Buka transaksi aktif untuk mencatat kondisi buku"
      >
        <AdminReturns transactions={activeTransactions} />
      </SectionCard>
    </DashboardShell>
  );
}
