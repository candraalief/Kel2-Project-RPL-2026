"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  submitSiswaAttendance,
  type AttendanceState,
} from "@/app/actions/attendance";
import type { SessionUser } from "@/modules/access/lib/session";
import type {
  AbsensiRecord,
  TransaksiRecord,
} from "@/modules/library/lib/data";

const initialAttendanceState: AttendanceState = {
  error: "",
  success: "",
};

const dayInMs = 24 * 60 * 60 * 1000;

type SiswaDashboardProps = {
  user: SessionUser;
  totalBooks: number;
  totalTransactions: number;
  activeTransactions: TransaksiRecord[];
  activeBookCount: number;
  lastAttendance: AbsensiRecord | null;
  todayDate: string;
};

type DueInfo = {
  days: number;
  label: string;
  tone: "good" | "warn" | "danger";
};

type QuickAction = {
  href: string;
  title: string;
  description: string;
  label: string;
};

function dateOnlyToUtcTime(value: string) {
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
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getDueInfo(dueDate: string, todayDate: string): DueInfo {
  const dueTime = dateOnlyToUtcTime(dueDate);
  const todayTime = dateOnlyToUtcTime(todayDate);

  if (dueTime === null || todayTime === null) {
    return {
      days: 0,
      label: "Tanggal belum valid",
      tone: "warn",
    };
  }

  const days = Math.round((dueTime - todayTime) / dayInMs);

  if (days < 0) {
    return {
      days,
      label: `Terlambat ${Math.abs(days)} hari`,
      tone: "danger",
    };
  }

  if (days === 0) {
    return {
      days,
      label: "Jatuh tempo hari ini",
      tone: "danger",
    };
  }

  if (days <= 2) {
    return {
      days,
      label: `${days} hari lagi`,
      tone: "warn",
    };
  }

  return {
    days,
    label: `${days} hari lagi`,
    tone: "good",
  };
}

function sortByNearestDue(transactions: TransaksiRecord[]) {
  return [...transactions].sort((first, second) => {
    const firstTime = dateOnlyToUtcTime(first.tanggal_jatuh_tempo) ?? Number.MAX_SAFE_INTEGER;
    const secondTime = dateOnlyToUtcTime(second.tanggal_jatuh_tempo) ?? Number.MAX_SAFE_INTEGER;

    return firstTime - secondTime;
  });
}

function getStatusText(transaction: TransaksiRecord, todayDate: string) {
  const dueInfo = getDueInfo(transaction.tanggal_jatuh_tempo, todayDate);

  return transaction.status ? `${transaction.status} - ${dueInfo.label}` : dueInfo.label;
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

function Feedback({
  tone,
  message,
}: {
  tone: "success" | "error" | "loading";
  message: string;
}) {
  const className = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    loading: "border-sky-200 bg-sky-50 text-sky-700",
  }[tone];

  return (
    <p className={`rounded-xl border px-4 py-3 text-sm font-medium ${className}`}>
      {message}
    </p>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  href,
  tone = "blue",
  loading = false,
  onClick,
}: {
  label: string;
  value: string | number;
  caption: string;
  href?: string;
  tone?: "blue" | "green" | "amber" | "zinc";
  loading?: boolean;
  onClick?: () => void;
}) {
  const toneClass = {
    blue: "bg-[#edf5ff] text-[#1768d8]",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-700",
    zinc: "bg-zinc-100 text-zinc-700",
  }[tone];
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          {loading ? <Spinner /> : <Icon label={label} />}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold leading-none text-zinc-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-zinc-500">{caption}</p>
    </>
  );
  const className =
    "group block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d3ff] hover:shadow-md active:translate-y-0 active:shadow-sm";

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

function DeadlineCard({
  activeTransactions,
  activeBookCount,
  todayDate,
}: {
  activeTransactions: TransaksiRecord[];
  activeBookCount: number;
  todayDate: string;
}) {
  const nearestTransaction = activeTransactions[0] ?? null;

  if (!nearestTransaction) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Deadline Pengembalian
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

  const dueInfo = getDueInfo(nearestTransaction.tanggal_jatuh_tempo, todayDate);
  const toneClass = {
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
  }[dueInfo.tone];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1768d8]">
            Deadline Terdekat
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
            {formatDate(nearestTransaction.tanggal_jatuh_tempo)}
          </h2>
          <div className={`mt-3 inline-flex rounded-xl border px-3 py-1.5 text-sm font-semibold ${toneClass}`}>
            {dueInfo.label}
          </div>
        </div>
        <div className="grid min-w-[220px] grid-cols-2 gap-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium text-zinc-500">Buku aktif</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{activeBookCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium text-zinc-500">Transaksi</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {activeTransactions.length}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
        <p>
          Peminjaman #{nearestTransaction.id_transaksi} - status{" "}
          <span className="font-semibold text-zinc-950">
            {nearestTransaction.status ?? "aktif"}
          </span>
        </p>
        <p>
          Tanggal pinjam: {formatDate(nearestTransaction.tanggal_pinjam)}
        </p>
      </div>
    </section>
  );
}

