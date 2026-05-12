import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { UpdateSiswaProfileForm } from "@/modules/access/ui/update-siswa-profile-form";
import { getStudentById } from "@/modules/library/lib/data";
import { EmptyState, SectionCard } from "@/modules/library/ui/library-cards";

export default async function SiswaProfilePage() {
  const user = await requireRole("siswa");
  const siswa = await getStudentById(user.id);

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Profil Siswa"
      description="Lihat dan ubah detail profil siswa"
      activeNav="Profil"
    >
      <section className="max-w-3xl">
        <SectionCard
          title="Edit profil"
        >
          {siswa ? (
            <UpdateSiswaProfileForm siswa={siswa} />
          ) : (
            <EmptyState text="Data profil siswa tidak ditemukan." />
          )}
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
