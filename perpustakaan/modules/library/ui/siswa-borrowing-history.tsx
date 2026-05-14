"use client";

import { useMemo, useState } from "react";
import type { SiswaDetailedTransactionRecord } from "@/modules/library/lib/data";
import {
  ButtonLoadingSpinner,
  useButtonPressLoading,
} from "@/modules/shared/ui/button-loading";

type BorrowingHistoryView = "active" | "history";

type SiswaBorrowingHistoryProps = {
  transactions: SiswaDetailedTransactionRecord[];
  todayDate: string;
};

const dayInMs = 24 * 60 * 60 * 1000;

function dateOnlyToUtcTime(value: string | null) {
  if (!value) {
    return null;
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
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getDaysBetween(from: string | null, to: string | null) {
  const fromTime = dateOnlyToUtcTime(from);
  const toTime = dateOnlyToUtcTime(to);

  if (fromTime === null || toTime === null) {
    return null;
  }

  return Math.round((toTime - fromTime) / dayInMs);
}

function getTotalBooks(transaction: SiswaDetailedTransactionRecord) {
  const total = transaction.items.reduce((sum, item) => sum + item.quantity, 0);

  return total > 0 ? total : 1;
}

function getBookTitleSummary(transaction: SiswaDetailedTransactionRecord) {
  if (transaction.items.length === 0) {
    return "Detail buku belum tersedia";
  }

  const [firstItem, ...otherItems] = transaction.items;

  if (otherItems.length === 0) {
    return firstItem.title;
  }

  return `${firstItem.title} +${otherItems.length} buku lain`;
}

function getDeadlineInfo(
  transaction: SiswaDetailedTransactionRecord,
  todayDate: string
) {
  const daysToDue = getDaysBetween(todayDate, transaction.tanggal_jatuh_tempo);

  if (transaction.tanggal_kembali) {
    const daysLate = getDaysBetween(
      transaction.tanggal_jatuh_tempo,
      transaction.tanggal_kembali
    );

    if (daysLate !== null && daysLate > 0) {
      return {
        label: `Dikembalikan ${formatDate(transaction.tanggal_kembali)} - terlambat ${daysLate} hari`,
        tone: "danger" as const,
      };
    }

    return {
      label: `Dikembalikan ${formatDate(transaction.tanggal_kembali)} - tepat waktu`,
      tone: "good" as const,
    };
  }

  if (daysToDue === null) {
    return {
      label: `Kembali ${formatDate(transaction.tanggal_jatuh_tempo)}`,
      tone: "warn" as const,
    };
  }

  if (daysToDue < 0) {
    return {
      label: `Kembali ${formatDate(transaction.tanggal_jatuh_tempo)} - terlambat ${Math.abs(daysToDue)} hari`,
      tone: "danger" as const,
    };
  }

  if (daysToDue === 0) {
    return {
      label: `Kembali ${formatDate(transaction.tanggal_jatuh_tempo)} - hari ini`,
      tone: "danger" as const,
    };
  }

  if (daysToDue <= 2) {
    return {
      label: `Kembali ${formatDate(transaction.tanggal_jatuh_tempo)} - ${daysToDue} hari lagi`,
      tone: "warn" as const,
    };
  }

  return {
    label: `Kembali ${formatDate(transaction.tanggal_jatuh_tempo)} - ${daysToDue} hari lagi`,
    tone: "good" as const,
  };
}

function getStatusLabel(transaction: SiswaDetailedTransactionRecord) {
  if (transaction.tanggal_kembali) {
    return "Selesai";
  }

  return transaction.status ?? "Aktif";
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 transition ${expanded ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeadlineBadge({
  transaction,
  todayDate,
}: {
  transaction: SiswaDetailedTransactionRecord;
  todayDate: string;
}) {
  const deadline = getDeadlineInfo(transaction, todayDate);
  const className = {
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  }[deadline.tone];

  return (
    <span className={`inline-flex w-fit rounded-lg px-3 py-1 text-xs font-semibold ${className}`}>
      {deadline.label}
    </span>
  );
}

function TransactionItemsPanel({
  transaction,
}: {
  transaction: SiswaDetailedTransactionRecord;
}) {
  if (transaction.items.length === 0) {
    return (
      <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-500">
        Detail buku untuk transaksi ini belum tersedia.
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
        Detail Buku
      </p>
      <div className="mt-3 grid gap-2">
        {transaction.items.map((item) => (
          <div
            key={item.key}
            className="grid gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 md:grid-cols-[1.4fr_0.5fr_1fr]"
          >
            <div>
              <p className="font-semibold text-zinc-950">{item.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {item.author ?? "Penulis tidak tersedia"}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-lg bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#0b55ff]">
              {item.quantity} buku
            </span>
            <span className="text-sm font-medium text-zinc-700">
              Deadline {formatDate(transaction.tanggal_jatuh_tempo)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiswaBorrowingHistory({
  transactions,
  todayDate,
}: SiswaBorrowingHistoryProps) {
  const [view, setView] = useState<BorrowingHistoryView>("active");
  const [expandedTransactionIds, setExpandedTransactionIds] = useState<Set<number>>(
    () => new Set()
  );
  const { loadingKey: loadingView, startLoading: startViewLoading } =
    useButtonPressLoading<BorrowingHistoryView>();

  const activeTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.tanggal_kembali === null)
        .sort((first, second) => {
          const firstTime =
            dateOnlyToUtcTime(first.tanggal_jatuh_tempo) ?? Number.MAX_SAFE_INTEGER;
          const secondTime =
            dateOnlyToUtcTime(second.tanggal_jatuh_tempo) ?? Number.MAX_SAFE_INTEGER;

          return firstTime - secondTime;
        }),
    [transactions]
  );
  const historyTransactions = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.tanggal_kembali !== null)
        .sort((first, second) => {
          const firstTime =
            dateOnlyToUtcTime(first.tanggal_kembali) ?? Number.MIN_SAFE_INTEGER;
          const secondTime =
            dateOnlyToUtcTime(second.tanggal_kembali) ?? Number.MIN_SAFE_INTEGER;

          return secondTime - firstTime;
        }),
    [transactions]
  );
  const visibleTransactions = view === "active" ? activeTransactions : historyTransactions;

  function toggleExpanded(transactionId: number) {
    setExpandedTransactionIds((current) => {
      const next = new Set(current);

      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }

      return next;
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">

        <div className="mt-4 grid gap-3 rounded-2xl bg-zinc-100 p-1.5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              startViewLoading("active");
              setView("active");
            }}
            aria-busy={loadingView === "active"}
            className={`inline-flex h-16 items-center justify-center gap-3 rounded-2xl text-base font-semibold transition ${
              view === "active"
                ? "bg-[#2567d8] text-white shadow-sm"
                : "bg-white text-zinc-950 hover:bg-zinc-50"
            }`}
          >
            {loadingView === "active" ? <ButtonLoadingSpinner /> : null}
            Peminjaman Aktif
            <span
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                view === "active"
                  ? "bg-white/20 text-white"
                  : "bg-[#dbeafe] text-[#2567d8]"
              }`}
            >
              {activeTransactions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              startViewLoading("history");
              setView("history");
            }}
            aria-busy={loadingView === "history"}
            className={`inline-flex h-16 items-center justify-center gap-3 rounded-2xl text-base font-semibold transition ${
              view === "history"
                ? "bg-[#2567d8] text-white shadow-sm"
                : "bg-white text-zinc-950 hover:bg-zinc-50"
            }`}
          >
            {loadingView === "history" ? <ButtonLoadingSpinner /> : null}
            Riwayat Peminjaman
            <span
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                view === "history"
                  ? "bg-white/20 text-white"
                  : "bg-[#dbeafe] text-[#2567d8]"
              }`}
            >
              {historyTransactions.length}
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[0.8fr_1.8fr_0.6fr_1.5fr_0.7fr] bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
          <span>Transaksi</span>
          <span>Buku</span>
          <span>Jumlah</span>
          <span>Deadline</span>
          <span>Status</span>
        </div>

        {visibleTransactions.length === 0 ? (
          <div className="border-t border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
            {view === "active"
              ? "Tidak ada peminjaman aktif."
              : "Belum ada riwayat pengembalian."}
          </div>
        ) : (
          visibleTransactions.map((transaction) => {
            const isExpanded = expandedTransactionIds.has(transaction.id_transaksi);

            return (
              <div key={transaction.id_transaksi} className="border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => toggleExpanded(transaction.id_transaksi)}
                  className="grid w-full gap-3 px-4 py-4 text-left text-sm text-zinc-600 transition hover:bg-[#f8fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1768d8] active:bg-[#edf5ff] md:grid-cols-[0.8fr_1.8fr_0.6fr_1.5fr_0.7fr] md:items-center"
                  aria-expanded={isExpanded}
                >
                  <span className="inline-flex items-center gap-2 font-semibold text-zinc-950 transition">
                    <ChevronIcon expanded={isExpanded} />
                    #{transaction.id_transaksi}
                  </span>

                  <span className="min-w-0">
                    <span className="line-clamp-2 font-semibold text-zinc-950">
                      {getBookTitleSummary(transaction)}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      Pinjam {formatDate(transaction.tanggal_pinjam)}
                    </span>
                  </span>

                  <span className="inline-flex w-fit rounded-lg bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#0b55ff]">
                    {getTotalBooks(transaction)} buku
                  </span>

                  <DeadlineBadge transaction={transaction} todayDate={todayDate} />

                  <span className="inline-flex w-fit rounded-lg bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {getStatusLabel(transaction)}
                  </span>
                </button>

                {isExpanded ? <TransactionItemsPanel transaction={transaction} /> : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
