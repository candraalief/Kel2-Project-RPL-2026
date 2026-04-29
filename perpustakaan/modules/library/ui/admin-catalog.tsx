"use client";

import Link from "next/link";
import { useActionState, useDeferredValue, useMemo, useState } from "react";
import {
  deleteCatalogBook,
  updateCatalogBook,
  type CatalogActionState,
} from "@/app/actions/catalog";
import type {
  AdminCatalogBook,
  CatalogGenre,
} from "@/modules/library/lib/catalog";

const initialActionState: CatalogActionState = {
  error: "",
  success: "",
};

type AvailabilityFilter = "all" | "available" | "unavailable";

function normalize(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function genreText(book: AdminCatalogBook) {
  return book.genres.length > 0
    ? book.genres.map((genre) => genre.name).join(", ")
    : "-";
}

function getBookStatus(book: AdminCatalogBook) {
  return book.availableCount > 0 ? "Tersedia" : "Tidak tersedia";
}

export function AdminCatalog({
  books,
  genres,
}: {
  books: AdminCatalogBook[];
  genres: CatalogGenre[];
}) {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [selectedBook, setSelectedBook] = useState<AdminCatalogBook | null>(null);
  const [editingBook, setEditingBook] = useState<AdminCatalogBook | null>(null);
  const deferredSearch = useDeferredValue(search);

  const filteredBooks = useMemo(() => {
    const query = normalize(deferredSearch);
    const from = Number(yearFrom);
    const to = Number(yearTo);

    return books.filter((book) => {
      const category = genreText(book);
      const matchesSearch =
        !query ||
        normalize(book.title).includes(query) ||
        normalize(book.author).includes(query) ||
        normalize(book.publisher).includes(query) ||
        normalize(category).includes(query);
      const matchesGenre =
        !selectedGenre ||
        book.genres.some((genre) => genre.id === selectedGenre);
      const matchesAvailability =
        availability === "all" ||
        (availability === "available" && book.availableCount > 0) ||
        (availability === "unavailable" && book.availableCount === 0);
      const matchesFrom =
        !yearFrom ||
        (book.publishedYear !== null && Number.isFinite(from) && book.publishedYear >= from);
      const matchesTo =
        !yearTo ||
        (book.publishedYear !== null && Number.isFinite(to) && book.publishedYear <= to);

      return (
        matchesSearch &&
        matchesGenre &&
        matchesAvailability &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [availability, books, deferredSearch, selectedGenre, yearFrom, yearTo]);

  const totalAvailable = books.reduce((total, book) => total + book.availableCount, 0);
  const totalUnavailable = books.reduce((total, book) => total + book.unavailableCount, 0);

  function resetFilters() {
    setSearch("");
    setSelectedGenre("");
    setAvailability("all");
    setYearFrom("");
    setYearTo("");
  }

  return (
    <div className="space-y-5">
      <Link
        href="/admin/buku/tambah"
        className="group flex min-h-44 w-full flex-col items-center justify-center rounded-[1.5rem] border border-[#cfe0ff] bg-[#eef5ff] text-center shadow-sm transition hover:border-[#1d66d6] hover:bg-[#e3efff]"
      >
        <span className="text-6xl font-semibold leading-none text-[#0f5fc4] transition group-hover:scale-105">
          +
        </span>
        <span className="mt-3 text-2xl font-semibold text-zinc-950">
          Tambah
          <br />
          Buku Baru
        </span>
      </Link>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricPill label="Total Koleksi Buku" value={books.length} tone="blue" />
        <MetricPill label="Jumlah Buku Tersedia" value={totalAvailable} tone="green" />
        <MetricPill label="Jumlah Buku Dipinjam" value={totalUnavailable} tone="orange" />
      </section>

      <section className="space-y-5">
        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="sr-only">Cari buku</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Cari judul buku, penulis, penerbit, atau kategori..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
            />
          </label>
        </div>

        <FilterPanel
          genres={genres}
          selectedGenre={selectedGenre}
          onSelectedGenreChange={setSelectedGenre}
          availability={availability}
          onAvailabilityChange={setAvailability}
          yearFrom={yearFrom}
          onYearFromChange={setYearFrom}
          yearTo={yearTo}
          onYearToChange={setYearTo}
          onReset={resetFilters}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-950">Daftar Buku</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Menampilkan {filteredBooks.length} dari {books.length} buku.
            </p>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm text-zinc-500">
            Tidak ada buku ditemukan. Coba ubah kata kunci atau reset filter.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={() => setSelectedBook(book)}
                onEdit={() => setEditingBook(book)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedBook ? (
        <BookDetailModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      ) : null}

      {editingBook ? (
        <EditBookModal
          book={editingBook}
          onClose={() => setEditingBook(null)}
        />
      ) : null}
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "orange";
}) {
  const toneClass = {
    blue: "bg-[#eaf3ff] text-[#0f5fc4]",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-500",
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className={`mt-3 inline-flex rounded-xl px-3 py-1 text-2xl font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function FilterPanel({
  genres,
  selectedGenre,
  onSelectedGenreChange,
  availability,
  onAvailabilityChange,
  yearFrom,
  onYearFromChange,
  yearTo,
  onYearToChange,
  onReset,
}: {
  genres: CatalogGenre[];
  selectedGenre: string;
  onSelectedGenreChange: (genreId: string) => void;
  availability: AvailabilityFilter;
  onAvailabilityChange: (status: AvailabilityFilter) => void;
  yearFrom: string;
  onYearFromChange: (value: string) => void;
  yearTo: string;
  onYearToChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-950">Filter Pencarian</h2>
        <p className="text-sm text-zinc-500">Saring hasil dari kolom pencarian di atas.</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(260px,1.3fr)_minmax(240px,1fr)_auto] lg:items-end">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-800">Genre</span>
          <select
            value={selectedGenre}
            onChange={(event) => onSelectedGenreChange(event.currentTarget.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          >
            <option value="">Semua Genre</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-800">Status Buku</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <StatusOption
              label="Semua"
              checked={availability === "all"}
              onClick={() => onAvailabilityChange("all")}
            />
            <StatusOption
              label="Tersedia"
              checked={availability === "available"}
              onClick={() => onAvailabilityChange("available")}
            />
            <StatusOption
              label="Tidak tersedia"
              checked={availability === "unavailable"}
              onClick={() => onAvailabilityChange("unavailable")}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-800">Tahun Terbit</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              value={yearFrom}
              onChange={(event) => onYearFromChange(event.currentTarget.value)}
              placeholder="Dari tahun"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
            />
            <input
              type="number"
              value={yearTo}
              onChange={(event) => onYearToChange(event.currentTarget.value)}
              placeholder="Sampai tahun"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[#b9d3ff] bg-white px-4 py-3 text-sm font-semibold text-[#0f5fc4] transition hover:bg-[#eef5ff] lg:w-auto"
        >
          Reset Filter
        </button>
      </div>
    </section>
  );
}

function StatusOption({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
    >
      <span>{label}</span>
      <span
        className={`h-4 w-4 rounded border ${
          checked ? "border-[#1d66d6] bg-[#1d66d6]" : "border-zinc-300"
        }`}
      />
    </button>
  );
}

function BookCard({
  book,
  onOpen,
  onEdit,
}: {
  book: AdminCatalogBook;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const deleteAction = deleteCatalogBook.bind(null, book.id);
  const available = book.availableCount > 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d3ff] hover:shadow-md"
    >
      <BookCover book={book} />

      <div className="mt-4 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-zinc-950">
            {book.title}
          </h3>
          <span
            className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
              available
                ? "bg-emerald-50 text-emerald-600"
                : "bg-orange-50 text-orange-600"
            }`}
          >
            {getBookStatus(book)}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">{book.author ?? "-"}</p>
        <p className="mt-2 text-sm text-zinc-500">{genreText(book)}</p>
      </div>

      <div className="mt-4 space-y-1 text-sm text-zinc-600">
        <p>Rak: <span className="font-semibold text-zinc-900">{book.shelfLocation ?? "-"}</span></p>
        <p>Tersedia: <span className="font-semibold text-zinc-900">{book.availableCount} copy</span></p>
      </div>

      <div className="mt-auto flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="inline-flex min-w-20 items-center justify-center rounded-lg bg-[#2f7eea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d66d6]"
        >
          Edit
        </button>
        <form
          action={deleteAction}
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            if (!window.confirm(`Hapus buku "${book.title}"?`)) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            className="inline-flex min-w-20 items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Hapus
          </button>
        </form>
      </div>
    </article>
  );
}

function BookCover({ book }: { book: AdminCatalogBook }) {
  if (book.coverUrl) {
    return (
      <div
        role="img"
        aria-label={`Sampul ${book.title}`}
        className="aspect-[4/5] w-full rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url("${book.coverUrl}")` }}
      />
    );
  }

  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-zinc-200 text-center text-xl font-semibold text-zinc-700">
      Foto
      <br />
      Buku
    </div>
  );
}

function BookDetailModal({
  book,
  onClose,
}: {
  book: AdminCatalogBook;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <article
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1d66d6]">
              Detail Buku
            </p>
            <h2 className="mt-1 text-3xl font-semibold text-zinc-950">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-xl font-semibold text-zinc-500 transition hover:bg-zinc-100"
          >
            x
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr]">
          <BookCover book={book} />
          <div className="grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
            <DetailItem label="Judul" value={book.title} />
            <DetailItem label="Penulis" value={book.author} />
            <DetailItem label="Penerbit" value={book.publisher} />
            <DetailItem label="ISBN" value={book.isbn} />
            <DetailItem label="Tahun terbit" value={book.publishedYear?.toString() ?? null} />
            <DetailItem label="Genre" value={genreText(book)} />
            <DetailItem label="Lokasi rak" value={book.shelfLocation} />
            <DetailItem label="Total copy" value={`${book.totalCopies} copy`} />
            <DetailItem label="Jumlah tersedia" value={`${book.availableCount} copy`} />
            <DetailItem label="Dipinjam / tidak tersedia" value={`${book.unavailableCount} copy`} />
            <div className="md:col-span-2">
              <DetailItem label="Deskripsi" value={book.description} />
            </div>
            <div className="md:col-span-2">
              {book.shelfMapUrl ? (
                <div
                  role="img"
                  aria-label={`Denah rak ${book.shelfLocation ?? book.title}`}
                  className="h-40 w-full rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url("${book.shelfMapUrl}")` }}
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl bg-zinc-100 px-4 text-center text-sm font-semibold text-zinc-500">
                  Denah rak belum tersedia.
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function EditBookModal({
  book,
  onClose,
}: {
  book: AdminCatalogBook;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateCatalogBook,
    initialActionState
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <form
        action={formAction}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
              Katalog
            </p>
            <h2 className="mt-1 text-3xl font-semibold text-zinc-950">
              Edit Buku
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-xl font-semibold text-zinc-500 transition hover:bg-zinc-100"
          >
            x
          </button>
        </div>

        <input type="hidden" name="id_buku" value={book.id} />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Judul Buku" name="judul" defaultValue={book.title} required />
          <Field label="Penulis" name="penulis" defaultValue={book.author ?? ""} required />
          <Field label="Penerbit" name="penerbit" defaultValue={book.publisher ?? ""} />
          <Field label="ISBN" name="isbn" defaultValue={book.isbn ?? ""} />
          <Field label="Tahun Terbit" name="tahun_terbit" type="number" defaultValue={book.publishedYear?.toString() ?? ""} />
          <Field label="Lokasi Rak" name="lokasi_rak" defaultValue={book.shelfLocation ?? ""} />
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-zinc-900">
              Deskripsi Buku
            </span>
            <textarea
              name="deskripsi"
              rows={4}
              defaultValue={book.description ?? ""}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            />
          </label>
        </div>

        <div className="mt-5">
          <ActionNotice state={state} />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-w-28 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-w-36 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-zinc-900">{value || "-"}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-zinc-900">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
      />
    </label>
  );
}

function ActionNotice({ state }: { state: CatalogActionState }) {
  if (state.error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {state.success}
      </p>
    );
  }

  return null;
}
