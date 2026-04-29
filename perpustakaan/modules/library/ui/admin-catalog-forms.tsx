"use client";

import Link from "next/link";
import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCatalogBook,
  createCatalogGenre,
  type CatalogActionState,
} from "@/app/actions/catalog";
import type { CatalogGenre } from "@/modules/library/lib/catalog";

const initialActionState: CatalogActionState = {
  error: "",
  success: "",
};

type ActiveTab = "book" | "genre";

export function AdminCatalogCreatePage({ genres }: { genres: CatalogGenre[] }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("book");

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
          onClick={() => setActiveTab("book")}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === "book"
              ? "bg-[#1d66d6] text-white"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Tambah Buku
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("genre")}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
            activeTab === "genre"
              ? "bg-[#1d66d6] text-white"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
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
  const [state, formAction, pending] = useActionState(
    createCatalogBook,
    initialActionState
  );
  const [genreQuery, setGenreQuery] = useState("");
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [showAllSelected, setShowAllSelected] = useState(false);
  const deferredGenreQuery = useDeferredValue(genreQuery);
  const sortedGenres = useMemo(
    () => [...genres].sort((first, second) => first.name.localeCompare(second.name, "id-ID")),
    [genres]
  );
  const selectedGenres = sortedGenres.filter((genre) =>
    selectedGenreIds.includes(genre.id)
  );
  const visibleSelectedGenres = showAllSelected
    ? selectedGenres
    : selectedGenres.slice(0, 4);
  const hiddenSelectedCount = selectedGenres.length - visibleSelectedGenres.length;
  const filteredGenres = sortedGenres.filter((genre) =>
    genre.name.toLowerCase().includes(deferredGenreQuery.trim().toLowerCase())
  );

  function toggleGenre(genreId: string) {
    setSelectedGenreIds((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId]
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-400 bg-zinc-100 p-6 text-center transition hover:bg-zinc-50">
        <input type="file" name="foto_buku" accept="image/*" className="sr-only" />
        <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-zinc-700" aria-hidden>
          <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 13l2.5-3 3 4 1.5-2 3 4H6l2-3z" fill="currentColor" />
          <circle cx="16" cy="8" r="1.5" fill="currentColor" />
        </svg>
        <span className="mt-3 text-sm font-semibold text-zinc-900">
          Tambah Foto Buku
        </span>
        <span className="mt-1 text-xs text-zinc-500">
          Struktur upload sudah siap, crop foto bisa ditambahkan nanti.
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Judul Buku" name="judul" required className="md:col-span-2" />
        <Field label="Penulis" name="penulis" required />
        <Field label="Penerbit" name="penerbit" />
        <Field label="ISBN" name="isbn" />
        <Field label="Tahun Terbit" name="tahun_terbit" type="number" />
        <Field label="Lokasi Rak" name="lokasi_rak" />
        <Field
          label="Jumlah Copy Awal"
          name="jumlah_copy"
          type="number"
          min="1"
          defaultValue="1"
          required
        />

        <div className="space-y-3 md:col-span-2">
          <p className="text-sm font-semibold text-zinc-900">Genre</p>
          {selectedGenreIds.map((genreId) => (
            <input key={genreId} type="hidden" name="genre_ids" value={genreId} />
          ))}

          {selectedGenres.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              {visibleSelectedGenres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#eaf3ff] px-3 py-1.5 text-sm font-semibold text-[#0f5fc4]"
                >
                  {genre.name}
                  <span aria-hidden>x</span>
                </button>
              ))}
              {hiddenSelectedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSelected(true)}
                  className="inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-zinc-600"
                >
                  +{hiddenSelectedCount} lainnya
                </button>
              ) : null}
              {showAllSelected && selectedGenres.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSelected(false)}
                  className="inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-zinc-600"
                >
                  Ringkas
                </button>
              ) : null}
            </div>
          ) : null}

          <input
            value={genreQuery}
            onChange={(event) => setGenreQuery(event.currentTarget.value)}
            placeholder="Cari genre"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6]"
          />

          <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2">
            {filteredGenres.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500">
                Genre tidak ditemukan.
              </p>
            ) : (
              filteredGenres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    selectedGenreIds.includes(genre.id)
                      ? "bg-[#eaf3ff] text-[#0f5fc4]"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span>{genre.name}</span>
                  <span>{selectedGenreIds.includes(genre.id) ? "Dipilih" : "+"}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-zinc-900">
            Deskripsi Buku
          </span>
          <textarea
            name="deskripsi"
            rows={4}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          />
        </label>

        <div className="flex min-h-28 items-center justify-center rounded-xl border border-zinc-300 bg-zinc-100 px-4 text-center text-sm font-semibold text-zinc-500 md:col-span-2">
          Denah rak otomatis mengikuti lokasi rak yang dipilih jika data denah tersedia.
        </div>
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
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createCatalogGenre,
    initialActionState
  );
  const sortedGenres = useMemo(
    () => [...genres].sort((first, second) => first.name.localeCompare(second.name, "id-ID")),
    [genres]
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <form ref={formRef} action={formAction} className="space-y-4">
        <Field label="Nama Genre" name="nama_genre" required />
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-zinc-900">
            Deskripsi Genre
          </span>
          <textarea
            name="deskripsi_genre"
            rows={4}
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#1d66d6]"
          />
        </label>

        <ActionNotice state={state} />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-w-44 items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {pending ? "Menambahkan..." : "Tambahkan"}
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Daftar Genre</h3>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {sortedGenres.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada genre.</p>
          ) : (
            sortedGenres.map((genre) => (
              <div
                key={genre.id}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2"
              >
                <p className="text-sm font-semibold text-zinc-900">{genre.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {genre.description ?? "Tanpa deskripsi"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  className = "",
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  min?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-sm font-semibold text-zinc-900">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
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
