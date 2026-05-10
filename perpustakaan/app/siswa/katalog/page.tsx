import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getAdminCatalogData } from "@/modules/library/lib/catalog";
import { AdminCatalog } from "@/modules/library/ui/admin-catalog";
import { BorrowCartProvider } from "@/store/use-cart-store";

export default async function SiswaCatalogPage() {
  const user = await requireRole("siswa");
  const catalogData = await getAdminCatalogData();

  return (
    <BorrowCartProvider>
      <DashboardShell
        role="siswa"
        user={user}
        title="Katalog Buku"
        description="Telusuri koleksi buku perpustakaan, stok, dan lokasi rak."
        activeNav="Katalog"
      >
        <AdminCatalog
          books={catalogData.books}
          genres={catalogData.genres}
          readOnly
        />
      </DashboardShell>
    </BorrowCartProvider>
  );
}
