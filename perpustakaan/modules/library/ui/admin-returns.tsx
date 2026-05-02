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
  good: number;
  damaged: number;
  lost: number;
};

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

function initialCounts(items: TransactionBookItem[]) {
  return Object.fromEntries(
    items.map((item) => [
      item.key,
      {
        good: item.quantity,
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
}: {
  transactions: DetailedTransactionRecord[];
}) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<DetailedTransactionRecord | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 5000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
        Belum ada transaksi aktif untuk diproses.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-zinc-200">
        <div className="grid grid-cols-[0.5fr_1fr_0.9fr_0.9fr_0.7fr_0.7fr] bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
          <span>ID</span>
          <span>Siswa</span>
          <span>Pinjam</span>
          <span>Jatuh Tempo</span>
          <span>Buku</span>
          <span>Aksi</span>
        </div>
        {transactions.map((transaction) => (
          <div
            key={transaction.id_transaksi}
            className="grid grid-cols-[0.5fr_1fr_0.9fr_0.9fr_0.7fr_0.7fr] items-center border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600"
          >
            <span className="font-medium text-zinc-900">
              {transaction.id_transaksi}
            </span>
            <span className="font-medium text-zinc-900">
              {transaction.siswa?.nama ?? `Siswa #${transaction.id_siswa}`}
            </span>
            <span>{formatDate(transaction.tanggal_pinjam)}</span>
            <span>{formatDate(transaction.tanggal_jatuh_tempo)}</span>
            <span>{transaction.items.length} buku</span>
            <button
              type="button"
              onClick={() => setSelectedTransaction(transaction)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#020016] px-3 text-xs font-semibold text-white transition hover:bg-[#10102a]"
            >
              Detail
            </button>
          </div>
        ))}
      </div>

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
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const totalBooks = useMemo(
    () => transaction.items.reduce((total, item) => total + item.quantity, 0),
    [transaction.items]
  );

  function updateCount(item: TransactionBookItem, key: keyof ConditionCounts, value: string) {
    const numberValue = Math.max(0, Number(value) || 0);

    setCounts((current) => ({
      ...current,
      [item.key]: {
        ...current[item.key],
        [key]: numberValue,
      },
    }));
  }

  function handleSubmit() {
    setError("");

    const payload: ReturnItemInput[] = transaction.items.map((item) => ({
      key: item.key,
      title: item.title,
      copyIds: item.copyIds,
      quantity: item.quantity,
      good: counts[item.key]?.good ?? 0,
      damaged: counts[item.key]?.damaged ?? 0,
      lost: counts[item.key]?.lost ?? 0,
    }));

    const invalidItem = payload.find(
      (item) => item.good + item.damaged + item.lost !== item.quantity
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
        payload
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-8 py-6">
          <h2 className="text-3xl font-semibold text-black">
            Detail Transaksi Siswa
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="x" className="h-7 w-7" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fa] px-8 py-7">
          <section>
            <h3 className="text-lg font-semibold text-slate-600">
              Informasi Siswa
            </h3>
            <div className="mt-5 grid gap-5 rounded-xl border border-zinc-200 bg-white p-6 md:grid-cols-[120px_1fr_1fr]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#dbeafe] text-[#1d4ed8]">
                <Icon name="user" className="h-12 w-12" />
              </div>
              <div className="space-y-6">
                <InfoBlock label="Nama Lengkap" value={transaction.siswa?.nama ?? "-"} />
                <InfoBlock
                  icon={<Icon name="school" className="h-5 w-5" />}
                  label="Kelas"
                  value={transaction.siswa?.kelas ?? "-"}
                />
              </div>
              <div className="space-y-6">
                <InfoBlock label="NIS" value={transaction.siswa?.nisn ?? "-"} />
                <InfoBlock
                  icon={<Icon name="phone" className="h-5 w-5" />}
                  label="No. Telepon"
                  value={transaction.siswa?.nomor_whatsapp ?? "-"}
                />
              </div>
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-semibold text-slate-600">
              Daftar Buku Dipinjam ({totalBooks} buku)
            </h3>

            {transaction.items.length === 0 ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
                Detail buku belum tersedia. Pengembalian dengan kondisi hanya
                bisa diproses jika transaksi menyimpan item buku atau ID
                eksemplar per buku.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
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

            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex shrink-0 justify-end gap-4 border-t border-zinc-200 bg-white px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-14 min-w-32 items-center justify-center rounded-xl bg-zinc-200 px-6 text-lg font-semibold text-slate-700 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || transaction.items.length === 0}
            className="inline-flex h-14 min-w-72 items-center justify-center rounded-xl bg-emerald-600 px-6 text-lg font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
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
    <div className="flex gap-3">
      {icon ? <span className="mt-7 text-slate-400">{icon}</span> : null}
      <div>
        <p className="text-lg text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-semibold text-black">{value}</p>
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
  counts: ConditionCounts;
  transaction: DetailedTransactionRecord;
  onChange: (
    item: TransactionBookItem,
    key: keyof ConditionCounts,
    value: string
  ) => void;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="grid gap-5 md:grid-cols-[80px_1fr_auto]">
        <div className="h-20 w-16 rounded-md bg-zinc-200" />
        <div className="grid gap-2 md:grid-cols-2">
          <div className="md:col-span-2">
            <h4 className="text-xl font-semibold text-black">{item.title}</h4>
          </div>
          <p className="text-base text-slate-500">
            Kode: <span className="text-slate-700">{item.code ?? "-"}</span>
          </p>
          <p className="text-base text-slate-500">
            Kategori:{" "}
            <span className="text-slate-700">{item.category ?? "-"}</span>
          </p>
          <p className="text-base text-slate-500">
            Tgl Pinjam:{" "}
            <span className="text-black">{formatDate(transaction.tanggal_pinjam)}</span>
          </p>
          <p className="text-base text-slate-500">
            Batas Kembali:{" "}
            <span className="text-black">{formatDate(transaction.tanggal_jatuh_tempo)}</span>
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-base text-slate-500">
            Jumlah Total:{" "}
            <span className="font-semibold text-[#0b55ff]">
              {item.quantity} buku
            </span>
          </p>
          <span className="mt-2 inline-flex rounded-lg bg-[#dbeafe] px-3 py-1 text-sm font-medium text-[#0b55ff]">
            Dipinjam
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-5">
        <p className="text-base font-semibold text-slate-700">Kondisi Buku:</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ConditionInput
            label="Baik"
            tone="green"
            value={counts.good}
            onChange={(value) => onChange(item, "good", value)}
          />
          <ConditionInput
            label="Rusak"
            tone="orange"
            value={counts.damaged}
            onChange={(value) => onChange(item, "damaged", value)}
          />
          <ConditionInput
            label="Hilang"
            tone="red"
            value={counts.lost}
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
  onChange,
}: {
  label: string;
  tone: "green" | "orange" | "red";
  value: number;
  onChange: (value: string) => void;
}) {
  const toneClass = {
    green: "border-emerald-300 bg-emerald-50 focus:border-emerald-500",
    orange: "border-orange-300 bg-orange-50 focus:border-orange-500",
    red: "border-red-300 bg-red-50 focus:border-red-500",
  }[tone];

  return (
    <label className="block space-y-2">
      <span className="text-base font-semibold text-slate-600">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={`h-14 w-full rounded-lg border px-4 text-2xl text-black outline-none transition ${toneClass}`}
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
