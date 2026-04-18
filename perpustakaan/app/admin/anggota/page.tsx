import {
  getAllSiswaAccounts,
  getPendingSiswaRegistrations,
} from "@/modules/access/lib/student-registration";
import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { ApproveSiswaForm } from "@/modules/access/ui/approve-siswa-form";
import { ClearSiswaPasswordForm } from "@/modules/access/ui/clear-siswa-password-form";
import { EmptyState, SectionCard } from "@/modules/library/ui/library-cards";

export default async function AdminMembersPage() {
  const user = await requireRole("admin");
  const [pendingSiswa, allSiswa] = await Promise.all([
    getPendingSiswaRegistrations(),
    getAllSiswaAccounts(),
  ]);

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Anggota"
      description="Kelola data siswa, verifikasi akun baru, dan kosongkan password lama agar siswa bisa mengatur password baru sendiri."
      activeNav="Anggota"
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Verifikasi siswa"
          subtitle="Pendaftaran yang menunggu persetujuan"
        >
          <div className="space-y-4">
            {pendingSiswa.length === 0 ? (
              <EmptyState text="Tidak ada akun siswa yang menunggu verifikasi." />
            ) : (
              pendingSiswa.map((siswa) => (
                <div
                  key={siswa.id_siswa}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="grid gap-1 text-sm text-zinc-600">
                      <p className="text-lg font-semibold text-zinc-900">
                        {siswa.nama}
                      </p>
                      <p>NISN: {siswa.nisn ?? "-"}</p>
                      <p>Username: {siswa.username ?? "-"}</p>
                      <p>Email: {siswa.email ?? "-"}</p>
                      <p>Kelas: {siswa.kelas ?? "-"}</p>
                      <p>Status: {siswa.status_keanggotaan ?? "-"}</p>
                    </div>
                    <ApproveSiswaForm siswaId={siswa.id_siswa} />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Password siswa"
          subtitle="Admin hanya dapat mengosongkan password lama agar siswa bisa membuat password baru sendiri"
        >
          <div className="space-y-4">
            {allSiswa.length === 0 ? (
              <EmptyState text="Belum ada data siswa." />
            ) : (
              allSiswa.map((siswa) => (
                <div
                  key={siswa.id_siswa}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="mb-3 grid gap-1 text-sm text-zinc-600">
                    <p className="text-base font-semibold text-zinc-900">
                      {siswa.nama}
                    </p>
                    <p>Username: {siswa.username ?? "-"}</p>
                    <p>Email: {siswa.email ?? "-"}</p>
                    <p>Status: {siswa.status_keanggotaan ?? "-"}</p>
                    <p>
                      Password saat ini:{" "}
                      {siswa.password_tersedia
                        ? "Sudah diatur"
                        : "Dikosongkan admin / belum diatur"}
                    </p>
                  </div>
                  <ClearSiswaPasswordForm siswaId={siswa.id_siswa} />
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}