function ActiveLoansList({
  transactions,
  todayDate,
}: {
  transactions: TransaksiRecord[];
  todayDate: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
        Belum ada buku yang sedang dipinjam.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.slice(0, 4).map((transaction) => {
        const dueInfo = getDueInfo(transaction.tanggal_jatuh_tempo, todayDate);
        const badgeClass = {
          good: "bg-emerald-50 text-emerald-700",
          warn: "bg-amber-50 text-amber-700",
          danger: "bg-red-50 text-red-700",
        }[dueInfo.tone];

        return (
          <Link
            key={transaction.id_transaksi}
            href="/siswa/peminjaman"
            className="grid gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm transition hover:border-[#b9d3ff] hover:bg-[#f8fbff] active:scale-[0.995] md:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-semibold text-zinc-950">
                Peminjaman #{transaction.id_transaksi}
              </p>
              <p className="mt-1 text-zinc-500">
                Kembali paling lambat {formatDate(transaction.tanggal_jatuh_tempo)}
              </p>
            </div>
            <span className={`inline-flex h-8 w-fit items-center rounded-lg px-3 text-xs font-semibold ${badgeClass}`}>
              {getStatusText(transaction, todayDate)}
            </span>
          </Link>
        );
      })}
    </div>
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

function AttendanceActionCard({
  user,
  lastAttendance,
}: {
  user: SessionUser;
  lastAttendance: AbsensiRecord | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    submitSiswaAttendance,
    initialAttendanceState
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current && state?.success) {
      router.refresh();
    }

    wasPendingRef.current = false;
  }, [pending, router, state?.success]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Absensi Terakhir
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
            {lastAttendance
              ? formatDateTime(lastAttendance.waktu_kunjungan)
              : "Belum ada absensi"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {lastAttendance?.tujuan ?? `Akun aktif atas nama ${user.name}`}
          </p>
        </div>
        <form action={formAction} className="shrink-0">
          <input
            type="hidden"
            name="tujuan"
            value="Kunjungan perpustakaan siswa"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 min-w-44 items-center justify-center gap-2 rounded-xl bg-[#1768d8] px-4 text-sm font-semibold text-white transition hover:bg-[#1258ba] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? (
              <>
                <Spinner />
                Mencatat...
              </>
            ) : (
              "Catat absensi"
            )}
          </button>
        </form>
      </div>

      <div className="mt-4 space-y-2">
        {pending ? (
          <Feedback tone="loading" message="Absensi sedang disimpan." />
        ) : null}
        {state?.success ? <Feedback tone="success" message={state.success} /> : null}
        {state?.error ? <Feedback tone="error" message={state.error} /> : null}
      </div>
    </section>
  );
}

