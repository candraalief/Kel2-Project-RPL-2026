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
      description="Perbarui data akun siswa agar identitas dan kontak perpustakaan tetap sesuai."
      activeNav="Profil"
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Edit profil"
          subtitle="Data ini digunakan untuk akun perpustakaan siswa"
        >
          {siswa ? (
            <UpdateSiswaProfileForm siswa={siswa} />
          ) : (
            <EmptyState text="Data profil siswa tidak ditemukan." />
          )}
        </SectionCard>

        <SectionCard
          title="Informasi akun"
          subtitle="Ringkasan data yang sedang dipakai pada session"
        >
          <div className="grid gap-3 text-sm leading-7 text-zinc-600">
            <p>Nama siswa: {user.name}</p>
            <p>Identifier session: {user.identifier}</p>
            <p>Kelas saat ini: {user.className ?? "-"}</p>
            <p>Akses: siswa terverifikasi</p>
            <p>
              Catatan: jika username, email, atau kelas diubah dan berhasil
              disimpan, tampilan sidebar akan ikut diperbarui otomatis.
            </p>
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
