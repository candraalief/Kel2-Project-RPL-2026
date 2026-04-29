import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getAdminCatalogData } from "@/modules/library/lib/catalog";
import { AdminCatalog } from "@/modules/library/ui/admin-catalog";

export default async function AdminBooksPage() {
  const user = await requireRole("admin");
  const catalogData = await getAdminCatalogData();

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Katalog"
      description="Kelola koleksi buku, genre, copy, dan detail rak perpustakaan."
      activeNav="Buku"
    >
      <AdminCatalog books={catalogData.books} genres={catalogData.genres} />
    </DashboardShell>
  );
}
