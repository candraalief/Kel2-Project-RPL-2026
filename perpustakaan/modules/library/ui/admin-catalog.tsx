"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useActionState,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  addCatalogCopies,
  deleteCatalogBook,
  loadCatalogBookBorrowSchedule,
  loadCatalogBookCopySummary,
  removeCatalogCopies,
  updateCatalogBook,
  type CatalogActionState,
} from "@/app/actions/catalog";
import type {
  AdminCatalogBook,
  CatalogBorrowScheduleItem,
  CatalogCopySummary,
  CatalogGenre,
} from "@/modules/library/lib/catalog";
import {
  BorrowCheckoutDrawer,
  type BorrowStudentOption,
} from "@/modules/library/ui/borrow-checkout-drawer";
import { useCartStore } from "@/store/use-cart-store";

const initialActionState: CatalogActionState = {
  error: "",
  success: "",
};

const emptyCopySummary: CatalogCopySummary = {
  totalCopies: 0,
  availableCount: 0,
  borrowedCount: 0,
  removedCount: 0,
  unavailableCount: 0,
};
const emptyBorrowSchedule: CatalogBorrowScheduleItem[] = [];

type AvailabilityFilter = "all" | "available" | "unavailable";
type PageSize = 5 | 10 | 25;
type CatalogBorrowScheduleCalendarItem = CatalogBorrowScheduleItem & {
  dateKey: string;
};

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

function getBookCoverDisplayUrl(book: AdminCatalogBook) {
  return book.coverDisplayUrl ?? book.coverUrl;
}

