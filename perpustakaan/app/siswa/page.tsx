import { requireRole } from "@/modules/access/lib/guards";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";
import { getSiswaBorrowingSummary } from "@/modules/library/lib/data";
import { SiswaDashboard } from "@/modules/library/ui/siswa-dashboard";

export default async function SiswaDashboardPage() {
  const user = await requireRole("siswa");
  const borrowingSummary = await getSiswaBorrowingSummary(user.id);
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <DashboardShell
      role="siswa"
      user={user}
      title="Dashboard Utama"
      description=""
      activeNav="Beranda"
    >
      <SiswaDashboard
        user={user}
        activeItems={borrowingSummary.activeItems}
        todayDate={todayDate}
      />
    </DashboardShell>
  );
}
