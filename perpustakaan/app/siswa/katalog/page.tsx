import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getBooks } from "@/modules/library/lib/data";
import { BooksTable, SectionCard } from "@/modules/library/ui/library-cards";

export default async function SiswaCatalogPage() {
  const user = await requireRole("siswa");
  const books = await getBooks();

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Katalog Buku"
      description="Telusuri koleksi buku perpustakaan, stok, dan lokasi rak."
      activeNav="Katalog"
    >
      <SectionCard title="Daftar buku" subtitle="Katalog perpustakaan">
        <BooksTable books={books} />
      </SectionCard>
    </DashboardShell>
  );
}
