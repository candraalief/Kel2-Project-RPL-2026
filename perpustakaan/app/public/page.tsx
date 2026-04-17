import { getSessionUser } from "@/modules/access/lib/session";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getAttendanceRecords, getBooks } from "@/modules/library/lib/data";
import { MetricCard, SectionCard } from "@/modules/library/ui/library-cards";

export default async function PublicPage() {
  const sessionUser = await getSessionUser();
  const [books, attendance] = await Promise.all([
    getBooks(),
    getAttendanceRecords(5),
  ]);
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
      title="Beranda Pengunjung"
      description="Akses cepat ke absensi pengunjung dan katalog buku yang tersedia di perpustakaan."
      activeNav="Beranda"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total buku" value={books.length} />
        <MetricCard label="Kunjungan terbaru" value={attendance.length} />
        <MetricCard
          label="Buku tersedia"
          value={books.filter((item) => (item.stok_buku ?? 0) > 0).length}
        />
        <MetricCard label="Akses" value="Publik" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Navigasi cepat" subtitle="Fitur pengunjung">
          <div className="grid gap-3 md:grid-cols-2">
            <QuickLink href="/public/absensi" title="Isi absensi pengunjung" />
            <QuickLink href="/public/katalog" title="Lihat katalog buku" />
          </div>
        </SectionCard>

        <SectionCard title="Kunjungan terbaru" subtitle="Aktivitas publik">
          <div className="space-y-3">
            {attendance.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada kunjungan terbaru.</p>
            ) : (
              attendance.map((item) => (
                <div
                  key={item.id_absensi}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4"
                >
                  <p className="font-medium text-zinc-900">{item.nama}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {item.tujuan ?? "-"}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {item.waktu_kunjungan ?? "-"}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </DashboardShell>
  );
}

function QuickLink({ href, title }: { href: string; title: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
    >
      {title}
    </a>
  );
}
