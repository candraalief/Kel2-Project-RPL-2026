import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSessionUser } from "@/modules/access/lib/session";
import { PublicAttendanceForm } from "@/modules/library/ui/attendance-forms";
import { SectionCard } from "@/modules/library/ui/library-cards";
import {
  getStudentNameSuggestions,
  type StudentSuggestion,
} from "@/modules/library/lib/data";

export default async function PublicAttendancePage() {
  const sessionUser = await getSessionUser();
  const studentNameSuggestions: StudentSuggestion[] =
    await getStudentNameSuggestions();
  const publicUser = sessionUser ?? {
    id: 0,
    role: "public" as const,
    name: "Monitor Publik",
    identifier: "public",
  };

  return (
    <DashboardShell
      role="public"
      user={publicUser}
      title="Absensi Pengunjung"
      description="Isi kehadiran pengunjung perpustakaan umum melalui monitor publik."
      activeNav="Absensi"
    >
      <SectionCard title="Publik" subtitle="Isi Data Kunjungan">
        <PublicAttendanceForm studentNameSuggestions={studentNameSuggestions} />
      </SectionCard>
    </DashboardShell>
  );
}
