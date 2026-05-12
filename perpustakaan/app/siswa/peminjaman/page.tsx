import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getDetailedSiswaTransactions } from "@/modules/library/lib/data";
import { SiswaBorrowingHistory } from "@/modules/library/ui/siswa-borrowing-history";

export default async function SiswaBorrowingPage() {
  const user = await requireRole("siswa");
  const transactions = await getDetailedSiswaTransactions(user.id);
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Peminjaman & Riwayat"
      description="Pantau buku yang sedang dipinjam, deadline pengembalian, dan riwayat transaksi akunmu."
      activeNav="Peminjaman & Riwayat"
    >
      <SiswaBorrowingHistory transactions={transactions} todayDate={todayDate} />
    </DashboardShell>
  );
}
