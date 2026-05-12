import { redirect } from "next/navigation";
import { requireRole } from "@/modules/access/lib/guards";

export default async function SiswaHistoryPage() {
  await requireRole("siswa");
  redirect("/siswa/peminjaman");
}
