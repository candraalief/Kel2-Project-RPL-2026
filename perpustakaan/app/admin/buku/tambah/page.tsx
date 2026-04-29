import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getCatalogGenres } from "@/modules/library/lib/catalog";
import { AdminCatalogCreatePage } from "@/modules/library/ui/admin-catalog-forms";

export default async function AdminCatalogCreateRoute() {
  const user = await requireRole("admin");
  const genres = await getCatalogGenres();

  return (
    <DashboardShell
      role="admin"
      user={user}
      title="Katalog - Tambah Katalog"
      description="Tambahkan buku baru dan kelola genre katalog perpustakaan."
      activeNav="Buku"
    >
      <AdminCatalogCreatePage genres={genres} />
    </DashboardShell>
  );
}
