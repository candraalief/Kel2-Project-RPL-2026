"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "@/modules/access/lib/session";
import type { SiswaActiveBorrowingItem } from "@/modules/library/lib/data";

const dayInMs = 24 * 60 * 60 * 1000;

type SiswaDashboardProps = {
  user: SessionUser;
  activeItems: SiswaActiveBorrowingItem[];
  todayDate: string;
};

type DueInfo = {
  label: string;
  tone: "good" | "warn" | "danger";
};

type QuickAction = {
  href: string;
  title: string;
  description: string;
  label: string;
};

function dateTimeToTime(value: string) {
  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getTime();
  }

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return Date.UTC(year, month - 1, day);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getDueInfo(dueDate: string, todayDate: string): DueInfo {
  const dueTime = dateTimeToTime(dueDate);
  const todayTime = dateTimeToTime(todayDate);

  if (dueTime === null || todayTime === null) {
    return {
      label: "Tanggal belum valid",
      tone: "warn",
    };
  }

  const days = Math.round((dueTime - todayTime) / dayInMs);

  if (days < 0) {
    return {
      label: `Terlambat ${Math.abs(days)} hari`,
      tone: "danger",
    };
  }

  if (days === 0) {
    return {
      label: "Jatuh tempo hari ini",
      tone: "danger",
    };
  }

  if (days <= 2) {
    return {
      label: `${days} hari lagi`,
      tone: "warn",
    };
  }

  return {
    label: `${days} hari lagi`,
    tone: "good",
  };
}

function sortBorrowingItems(items: SiswaActiveBorrowingItem[]) {
  return [...items].sort((first, second) => {
    const firstTime = dateTimeToTime(first.dueDate) ?? Number.MAX_SAFE_INTEGER;
    const secondTime = dateTimeToTime(second.dueDate) ?? Number.MAX_SAFE_INTEGER;

    return firstTime - secondTime;
  });
}

function Icon({ label }: { label: string }) {
  const className = "h-5 w-5";

  if (label === "Katalog") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 6.5A2.5 2.5 0 017.5 4H20v14H7.5A2.5 2.5 0 005 20.5V6.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 8h8M8 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Absensi") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5V7M16 3.5V7M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Peminjaman") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M7 4h10a2 2 0 012 2v14H7a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 9h6M9 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (label === "Riwayat") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M5 12a7 7 0 111.8 4.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 17v-5h5M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19c1.6-3 4-4.5 7-4.5s5.4 1.5 7 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

function ProfileStrip({ user }: { user: SessionUser }) {
  return (
    <section className="flex justify-start">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:w-auto sm:min-w-80">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Informasi Akun
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf5ff] text-sm font-semibold text-[#1768d8]">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-950">
              Nama: {user.name}
            </p>
            <p className="truncate text-sm text-zinc-500">
              {user.className ?? "Kelas belum diisi"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeadlineListCard({
  items,
  todayDate,
}: {
  items: SiswaActiveBorrowingItem[];
  todayDate: string;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1768d8]">
          Deadline Terdekat
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-950">
          Tidak ada peminjaman aktif
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Semua buku yang tercatat untuk akun ini sudah selesai dikembalikan.
        </p>
        <Link
          href="/siswa/katalog"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#1768d8] px-4 text-sm font-semibold text-white transition hover:bg-[#1258ba] active:scale-[0.99]"
        >
          Buka Katalog
        </Link>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1768d8]">
            Deadline Terdekat
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
            Peminjaman aktif
          </h2>
        </div>
        <Link
          href="/siswa/peminjaman"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:border-[#b9d3ff] hover:bg-zinc-50 active:scale-[0.99]"
        >
          Lihat semua
        </Link>
      </div>

      <div className="hidden grid-cols-[1.5fr_0.55fr_1.2fr] bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
        <span>Judul Buku</span>
        <span>Jumlah</span>
        <span>Status Deadline</span>
      </div>

      <div>
        {items.map((item) => {
          const dueInfo = getDueInfo(item.dueDate, todayDate);
          const badgeClass = {
            good: "bg-emerald-50 text-emerald-700",
            warn: "bg-amber-50 text-amber-700",
            danger: "bg-red-50 text-red-700",
          }[dueInfo.tone];

          return (
            <Link
              key={item.key}
              href="/siswa/peminjaman"
              className="grid gap-3 border-t border-zinc-200 px-5 py-4 text-sm transition hover:bg-[#f8fbff] active:bg-[#edf5ff] md:grid-cols-[1.5fr_0.55fr_1.2fr] md:items-center"
            >
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold text-zinc-950">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Transaksi #{item.transactionId}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-lg bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#0b55ff]">
                {item.quantity} buku
              </span>
              <span className={`inline-flex w-fit rounded-lg px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                Kembali {formatDate(item.dueDate)} - {dueInfo.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function QuickActionCard({
  action,
  loading,
  onNavigate,
}: {
  action: QuickAction;
  loading: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <Link
      href={action.href}
      onClick={() => onNavigate(action.href)}
      className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d3ff] hover:shadow-md active:translate-y-0 active:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf5ff] text-[#1768d8] transition group-hover:bg-[#1768d8] group-hover:text-white">
          {loading ? <Spinner /> : <Icon label={action.label} />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-950">
            {action.title}
          </span>
          <span className="mt-1 block text-sm leading-5 text-zinc-500">
            {loading ? "Memuat halaman..." : action.description}
          </span>
        </span>
      </div>
    </Link>
  );
}

export function SiswaDashboard({
  user,
  activeItems,
  todayDate,
}: SiswaDashboardProps) {
  const [navigatingTo, setNavigatingTo] = useState("");
  const sortedItems = sortBorrowingItems(activeItems);
  const quickActions: QuickAction[] = [
    {
      href: "/siswa/katalog",
      title: "Katalog Buku",
      description: "Cari buku di perpustakaan.",
      label: "Katalog",
    },
    {
      href: "/siswa/absensi",
      title: "Absensi",
      description: "Catat kunjungan perpustakaan.",
      label: "Absensi",
    },
    {
      href: "/siswa/peminjaman",
      title: "Peminjaman & Riwayat",
      description: "Pantau deadline dan riwayat.",
      label: "Peminjaman",
    },
    {
      href: "/siswa/profil",
      title: "Profil",
      description: "Kelola data akun.",
      label: "Profil",
    },
  ];

  return (
    <div className="space-y-5">
      <ProfileStrip user={user} />

      <section>
        <DeadlineListCard items={sortedItems} todayDate={todayDate} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Navigasi Cepat
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
            Fitur utama siswa
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.href}
              action={action}
              loading={navigatingTo === action.href}
              onNavigate={setNavigatingTo}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
