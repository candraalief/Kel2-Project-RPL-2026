"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createBorrowTransaction,
  type CreateBorrowTransactionInput,
} from "@/app/actions/transactions";
import { useCartStore } from "@/store/use-cart-store";

export type BorrowStudentOption = {
  id: number;
  name: string;
  nis: string | null;
  nisn: string | null;
  className: string | null;
};

type BorrowCheckoutDrawerProps = {
  students: BorrowStudentOption[];
  adminName: string;
};

function toDateTimeLocalInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function cartItemCover(coverUrl: string | null, title: string) {
  if (coverUrl) {
    return (
      <div
        role="img"
        aria-label={`Sampul ${title}`}
        className="h-16 w-12 shrink-0 rounded-lg bg-cover bg-center"
        style={{ backgroundImage: `url("${coverUrl}")` }}
      />
    );
  }

  return (
    <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-center text-[10px] font-semibold text-zinc-500">
      Foto
      <br />
      Buku
    </div>
  );
}

function normalizeStudentText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function studentDisplayName(student: BorrowStudentOption) {
  return [
    student.name,
    student.nis ? `NIS ${student.nis}` : "",
    student.nisn ? `NISN ${student.nisn}` : "",
    student.className ?? "",
  ]
    .filter(Boolean)
    .join(" - ");
}

