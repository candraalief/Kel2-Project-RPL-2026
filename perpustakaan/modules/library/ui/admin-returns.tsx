"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  processTransactionReturn,
  type ReturnItemInput,
} from "@/app/actions/transactions";
import type {
  DetailedTransactionRecord,
  TransactionBookItem,
} from "@/modules/library/lib/data";

type ConditionCounts = {
  damaged: number;
  lost: number;
};

type ReturnTab = "active" | "history";
type TransactionStatusFilter =
  | "all"
  | "normal"
  | "late"
  | "completed"
  | "noted";

const emptyHistoryTransactions: DetailedTransactionRecord[] = [];

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
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getTotalBooks(transaction: DetailedTransactionRecord) {
  return transaction.items.reduce((total, item) => total + item.quantity, 0);
}

function getDaysLate(value: string | null) {
  if (!value) {
    return 0;
  }

  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return 0;
  }

  dueDate.setHours(23, 59, 59, 999);

  const difference = Date.now() - dueDate.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(difference / 86_400_000);
}

function getTransactionStatus(transaction: DetailedTransactionRecord) {
  if (transaction.tanggal_kembali) {
    const normalizedStatus = (transaction.status ?? "").toLowerCase();
    const normalizedNote = (transaction.catatan ?? "").toLowerCase();
    const hasNote =
      normalizedStatus.includes("catatan") ||
      normalizedStatus.includes("rusak") ||
      normalizedStatus.includes("hilang") ||
      normalizedNote.length > 0;

    if (hasNote) {
      return {
        filter: "noted" as const,
        label: "Dengan catatan",
        className: "bg-amber-50 text-amber-700",
      };
    }

    return {
      filter: "completed" as const,
      label: "Dikembalikan",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  const daysLate = getDaysLate(transaction.tanggal_jatuh_tempo);

  if (daysLate > 0) {
    return {
      filter: "late" as const,
      label: `${daysLate} terlambat`,
      className: "bg-red-50 text-red-600",
    };
  }

  return {
    filter: "normal" as const,
    label: "Normal",
    className: "bg-emerald-50 text-emerald-700",
  };
}

function getReturnConditionCounts(
  transaction: DetailedTransactionRecord,
  item: TransactionBookItem
) {
  const note = transaction.catatan ?? "";
  const segments = note
    .split(/[|;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const itemSegment = segments.find((segment) =>
    segment.toLowerCase().startsWith(`${item.title.toLowerCase()}:`)
  );
  const damaged =
    itemSegment?.match(/(\d+)\s+rusak/i)?.[1] !== undefined
      ? Number(itemSegment.match(/(\d+)\s+rusak/i)?.[1])
      : 0;
  const lost =
    itemSegment?.match(/(\d+)\s+hilang/i)?.[1] !== undefined
      ? Number(itemSegment.match(/(\d+)\s+hilang/i)?.[1])
      : 0;
  const good = Math.max(item.quantity - damaged - lost, 0);

  return { good, damaged, lost };
}

function initialCounts(items: TransactionBookItem[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.key,
      {
        damaged: 0,
        lost: 0,
      },
    ])
  ) as Record<string, ConditionCounts>;
}

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "user" | "school" | "phone" | "x";
  className?: string;
}) {
  if (name === "user") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "school") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 10l8-5 8 5-8 5-8-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M7 12v5h10v-5M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M7 4l3 4-2 2c1.2 2.4 3.1 4.3 5.5 5.5l2-2 4 3c.3.2.5.6.4 1l-.6 2.4c-.1.5-.6.8-1.1.8C10.2 21.2 2.8 13.8 2.8 5.8c0-.5.3-1 .8-1.1L6 4.1c.4-.1.8.1 1 .4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AdminReturns({
  transactions,
  historyTransactions,
}: {
  transactions: DetailedTransactionRecord[];
  historyTransactions?: DetailedTransactionRecord[];
}) {
  const history = historyTransactions ?? emptyHistoryTransactions;
  const hasHistoryTab = historyTransactions !== undefined;
  const [activeTab, setActiveTab] = useState<ReturnTab>("active");
  const [selectedTransaction, setSelectedTransaction] =
    useState<DetailedTransactionRecord | null>(null);
  const [expandedTransactionIds, setExpandedTransactionIds] = useState<Set<number>>(
    () => new Set()
  );
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<TransactionStatusFilter>("all");
  const [toast, setToast] = useState("");

  const visibleActiveTransactions = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const statusInfo = getTransactionStatus(transaction);
      const matchesStatus =
        statusFilter === "all" || statusInfo.filter === statusFilter;
      const searchableText = [
        transaction.id_transaksi,
        transaction.siswa?.nisn,
        transaction.siswa?.nama,
        statusInfo.label,
        transaction.catatan,
        ...transaction.items.map((item) => item.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [appliedSearch, statusFilter, transactions]);

  const visibleHistoryTransactions = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();

    return history.filter((transaction) => {
      const statusInfo = getTransactionStatus(transaction);
      const matchesStatus =
        statusFilter === "all" || statusInfo.filter === statusFilter;
      const searchableText = [
        transaction.id_transaksi,
        transaction.siswa?.nisn,
        transaction.siswa?.nama,
        statusInfo.label,
        transaction.status,
        transaction.catatan,
        transaction.tanggal_kembali ? formatDate(transaction.tanggal_kembali) : null,
        ...transaction.items.map((item) => item.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchableText.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [appliedSearch, history, statusFilter]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 5000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (transactions.length === 0 && history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
        Belum ada transaksi peminjaman atau history pengembalian.
      </div>
    );
  }

  function toggleExpanded(transactionId: number) {
    setExpandedTransactionIds((current) => {
      return current.has(transactionId) ? new Set() : new Set([transactionId]);
    });
  }

  return (
    <div className="space-y-3">
      {hasHistoryTab ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-2">
          <ReturnTabButton
            active={activeTab === "active"}
            label="Perlu Dikembalikan"
            count={transactions.length}
            onClick={() => {
              setActiveTab("active");
              setStatusFilter("all");
              setAppliedSearch(searchInput);
            }}
          />
          <ReturnTabButton
            active={activeTab === "history"}
            label="History Pengembalian"
            count={history.length}
            onClick={() => {
              setActiveTab("history");
              setStatusFilter("all");
              setAppliedSearch(searchInput);
            }}
          />
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(searchInput);
        }}
        className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-[1fr_160px_auto] md:items-end"
      >
        <FilterField label="Cari transaksi">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.currentTarget.value)}
            placeholder="Cari nama, judul, NIS, atau ID transaksi"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
          />
        </FilterField>

        <FilterField label="Status">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.currentTarget.value as TransactionStatusFilter)
            }
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          >
            <option value="all">Semua</option>
            {activeTab === "history" ? (
              <>
                <option value="completed">Dikembalikan</option>
                <option value="noted">Dengan catatan</option>
              </>
            ) : (
              <>
                <option value="normal">Normal</option>
                <option value="late">Terlambat</option>
              </>
            )}
          </select>
        </FilterField>

        <button
          type="submit"
          className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#1d66d6] px-5 text-sm font-semibold text-white transition hover:bg-[#1553b2]"
        >
          Cari
        </button>
      </form>

      <ReturnTransactionsTable
        transactions={
          activeTab === "history"
            ? visibleHistoryTransactions
            : visibleActiveTransactions
        }
        mode={activeTab}
        expandedTransactionIds={expandedTransactionIds}
        onToggleExpanded={toggleExpanded}
        onProcess={setSelectedTransaction}
      />

      {selectedTransaction ? (
        <ReturnDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSuccess={(message) => {
            setSelectedTransaction(null);
            setToast(message);
          }}
        />
      ) : null}

      {toast ? <ActionToast message={toast} onClose={() => setToast("")} /> : null}
    </div>
  );
}

function ReturnTabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
        active
          ? "bg-[#1d66d6] text-white shadow-sm"
          : "bg-white text-zinc-900 hover:bg-zinc-50"
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] ${
          active ? "bg-white/20 text-white" : "bg-[#dbeafe] text-[#0b55ff]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ReturnTransactionsTable({
  transactions,
  mode,
  expandedTransactionIds,
  onToggleExpanded,
  onProcess,
}: {
  transactions: DetailedTransactionRecord[];
  mode: ReturnTab;
  expandedTransactionIds: Set<number>;
  onToggleExpanded: (transactionId: number) => void;
  onProcess: (transaction: DetailedTransactionRecord) => void;
}) {
  const isHistory = mode === "history";

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="grid grid-cols-[1fr_1fr_1.5fr_0.8fr_1fr_0.9fr] bg-zinc-50 px-4 py-3 text-xs font-semibold text-slate-600">
        <span>ID Transaksi</span>
        <span>NIS</span>
        <span>Nama Siswa</span>
        <span>Total Buku</span>
        <span>Status</span>
        <span className="text-center">
          {isHistory ? "Tanggal Kembali" : "Aksi"}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="border-t border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
          {isHistory
            ? "Belum ada history pengembalian yang sesuai filter."
            : "Tidak ada transaksi pengembalian yang sesuai filter."}
        </div>
      ) : (
        transactions.map((transaction) => {
          const totalBooks = getTotalBooks(transaction);
          const statusInfo = getTransactionStatus(transaction);
          const isExpanded = expandedTransactionIds.has(transaction.id_transaksi);

          return (
            <div key={transaction.id_transaksi} className="border-t border-zinc-200">
              <div className="grid grid-cols-[1fr_1fr_1.5fr_0.8fr_1fr_0.9fr] items-center px-4 py-3 text-sm text-zinc-600">
                <button
                  type="button"
                  onClick={() => onToggleExpanded(transaction.id_transaksi)}
                  className="inline-flex items-center gap-2 text-left font-semibold text-zinc-900 transition hover:text-[#1d66d6]"
                  aria-expanded={isExpanded}
                >
                  <ChevronIcon expanded={isExpanded} />
                  <span>{transaction.id_transaksi}</span>
                </button>
                <span>{transaction.siswa?.nisn ?? "-"}</span>
                <span className="font-medium text-zinc-900">
                  {transaction.siswa?.nama ?? `Siswa #${transaction.id_siswa}`}
                </span>
                <span className="inline-flex w-fit rounded-lg bg-[#dbeafe] px-3 py-1 text-xs font-semibold text-[#0b55ff]">
                  {totalBooks} buku
                </span>
                <span
                  className={`inline-flex w-fit rounded-lg px-3 py-1 text-xs font-semibold ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
                <div className="flex justify-center">
                  {isHistory ? (
                    <span className="text-xs font-semibold text-slate-600">
                      {formatDate(transaction.tanggal_kembali)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onProcess(transaction)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1d66d6] px-4 text-xs font-semibold text-white transition hover:bg-[#1553b2]"
                    >
                      Proses
                    </button>
                  )}
                </div>
              </div>

              {isExpanded ? (
                <TransactionItemsPanel transaction={transaction} mode={mode} />
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TransactionItemsPanel({
  transaction,
  mode,
}: {
  transaction: DetailedTransactionRecord;
  mode: ReturnTab;
}) {
  const isHistory = mode === "history";

  return (
    <div className="bg-zinc-50 px-4 pb-4">
      <div className="ml-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div
          className={`grid bg-zinc-100 px-4 py-2 text-xs font-semibold text-slate-600 ${
            isHistory
              ? "grid-cols-[1fr_90px_90px_90px_90px]"
              : "grid-cols-[1fr_120px]"
          }`}
        >
          <span>Judul Buku</span>
          <span className="text-center">Jumlah</span>
          {isHistory ? (
            <>
              <span className="text-center">Baik</span>
              <span className="text-center">Rusak</span>
              <span className="text-center">Hilang</span>
            </>
          ) : null}
        </div>

        {transaction.items.length === 0 ? (
          <div className="px-4 py-4 text-sm text-zinc-500">
            Detail buku belum tersedia untuk transaksi ini.
          </div>
        ) : (
          transaction.items.map((item) => {
            const conditionCounts = getReturnConditionCounts(transaction, item);

            return (
              <div
                key={item.key}
                className={`grid border-t border-zinc-200 px-4 py-3 text-sm ${
                  isHistory
                    ? "grid-cols-[1fr_90px_90px_90px_90px]"
                    : "grid-cols-[1fr_120px]"
                }`}
              >
                <span className="font-medium text-zinc-900">{item.title}</span>
                <span className="text-center text-slate-600">
                  {item.quantity} buku
                </span>
                {isHistory ? (
                  <>
                    <span className="text-center text-emerald-700">
                      {conditionCounts.good}
                    </span>
                    <span className="text-center text-amber-700">
                      {conditionCounts.damaged}
                    </span>
                    <span className="text-center text-red-600">
                      {conditionCounts.lost}
                    </span>
                  </>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {transaction.catatan ? (
        <div className="ml-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Catatan Pengembalian</p>
          <p className="mt-1 text-amber-900">{transaction.catatan}</p>
        </div>
      ) : null}
    </div>
  );
}

function ReturnDetailModal({
  transaction,
  onClose,
  onSuccess,
}: {
  transaction: DetailedTransactionRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [counts, setCounts] = useState(() => initialCounts(transaction.items));
  const [returnNote, setReturnNote] = useState(transaction.catatan ?? "");
  const [error, setError] = useState("");
  const [conditionWarning, setConditionWarning] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const totalBooks = useMemo(
    () => transaction.items.reduce((total, item) => total + item.quantity, 0),
    [transaction.items]
  );

  function updateCount(
    item: TransactionBookItem,
    key: keyof ConditionCounts,
    value: string
  ) {
    const numberValue = Math.max(0, Math.floor(Number(value) || 0));
    const currentItem = counts[item.key] ?? { damaged: 0, lost: 0 };
    const otherCount = key === "damaged" ? currentItem.lost : currentItem.damaged;
    const maxValue = Math.max(item.quantity - otherCount, 0);

    if (numberValue > maxValue) {
      setConditionWarning(
        `Jumlah rusak dan hilang untuk ${item.title} tidak boleh melebihi ${item.quantity} buku.`
      );
    } else {
      setConditionWarning("");
    }

    setCounts((current) => {
      const latestItem = current[item.key] ?? { damaged: 0, lost: 0 };
      const latestOtherCount =
        key === "damaged" ? latestItem.lost : latestItem.damaged;
      const latestMaxValue = Math.max(item.quantity - latestOtherCount, 0);
      const nextValue = Math.min(numberValue, latestMaxValue);

      return {
        ...current,
        [item.key]: {
          ...latestItem,
          [key]: nextValue,
        },
      };
    });
  }

  function handleSubmit() {
    setError("");
    setConditionWarning("");

    const payload: ReturnItemInput[] = transaction.items.map((item) => {
      const itemCounts = counts[item.key] ?? { damaged: 0, lost: 0 };
      const damaged = itemCounts.damaged;
      const lost = itemCounts.lost;
      const good = item.quantity - (damaged + lost);

      return {
        key: item.key,
        title: item.title,
        copyIds: item.copyIds,
        quantity: item.quantity,
        good,
        damaged,
        lost,
      };
    });

    const invalidItem = payload.find(
      (item) =>
        item.damaged + item.lost > item.quantity ||
        item.good + item.damaged + item.lost !== item.quantity
    );

    if (invalidItem) {
      setError(
        `Total kondisi untuk ${invalidItem.title} harus sama dengan ${invalidItem.quantity} eksemplar.`
      );
      return;
    }

    startTransition(async () => {
      const result = await processTransactionReturn(
        transaction.id_transaksi,
        payload,
        returnNote
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
      onSuccess(result.success || "Pengembalian berhasil diproses.");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-5 py-3">
          <h2 className="text-xl font-semibold text-black">
            Detail Transaksi Siswa
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fa] px-5 py-4">
          <section>
            <h3 className="text-sm font-semibold text-slate-600">
              Informasi Siswa
            </h3>
            <div className="mt-2 grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 md:grid-cols-[60px_1fr_1fr]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dbeafe] text-[#1d4ed8]">
                <Icon name="user" className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <InfoBlock label="Nama Lengkap" value={transaction.siswa?.nama ?? "-"} />
                <InfoBlock
                  icon={<Icon name="school" className="h-3.5 w-3.5" />}
                  label="Kelas"
                  value={transaction.siswa?.kelas ?? "-"}
                />
              </div>
              <div className="space-y-2">
                <InfoBlock label="NIS" value={transaction.siswa?.nisn ?? "-"} />
                <InfoBlock
                  icon={<Icon name="phone" className="h-3.5 w-3.5" />}
                  label="No. Telepon"
                  value={transaction.siswa?.nomor_whatsapp ?? "-"}
                />
              </div>
            </div>
          </section>

          <section className="mt-4">
            <h3 className="text-sm font-semibold text-slate-600">
              Daftar Buku Dipinjam ({totalBooks} buku)
            </h3>

            {transaction.items.length === 0 ? (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Detail buku belum tersedia. Pengembalian dengan kondisi hanya
                bisa diproses jika transaksi menyimpan item buku atau ID
                eksemplar per buku.
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {transaction.items.map((item) => (
                  <ReturnBookCard
                    key={item.key}
                    item={item}
                    counts={counts[item.key]}
                    transaction={transaction}
                    onChange={updateCount}
                  />
                ))}
              </div>
            )}

            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Catatan Pengembalian
              </span>
              <textarea
                value={returnNote}
                onChange={(event) => setReturnNote(event.currentTarget.value)}
                maxLength={1000}
                placeholder="Tambahkan catatan bila diperlukan..."
                className="min-h-16 w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
              />
            </label>

            {conditionWarning ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                {conditionWarning}
              </div>
            ) : null}

            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {error}
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-zinc-200 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-10 min-w-24 items-center justify-center rounded-xl bg-zinc-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || transaction.items.length === 0}
            className="inline-flex h-10 min-w-48 items-center justify-center rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isPending ? "Memproses..." : "Proses Pengembalian"}
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      {icon ? <span className="mt-4 text-slate-400">{icon}</span> : null}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-black">{value}</p>
      </div>
    </div>
  );
}

function ReturnBookCard({
  item,
  counts,
  transaction,
  onChange,
}: {
  item: TransactionBookItem;
  counts?: ConditionCounts;
  transaction: DetailedTransactionRecord;
  onChange: (
    item: TransactionBookItem,
    key: keyof ConditionCounts,
    value: string
  ) => void;
}) {
  const damaged = counts?.damaged ?? 0;
  const lost = counts?.lost ?? 0;
  const good = Math.max(item.quantity - (damaged + lost), 0);

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="grid gap-3 md:grid-cols-[44px_1fr_auto]">
        <div className="h-12 w-9 rounded-md bg-zinc-200" />
        <div className="grid gap-x-3 gap-y-1.5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h4 className="text-base font-semibold text-black">{item.title}</h4>
          </div>
          <p className="text-xs text-slate-500">
            Kode: <span className="text-slate-700">{item.code ?? "-"}</span>
          </p>
          <p className="text-xs text-slate-500">
            Kategori:{" "}
            <span className="text-slate-700">{item.category ?? "-"}</span>
          </p>
          <p className="text-xs text-slate-500">
            Tgl Pinjam:{" "}
            <span className="text-black">{formatDate(transaction.tanggal_pinjam)}</span>
          </p>
          <p className="text-xs text-slate-500">
            Batas Kembali:{" "}
            <span className="text-black">{formatDate(transaction.tanggal_jatuh_tempo)}</span>
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs text-slate-500">
            Jumlah Total:{" "}
            <span className="font-semibold text-[#0b55ff]">
              {item.quantity} buku
            </span>
          </p>
          <span className="mt-1.5 inline-flex rounded-lg bg-[#dbeafe] px-2 py-0.5 text-[11px] font-medium text-[#0b55ff]">
            Dipinjam
          </span>
        </div>
      </div>

      <div className="mt-3 border-t border-zinc-200 pt-3">
        <p className="text-xs font-semibold text-slate-700">Kondisi Buku:</p>
        <div className="mt-2 grid gap-2.5 md:grid-cols-3">
          <ConditionInput
            label="Baik"
            tone="green"
            value={good}
            readOnly
          />
          <ConditionInput
            label="Rusak"
            tone="orange"
            value={damaged}
            max={item.quantity - lost}
            onChange={(value) => onChange(item, "damaged", value)}
          />
          <ConditionInput
            label="Hilang"
            tone="red"
            value={lost}
            max={item.quantity - damaged}
            onChange={(value) => onChange(item, "lost", value)}
          />
        </div>
      </div>
    </article>
  );
}

function ConditionInput({
  label,
  tone,
  value,
  max,
  readOnly = false,
  onChange,
}: {
  label: string;
  tone: "green" | "orange" | "red";
  value: number;
  max?: number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  const toneClass = {
    green: "border-emerald-300 bg-emerald-50 focus:border-emerald-500",
    orange: "border-orange-300 bg-orange-50 focus:border-orange-500",
    red: "border-red-300 bg-red-50 focus:border-red-500",
  }[tone];

  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.currentTarget.value)}
        className={`h-9 w-full rounded-lg border px-3 text-base text-black outline-none transition ${toneClass} ${
          readOnly ? "cursor-not-allowed text-slate-700" : ""
        }`}
      />
    </label>
  );
}

function ActionToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-6 top-6 z-[60] flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-emerald-700 transition hover:bg-emerald-100"
        title="Tutup notifikasi"
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}
