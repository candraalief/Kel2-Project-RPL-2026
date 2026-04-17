import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import {
  getAttendanceRecords,
  getBooks,
  getStudents,
  getTransactions,
} from "@/modules/library/lib/data";
import { MetricCard, SectionCard } from "@/modules/library/ui/library-cards";

export default async function AdminReportsPage() {
  const user = await requireRole("admin");
  const [books, students, transactions, attendance] = await Promise.all([
    getBooks(),
    getStudents(),
    getTransactions(),
    getAttendanceRecords(),
  ]);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Laporan"
      description="Ringkasan data buku, anggota, transaksi, dan absensi sebagai dasar laporan periodik."
      activeNav="Laporan"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total buku" value={books.length} />
        <MetricCard label="Total anggota" value={students.length} />
        <MetricCard label="Total transaksi" value={transactions.length} />
        <MetricCard label="Total absensi" value={attendance.length} />
      </section>

      <SectionCard title="Ringkasan laporan" subtitle="Status operasional">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Peminjaman aktif"
            value={transactions.filter((item) => item.tanggal_kembali === null).length}
          />
          <MetricCard
            label="Pengembalian selesai"
            value={transactions.filter((item) => item.tanggal_kembali !== null).length}
          />
          <MetricCard
            label="Siswa aktif"
            value={students.filter((item) => item.status_keanggotaan === "aktif").length}
          />
          <MetricCard
            label="Menunggu verifikasi"
            value={
              students.filter((item) => item.status_keanggotaan === "menunggu_verifikasi")
                .length
            }
          />
        </div>
      </SectionCard>
    </DashboardShell>
  );
}
