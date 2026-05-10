import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSessionUser } from "@/modules/access/lib/session";
import { getAdminCatalogData } from "@/modules/library/lib/catalog";
import { AdminCatalog } from "@/modules/library/ui/admin-catalog";
import { BorrowCartProvider } from "@/store/use-cart-store";

export default async function PublicCatalogPage() {
  const sessionUser = await getSessionUser();
  const catalogData = await getAdminCatalogData();
  const publicUser = sessionUser ?? {
    id: 0,
    role: "public" as const,
    name: "Monitor Publik",
    identifier: "public",
  };

  return (
    <BorrowCartProvider>
      <DashboardShell
        role="public"
        user={publicUser}
        title="Katalog Publik"
        description="Telusuri koleksi buku perpustakaan tanpa harus masuk sebagai siswa."
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
