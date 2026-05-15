import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSiswaAttendanceToday } from "@/modules/library/lib/data";
import { SiswaAttendanceForm } from "@/modules/library/ui/attendance-forms";
import { SectionCard } from "@/modules/library/ui/library-cards";

export default async function SiswaAttendancePage() {
  const user = await requireRole("siswa");
  const todayAttendance = await getSiswaAttendanceToday(user.id);

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Absensi Siswa"
      description="Catat kehadiran siswa dengan cepat dan praktis."
      activeNav="Absensi"
    >
      <SectionCard title="Absensi" subtitle="Catat kehadiran hari ini">
        <SiswaAttendanceForm
          userName={user.name}
          className={user.className ?? null}
          alreadyAttendedToday={todayAttendance !== null}
          attendanceTime={todayAttendance?.waktu_kunjungan ?? null}
        />
      </SectionCard>
    </DashboardShell>
  );
}
