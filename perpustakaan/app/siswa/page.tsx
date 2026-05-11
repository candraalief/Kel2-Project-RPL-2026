import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import {
  getBooks,
  getLatestSiswaAttendance,
  getSiswaBorrowingSummary,
} from "@/modules/library/lib/data";
import { SiswaDashboard } from "@/modules/library/ui/siswa-dashboard";

export default async function SiswaDashboardPage() {
  const user = await requireRole("siswa");
  const [books, borrowingSummary, lastAttendance] = await Promise.all([
    getBooks(),
    getSiswaBorrowingSummary(user.id),
    getLatestSiswaAttendance(user.id),
  ]);
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
      title="Beranda Siswa"
      description="Ringkasan akun siswa, koleksi buku yang tersedia, serta transaksi peminjaman yang sedang berjalan."
      activeNav="Beranda"
    >
      <SiswaDashboard
        user={user}
        totalBooks={books.length}
        totalTransactions={borrowingSummary.transactions.length}
        activeTransactions={borrowingSummary.activeTransactions}
        activeBookCount={borrowingSummary.activeBookCount}
        lastAttendance={lastAttendance}
        todayDate={todayDate}
      />
    </DashboardShell>
  );
}
