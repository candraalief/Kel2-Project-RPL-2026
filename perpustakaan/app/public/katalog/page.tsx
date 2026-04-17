import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSessionUser } from "@/modules/access/lib/session";
import { getBooks } from "@/modules/library/lib/data";
import { BooksTable, SectionCard } from "@/modules/library/ui/library-cards";

export default async function PublicCatalogPage() {
  const sessionUser = await getSessionUser();
  const books = await getBooks();
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
      title="Katalog Publik"
      description="Telusuri koleksi buku perpustakaan tanpa harus masuk sebagai siswa."
      activeNav="Katalog"
    >
      <SectionCard title="Katalog buku" subtitle="Daftar koleksi perpustakaan">
        <BooksTable books={books} />
      </SectionCard>
    </DashboardShell>
  );
}
