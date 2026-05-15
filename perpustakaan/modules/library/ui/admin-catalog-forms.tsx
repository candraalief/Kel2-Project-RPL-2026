"use client";

import Link from "next/link";
import { useActionState, useDeferredValue, useEffect, useMemo, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createCatalogBook,
  createCatalogGenre,
  deleteCatalogGenre,
  updateCatalogGenre,
  type CatalogActionState,
} from "@/app/actions/catalog";
import type { CatalogGenre } from "@/modules/library/lib/catalog";
import {
  ButtonLoadingSpinner,
  useButtonPressLoading,
} from "@/modules/shared/ui/button-loading";
const initialActionState: CatalogActionState = {
  error: "",
  success: "",
};

type ActiveTab = "book" | "genre";

export function AdminCatalogCreatePage({ genres }: { genres: CatalogGenre[] }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("book");
  const { loadingKey: loadingTab, startLoading: startTabLoading } =
    useButtonPressLoading<ActiveTab>();

  function selectTab(tab: ActiveTab) {
    startTabLoading(tab);
    setActiveTab(tab);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-500">Admin</p>
          <h2 className="text-3xl font-semibold text-zinc-950">
            Katalog - Tambah Katalog
          </h2>
        </div>
        <Link
          href="/admin/buku"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-2xl font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
        >
          &lt;
        </Link>
      </div>

      <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => selectTab("book")}
          aria-busy={loadingTab === "book"}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === "book"
              ? "bg-[#1d66d6] text-white"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {loadingTab === "book" ? <ButtonLoadingSpinner /> : null}
          Tambah Buku
        </button>
        <button
          type="button"
          onClick={() => selectTab("genre")}
          aria-busy={loadingTab === "genre"}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === "genre"
              ? "bg-[#1d66d6] text-white"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {loadingTab === "genre" ? <ButtonLoadingSpinner /> : null}
          Tambah Genre
        </button>
      </div>

      {activeTab === "book" ? (
        <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <AddBookForm genres={genres} />
        </section>
      ) : (
        <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <AddGenreForm genres={genres} />
        </section>
      )}
    </div>
  );
}

