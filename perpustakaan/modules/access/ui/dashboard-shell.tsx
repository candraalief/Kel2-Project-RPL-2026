import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionUser, UserRole } from "../lib/session";
import { LogoutForm } from "./logout-form";
import { PageTransition } from "./page-transition";

type DashboardShellProps = {
  role: UserRole;
  user: SessionUser;
  title: string;
  description: string;
  activeNav: string;
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
};

function NavIcon({ label }: { label: string }) {
  const iconClassName = "h-[15px] w-[15px] text-[#d6e8ff]";

  if (label === "Beranda") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (label === "Katalog" || label === "Buku") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <path d="M5 6.5A2.5 2.5 0 017.5 4H20v14H7.5A2.5 2.5 0 005 20.5V6.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M5 6.5A2.5 2.5 0 017.5 4H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Riwayat" || label === "Peminjaman" || label === "Pengembalian") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Absensi") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5V7M16 3.5V7M8 11h3m3 0h2M8 15h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Profil" || label === "Anggota") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Laporan") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <path d="M5 19V8m5 11V5m5 14v-7m4 7H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Beranda", href: "/admin" },
    { label: "Buku", href: "/admin/buku" },
    { label: "Anggota", href: "/admin/anggota" },
    { label: "Peminjaman", href: "/admin/peminjaman" },
    { label: "Pengembalian", href: "/admin/pengembalian" },
    { label: "Absensi", href: "/admin/absensi" },
    { label: "Laporan", href: "/admin/laporan" },
  ],
  siswa: [
    { label: "Beranda", href: "/siswa" },
    { label: "Profil", href: "/siswa/profil" },
    { label: "Absensi", href: "/siswa/absensi" },
    { label: "Katalog", href: "/siswa/katalog" },
    { label: "Peminjaman", href: "/siswa/peminjaman" },
    { label: "Riwayat", href: "/siswa/riwayat" },
  ],
  public: [
    { label: "Absensi", href: "/public/absensi" },
    { label: "Katalog", href: "/public/katalog" },
  ],
};

function getRoleBadge(role: UserRole) {
  if (role === "admin") {
    return "Administrator";
  }

  if (role === "siswa") {
    return "Siswa";
  }

  return "Publik";
}

function getSessionRoleLabel(role: UserRole) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "siswa") {
    return "Siswa";
  }

  return "Public";
}

export function DashboardShell({
  role,
  user,
  title,
  description,
  activeNav,
  children,
}: DashboardShellProps) {
  const navItems = navByRole[role];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#d8e7f8_0%,#e7f1fb_28%,#f3f8fd_100%)] p-4 text-zinc-900 sm:p-6">
      <PageTransition>
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(33,86,145,0.18)] lg:grid-cols-[250px_1fr]">
        <aside className="relative border-b border-[#1a5fc5] bg-[linear-gradient(180deg,#0f5fc4_0%,#0a4ead_100%)] px-4 py-6 text-white lg:border-b-0 lg:border-r lg:border-[#2a6ecf]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-sm font-semibold text-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5V5.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M4 5.5A2.5 2.5 0 016.5 3H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold leading-5 text-white">Perpustakaan Sekolah</p>
              <p className="text-xs text-[#b7d7ff]">{user.className ?? "SMP Negeri 1"}</p>
            </div>
          </div>

          <div className="mt-8 space-y-1.5">
            {navItems.map((item) => {
              const isActive = item.label === activeNav;

              return (
                <Link
                  key={`${role}-${item.label}`}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#e6f0ff] text-[#0e53b7] shadow-[0_8px_20px_rgba(2,31,84,0.15)]"
                      : "text-[#dbeaff] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={`${isActive ? "text-[#0e53b7]" : "text-[#dbeaff] group-hover:text-white"}`}>
                    <NavIcon label={item.label} />
                  </span>
                  <span>{item.label === "Beranda" && role === "siswa" ? "Dashboard Siswa" : item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#dbeaff]">Butuh bantuan?</p>
            <div className="mt-2 space-y-1 text-xs text-[#b8d7ff]">
              <p>Hubungi pustakawan</p>
            </div>

            <div className="mt-4 space-y-1 text-xs text-[#dbeaff]">
              <p>
                Active Session : <span className="font-semibold text-white">{user.name}</span>
              </p>
              <p>
                Roles : <span className="font-semibold text-white">{getSessionRoleLabel(role)}</span>
              </p>
            </div>
          </div>
        </aside>

          <div className="flex min-w-0 flex-col bg-[#fbfdff]">
          <header className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {getRoleBadge(role)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                {title}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LogoutForm />
            </div>
          </header>

          <div className="flex-1 overflow-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
        </div>
      </PageTransition>
    </main>
  );
}
