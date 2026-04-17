import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getAttendanceRecords } from "@/modules/library/lib/data";
import { AttendanceTable, SectionCard } from "@/modules/library/ui/library-cards";

export default async function AdminAttendancePage() {
  const user = await requireRole("admin");
  const records = await getAttendanceRecords();

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Absensi"
      description="Pantau seluruh absensi pengunjung umum maupun siswa di perpustakaan."
      activeNav="Absensi"
    >
      <SectionCard title="Data absensi" subtitle="Daftar kunjungan perpustakaan">
        <AttendanceTable records={records} />
      </SectionCard>
    </DashboardShell>
  );
}
