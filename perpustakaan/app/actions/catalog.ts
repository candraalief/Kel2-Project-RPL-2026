"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/modules/access/lib/session";
import {
  getBookGenreTableConfigs,
  getCatalogGenres,
  getCopyTableConfigs,
} from "@/modules/library/lib/catalog";

export type CatalogActionState = {
  error: string;
  success: string;
};

const emptyState: CatalogActionState = {
  error: "",
  success: "",
};

async function requireAdminAction() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

function readTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseYear(value: string) {
  if (!value) {
    return null;
  }

  const year = Number(value);
  const currentYear = new Date().getFullYear() + 1;

  if (!Number.isInteger(year) || year < 1000 || year > currentYear) {
    return null;
  }

  return year;
}

function parseInitialCopies(value: string) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 1) {
    return null;
  }

  return count;
}

async function ensureUniqueIsbn(isbn: string) {
  if (!isbn) {
    return true;
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("buku")
    .select("id_buku")
    .eq("isbn", isbn)
    .limit(1);

  if (error) {
    return true;
  }

  return (data ?? []).length === 0;
}

async function insertInitialCopies(bookId: number, copyCount: number) {
  const supabase = getServerSupabaseClient();

  for (const config of getCopyTableConfigs()) {
    const rows = Array.from({ length: copyCount }, () => ({
      [config.bookIdColumn]: bookId,
      [config.statusColumn]: "tersedia",
    }));
    const { error } = await supabase.from(config.table).insert(rows as never);

    if (!error) {
      return true;
    }
  }

  return false;
}

async function insertBookGenres(bookId: number, genreIds: string[]) {
  if (genreIds.length === 0) {
    return;
  }

  const supabase = getServerSupabaseClient();

  for (const config of getBookGenreTableConfigs()) {
    const rows = genreIds.map((genreId) => ({
      [config.bookIdColumn]: bookId,
      [config.genreIdColumn]: genreId,
    }));
    const { error } = await supabase.from(config.table).insert(rows as never);

    if (!error) {
      return;
    }
  }
}

async function uploadBookCover(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  formData: FormData
) {
  const file = formData.get("foto_buku");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `covers/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("book-covers")
    .upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    return null;
  }

  return supabase.storage.from("book-covers").getPublicUrl(path).data.publicUrl;
}

async function removeBookCopies(bookId: number) {
  const supabase = getServerSupabaseClient();

  for (const config of getCopyTableConfigs()) {
    await supabase.from(config.table).delete().eq(config.bookIdColumn, bookId);
  }
}

async function removeBookGenres(bookId: number) {
  const supabase = getServerSupabaseClient();

  for (const config of getBookGenreTableConfigs()) {
    await supabase.from(config.table).delete().eq(config.bookIdColumn, bookId);
  }
}

export async function createCatalogGenre(
  _prevState: CatalogActionState | undefined,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdminAction();

  const name = readTrimmed(formData, "nama_genre");
  const description = readTrimmed(formData, "deskripsi_genre");

  if (!name) {
    return { error: "Nama genre wajib diisi.", success: "" };
  }

  const existingGenres = await getCatalogGenres();
  const isDuplicate = existingGenres.some(
    (genre) => genre.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (isDuplicate) {
    return { error: "Genre dengan nama tersebut sudah ada.", success: "" };
  }

  const supabase = getServerSupabaseClient();

  for (const table of ["genre", "genres"]) {
    const payloads = [
      {
        nama: name,
        deskripsi: description || null,
      },
      {
        nama_genre: name,
        deskripsi_genre: description || null,
      },
      {
        name,
        description: description || null,
      },
    ];

    for (const payload of payloads) {
      const { error } = await supabase.from(table).insert(payload as never);

      if (!error) {
        revalidatePath("/admin/buku");
        revalidatePath("/admin/buku/tambah");
        return { error: "", success: "Genre berhasil ditambahkan." };
      }
    }
  }

  return {
    error:
      "Tabel genre belum tersedia atau kolomnya berbeda. Siapkan tabel genre untuk menyimpan data ini.",
    success: "",
  };
}

export async function createCatalogBook(
  _prevState: CatalogActionState | undefined,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdminAction();

  const title = readTrimmed(formData, "judul");
  const author = readTrimmed(formData, "penulis");
  const publisher = readTrimmed(formData, "penerbit");
  const isbn = readTrimmed(formData, "isbn");
  const shelfLocation = readTrimmed(formData, "lokasi_rak");
  const description = readTrimmed(formData, "deskripsi");
  const year = parseYear(readTrimmed(formData, "tahun_terbit"));
  const initialCopies = parseInitialCopies(readTrimmed(formData, "jumlah_copy"));
  const genreIds = formData
    .getAll("genre_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!title) {
    return { error: "Judul buku wajib diisi.", success: "" };
  }

  if (!author) {
    return { error: "Penulis wajib diisi.", success: "" };
  }

  if (readTrimmed(formData, "tahun_terbit") && year === null) {
    return { error: "Tahun terbit harus berupa angka tahun yang valid.", success: "" };
  }

  if (initialCopies === null) {
    return { error: "Jumlah copy awal minimal 1.", success: "" };
  }

  if (!(await ensureUniqueIsbn(isbn))) {
    return { error: "ISBN sudah digunakan oleh buku lain.", success: "" };
  }

  const supabase = getServerSupabaseClient();
  const coverUrl = await uploadBookCover(supabase, formData);
  const fullPayload = {
    judul: title,
    penulis: author,
    penerbit: publisher || null,
    isbn: isbn || null,
    tahun_terbit: year,
    lokasi_rak: shelfLocation || null,
    deskripsi: description || null,
    foto_url: coverUrl,
    stok_buku: initialCopies,
  };

  let insertBook = await supabase
    .from("buku")
    .insert(fullPayload as never)
    .select("*")
    .single<Record<string, unknown>>();

  if (insertBook.error) {
    insertBook = await supabase
      .from("buku")
      .insert({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
        stok_buku: initialCopies,
      } as never)
      .select("*")
      .single<Record<string, unknown>>();
  }

  if (insertBook.error || !insertBook.data) {
    return {
      error: `Gagal menambahkan buku: ${insertBook.error?.message ?? "data tidak kembali"}`,
      success: "",
    };
  }

  const bookId = Number(insertBook.data.id_buku ?? insertBook.data.id);

  if (Number.isFinite(bookId)) {
    await Promise.all([
      insertInitialCopies(bookId, initialCopies),
      insertBookGenres(bookId, genreIds),
    ]);
  }

  revalidatePath("/admin/buku");
  revalidatePath("/admin/buku/tambah");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return {
    ...emptyState,
    success: "Buku berhasil ditambahkan.",
  };
}

export async function updateCatalogBook(
  _prevState: CatalogActionState | undefined,
  formData: FormData
): Promise<CatalogActionState> {
  await requireAdminAction();

  const bookId = Number(readTrimmed(formData, "id_buku"));
  const title = readTrimmed(formData, "judul");
  const author = readTrimmed(formData, "penulis");
  const publisher = readTrimmed(formData, "penerbit");
  const isbn = readTrimmed(formData, "isbn");
  const shelfLocation = readTrimmed(formData, "lokasi_rak");
  const description = readTrimmed(formData, "deskripsi");
  const year = parseYear(readTrimmed(formData, "tahun_terbit"));

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return { error: "Buku tidak valid.", success: "" };
  }

  if (!title || !author) {
    return { error: "Judul dan penulis wajib diisi.", success: "" };
  }

  if (readTrimmed(formData, "tahun_terbit") && year === null) {
    return { error: "Tahun terbit harus berupa angka tahun yang valid.", success: "" };
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase
    .from("buku")
    .update({
      judul: title,
      penulis: author,
      penerbit: publisher || null,
      isbn: isbn || null,
      tahun_terbit: year,
      lokasi_rak: shelfLocation || null,
      deskripsi: description || null,
    } as never)
    .eq("id_buku", bookId);

  if (error) {
    const fallback = await supabase
      .from("buku")
      .update({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
      } as never)
      .eq("id_buku", bookId);

    if (fallback.error) {
      return { error: `Gagal memperbarui buku: ${fallback.error.message}`, success: "" };
    }
  }

  revalidatePath("/admin/buku");
  revalidatePath("/admin/buku/tambah");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return { error: "", success: "Buku berhasil diperbarui." };
}

export async function deleteCatalogBook(bookId: number) {
  await requireAdminAction();

  if (!Number.isInteger(bookId) || bookId <= 0) {
    throw new Error("Buku tidak valid.");
  }

  await Promise.all([removeBookCopies(bookId), removeBookGenres(bookId)]);

  const supabase = getServerSupabaseClient();
  const { error } = await supabase.from("buku").delete().eq("id_buku", bookId);

  if (error) {
    throw new Error(`Gagal menghapus buku: ${error.message}`);
  }

  revalidatePath("/admin/buku");
  revalidatePath("/admin/buku/tambah");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");
}