function AddBookForm({ genres }: { genres: CatalogGenre[] }) {
  const [bookFields, setBookFields] = useState({
    judul: "",
    penulis: "",
    penerbit: "",
    isbn: "",
    tahun_terbit: "",
    jumlah_copy: "1",
    deskripsi: "",
    lokasi_rak: "",
    foto_url: "",
  });
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [state, formAction, pending] = useActionState(async (
    prevState: CatalogActionState | undefined,
    formData: FormData
  ) => {
    const nextState = await createCatalogBook(prevState, formData);

    if (nextState.success) {
      setBookFields({
        judul: "",
        penulis: "",
        penerbit: "",
        isbn: "",
        tahun_terbit: "",
        jumlah_copy: "1",
        deskripsi: "",
        lokasi_rak: "",
        foto_url: "",
      });
      setSelectedGenreIds([]);
      setShowAllGenres(false);
    }

    return nextState;
  }, initialActionState);
  const sortedGenres = useMemo(
    () => [...genres].sort((first, second) => first.name.localeCompare(second.name, "id-ID")),
    [genres]
  );
  const visibleGenres = showAllGenres ? sortedGenres : sortedGenres.slice(0, 3);
  const hiddenGenreCount = Math.max(sortedGenres.length - visibleGenres.length, 0);

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId]
    );
  }

  function updateBookField(field: keyof typeof bookFields, value: string) {
    setBookFields((currentFields) => ({
      ...currentFields,
      [field]: value,
    }));
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-400 bg-zinc-100 p-6 text-center transition hover:bg-zinc-50">
          <input type="file" name="foto_buku" accept="image/*" className="sr-only" />
          <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-zinc-700" aria-hidden>
            <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 13l2.5-3 3 4 1.5-2 3 4H6l2-3z" fill="currentColor" />
            <circle cx="16" cy="8" r="1.5" fill="currentColor" />
          </svg>
          <span className="mt-3 text-sm font-semibold text-zinc-900">
            Upload Foto Buku
          </span>
          <span className="mt-1 text-xs text-zinc-500">
            Pilih file gambar dari perangkat.
          </span>
        </label>

        <label className="flex min-h-40 flex-col justify-center rounded-2xl border border-zinc-200 bg-white p-5">
          <span className="text-sm font-semibold text-zinc-900">
            Link Gambar Buku
          </span>
          <input
            name="foto_url"
            type="url"
            value={bookFields.foto_url}
            onChange={(event) => updateBookField("foto_url", event.currentTarget.value)}
            placeholder="https://contoh.com/sampul-buku.jpg"
            className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
          />
          <span className="mt-2 text-xs text-zinc-500">
            Bisa memakai URL gambar dari internet.
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Judul Buku"
          name="judul"
          value={bookFields.judul}
          onChange={(value) => updateBookField("judul", value)}
          required
          className="md:col-span-2"
        />
        <Field
          label="Penulis"
          name="penulis"
          value={bookFields.penulis}
          onChange={(value) => updateBookField("penulis", value)}
          required
        />
        <Field
          label="Penerbit"
          name="penerbit"
          value={bookFields.penerbit}
          onChange={(value) => updateBookField("penerbit", value)}
        />
        <Field
          label="ISBN"
          name="isbn"
          value={bookFields.isbn}
          onChange={(value) => updateBookField("isbn", value)}
        />
        <Field
          label="Tahun Terbit"
          name="tahun_terbit"
          type="number"
          value={bookFields.tahun_terbit}
          onChange={(value) => updateBookField("tahun_terbit", value)}
        />
        <Field
          label="Jumlah Copy Awal"
          name="jumlah_copy"
          type="number"
          min="1"
          value={bookFields.jumlah_copy}
          onChange={(value) => updateBookField("jumlah_copy", value)}
          required
        />

        <div className="space-y-3 md:col-span-2">
          <p className="text-sm font-semibold text-zinc-900">Genre</p>
          {selectedGenreIds.map((genreId) => (
            <input key={genreId} type="hidden" name="genre_ids" value={genreId} />
          ))}

          <div className="flex flex-wrap items-center gap-2">
            {sortedGenres.length === 0 ? (
              <p className="text-sm text-zinc-500">Belum ada genre.</p>
            ) : (
              visibleGenres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                    selectedGenreIds.includes(genre.id)
                      ? "border-[#2f7cff] bg-[#2f7cff] text-white"
                      : "border-zinc-200 bg-white text-black hover:bg-zinc-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${
                      selectedGenreIds.includes(genre.id)
                        ? "border-white text-white"
                        : "border-zinc-300 text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  {genre.name}
                </button>
              ))
            )}
            {sortedGenres.length > 3 ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowAllGenres(!showAllGenres)}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold text-[#1768d8] transition hover:bg-zinc-50"
                >
                  {showAllGenres ? "Less" : `More +${hiddenGenreCount}`}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-zinc-900">
            Deskripsi Buku
          </span>
          <textarea
            name="deskripsi"
            rows={4}
            value={bookFields.deskripsi}
            onChange={(event) => updateBookField("deskripsi", event.currentTarget.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          />
        </label>

        <ShelfLocationInput
          value={bookFields.lokasi_rak}
          onChange={(value) => updateBookField("lokasi_rak", value)}
        />
      </div>

      <ActionNotice state={state} />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-w-44 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Menambahkan..." : "Tambahkan"}
      </button>
    </form>
  );
}

function AddGenreForm({ genres }: { genres: CatalogGenre[] }) {
  const router = useRouter();
  const [genreQuery, setGenreQuery] = useState("");
  const [addingGenre, setAddingGenre] = useState(false);
  const [editingGenre, setEditingGenre] = useState<CatalogGenre | null>(null);
  const [deletingGenre, setDeletingGenre] = useState<CatalogGenre | null>(null);
  const [actionState, setActionState] =
    useState<CatalogActionState>(initialActionState);
  const [isPending, startTransition] = useTransition();
  const deferredGenreQuery = useDeferredValue(genreQuery);
  const sortedGenres = useMemo(
    () => [...genres].sort((first, second) => first.name.localeCompare(second.name, "id-ID")),
    [genres]
  );
  const filteredGenres = sortedGenres.filter((genre) =>
    genre.name.toLowerCase().includes(deferredGenreQuery.trim().toLowerCase())
  );

  useEffect(() => {
    if (actionState.success) {
      router.refresh();
    }
  }, [actionState.success, router]);

  function openAddModal() {
    setActionState(initialActionState);
    setAddingGenre(true);
  }

  function openEditModal(genre: CatalogGenre) {
    setActionState(initialActionState);
    setEditingGenre(genre);
  }

  function openDeleteModal(genre: CatalogGenre) {
    setActionState(initialActionState);
    setDeletingGenre(genre);
  }

  function closeModal() {
    if (isPending) {
      return;
    }

    setAddingGenre(false);
    setEditingGenre(null);
    setDeletingGenre(null);
    setActionState(initialActionState);
  }

  function submitAddGenre(formData: FormData) {
    if (isPending) {
      return;
    }

    setActionState(initialActionState);
    startTransition(async () => {
      const result = await createCatalogGenre(undefined, formData);
      setActionState(result);

      if (!result.error) {
        setAddingGenre(false);
      }
    });
  }

  function submitEditGenre(genreId: string, name: string, description: string) {
    if (isPending) {
      return;
    }

    setActionState(initialActionState);
    startTransition(async () => {
      const result = await updateCatalogGenre(genreId, name, description);
      setActionState(result);

      if (!result.error) {
        setEditingGenre(null);
      }
    });
  }

  function confirmDeleteGenre() {
    if (!deletingGenre || isPending) {
      return;
    }

    setActionState(initialActionState);
    startTransition(async () => {
      const result = await deleteCatalogGenre(deletingGenre.id);
      setActionState(result);

      if (!result.error) {
        setDeletingGenre(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-950">Kelola Genre</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Cari, tambah, edit, dan hapus genre katalog.
            </p>
          </div>
          <div className="flex min-w-[min(100%,28rem)] flex-1 items-center gap-2 md:flex-none">
            <label className="relative block flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon />
              </span>
              <input
                value={genreQuery}
                onChange={(event) => setGenreQuery(event.currentTarget.value)}
                placeholder="Cari genre berdasarkan nama..."
                className="h-10 w-full rounded-xl border border-transparent bg-[#f1f1f4] pl-9 pr-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-slate-500 focus:border-[#1d66d6]"
              />
            </label>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2f7eea] text-xl font-semibold text-white transition hover:bg-[#1d66d6]"
              aria-label="Tambah genre"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {filteredGenres.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
              Genre tidak ditemukan.
            </p>
          ) : (
            filteredGenres.map((genre) => (
              <article
                key={genre.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-950">
                    {genre.name}
                  </h4>
                  <p className="mt-1 text-sm text-zinc-500">
                    {genre.description ?? "Tanpa deskripsi"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(genre)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(genre)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {actionState.success && !addingGenre && !editingGenre && !deletingGenre ? (
        <ActionNotice state={actionState} />
      ) : null}

      {addingGenre ? (
        <GenreFormModal
          title="Tambah Genre"
          submitLabel={isPending ? "Menambahkan..." : "Tambahkan"}
          pending={isPending}
          state={actionState}
          onClose={closeModal}
          onSubmit={submitAddGenre}
        />
      ) : null}

      {editingGenre ? (
        <GenreFormModal
          title="Edit Genre"
          submitLabel={isPending ? "Menyimpan..." : "Simpan"}
          pending={isPending}
          state={actionState}
          genre={editingGenre}
          onClose={closeModal}
          onSubmit={(formData) =>
            submitEditGenre(
              editingGenre.id,
              String(formData.get("nama_genre") ?? ""),
              String(formData.get("deskripsi_genre") ?? "")
            )
          }
        />
      ) : null}

      {deletingGenre ? (
        <DangerGenreModal
          genre={deletingGenre}
          pending={isPending}
          state={actionState}
          onClose={closeModal}
          onConfirm={confirmDeleteGenre}
        />
      ) : null}
    </div>
  );
}

function GenreFormModal({
  title,
  submitLabel,
  pending,
  state,
  genre,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  pending: boolean;
  state: CatalogActionState;
  genre?: CatalogGenre;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
      onClick={onClose}
    >
      <form
        action={onSubmit}
        className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d66d6]">
              Genre
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-zinc-950">
              {title}
            </h3>
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

        <div className="mt-5 space-y-4">
          <Field
            label="Nama Genre"
            name="nama_genre"
            defaultValue={genre?.name ?? ""}
            required
          />
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-900">
              Deskripsi Genre
            </span>
            <textarea
              name="deskripsi_genre"
              rows={4}
              defaultValue={genre?.description ?? ""}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
            />
          </label>
        </div>

        <div className="mt-4">
          <ActionNotice state={state} />
        </div>

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
            type="submit"
            disabled={pending}
            className="inline-flex min-w-36 items-center justify-center rounded-xl bg-[#2f7eea] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function DangerGenreModal({
  genre,
  pending,
  state,
  onClose,
  onConfirm,
}: {
  genre: CatalogGenre;
  pending: boolean;
  state: CatalogActionState;
  onClose: () => void;
  onConfirm: () => void;
}) {
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
              Hapus Genre
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-zinc-950">
              {genre.name}
            </h3>
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

        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Genre akan dihapus dari daftar dan relasi buku yang memakai genre ini
          akan dilepas.
        </p>

        <div className="mt-4">
          <ActionNotice state={state} />
        </div>

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
            disabled={pending}
            className="inline-flex min-w-28 items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </article>
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

function shelfCodeValue(value: string) {
  return value.trim().replace(/^rak\b/i, "").trim().toUpperCase();
}

function ShelfLocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const code = shelfCodeValue(value);

  return (
    <label className="block space-y-2 md:col-span-2">
      <span className="text-sm font-semibold text-zinc-900">Lokasi Rak</span>
      <input type="hidden" name="lokasi_rak" value={code} />
      <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-[#1d66d6]">
        <span className="inline-flex items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-700">
          Rak
        </span>
        <input
          value={code}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="A1"
          className="min-w-0 flex-1 px-3 py-2.5 text-sm text-zinc-900 outline-none"
        />
      </div>
      <p className="text-xs text-zinc-500">
        Cukup isi kode rak, misalnya A1 atau B2. Sistem akan menyimpan sebagai Rak A1.
      </p>
    </label>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  value,
  onChange,
  required,
  className = "",
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
}) {
  const controlledProps =
    value === undefined
      ? { defaultValue }
      : {
          value,
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onChange?.(event.currentTarget.value),
        };

  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-sm font-semibold text-zinc-900">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        {...controlledProps}
        required={required}
        min={min}
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
