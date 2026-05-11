import Link from "next/link";
import { getSessionUser } from "@/modules/access/lib/session";
import { DashboardShell } from "@/modules/access/ui/dashboard-shell";

type QuickAction = {
  href: string;
  title: string;
  description: string;
  label: "Absensi" | "Katalog";
};

const quickActions: QuickAction[] = [
  {
    href: "/public/absensi",
    title: "Isi Absensi",
    description: "Catat kunjungan perpustakaan.",
    label: "Absensi",
  },
  {
    href: "/public/katalog",
    title: "Katalog Buku",
    description: "Search dan filter koleksi.",
    label: "Katalog",
  },
];

export default async function PublicPage() {
  const sessionUser = await getSessionUser();
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
      title="Beranda Pengunjung"
      description="Akses cepat ke absensi pengunjung dan katalog buku yang tersedia di perpustakaan."
      activeNav="Beranda"
    >
      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Navigasi Cepat
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
            Fitur utama pengunjung
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:max-w-2xl">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d3ff] hover:shadow-md active:translate-y-0 active:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf5ff] text-[#1768d8] transition group-hover:bg-[#1768d8] group-hover:text-white">
          <QuickActionIcon label={action.label} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-950">
            {action.title}
          </span>
          <span className="mt-1 block text-sm leading-5 text-zinc-500">
            {action.description}
          </span>
        </span>
      </div>
    </Link>
  );
}

function QuickActionIcon({ label }: { label: QuickAction["label"] }) {
  const className = "h-5 w-5";

  if (label === "Katalog") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 6.5A2.5 2.5 0 017.5 4H20v14H7.5A2.5 2.5 0 005 20.5V6.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 8h8M8 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.5V7M16 3.5V7M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
