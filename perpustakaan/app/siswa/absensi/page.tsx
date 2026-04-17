import { submitSiswaAttendance } from "@/app/actions/attendance";
import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
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
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
            <p>Nama: {user.name}</p>
            <p>Kelas: {user.className ?? "-"}</p>
            <p>Tujuan: Kunjungan perpustakaan siswa</p>
          </div>
          <form action={submitSiswaAttendance}>
            <button
              type="submit"
              className="inline-flex rounded-full bg-[#6c3cff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#5a30db]"
            >
              Catat absensi saya
            </button>
          </form>
        </div>
      </SectionCard>
    </DashboardShell>
  );
}