function useCatalogCopySummary(bookId: number, enabled = true) {
  const [summary, setSummary] = useState<CatalogCopySummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      return;
    }

    loadCatalogBookCopySummary(bookId)
      .then((result) => {
        if (!alive) {
          return;
        }

        setSummary(result.summary);
        setError(result.error);
      })
      .catch(() => {
        if (alive) {
          setError("Gagal memuat ringkasan eksemplar.");
          setSummary(null);
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [bookId, enabled]);

  return {
    summary,
    counts: summary ?? emptyCopySummary,
    error,
    loading,
  };
}

function useCatalogBorrowSchedule(
  bookId: number,
  enabled = true,
  includeBorrowerDetails = false
) {
  const [items, setItems] =
    useState<CatalogBorrowScheduleItem[]>(emptyBorrowSchedule);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    let alive = true;

    if (!enabled) {
      return;
    }

    loadCatalogBookBorrowSchedule(bookId, includeBorrowerDetails)
      .then((result) => {
        if (!alive) {
          return;
        }

        setItems(result.items);
        setError(result.error);
      })
      .catch(() => {
        if (alive) {
          setError("Gagal memuat kalender pengembalian buku.");
          setItems(emptyBorrowSchedule);
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [bookId, enabled, includeBorrowerDetails]);

  return {
    error,
    items,
    loading,
  };
}

export function AdminCatalog({
  books,
  genres,
  students = [],
  adminName = "",
  readOnly = false,
}: {
  books: AdminCatalogBook[];
  genres: CatalogGenre[];
  students?: BorrowStudentOption[];
  adminName?: string;
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [selectedBook, setSelectedBook] = useState<AdminCatalogBook | null>(null);
  const [borrowingBook, setBorrowingBook] = useState<AdminCatalogBook | null>(null);
  const [editingBook, setEditingBook] = useState<AdminCatalogBook | null>(null);
  const [addingCopiesBook, setAddingCopiesBook] =
    useState<AdminCatalogBook | null>(null);
  const [deletingBook, setDeletingBook] = useState<AdminCatalogBook | null>(null);
  const [removingCopiesBook, setRemovingCopiesBook] =
    useState<AdminCatalogBook | null>(null);
  const [addCopiesState, setAddCopiesState] =
    useState<CatalogActionState>(initialActionState);
  const [deleteState, setDeleteState] = useState<CatalogActionState>(initialActionState);
  const [removeCopiesState, setRemoveCopiesState] =
    useState<CatalogActionState>(initialActionState);
  const [deleteToast, setDeleteToast] = useState("");
  const [isAddingCopies, startAddCopiesTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isRemovingCopies, startRemoveCopiesTransition] = useTransition();
  const router = useRouter();
  const deferredSearch = useDeferredValue(search);
  const { addItem, openCart } = useCartStore();

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

  const totalPages = Math.max(Math.ceil(filteredBooks.length / pageSize), 1);
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedBooks = filteredBooks.slice(pageStart, pageStart + pageSize);
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
    setShowAllGenres(false);
    setCurrentPage(1);
  }

  function toggleGenre(genreId: string) {
    setCurrentPage(1);
    setSelectedGenreIds((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId]
    );
  }

  function removeGenre(genreId: string) {
    setCurrentPage(1);
    setSelectedGenreIds((current) => current.filter((id) => id !== genreId));
  }

  function updateAvailability(value: AvailabilityFilter) {
    setAvailability(value);
    setCurrentPage(1);
  }

  function clearAvailability() {
    updateAvailability("all");
  }

  function clearYearFrom() {
    setCurrentPage(1);
    setYearFrom("");
  }

  function clearYearTo() {
    setCurrentPage(1);
    setYearTo("");
  }

  function updateYearFrom(value: string) {
    setYearFrom(value);
    setCurrentPage(1);
  }

  function updateYearTo(value: string) {
    setYearTo(value);
    setCurrentPage(1);
  }

  function updatePageSize(value: PageSize) {
    setPageSize(value);
    setCurrentPage(1);
  }

  function openDeleteModal(book: AdminCatalogBook) {
    setDeleteState(initialActionState);
    setDeletingBook(book);
  }

  function openAddCopiesModal(book: AdminCatalogBook) {
    setAddCopiesState(initialActionState);
    setAddingCopiesBook(book);
  }

  function openRemoveCopiesModal(book: AdminCatalogBook) {
    setRemoveCopiesState(initialActionState);
    setRemovingCopiesBook(book);
  }

  function addBookToBorrowCart(book: AdminCatalogBook, quantity: number) {
    if (book.availableCount < 1) {
      return;
    }

    addItem({
      bookId: book.id,
      title: book.title,
      coverUrl: getBookCoverDisplayUrl(book),
      availableCount: book.availableCount,
      quantity,
    });
    setBorrowingBook(null);
    openCart();
  }

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }

    setDeletingBook(null);
    setDeleteState(initialActionState);
  }

  function closeAddCopiesModal() {
    if (isAddingCopies) {
      return;
    }

    setAddingCopiesBook(null);
    setAddCopiesState(initialActionState);
  }

  function closeRemoveCopiesModal() {
    if (isRemovingCopies) {
      return;
    }

    setRemovingCopiesBook(null);
    setRemoveCopiesState(initialActionState);
  }

  function confirmDeleteBook() {
    if (!deletingBook || isDeleting) {
      return;
    }

    setDeleteState(initialActionState);
    startDeleteTransition(async () => {
      const result = await deleteCatalogBook(deletingBook.id);

      if (result.error) {
        setDeleteState(result);
        return;
      }

      setDeletingBook(null);
      setDeleteState(initialActionState);
      setDeleteToast(result.success || "Buku berhasil dihapus.");
      router.refresh();
    });
  }

  function confirmAddCopies(quantity: number) {
    if (!addingCopiesBook || isAddingCopies) {
      return;
    }

    setAddCopiesState(initialActionState);
    startAddCopiesTransition(async () => {
      const result = await addCatalogCopies(addingCopiesBook.id, quantity);

      if (result.error) {
        setAddCopiesState(result);
        return;
      }

      setAddingCopiesBook(null);
      setAddCopiesState(initialActionState);
      setDeleteToast(result.success || "Eksemplar berhasil ditambahkan.");
      router.refresh();
    });
  }

  function confirmRemoveCopies(quantity: number, reason: string) {
    if (!removingCopiesBook || isRemovingCopies) {
      return;
    }

    setRemoveCopiesState(initialActionState);
    startRemoveCopiesTransition(async () => {
      const result = await removeCatalogCopies(
        removingCopiesBook.id,
        quantity,
        reason
      );

      if (result.error) {
        setRemoveCopiesState(result);
        return;
      }

      setRemovingCopiesBook(null);
      setRemoveCopiesState(initialActionState);
      setDeleteToast(result.success || "Eksemplar berhasil dikeluarkan.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="relative block w-full">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari buku..."
                className="h-9 w-full rounded-md border border-transparent bg-[#f1f1f4] pl-9 pr-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-slate-500 focus:border-[#1d66d6]"
              />
            </label>

            {!readOnly ? (
              <Link
                href="/admin/buku/tambah"
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-[#1768d8] px-4 text-sm font-semibold text-white transition hover:bg-[#1258ba] md:w-auto"
              >
                <PlusIcon />
                Tambah Buku
              </Link>
            ) : null}
          </div>

          <div className="my-3 border-t border-zinc-200" />

          {activeFilterCount > 0 ? (
            <>
              <ActiveFilters
                selectedGenres={selectedGenres}
                availability={availability}
                yearFrom={yearFrom}
                yearTo={yearTo}
                onRemoveGenre={removeGenre}
                onClearAvailability={clearAvailability}
                onClearYearFrom={clearYearFrom}
                onClearYearTo={clearYearTo}
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
            onAvailabilityChange={updateAvailability}
            yearFrom={yearFrom}
            onYearFromChange={updateYearFrom}
            yearTo={yearTo}
            onYearToChange={updateYearTo}
            activeFilterCount={activeFilterCount}
            showAllGenres={showAllGenres}
            onShowAllGenresChange={setShowAllGenres}
          />
        </section>
      </section>

      {filteredBooks.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm text-zinc-500">
          Tidak ada buku ditemukan. Coba ubah kata kunci atau reset filter.
        </div>
      ) : (
        <section className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {paginatedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                readOnly={readOnly}
                onOpen={() => setSelectedBook(book)}
                onAddToBorrowCart={() => setBorrowingBook(book)}
                onEdit={() => setEditingBook(book)}
                onDelete={() => openDeleteModal(book)}
              />
            ))}
          </div>
          <CatalogPaginationControls
            currentPage={safePage}
            pageSize={pageSize}
            totalItems={filteredBooks.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onPageSizeChange={updatePageSize}
          />
        </section>
      )}

      {selectedBook ? (
        <BookDetailModal
          book={selectedBook}
          readOnly={readOnly}
          onClose={() => setSelectedBook(null)}
        />
      ) : null}

      {!readOnly && editingBook ? (
        <EditBookModal
          book={editingBook}
          onClose={() => setEditingBook(null)}
          onAddCopies={() => openAddCopiesModal(editingBook)}
          onRemoveCopies={() => openRemoveCopiesModal(editingBook)}
        />
      ) : null}

      {!readOnly && borrowingBook ? (
        <BorrowBookModal
          book={borrowingBook}
          onClose={() => setBorrowingBook(null)}
          onConfirm={(quantity) => addBookToBorrowCart(borrowingBook, quantity)}
        />
      ) : null}

      {!readOnly && addingCopiesBook ? (
        <CatalogAddCopiesModal
          book={addingCopiesBook}
          state={addCopiesState}
          pending={isAddingCopies}
          onClose={closeAddCopiesModal}
          onConfirm={confirmAddCopies}
        />
      ) : null}

      {!readOnly && deletingBook ? (
        <DeleteBookModal
          book={deletingBook}
          state={deleteState}
          pending={isDeleting}
          onClose={closeDeleteModal}
          onConfirm={confirmDeleteBook}
        />
      ) : null}

      {!readOnly && removingCopiesBook ? (
        <RemoveCopiesModal
          book={removingCopiesBook}
          state={removeCopiesState}
          pending={isRemovingCopies}
          onClose={closeRemoveCopiesModal}
          onConfirm={confirmRemoveCopies}
        />
      ) : null}

      {deleteToast ? (
        <ActionToast message={deleteToast} onClose={() => setDeleteToast("")} />
      ) : null}

      {!readOnly ? (
        <BorrowCheckoutDrawer students={students} adminName={adminName} />
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
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
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M4 5h16l-6.5 7.5V19l-3 1.5v-8L4 5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function ActiveFilters({
  selectedGenres,
  availability,
  yearFrom,
  yearTo,
  onRemoveGenre,
  onClearAvailability,
  onClearYearFrom,
  onClearYearTo,
  onReset,
}: {
  selectedGenres: CatalogGenre[];
  availability: AvailabilityFilter;
  yearFrom: string;
  yearTo: string;
  onRemoveGenre: (genreId: string) => void;
  onClearAvailability: () => void;
  onClearYearFrom: () => void;
  onClearYearTo: () => void;
  onReset: () => void;
}) {
  const availabilityLabel =
    availability === "available"
      ? "Tersedia"
      : availability === "unavailable"
        ? "Tidak tersedia"
        : "";
  const hasAvailability = availability !== "all";
  const hasYearFrom = Boolean(yearFrom);
  const hasYearTo = Boolean(yearTo);
  const hasActiveFilters =
    selectedGenres.length > 0 || hasAvailability || hasYearFrom || hasYearTo;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {selectedGenres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          onClick={() => onRemoveGenre(genre.id)}
          className="inline-flex h-5 items-center gap-1 rounded-full bg-[#edf5ff] px-2 text-[10px] font-semibold text-[#0b55ff] transition hover:bg-[#e0edff]"
        >
          Genre: {genre.name}
          <span className="text-sm leading-none" aria-hidden>
            x
          </span>
        </button>
      ))}
      {hasAvailability ? (
        <button
          type="button"
          onClick={onClearAvailability}
          className="inline-flex h-5 items-center gap-1 rounded-full bg-[#edf5ff] px-2 text-[10px] font-semibold text-[#0b55ff] transition hover:bg-[#e0edff]"
        >
          Status: {availabilityLabel}
          <span className="text-sm leading-none" aria-hidden>
            x
          </span>
        </button>
      ) : null}
      {hasYearFrom ? (
        <button
          type="button"
          onClick={onClearYearFrom}
          className="inline-flex h-5 items-center gap-1 rounded-full bg-[#edf5ff] px-2 text-[10px] font-semibold text-[#0b55ff] transition hover:bg-[#e0edff]"
        >
          Tahun Dari: {yearFrom}
          <span className="text-sm leading-none" aria-hidden>
            x
          </span>
        </button>
      ) : null}
      {hasYearTo ? (
        <button
          type="button"
          onClick={onClearYearTo}
          className="inline-flex h-5 items-center gap-1 rounded-full bg-[#edf5ff] px-2 text-[10px] font-semibold text-[#0b55ff] transition hover:bg-[#e0edff]"
        >
          Tahun Sampai: {yearTo}
          <span className="text-sm leading-none" aria-hidden>
            x
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-slate-600 transition hover:bg-zinc-50"
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
  showAllGenres,
  onShowAllGenresChange,
}: {
  genres: CatalogGenre[];
  selectedGenreIds: string[];
  onToggleGenre: (genreId: string) => void;
  availability: AvailabilityFilter;
  onAvailabilityChange: (value: AvailabilityFilter) => void;
  yearFrom: string;
  onYearFromChange: (value: string) => void;
  yearTo: string;
  onYearToChange: (value: string) => void;
  activeFilterCount: number;
  showAllGenres: boolean;
  onShowAllGenresChange: (value: boolean) => void;
}) {
  const visibleGenres = showAllGenres ? genres : genres.slice(0, 3);
  const hiddenGenreCount = Math.max(genres.length - visibleGenres.length, 0);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-center gap-2 text-zinc-950">
        <FilterIcon />
        <h2 className="text-sm font-semibold">Filter</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dfeeff] px-1.5 text-[10px] font-semibold text-[#1768d8]">
          {activeFilterCount}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-zinc-700">Genre</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {genres.length === 0 ? (
              <p className="text-[11px] text-zinc-500">Belum ada genre.</p>
            ) : (
              visibleGenres.map((genre) => (
                <GenreOption
                  key={genre.id}
                  label={genre.name}
                  checked={selectedGenreIds.includes(genre.id)}
                  onClick={() => onToggleGenre(genre.id)}
                />
              ))
            )}
            {genres.length > 3 ? (
              <button
                type="button"
                onClick={() => onShowAllGenresChange(!showAllGenres)}
                className="inline-flex h-6 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-[#1768d8] transition hover:bg-zinc-50"
              >
                {showAllGenres ? "Less" : `More +${hiddenGenreCount}`}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr_0.8fr] xl:items-end">
          <CatalogFilterField label="Status Ketersediaan">
            <select
              value={availability}
              onChange={(event) =>
                onAvailabilityChange(event.currentTarget.value as AvailabilityFilter)
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            >
              <option value="all">Semua Status</option>
              <option value="available">Tersedia</option>
              <option value="unavailable">Tidak tersedia</option>
            </select>
          </CatalogFilterField>

          <CatalogFilterField label="Tahun Dari">
            <input
              type="number"
              value={yearFrom}
              onChange={(event) => onYearFromChange(event.currentTarget.value)}
              placeholder="2000"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
            />
          </CatalogFilterField>

          <CatalogFilterField label="Tahun Sampai">
            <input
              type="number"
              value={yearTo}
              onChange={(event) => onYearToChange(event.currentTarget.value)}
              placeholder="2026"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
            />
          </CatalogFilterField>
        </div>
      </div>
    </section>
  );
}

function CatalogFilterField({
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
      className={`inline-flex h-6 items-center justify-center rounded-full border px-3 text-[11px] font-semibold transition ${
        checked
          ? "border-[#2f7cff] bg-[#2f7cff] text-white"
          : "border-zinc-200 bg-white text-black hover:bg-zinc-50"
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  const sortedPages = Array.from(pages).sort((first, second) => first - second);
  const items: Array<number | "..."> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (previousPage && page - previousPage > 1) {
      items.push("...");
    }

    items.push(page);
  });

  return items;
}

function CatalogPaginationControls({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}) {
  const pageItems = getPaginationItems(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
      <p className="font-semibold">
        Menampilkan {startItem}-{endItem} dari {totalItems} buku
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 font-semibold">
          Tampil
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.currentTarget.value) as PageSize)
            }
            className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
          </select>
        </label>

        <nav className="flex items-center gap-1" aria-label="Pagination katalog">
          {pageItems.map((item, index) =>
            item === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 min-w-8 items-center justify-center text-zinc-400"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold transition ${
                  item === currentPage
                    ? "bg-[#1768d8] text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {item}
              </button>
            )
          )}
        </nav>
      </div>
    </div>
  );
}

function BookCard({
  book,
  readOnly = false,
  onOpen,
  onAddToBorrowCart,
  onEdit,
  onDelete,
}: {
  book: AdminCatalogBook;
  readOnly?: boolean;
  onOpen: () => void;
  onAddToBorrowCart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
      className="flex cursor-pointer flex-col rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9d3ff] hover:shadow-md"
    >
      <BookCover book={book} />

      <div className="mt-2 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[12px] font-semibold text-zinc-950">
            {book.title}
          </h3>
          <span
            className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold ${
              available
                ? "bg-emerald-50 text-emerald-600"
                : "bg-orange-50 text-orange-600"
            }`}
          >
            {getBookStatus(book)}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-600">{book.author ?? "-"}</p>
        <p className="mt-1 text-[10px] text-zinc-500">{genreText(book)}</p>
      </div>

      <div className="mt-2 space-y-0.5 text-[10px] text-zinc-600">
        <p>Rak: <span className="font-semibold text-zinc-900">{book.shelfLocation ?? "-"}</span></p>
        <p>Tersedia: <span className="font-semibold text-zinc-900">{book.availableCount} eksemplar</span></p>
      </div>

      {!readOnly ? (
        <div className="mt-auto space-y-1.5 pt-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddToBorrowCart();
            }}
            disabled={!available}
            className="inline-flex h-7 w-full items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            Pinjam
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="inline-flex h-7 w-full items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-600 transition hover:bg-blue-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="inline-flex h-7 w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-2 text-[10px] font-semibold text-red-600 transition hover:bg-red-100"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function BookCover({ book }: { book: AdminCatalogBook }) {
  const coverUrl = getBookCoverDisplayUrl(book);

  if (coverUrl) {
    return (
      <div
        role="img"
        aria-label={`Sampul ${book.title}`}
        className="aspect-[4/5] w-full rounded-xl bg-cover bg-center"
        style={{ backgroundImage: `url("${coverUrl}")` }}
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

function BorrowBookModal({
  book,
  onClose,
  onConfirm,
}: {
  book: AdminCatalogBook;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const maxQuantity = Math.max(book.availableCount, 0);
  const [quantityInput, setQuantityInput] = useState("1");
  const quantityNumber = Number(quantityInput);
  const safeQuantity =
    Number.isInteger(quantityNumber) && quantityNumber > 0
      ? Math.min(quantityNumber, Math.max(maxQuantity, 1))
      : 1;
  const disabled = maxQuantity < 1;

  function updateQuantity(value: string) {
    if (!value) {
      setQuantityInput("");
      return;
    }

    const nextQuantity = Number(value);

    if (!Number.isFinite(nextQuantity)) {
      return;
    }

    setQuantityInput(
      String(Math.max(1, Math.min(Math.floor(nextQuantity), maxQuantity)))
    );
  }

  function increaseQuantity() {
    setQuantityInput((current) => {
      const currentNumber = Number(current);
      const nextQuantity = Number.isFinite(currentNumber) ? currentNumber + 1 : 1;

      return String(Math.max(1, Math.min(Math.floor(nextQuantity), maxQuantity)));
    });
  }

  function decreaseQuantity() {
    setQuantityInput((current) => {
      const currentNumber = Number(current);
      const nextQuantity = Number.isFinite(currentNumber) ? currentNumber - 1 : 1;

      return String(Math.max(1, Math.min(Math.floor(nextQuantity), maxQuantity)));
    });
  }

  function normalizeEmptyQuantity() {
    if (!quantityInput) {
      setQuantityInput("1");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <article
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d66d6]">
              Pinjam Buku
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100"
          >
            x
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
          <div className="flex gap-3">
            <div className="w-20 shrink-0">
              <BookCover book={book} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Informasi Buku</p>
              <p className="mt-1 truncate text-base font-semibold text-zinc-950">
                {book.title}
              </p>
              <p className="mt-2 text-sm text-blue-800">
                Total: {book.totalCopies} eksemplar - Tersedia:{" "}
                {book.availableCount} eksemplar - Dipinjam:{" "}
                {book.borrowedCount} eksemplar
              </p>
            </div>
          </div>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm font-semibold text-zinc-950">
            Jumlah Dipinjam
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={disabled}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={Math.max(maxQuantity, 1)}
              value={quantityInput}
              onChange={(event) => updateQuantity(event.currentTarget.value)}
              onBlur={normalizeEmptyQuantity}
              disabled={disabled}
              className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-center text-base font-semibold text-zinc-950 outline-none transition focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-100"
            />
            <button
              type="button"
              onClick={increaseQuantity}
              disabled={disabled}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              +
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Maksimal {maxQuantity} eksemplar tersedia untuk dipinjam.
          </p>
        </label>

        {disabled ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Buku ini belum memiliki eksemplar tersedia untuk dipinjam.
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(safeQuantity)}
            disabled={disabled || !quantityInput}
            className="inline-flex min-w-32 items-center justify-center rounded-xl bg-[#1d66d6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1553b2] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            Masukkan Cart
          </button>
        </div>
      </article>
    </div>
  );
}

function BookDetailModal({
  book,
  readOnly = false,
  onClose,
}: {
  book: AdminCatalogBook;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const copySummary = useCatalogCopySummary(book.id, !readOnly);
  const borrowSchedule = useCatalogBorrowSchedule(book.id, true, !readOnly);
  const counts = readOnly
    ? {
        totalCopies: book.totalCopies,
        availableCount: book.availableCount,
        borrowedCount: book.borrowedCount,
        removedCount: book.removedCount,
        unavailableCount: book.unavailableCount,
      }
    : copySummary.counts;
  const error = readOnly ? "" : copySummary.error;
  const loading = readOnly ? false : copySummary.loading;
  const countLabel = (value: number) =>
    loading ? "Memuat..." : `${value} eksemplar`;

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
            <DetailItem
              label="Eksemplar Tersedia"
              value={countLabel(counts.availableCount)}
              helper="Eksemplar yang bisa dipinjam saat ini dengan status tersedia."
            />
            <DetailItem
              label="Eksemplar Dipinjam"
              value={countLabel(counts.borrowedCount)}
              helper="Eksemplar yang sedang dipinjam siswa dengan status dipinjam."
            />
            <DetailItem
              label="Total Eksemplar Aktif"
              value={countLabel(counts.totalCopies)}
              helper="Semua eksemplar yang masih masuk koleksi: tersedia atau dipinjam; tidak termasuk hilang/dikeluarkan."
            />
            <DetailItem
              label="Eksemplar Hilang/Dikeluarkan"
              value={countLabel(counts.removedCount)}
              helper="Sudah tidak masuk koleksi aktif."
            />
            {error ? (
              <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
            <div className="md:col-span-2">
              <DetailItem label="Deskripsi" value={book.description} />
            </div>
            <div className="md:col-span-2">
              <DetailItem label="Lokasi rak" value={book.shelfLocation} />
            </div>
          </div>
        </div>
        <BookBorrowCalendar
          error={borrowSchedule.error}
          items={borrowSchedule.items}
          loading={borrowSchedule.loading}
          showBorrowerDetails={!readOnly}
        />
      </article>
    </div>
  );
}

function BookBorrowCalendar({
  error,
  items,
  loading,
  showBorrowerDetails,
}: {
  error: string;
  items: CatalogBorrowScheduleItem[];
  loading: boolean;
  showBorrowerDetails: boolean;
}) {
  const dueItems = useMemo<CatalogBorrowScheduleCalendarItem[]>(
    () =>
      items
        .map((item) => ({
          ...item,
          dateKey: toDateKey(item.dueDate),
        }))
        .filter(isCatalogBorrowScheduleCalendarItem)
        .sort((first, second) => first.dateKey.localeCompare(second.dateKey)),
    [items]
  );
  const month = getCalendarMonth(dueItems);
  const cells = useMemo(
    () => buildCalendarCells(month.year, month.monthIndex),
    [month.monthIndex, month.year]
  );
  const todayKey = getTodayKey();
  const dueByDate = useMemo(() => {
    const map = new Map<string, CatalogBorrowScheduleItem[]>();

    dueItems.forEach((item) => {
      map.set(item.dateKey, [...(map.get(item.dateKey) ?? []), item]);
    });

    return map;
  }, [dueItems]);

  return (
    <section className="mt-6 border-t border-zinc-200 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1d66d6]">
            Kalender Pengembalian
          </p>
          <h3 className="mt-1 text-xl font-semibold text-zinc-950">
            Deadline peminjaman buku ini
          </h3>
        </div>
        <span className="rounded-full bg-[#e6f0ff] px-3 py-1 text-xs font-semibold text-[#1d66d6]">
          {loading ? "Memuat..." : `${dueItems.length} jadwal aktif`}
        </span>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-600" />
          Memuat jadwal pengembalian...
        </div>
      ) : dueItems.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          Belum ada peminjaman aktif untuk buku ini.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-zinc-950">
                {formatMonthLabel(month.year, month.monthIndex)}
              </p>
              <p className="text-xs font-semibold text-zinc-500">
                Tanggal biru = deadline
              </p>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const dayItems = cell.dateKey ? dueByDate.get(cell.dateKey) ?? [] : [];
                const dueCount = dayItems.reduce(
                  (total, item) => total + item.quantity,
                  0
                );
                const hasDue = dueCount > 0;
                const isToday = cell.dateKey === todayKey;

                return (
                  <div
                    key={cell.key}
                    className={`relative flex aspect-square min-h-11 items-center justify-center rounded-xl border text-sm font-semibold ${
                      hasDue
                        ? "border-[#1d66d6] bg-[#1d66d6] text-white"
                        : isToday
                          ? "border-[#1d66d6] bg-white text-[#1d66d6]"
                          : cell.day
                            ? "border-zinc-200 bg-white text-zinc-700"
                            : "border-transparent bg-transparent text-transparent"
                    }`}
                  >
                    {cell.day ?? ""}
                    {hasDue ? (
                      <span className="absolute bottom-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] text-white">
                        {dueCount}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-950">
              Jadwal jatuh tempo
            </p>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {dueItems.map((item, index) => (
                <div
                  key={`${item.transactionId}-${item.dateKey}-${index}`}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-zinc-950">
                      {formatDueDateTime(item.dueDate, item.dateKey)}
                    </p>
                    <span className="rounded-full bg-[#e6f0ff] px-2 py-1 text-xs font-semibold text-[#1d66d6]">
                      {item.quantity} eksemplar
                    </span>
                  </div>
                  {showBorrowerDetails ? (
                    <>
                      <p className="mt-1 text-zinc-700">{item.studentName}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.className ?? "-"} · Transaksi #{item.transactionId}
                      </p>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function isCatalogBorrowScheduleCalendarItem(
  item: CatalogBorrowScheduleItem & { dateKey: string | null }
): item is CatalogBorrowScheduleCalendarItem {
  return item.dateKey !== null;
}

function toDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(date);
}

function getTodayKey() {
  return toDateKey(new Date().toISOString()) ?? "";
}

function getCalendarMonth(items: Array<{ dateKey: string }>) {
  const firstDateKey = items[0]?.dateKey ?? getTodayKey();
  const [year, month] = firstDateKey.split("-").map(Number);

  return {
    monthIndex: Number.isFinite(month) ? month - 1 : new Date().getMonth(),
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  };
}

function buildCalendarCells(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - offset + 1;

    if (day < 1 || day > daysInMonth) {
      return {
        dateKey: null,
        day: null,
        key: `empty-${index}`,
      };
    }

    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");

    return {
      dateKey: `${year}-${month}-${date}`,
      day,
      key: `${year}-${month}-${date}`,
    };
  });
}

function formatMonthLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDueDateTime(value: string, fallbackDateKey: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return formatDateKey(fallbackDateKey);
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function CatalogAddCopiesModal({
  book,
  state,
  pending,
  onClose,
  onConfirm,
}: {
  book: AdminCatalogBook;
  state: CatalogActionState;
  pending: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const { counts, error: summaryError, loading } = useCatalogCopySummary(book.id);
  const quantityNumber = Number(quantity);
  const quantityInvalid =
    !Number.isInteger(quantityNumber) || quantityNumber < 1;
  const disabled = pending || quantityInvalid;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <article
        className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1768d8]">
              Tambah Eksemplar
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            x
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#1768d8] text-sm font-bold text-[#1768d8]">
              +
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Informasi Buku</p>
              <p className="mt-2 text-base font-medium text-[#1258ba]">
                {book.title}
              </p>
              <p className="mt-3 text-sm font-medium text-[#1258ba]">
                {loading
                  ? "Memuat ringkasan eksemplar..."
                  : `Aktif: ${counts.totalCopies} eksemplar - Tersedia: ${counts.availableCount} eksemplar - Dipinjam: ${counts.borrowedCount} eksemplar`}
              </p>
            </div>
          </div>
        </div>

        {summaryError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {summaryError}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-950">
              Jumlah Eksemplar Baru
            </span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.currentTarget.value)}
              disabled={pending}
              className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f4] px-4 text-base text-zinc-900 outline-none transition focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:opacity-70"
            />
            <p className="text-sm text-slate-500">
              Eksemplar baru akan otomatis berstatus tersedia.
            </p>
          </label>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {state.error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={() => onConfirm(quantityNumber)}
            disabled={disabled}
            className="inline-flex min-w-40 items-center justify-center rounded-xl bg-[#1768d8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1258ba] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Menambahkan..." : "Tambah"}
          </button>
        </div>
      </article>
    </div>
  );
}

function RemoveCopiesModal({
  book,
  state,
  pending,
  onClose,
  onConfirm,
}: {
  book: AdminCatalogBook;
  state: CatalogActionState;
  pending: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, reason: string) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const {
    counts,
    error: summaryError,
    loading,
  } = useCatalogCopySummary(book.id);
  const maxQuantity = Math.max(counts.totalCopies - counts.borrowedCount, 0);
  const quantityNumber = Number(quantity);
  const quantityInvalid =
    !Number.isInteger(quantityNumber) ||
    quantityNumber < 1 ||
    quantityNumber > maxQuantity;
  const shouldUseReturnModule =
    reason.trim().toLowerCase() === "tidak kembali dari peminjam";
  const disabled =
    pending ||
    loading ||
    Boolean(summaryError) ||
    maxQuantity < 1 ||
    quantityInvalid ||
    !reason ||
    shouldUseReturnModule;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <article
        className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
              Keluarkan Eksemplar
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            x
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-orange-500 text-sm font-bold text-orange-500">
              !
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Informasi Buku</p>
              <p className="mt-2 text-base font-medium text-orange-700">
                {book.title}
              </p>
              <p className="mt-3 text-sm font-medium text-orange-700">
                {loading
                  ? "Memuat ringkasan eksemplar..."
                  : `Total: ${counts.totalCopies} eksemplar - Tersedia: ${counts.availableCount} eksemplar - Dipinjam: ${counts.borrowedCount} eksemplar`}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-950">
              Jumlah Eksemplar Dikeluarkan
            </span>
            <input
              type="number"
              min={1}
              max={Math.max(maxQuantity, 1)}
              value={quantity}
              onChange={(event) => setQuantity(event.currentTarget.value)}
              disabled={pending || loading || maxQuantity < 1}
              className="h-12 w-full rounded-xl border border-transparent bg-[#f1f1f4] px-4 text-base text-zinc-900 outline-none transition focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:opacity-70"
            />
            <p className="text-sm text-slate-500">
              {loading
                ? "Memuat jumlah eksemplar aktif..."
                : `Maksimal ${maxQuantity} eksemplar (aktif dan tidak sedang dipinjam).`}
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-950">Alasan</span>
            <select
              value={reason}
              onChange={(event) => {
                setReason(event.currentTarget.value);
                setQuantity("1");
              }}
              disabled={pending}
              className="h-14 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none transition focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <option value="">Pilih Alasan</option>
              <option value="Hilang">Hilang</option>
              <option value="Rusak Berat">Rusak Berat</option>
              <option value="Tidak Kembali dari Peminjam">
                Tidak Kembali dari Peminjam
              </option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </label>
        </div>

        {shouldUseReturnModule ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Eksemplar yang tidak kembali dari peminjam harus diproses lewat
            modul pengembalian agar transaksi siswa ikut tercatat.
          </div>
        ) : null}

        {summaryError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {summaryError}
          </div>
        ) : null}

        {!loading && !summaryError && maxQuantity < 1 ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Tidak ada eksemplar aktif yang bisa dikeluarkan karena semuanya sedang dipinjam atau sudah dikeluarkan.
          </div>
        ) : null}

        {state.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {state.error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={() => onConfirm(quantityNumber, reason)}
            disabled={disabled}
            className="inline-flex min-w-40 items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Mengeluarkan..." : "Keluarkan"}
          </button>
        </div>
      </article>
    </div>
  );
}

function DeleteBookModal({
  book,
  state,
  pending,
  onClose,
  onConfirm,
}: {
  book: AdminCatalogBook;
  state: CatalogActionState;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { counts, error: summaryError, loading } = useCatalogCopySummary(book.id);
  const blockedByCurrentBorrow = counts.borrowedCount > 0;
  const blocked = blockedByCurrentBorrow || Boolean(state.blockedByTransactions);
  const message = blockedByCurrentBorrow
    ? "Buku ini tidak dapat dihapus karena masih memiliki eksemplar yang sedang dipinjam. Buku hanya bisa dihapus jika belum pernah dipinjam."
    : summaryError || state.error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <article
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
              Hapus Buku
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-950">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            x
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          <p>
            Buku hanya bisa dihapus jika belum pernah dipinjam. Jika sudah
            pernah masuk transaksi, riwayat peminjaman harus tetap tersimpan.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <p>
              Penulis:{" "}
              <span className="font-semibold text-zinc-950">
                {book.author ?? "-"}
              </span>
            </p>
            <p>
              Dipinjam:{" "}
              <span className="font-semibold text-zinc-950">
                {loading ? "Memuat..." : `${counts.borrowedCount} eksemplar`}
              </span>
            </p>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex min-w-24 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || loading || blocked}
            className="inline-flex min-w-28 items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </article>
    </div>
  );
}

function ActionToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 5000);

    return () => window.clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-emerald-200 bg-white p-4 text-sm font-semibold text-emerald-700 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100"
        >
          x
        </button>
      </div>
    </div>
  );
}

function EditBookModal({
  book,
  onClose,
  onAddCopies,
  onRemoveCopies,
}: {
  book: AdminCatalogBook;
  onClose: () => void;
  onAddCopies: () => void;
  onRemoveCopies: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateCatalogBook,
    initialActionState
  );
  const router = useRouter();
  const initialCoverPreview = getBookCoverDisplayUrl(book);
  const [coverPreview, setCoverPreview] = useState(initialCoverPreview);
  const [temporaryCoverUrl, setTemporaryCoverUrl] = useState("");

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onClose();
    }
  }, [onClose, router, state.success]);

  useEffect(() => {
    return () => {
      if (temporaryCoverUrl) {
        URL.revokeObjectURL(temporaryCoverUrl);
      }
    };
  }, [temporaryCoverUrl]);

  function previewSelectedCover(file: File | null) {
    if (temporaryCoverUrl) {
      URL.revokeObjectURL(temporaryCoverUrl);
    }

    if (!file) {
      setTemporaryCoverUrl("");
      setCoverPreview(initialCoverPreview);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setTemporaryCoverUrl(objectUrl);
    setCoverPreview(objectUrl);
  }

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
          <label
            className={`relative flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-zinc-400 bg-zinc-100 bg-cover bg-center p-5 text-center transition hover:bg-zinc-50 ${
              coverPreview ? "text-white" : "text-zinc-900"
            }`}
            style={
              coverPreview
                ? { backgroundImage: `url("${coverPreview}")` }
                : undefined
            }
          >
            {coverPreview ? (
              <span className="absolute inset-0 bg-zinc-950/45" aria-hidden />
            ) : null}
            <input
              type="file"
              name="foto_buku"
              accept=".jpg,.jpeg,.png,.webp,image/jpg,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) =>
                previewSelectedCover(event.currentTarget.files?.[0] ?? null)
              }
            />
            <span className="relative text-sm font-semibold">
              {coverPreview ? "Ganti Foto Buku" : "Upload Foto Baru"}
            </span>
            <span className={`relative mt-1 text-xs ${coverPreview ? "text-white/85" : "text-zinc-500"}`}>
              Pilih file JPG, PNG, atau WebP, maksimal 10 MB.
            </span>
          </label>

          <label className="flex min-h-32 flex-col justify-center rounded-2xl border border-zinc-200 bg-white p-5">
            <span className="text-sm font-semibold text-zinc-900">
              Link Gambar Buku
            </span>
            <input
              name="foto_url"
              type="url"
              defaultValue={book.coverUrl ?? ""}
              placeholder="https://contoh.com/sampul-buku.jpg"
              className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
            />
            <span className="mt-2 text-xs text-zinc-500">
              Kosongkan field ini untuk menghapus gambar.
            </span>
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Manajemen Eksemplar
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Tambah atau keluarkan eksemplar untuk buku ini.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[320px]">
              <button
                type="button"
                onClick={onAddCopies}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                Tambah Eksemplar
              </button>
              <button
                type="button"
                onClick={onRemoveCopies}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                Keluarkan Eksemplar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Judul Buku" name="judul" defaultValue={book.title} required />
          <Field label="Penulis" name="penulis" defaultValue={book.author ?? ""} required />
          <Field label="Penerbit" name="penerbit" defaultValue={book.publisher ?? ""} />
          <Field label="ISBN" name="isbn" defaultValue={book.isbn ?? ""} />
          <Field label="Tahun Terbit" name="tahun_terbit" type="number" defaultValue={book.publishedYear?.toString() ?? ""} />
          <ShelfLocationInput
            defaultValue={book.shelfLocation ?? ""}
          />
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
  helper,
}: {
  label: string;
  value: string | null;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-zinc-900">{value || "-"}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p> : null}
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

function shelfCodeValue(value: string) {
  return value.trim().replace(/^rak\b/i, "").trim().toUpperCase();
}

function ShelfLocationInput({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-zinc-900">Lokasi Rak</span>
      <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-[#1d66d6]">
        <span className="inline-flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
          Rak
        </span>
        <input
          name="lokasi_rak"
          defaultValue={shelfCodeValue(defaultValue)}
          placeholder="A1"
          className="min-w-0 flex-1 px-3 py-2.5 text-sm text-zinc-900 outline-none"
        />
      </div>
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
