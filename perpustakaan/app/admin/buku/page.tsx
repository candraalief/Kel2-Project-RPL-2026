import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getBooks } from "@/modules/library/lib/data";
import { BooksTable, SectionCard } from "@/modules/library/ui/library-cards";

export default async function AdminBooksPage() {
  const user = await requireRole("admin");
  const books = await getBooks();

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Modul Buku"
      description="Daftar koleksi buku, stok, penulis, penerbit, dan lokasi rak."
      activeNav="Buku"
    >
      <SectionCard title="Data buku" subtitle="Koleksi perpustakaan">
        <BooksTable books={books} />
      </SectionCard>
    </DashboardShell>
  );
}
