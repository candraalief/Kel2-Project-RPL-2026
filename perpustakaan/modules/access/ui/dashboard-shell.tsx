import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionUser, UserRole } from "../lib/session";
import { LogoutForm } from "./logout-form";

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
    { label: "Absensi", href: "/siswa/absensi" },
    { label: "Katalog", href: "/siswa/katalog" },
    { label: "Peminjaman", href: "/siswa/peminjaman" },
    { label: "Riwayat", href: "/siswa/riwayat" },
  ],
  public: [
    { label: "Beranda", href: "/public" },
    { label: "Absensi", href: "/public/absensi" },
    { label: "Katalog", href: "/public/katalog" },
    { label: "Masuk", href: "/" },
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
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(33,86,145,0.18)] lg:grid-cols-[250px_1fr]">
        <aside className="border-b border-zinc-200 bg-[#f4f9ff] px-5 py-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#145da0] text-sm font-semibold text-white">
              SB
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">SMAN 10 Bogor</p>
              <p className="text-xs text-zinc-500">Perpustakaan</p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            {navItems.map((item) => {
              const isActive = item.label === activeNav;

              return (
                <Link
                  key={`${role}-${item.label}`}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#dcecff] text-[#145da0]"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isActive ? "bg-[#145da0]" : "bg-zinc-300"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Session
            </p>
            <div className="mt-3 space-y-1 text-sm text-zinc-600">
              <p className="font-medium text-zinc-900">{user.name}</p>
              <p>{user.identifier}</p>
              {user.className ? <p>{user.className}</p> : null}
              <p className="text-[#145da0]">{getRoleBadge(role)}</p>
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
              <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-500">
                Pencarian
              </div>
              <LogoutForm />
            </div>
          </header>

          <div className="flex-1 overflow-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
