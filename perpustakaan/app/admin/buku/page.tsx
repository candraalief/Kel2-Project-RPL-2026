import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getStudents } from "@/modules/library/lib/data";
import { getAdminCatalogData } from "@/modules/library/lib/catalog";
import { AdminCatalog } from "@/modules/library/ui/admin-catalog";
import { CartButton } from "@/modules/library/ui/cart-button";
import { BorrowCartProvider } from "@/store/use-cart-store";

export default async function AdminBooksPage() {
  const user = await requireRole("admin");
  const [catalogData, students] = await Promise.all([
    getAdminCatalogData(),
    getStudents(),
  ]);
  const activeStudents = students
    .filter((student) => student.status_keanggotaan === "aktif")
    .map((student) => ({
      id: student.id_siswa,
      name: student.nama,
      nisn: student.nisn,
      className: student.kelas,
    }));

  return (
    <BorrowCartProvider>
      <DashboardShell
        role="admin"
        user={user}
        title="Katalog"
        description="Kelola koleksi buku, genre, copy, dan detail rak perpustakaan."
        activeNav="Buku"
        headerActions={<CartButton />}
      >
        <AdminCatalog
          books={catalogData.books}
          genres={catalogData.genres}
          students={activeStudents}
          adminName={user.name}
        />
      </DashboardShell>
    </BorrowCartProvider>
  );
}