export function SiswaDashboard({
  user,
  totalBooks,
  totalTransactions,
  activeTransactions,
  activeBookCount,
  lastAttendance,
  todayDate,
}: SiswaDashboardProps) {
  const router = useRouter();
  const [navigatingTo, setNavigatingTo] = useState("");
  const [refreshMessage, setRefreshMessage] = useState("");
  const [isRefreshing, startRefreshTransition] = useTransition();
  const refreshFeedbackTimeoutRef = useRef<number | null>(null);
  const sortedActiveTransactions = useMemo(
    () => sortByNearestDue(activeTransactions),
    [activeTransactions]
  );
  const nearestDue = sortedActiveTransactions[0] ?? null;
  const nearestDueInfo = nearestDue
    ? getDueInfo(nearestDue.tanggal_jatuh_tempo, todayDate)
    : null;
  const quickActions: QuickAction[] = [
    {
      href: "/siswa/katalog",
      title: "Katalog Buku",
      description: "Search dan filter koleksi.",
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
      title: "Peminjaman",
      description: "Pantau buku aktif.",
      label: "Peminjaman",
    },
    {
      href: "/siswa/riwayat",
      title: "Riwayat",
      description: "Lihat transaksi selesai.",
      label: "Riwayat",
    },
    {
      href: "/siswa/profil",
      title: "Profil",
      description: "Kelola data akun.",
      label: "Profil",
    },
  ];

  function refreshDashboard() {
    if (refreshFeedbackTimeoutRef.current) {
      window.clearTimeout(refreshFeedbackTimeoutRef.current);
    }

    setRefreshMessage("");
    startRefreshTransition(() => {
      router.refresh();
    });
    refreshFeedbackTimeoutRef.current = window.setTimeout(() => {
      setRefreshMessage("Dashboard berhasil diperbarui.");

      refreshFeedbackTimeoutRef.current = window.setTimeout(() => {
        setRefreshMessage("");
      }, 3500);
    }, 450);
  }

  function startNavigation(href: string) {
    setNavigatingTo(href);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <DeadlineCard
          activeTransactions={sortedActiveTransactions}
          activeBookCount={activeBookCount}
          todayDate={todayDate}
        />

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Status Akun
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                {user.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {user.className ?? "Kelas belum diisi"} - akun aktif
              </p>
            </div>
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={isRefreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700 transition hover:border-[#b9d3ff] hover:bg-white active:scale-[0.99] disabled:cursor-wait disabled:text-zinc-400"
            >
              {isRefreshing ? <Spinner /> : null}
              {isRefreshing ? "Memuat..." : "Refresh"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-zinc-500">Username / Email</p>
              <p className="mt-1 font-semibold text-zinc-950">{user.identifier}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-zinc-500">Deadline utama</p>
              <p className="mt-1 font-semibold text-zinc-950">
                {nearestDueInfo?.label ?? "Tidak ada pinjaman aktif"}
              </p>
            </div>
          </div>

          {isRefreshing ? (
            <div className="mt-4">
              <Feedback tone="loading" message="Memuat ulang data dashboard." />
            </div>
          ) : null}
          {refreshMessage ? (
            <div className="mt-4">
              <Feedback tone="success" message={refreshMessage} />
            </div>
          ) : null}
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Peminjaman"
          value={activeBookCount}
          caption="Buku yang masih harus dikembalikan."
          href="/siswa/peminjaman"
          tone={activeBookCount > 0 ? "amber" : "green"}
          loading={navigatingTo === "/siswa/peminjaman"}
          onClick={() => startNavigation("/siswa/peminjaman")}
        />
        <SummaryCard
          label="Katalog"
          value={totalBooks}
          caption="Koleksi yang bisa dicari dan difilter."
          href="/siswa/katalog"
          tone="blue"
          loading={navigatingTo === "/siswa/katalog"}
          onClick={() => startNavigation("/siswa/katalog")}
        />
        <SummaryCard
          label="Riwayat"
          value={totalTransactions}
          caption="Total transaksi peminjaman akun ini."
          href="/siswa/riwayat"
          tone="zinc"
          loading={navigatingTo === "/siswa/riwayat"}
          onClick={() => startNavigation("/siswa/riwayat")}
        />
        <SummaryCard
          label="Absensi"
          value={lastAttendance ? "Ada" : "Kosong"}
          caption={lastAttendance ? formatDateTime(lastAttendance.waktu_kunjungan) : "Belum ada catatan."}
          href="/siswa/absensi"
          tone={lastAttendance ? "green" : "zinc"}
          loading={navigatingTo === "/siswa/absensi"}
          onClick={() => startNavigation("/siswa/absensi")}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Peminjaman Aktif
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                Deadline berikutnya
              </h2>
            </div>
            <Link
              href="/siswa/peminjaman"
              onClick={() => startNavigation("/siswa/peminjaman")}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 transition hover:border-[#b9d3ff] hover:bg-zinc-50 active:scale-[0.99]"
            >
              Lihat semua
            </Link>
          </div>
          <div className="mt-4">
            <ActiveLoansList
              transactions={sortedActiveTransactions}
              todayDate={todayDate}
            />
          </div>
        </section>

        <AttendanceActionCard user={user} lastAttendance={lastAttendance} />
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.href}
              action={action}
              loading={navigatingTo === action.href}
              onNavigate={startNavigation}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
