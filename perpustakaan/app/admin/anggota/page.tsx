import {
  getAllSiswaAccounts,
} from "@/modules/access/lib/student-registration";
import { requireRole } from "@/modules/access/lib/guards";
import { AdminMembers } from "@/modules/access/ui/admin-members";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";

export default async function AdminMembersPage() {
  const user = await requireRole("admin");
  const allSiswa = await getAllSiswaAccounts();

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Anggota"
      description="Kelola data siswa terdaftar dan verifikasi pendaftaran baru untuk sistem perpustakaan"
      activeNav="Anggota"
    >
      <AdminMembers siswa={allSiswa} />
    </DashboardShell>
  );
}