function CartQuantityControl({
  bookId,
  quantity,
  availableCount,
  onDecrease,
  onIncrease,
  onSetQuantity,
}: {
  bookId: number;
  quantity: number;
  availableCount: number;
  onDecrease: (bookId: number) => void;
  onIncrease: (bookId: number) => void;
  onSetQuantity: (bookId: number, quantity: number) => void;
}) {
  const [draftQuantity, setDraftQuantity] = useState(String(quantity));

  function updateQuantity(value: string) {
    if (!value) {
      setDraftQuantity("");
      return;
    }

    const nextQuantity = Number(value);

    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    const clampedQuantity = Math.max(
      1,
      Math.min(Math.floor(nextQuantity), availableCount)
    );

    setDraftQuantity(String(clampedQuantity));
    onSetQuantity(bookId, clampedQuantity);
  }

  function normalizeEmptyQuantity() {
    if (!draftQuantity) {
      setDraftQuantity(String(quantity));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onDecrease(bookId)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-base font-semibold text-zinc-700 transition hover:bg-zinc-50"
      >
        -
      </button>
      <input
        type="number"
        min={1}
        max={availableCount}
        value={draftQuantity}
        onChange={(event) => updateQuantity(event.currentTarget.value)}
        onBlur={normalizeEmptyQuantity}
        className="h-11 w-16 rounded-lg border border-zinc-200 text-center text-sm font-semibold text-zinc-950 outline-none focus:border-[#1d66d6]"
      />
      <button
        type="button"
        onClick={() => onIncrease(bookId)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 text-base font-semibold text-zinc-700 transition hover:bg-zinc-50"
      >
        +
      </button>
    </>
  );
}

export function BorrowCheckoutDrawer({
  students,
  adminName,
}: BorrowCheckoutDrawerProps) {
  const {
    items,
    isOpen,
    totalItems,
    closeCart,
    increaseItem,
    decreaseItem,
    setItemQuantity,
    removeItem,
    clearCart,
  } = useCartStore();
  const router = useRouter();
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [borrowDate, setBorrowDate] = useState(() =>
    toDateTimeLocalInputValue(new Date())
  );
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const studentLookup = useMemo(() => {
    return new Map(
      students.flatMap((student) => [
        [normalizeStudentText(student.name), student],
        [normalizeStudentText(studentDisplayName(student)), student],
        student.nis ? [normalizeStudentText(student.nis), student] : null,
        student.nisn ? [normalizeStudentText(student.nisn), student] : null,
      ].filter((entry): entry is [string, BorrowStudentOption] => entry !== null))
    );
  }, [students]);

  const selectedStudent = useMemo(() => {
    const id = Number(selectedStudentId);

    return students.find((student) => student.id === id) ?? null;
  }, [selectedStudentId, students]);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) =>
      [student.name, student.nis, student.nisn, student.className]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [studentQuery, students]);

  const shouldShowStudentSuggestions =
    studentQuery.trim().length > 0 &&
    (!selectedStudent ||
      normalizeStudentText(studentQuery) !== normalizeStudentText(selectedStudent.name)) &&
    filteredStudents.length > 0;

  const showStudentNotFound =
    studentQuery.trim().length > 0 &&
    !selectedStudent &&
    filteredStudents.length === 0;

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 5000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function updateBorrowDate(value: string) {
    setBorrowDate(value);
  }

  function handleStudentQueryChange(value: string) {
    setStudentQuery(value);

    const matched = studentLookup.get(normalizeStudentText(value));

    if (matched) {
      setSelectedStudentId(String(matched.id));
      return;
    }

    setSelectedStudentId("");
  }

  function handleSubmit() {
    setError("");

    const idSiswa = Number(selectedStudentId);

    if (items.length === 0) {
      setError("Keranjang masih kosong.");
      return;
    }

    if (!Number.isInteger(idSiswa) || idSiswa <= 0) {
      setError("Pilih siswa yang meminjam buku.");
      return;
    }

    if (!dueDate) {
      setError("Isi tanggal dan jam tenggat kembali terlebih dahulu.");
      return;
    }

    const payload: CreateBorrowTransactionInput = {
      idSiswa,
      tanggalPinjam: borrowDate,
      tanggalJatuhTempo: dueDate,
      catatan: note,
      items: items.map((item) => ({
        bookId: item.bookId,
        title: item.title,
        quantity: item.quantity,
      })),
    };

    startTransition(async () => {
      const result = await createBorrowTransaction(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      clearCart();
      closeCart();
      setSelectedStudentId("");
      setStudentQuery("");
      setDueDate("");
      setNote("");
      setSuccessMessage(result.success || "Peminjaman berhasil dibuat.");
      router.refresh();
    });
  }

  return (
    <>
      {isOpen ? (
        <div
          className="cart-backdrop-enter fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 md:items-stretch md:justify-end"
          onClick={() => {
            if (!isPending) {
              closeCart();
            }
          }}
        >
          <aside
            className="cart-drawer-enter flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl md:h-full md:max-h-none md:max-w-xl md:rounded-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-4 py-4 sm:px-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1d66d6]">
                  Checkout Peminjaman
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
                  Keranjang Buku
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCart}
                disabled={isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                x
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <section>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-950">
                    Buku Dipilih
                  </p>
                  <span className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-xs font-semibold text-[#0b55ff]">
                    {totalItems} buku
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                    Belum ada buku di keranjang.
                  </div>
                ) : (
                  <div className="mt-3 max-h-[32vh] space-y-2 overflow-y-auto pr-1 md:max-h-80">
                    {items.map((item) => (
                      <article
                        key={item.bookId}
                        className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3"
                      >
                        {cartItemCover(item.coverUrl, item.title)}
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-950">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            Tersedia {item.availableCount} eksemplar
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <CartQuantityControl
                              key={`${item.bookId}-${item.quantity}`}
                              bookId={item.bookId}
                              quantity={item.quantity}
                              availableCount={item.availableCount}
                              onDecrease={decreaseItem}
                              onIncrease={increaseItem}
                              onSetQuantity={setItemQuantity}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(item.bookId)}
                              className="ml-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-950">
                  Data Peminjaman
                </p>
                <div className="mt-4 space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-700">
                      Siswa
                    </span>
                    <div className="relative">
                      <input
                        value={studentQuery}
                        autoComplete="off"
                        onChange={(event) =>
                          handleStudentQueryChange(event.currentTarget.value)
                        }
                        placeholder="Cari nama, NIS, NISN, atau kelas..."
                        className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
                      />

                      {shouldShowStudentSuggestions ? (
                        <div className="absolute z-20 mt-2 max-h-52 w-full overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
                          {filteredStudents.slice(0, 8).map((student) => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => {
                                setStudentQuery(student.name);
                                setSelectedStudentId(String(student.id));
                              }}
                              className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-zinc-900">
                                  {student.name}
                                </span>
                                <span className="block truncate text-xs text-zinc-500">
                                  {student.nis ? `NIS ${student.nis}` : "NIS -"}
                                  {student.nisn ? ` / NISN ${student.nisn}` : ""}
                                </span>
                              </span>
                              <span className="shrink-0 text-xs text-zinc-500">
                                {student.className ?? "-"}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </label>

                  {selectedStudent ? (
                    <div className="break-words rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                      Dipilih: {studentDisplayName(selectedStudent)}
                    </div>
                  ) : null}

                  {showStudentNotFound ? (
                    <div className="break-words rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                      Siswa aktif tidak ditemukan. Coba nama, NIS, NISN, atau kelas lain.
                    </div>
                  ) : null}

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-700">
                      Admin / Petugas
                    </span>
                    <input
                      value={adminName}
                      readOnly
                      className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 text-sm font-semibold text-zinc-700 outline-none"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-700">
                        Tanggal Pinjam
                      </span>
                      <input
                        type="datetime-local"
                        step={60}
                        value={borrowDate}
                        onChange={(event) => updateBorrowDate(event.currentTarget.value)}
                        className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-700">
                        Tenggat Kembali
                      </span>
                      <input
                        type="datetime-local"
                        step={60}
                        min={borrowDate || undefined}
                        value={dueDate}
                        onChange={(event) => setDueDate(event.currentTarget.value)}
                        className="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
                      />
                      <span className="text-xs text-zinc-500">
                        Wajib diisi manual sampai jam dan menit sebelum checkout.
                      </span>
                    </label>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-700">
                      Keterangan
                    </span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.currentTarget.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Opsional..."
                      className="min-h-24 w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
                    />
                  </label>
                </div>

                {error ? (
                  <div className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                ) : null}
              </section>
            </div>

            <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || items.length === 0 || !dueDate}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#1d66d6] px-4 text-sm font-semibold text-white transition hover:bg-[#1553b2] disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isPending ? "Memproses..." : "Checkout Peminjaman"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {successMessage ? (
        <div className="fixed bottom-4 left-4 right-4 z-[60] rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-700 shadow-xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-[min(360px,calc(100vw-2rem))]">
          <div className="flex items-start justify-between gap-3">
            <p>{successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100"
            >
              x
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
