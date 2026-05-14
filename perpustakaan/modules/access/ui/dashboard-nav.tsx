"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import type { UserRole } from "../lib/session";

type NavItem = {
  label: string;
  href: string;
};

type DashboardNavProps = {
  activeNav: string;
  items: NavItem[];
  role: UserRole;
};

function NavIcon({ label }: { label: string }) {
  const iconClassName =
    "h-[15px] w-[15px] text-current [@media(max-height:680px)]:h-3.5 [@media(max-height:680px)]:w-3.5";

  if (label === "Beranda") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10.5V19h10v-8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (label === "Katalog" || label === "Buku" || label === "Katalog & Peminjaman") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={iconClassName} aria-hidden>
        <path d="M5 6.5A2.5 2.5 0 017.5 4H20v14H7.5A2.5 2.5 0 005 20.5V6.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M5 6.5A2.5 2.5 0 017.5 4H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (
    label === "Riwayat" ||
    label === "Peminjaman" ||
    label === "Peminjaman & Riwayat" ||
    label === "Pengembalian" ||
    label === "Peminjaman & Pengembalian"
  ) {
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

function isItemActive(item: NavItem, activeNav: string) {
  return (
    item.label === activeNav ||
    ((item.label === "Katalog" || item.label === "Katalog & Peminjaman") &&
      activeNav === "Buku") ||
    ((item.label === "Peminjaman & Pengembalian" ||
      item.label === "Pengembalian") &&
      (activeNav === "Peminjaman" || activeNav === "Pengembalian"))
  );
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

export function DashboardNav({ activeNav, items, role }: DashboardNavProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  return (
    <div className="mt-[clamp(0.75rem,2.5vh,1.5rem)] shrink-0 space-y-1">
      {items.map((item) => {
        const isActive = isItemActive(item, activeNav);
        const isPending = pendingHref === item.href && pathname !== item.href;
        const isHighlighted = isActive || isPending;

        return (
          <Link
            key={`${role}-${item.label}`}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-busy={isPending}
            onClick={(event) => {
              if (isModifiedClick(event) || pathname === item.href) {
                return;
              }

              setPendingHref(item.href);
            }}
            className={`group flex items-center gap-2.5 rounded-xl px-3 py-[clamp(0.4rem,1.2vh,0.625rem)] text-[13px] font-medium transition ${
              isHighlighted
                ? "bg-[#e6f0ff] text-[#0e53b7] shadow-[0_8px_20px_rgba(2,31,84,0.15)]"
                : "text-[#dbeaff] hover:bg-white/10 hover:text-white"
            }`}
          >
            <span
              className={
                isHighlighted
                  ? "text-[#0e53b7]"
                  : "text-[#dbeaff] group-hover:text-white"
              }
            >
              <NavIcon label={item.label} />
            </span>
            <span className="min-w-0 leading-tight">
              {item.label === "Beranda" && role === "siswa"
                ? "Dashboard Siswa"
                : item.label}
            </span>
            {isPending ? (
              <span
                className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#b9d4ff] border-t-[#0e53b7]"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
