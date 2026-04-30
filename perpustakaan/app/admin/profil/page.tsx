import { requireRole } from "@/modules/access/lib/guards";
import {
  getAdminProfileById,
  getAdminProfiles,
  getAdminProfileStats,
} from "@/modules/access/lib/admin-profile";
import { AdminProfileForms } from "@/modules/access/ui/admin-profile-forms";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { EmptyState } from "@/modules/library/ui/library-cards";

export default async function AdminProfilePage() {
  const user = await requireRole("admin");
  const [admin, admins, stats] = await Promise.all([
    getAdminProfileById(user.id),
    getAdminProfiles(),
    getAdminProfileStats(),
  ]);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Profil Admin"
      description="Kelola profil admin, informasi akun, dan tambah akun admin baru."
      activeNav="Profil"
    >
      {admin ? (
        <AdminProfileForms
          admin={admin}
          admins={admins}
          totalAdmin={stats.totalAdmin}
          totalSiswa={stats.totalSiswa}
          canManageAdmins={user.id === 0}
        />
      ) : (
        <EmptyState text="Data profil admin tidak ditemukan." />
      )}
    </DashboardShell>
  );
}
