import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { SiswaAttendanceForm } from "@/modules/library/ui/attendance-forms";
import { SectionCard } from "@/modules/library/ui/library-cards";

export default async function SiswaAttendancePage() {
  const user = await requireRole("siswa");

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Absensi Siswa"
      description="Catat kehadiran siswa perpustakaan menggunakan akun yang sedang login."
      activeNav="Absensi"
    >
      <SectionCard title="Absensi" subtitle="Catat kehadiran hari ini">
        <SiswaAttendanceForm
          userName={user.name}
          className={user.className ?? null}
        />
      </SectionCard>
    </DashboardShell>
  );
}
