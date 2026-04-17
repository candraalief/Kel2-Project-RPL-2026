import {
  getAttendanceRecords,
  getBooks,
  getStudents,
  getTransactions,
} from "@/modules/library/lib/data";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { MetricCard, SectionCard } from "@/modules/library/ui/library-cards";
import { requireRole } from "@/modules/access/lib/guards";

export default async function AdminHomePage() {
  const user = await requireRole("admin");
  const [books, students, transactions, attendance] = await Promise.all([
    getBooks(),
    getStudents(),
    getTransactions(),
    getAttendanceRecords(5),
  ]);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Beranda Administrator"
      description="Ringkasan kondisi perpustakaan, data anggota, transaksi, dan kunjungan terbaru."
      activeNav="Beranda"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total buku" value={books.length} />
        <MetricCard label="Total anggota siswa" value={students.length} />
        <MetricCard label="Total transaksi" value={transactions.length} />
        <MetricCard label="Absensi terbaru" value={attendance.length} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Status sistem" subtitle="Ringkasan operasional">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBox
              title="Peminjaman aktif"
              value={transactions.filter((item) => item.tanggal_kembali === null).length}
            />
            <InfoBox
              title="Pengembalian selesai"
              value={transactions.filter((item) => item.tanggal_kembali !== null).length}
            />
            <InfoBox
              title="Siswa aktif"
              value={students.filter((item) => item.status_keanggotaan === "aktif").length}
            />
            <InfoBox
              title="Menunggu verifikasi"
              value={
                students.filter((item) => item.status_keanggotaan === "menunggu_verifikasi")
                  .length
              }
            />
          </div>
        </SectionCard>

        <SectionCard title="Aktivitas terbaru" subtitle="Absensi pengunjung">
          <div className="space-y-3">
            {attendance.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada absensi terbaru.</p>
            ) : (
              attendance.map((item) => (
                <div
                  key={item.id_absensi}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4"
                >
                  <p className="font-medium text-zinc-900">{item.nama}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {item.jenis_pengunjung ?? "-"} • {item.tujuan ?? "-"}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {item.waktu_kunjungan ?? "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function InfoBox({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
