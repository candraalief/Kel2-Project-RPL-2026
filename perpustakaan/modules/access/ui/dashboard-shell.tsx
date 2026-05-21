"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { SessionUser, UserRole } from "../lib/session";
import { DashboardNav } from "./dashboard-nav";
import { LogoutForm } from "./logout-form";
import { PageTransition } from "./page-transition";

type DashboardShellProps = {
  role: UserRole;
  user: SessionUser;
  title: string;
  description: string;
  activeNav: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
};

const navByRole: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Beranda", href: "/admin" },
    { label: "Profil", href: "/admin/profil" },
    { label: "Anggota", href: "/admin/anggota" },
    { label: "Absensi", href: "/admin/absensi" },
    { label: "Katalog & Peminjaman", href: "/admin/buku" },
    { label: "Pengembalian", href: "/admin/pengembalian" },
    { label: "Laporan", href: "/admin/laporan" },
  ],
  siswa: [
    { label: "Beranda", href: "/siswa" },
    { label: "Profil", href: "/siswa/profil" },
    { label: "Absensi", href: "/siswa/absensi" },
    { label: "Katalog", href: "/siswa/katalog" },
    { label: "Peminjaman & Riwayat", href: "/siswa/peminjaman" },
  ],
  public: [
    { label: "Absensi", href: "/public/absensi" },
    { label: "Katalog", href: "/public/katalog" },
  ],
};

function getRoleBadge(role: UserRole) {
  if (role === "admin") {
    return "Admin";
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

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="flex h-[clamp(2rem,5vh,2.5rem)] w-[clamp(2rem,5vh,2.5rem)] shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/10 text-sm font-semibold text-white">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5V5.5z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M4 5.5A2.5 2.5 0 016.5 3H20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f0ff] text-sm font-semibold text-[#0e53b7]">
      {name.trim().charAt(0).toUpperCase() || "U"}
    </span>
  );
}

export function DashboardShell({
  role,
  user,
  title,
  description,
  activeNav,
  headerActions,
  children,
}: DashboardShellProps) {
  const navItems = navByRole[role];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  return (
    <main className="h-dvh overflow-hidden bg-[#fbfdff] text-zinc-900">
      <PageTransition>
        <div className="grid h-dvh w-full overflow-hidden bg-white md:grid-cols-[250px_1fr]">
          {drawerOpen ? (
            <button
              type="button"
              aria-label="Tutup navigasi"
              className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-[1px] transition md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
          ) : null}

          <aside
            id={drawerId}
            className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-2rem))] min-h-0 flex-col overflow-hidden border-r border-[#2a6ecf] bg-[linear-gradient(180deg,#0f5fc4_0%,#0a4ead_100%)] px-4 py-4 text-white shadow-2xl transition-transform duration-300 ease-out md:relative md:z-auto md:h-full md:w-auto md:translate-x-0 md:border-r md:shadow-none ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex shrink-0 items-center gap-2.5">
              <BrandMark />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-5 text-white">
                  Perpustakaan Sekolah
                </p>
                <p className="text-[11px] text-[#b7d7ff]">SMAN 10 Bogor</p>
              </div>
              <button
                type="button"
                aria-label="Tutup menu navigasi"
                className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 md:hidden"
                onClick={() => setDrawerOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <DashboardNav activeNav={activeNav} items={navItems} role={role} />

            <div className="mt-auto shrink-0 space-y-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-[clamp(0.6rem,1.5vh,1rem)] backdrop-blur-sm">
                <LogoutForm role={role} />
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-[clamp(0.6rem,1.5vh,1rem)] backdrop-blur-sm">
                <p className="text-[11px] font-semibold text-[#dbeaff]">
                  Butuh bantuan?
                </p>
                <div className="mt-1.5 space-y-1 text-[11px] text-[#b8d7ff]">
                  <p>Hubungi pustakawan</p>
                </div>

                <div className="mt-[clamp(0.5rem,1.5vh,1rem)] space-y-1 text-[11px] leading-4 text-[#dbeaff]">
                  <p>
                    Active Session :{" "}
                    <span className="font-semibold text-white">{user.name}</span>
                  </p>
                  <p>
                    Roles :{" "}
                    <span className="font-semibold text-white">
                      {getSessionRoleLabel(role)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col bg-[#fbfdff]">
            <header className="shrink-0 border-b border-zinc-200 px-4 py-3 sm:px-6 md:py-4">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:hidden">
                <button
                  type="button"
                  aria-label="Buka menu navigasi"
                  aria-controls={drawerId}
                  aria-expanded={drawerOpen}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => setDrawerOpen(true)}
                >
                  <MenuIcon />
                </button>

                <div className="min-w-0 text-center">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    Perpustakaan Sekolah
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    SMAN 10 Bogor
                  </p>
                </div>

                <div className="flex min-w-11 items-center justify-end">
                  {headerActions ? headerActions : <UserAvatar name={user.name} />}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:mt-0 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {getRoleBadge(role)}
                  </p>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                      {description}
                    </p>
                  ) : null}
                </div>

                {headerActions ? (
                  <div className="hidden flex-wrap items-center gap-3 md:flex">
                    {headerActions}
                  </div>
                ) : null}
              </div>
            </header>

            <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 md:px-6 md:py-5">
              {children}
            </div>
          </div>
        </div>
      </PageTransition>
    </main>
  );
}
