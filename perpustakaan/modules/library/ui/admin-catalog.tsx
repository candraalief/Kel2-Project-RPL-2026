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
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
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
        normalize(book.isbn).includes(query) ||
        normalize(category).includes(query);
      const matchesGenre =
        selectedGenreIds.length === 0 ||
        selectedGenreIds.every((genreId) =>
          book.genres.some((genre) => genre.id === genreId)
        );
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
  }, [availability, books, deferredSearch, selectedGenreIds, yearFrom, yearTo]);

  const totalAvailable = books.reduce((total, book) => total + book.availableCount, 0);
  const totalUnavailable = books.reduce((total, book) => total + book.unavailableCount, 0);
  const activeFilterCount =
    selectedGenreIds.length +
    (availability !== "all" ? 1 : 0) +
    (yearFrom ? 1 : 0) +
    (yearTo ? 1 : 0);
  const selectedGenres = genres.filter((genre) =>
    selectedGenreIds.includes(genre.id)
  );

  function resetFilters() {
    setSearch("");
    setSelectedGenreIds([]);
    setAvailability("all");
    setYearFrom("");
    setYearTo("");
  }

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId]
    );
  }

  function removeGenre(genreId: string) {
    setSelectedGenreIds((current) => current.filter((id) => id !== genreId));
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Total Koleksi Buku" value={books.length} tone="blue" />
        <MetricCard label="Buku Tersedia" value={totalAvailable} tone="green" />
        <MetricCard label="Buku Dipinjam" value={totalUnavailable} tone="red" />
      </section>

      <section className="space-y-5">
        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block w-full lg:flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Cari berdasarkan judul, penulis, penerbit, ISBN, atau genre..."
                className="h-10 w-full rounded-lg border border-transparent bg-[#f1f1f4] pl-11 pr-4 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-slate-500 focus:border-[#1d66d6]"
              />
            </label>

            <Link
              href="/admin/buku/tambah"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1768d8] px-4 text-sm font-semibold text-white transition hover:bg-[#1258ba]"
            >
              <PlusIcon />
              Tambah Buku
            </Link>
          </div>

          <div className="my-3 border-t border-zinc-200" />

          {selectedGenres.length > 0 ? (
            <>
              <ActiveFilters
                selectedGenres={selectedGenres}
                onRemoveGenre={removeGenre}
                onReset={resetFilters}
              />
              <div className="my-3 border-t border-zinc-200" />
            </>
          ) : null}

          <FilterPanel
            genres={genres}
            selectedGenreIds={selectedGenreIds}
            onToggleGenre={toggleGenre}
            availability={availability}
            onAvailabilityChange={setAvailability}
            yearFrom={yearFrom}
            onYearFromChange={setYearFrom}
            yearTo={yearTo}
            onYearToChange={setYearTo}
            activeFilterCount={activeFilterCount}
          />
        </section>

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

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "red";
}) {
  const toneClass = {
    blue: "bg-[#edf5ff] text-[#1768d8]",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-500",
  }[tone];

  return (
    <div className="flex min-h-16 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <MetricIcon tone={tone} />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <p className="truncate text-sm font-medium text-slate-600">{label}</p>
        <p className="shrink-0 text-2xl font-semibold leading-none text-black">{value}</p>
      </div>
    </div>
  );
}

function MetricIcon({ tone }: { tone: "blue" | "green" | "red" }) {
  if (tone === "green") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (tone === "red") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 18h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5V5.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 7h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 12a8 8 0 0113.6-5.7L20 8.7M20 5v3.7h-3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 01-13.6 5.7L4 15.3M4 19v-3.7h3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path d="M4 5h16l-6.5 7.5V19l-3 1.5v-8L4 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ActiveFilters({
  selectedGenres,
  onRemoveGenre,
  onReset,
}: {
  selectedGenres: CatalogGenre[];
  onRemoveGenre: (genreId: string) => void;
  onReset: () => void;
}) {
  if (selectedGenres.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {selectedGenres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          onClick={() => onRemoveGenre(genre.id)}
          className="inline-flex h-8 items-center gap-2 rounded-full bg-[#edf5ff] px-3 text-sm font-medium text-[#0b55ff] transition hover:bg-[#e0edff]"
        >
          Genre: {genre.name}
          <span className="text-xl leading-none" aria-hidden>
            x
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-zinc-50"
      >
        <ResetIcon />
        Bersihkan Semua
      </button>
    </div>
  );
}

function FilterPanel({
  genres,
  selectedGenreIds,
  onToggleGenre,
  availability,
  onAvailabilityChange,
  yearFrom,
  onYearFromChange,
  yearTo,
  onYearToChange,
  activeFilterCount,
}: {
  genres: CatalogGenre[];
  selectedGenreIds: string[];
  onToggleGenre: (genreId: string) => void;
  availability: AvailabilityFilter;
  onAvailabilityChange: (status: AvailabilityFilter) => void;
  yearFrom: string;
  onYearFromChange: (value: string) => void;
  yearTo: string;
  onYearToChange: (value: string) => void;
  activeFilterCount: number;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-zinc-950">
          <FilterIcon />
          <h2 className="text-base font-semibold">Filter</h2>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#dfeeff] px-2 text-xs font-semibold text-[#1768d8]">
            {activeFilterCount}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-zinc-50"
          title="Filter terbuka"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path d="M7 14l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-3 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-600">Genre</p>
          <div className="flex flex-wrap gap-2">
            {genres.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada genre.</p>
            ) : (
              genres.map((genre) => (
                <GenreOption
                  key={genre.id}
                  label={genre.name}
                  checked={selectedGenreIds.includes(genre.id)}
                  onClick={() => onToggleGenre(genre.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-600">
              Status Ketersediaan
            </span>
            <select
              value={availability}
              onChange={(event) =>
                onAvailabilityChange(event.currentTarget.value as AvailabilityFilter)
              }
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            >
              <option value="all">Semua Status</option>
              <option value="available">Tersedia</option>
              <option value="unavailable">Tidak tersedia</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-600">
              Tahun Dari
            </span>
            <input
              type="number"
              value={yearFrom}
              onChange={(event) => onYearFromChange(event.currentTarget.value)}
              placeholder="2000"
              className="h-10 w-full rounded-lg border border-transparent bg-[#f1f1f4] px-3 text-sm text-zinc-900 outline-none transition placeholder:text-slate-500 focus:border-[#1d66d6]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-600">
              Tahun Sampai
            </span>
            <input
              type="number"
              value={yearTo}
              onChange={(event) => onYearToChange(event.currentTarget.value)}
              placeholder="2024"
              className="h-10 w-full rounded-lg border border-transparent bg-[#f1f1f4] px-3 text-sm text-zinc-900 outline-none transition placeholder:text-slate-500 focus:border-[#1d66d6]"
            />
          </label>
        </div>
      </div>
    </section>
  );
}

function GenreOption({
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
      className={`inline-flex h-9 items-center justify-center rounded-full border px-3.5 text-sm font-semibold transition ${
        checked
          ? "border-[#2f7cff] bg-[#2f7cff] text-white"
          : "border-zinc-200 bg-white text-black hover:bg-zinc-50"
      }`}
    >
      <span>{label}</span>
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
