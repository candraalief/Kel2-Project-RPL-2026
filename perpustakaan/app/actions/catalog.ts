"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/modules/access/lib/session";
import { normalizeCatalogShelfLocation } from "@/modules/library/lib/shelf-locations";
import {
  getBookGenreTableConfigs,
  getCatalogBookBorrowSchedule,
  getCatalogBookCopySummary,
  getCatalogGenres,
  getCopyTableConfigs,
  type CatalogBorrowScheduleItem,
  type CatalogCopySummary,
} from "@/modules/library/lib/catalog";

export type CatalogActionState = {
  error: string;
  success: string;
  blockedByTransactions?: boolean;
};

export type CatalogCopySummaryState = {
  error: string;
  summary: CatalogCopySummary | null;
};

export type CatalogBorrowScheduleState = {
  error: string;
  items: CatalogBorrowScheduleItem[];
};

const emptyState: CatalogActionState = {
  error: "",
  success: "",
};
const bookCoverBucket = "foto_buku";
const maxBookCoverSize = 10 * 1024 * 1024;

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

function parsePositiveInteger(value: string) {
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

async function updateBookStock(bookId: number, delta: number) {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("buku")
    .select("stok_buku")
    .eq("id_buku", bookId)
    .single<{ stok_buku: number | null }>();

  if (error) {
    return;
  }

  const currentStock =
    typeof data?.stok_buku === "number" && Number.isFinite(data.stok_buku)
      ? data.stok_buku
      : 0;

  await supabase
    .from("buku")
    .update({ stok_buku: Math.max(currentStock + delta, 0) } as never)
    .eq("id_buku", bookId);
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
    return { coverUrl: null, coverPath: null, error: "" };
  }

  if (file.size > maxBookCoverSize) {
    return {
      coverUrl: null,
      coverPath: null,
      error: "Ukuran cover buku maksimal 10 MB.",
    };
  }

  const rawExtension = file.name.split(".").pop()?.toLowerCase() || "";
  const isPng = file.type === "image/png" || rawExtension === "png";
  const isWebp = file.type === "image/webp" || rawExtension === "webp";
  const isJpg =
    file.type === "image/jpg" ||
    file.type === "image/jpeg" ||
    rawExtension === "jpg" ||
    rawExtension === "jpeg";

  if (!isPng && !isJpg && !isWebp) {
    return {
      coverUrl: null,
      coverPath: null,
      error: "Cover buku harus berformat JPG, PNG, atau WebP.",
    };
  }

  const extension = isPng ? "png" : isWebp ? "webp" : "jpg";
  const contentType = isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";
  const path = `covers/${crypto.randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(bookCoverBucket)
    .upload(path, bytes, {
      contentType,
      upsert: false,
    });

  if (error) {
    return {
      coverUrl: null,
      coverPath: null,
      error: `Gagal mengunggah cover buku: ${error.message}`,
    };
  }

  return {
    coverUrl: supabase.storage.from(bookCoverBucket).getPublicUrl(path).data
      .publicUrl,
    coverPath: path,
    error: "",
  };
}

function parseBookCoverUrl(value: string) {
  if (!value) {
    return { coverUrl: null, coverPath: null, error: "" };
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        coverUrl: null,
        coverPath: null,
        error: "Link gambar harus diawali http:// atau https://.",
      };
    }

    return { coverUrl: url.toString(), coverPath: null, error: "" };
  } catch {
    return { coverUrl: null, coverPath: null, error: "Link gambar tidak valid." };
  }
}

function readRowString(row: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!row) {
    return null;
  }

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getBookCoverPath(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const prefixes = [
      `/storage/v1/object/public/${bookCoverBucket}/`,
      `/storage/v1/object/sign/${bookCoverBucket}/`,
      `/storage/v1/object/${bookCoverBucket}/`,
    ];

    for (const prefix of prefixes) {
      const index = url.pathname.indexOf(prefix);

      if (index >= 0) {
        return decodeURIComponent(url.pathname.slice(index + prefix.length));
      }
    }
  } catch {
    // Legacy data may store only the storage object path.
  }

  if (/^covers\//i.test(value)) {
    return value;
  }

  return null;
}

function hasDifferentStoredCover(previousUrl: string | null, nextUrl: string | null) {
  const previousPath = getBookCoverPath(previousUrl);
  const nextPath = getBookCoverPath(nextUrl);

  if (previousPath && nextPath) {
    return previousPath !== nextPath;
  }

  return previousUrl !== nextUrl;
}

async function removeBookCoverPath(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  path: string | null
) {
  if (!path) {
    return;
  }

  await supabase.storage.from(bookCoverBucket).remove([path]);
}

async function removeStoredBookCover(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  coverUrl: string | null
) {
  await removeBookCoverPath(supabase, getBookCoverPath(coverUrl));
}

async function getExistingBookCoverUrl(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  bookId: number
) {
  const { data, error } = await supabase
    .from("buku")
    .select("*")
    .eq("id_buku", bookId)
    .limit(1)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    return null;
  }

  return readRowString(data, ["foto_url", "foto_buku", "cover_url", "gambar"]);
}

async function resolveBookCoverUrl(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  formData: FormData
) {
  const uploadedCover = await uploadBookCover(supabase, formData);

  if (uploadedCover.error || uploadedCover.coverUrl) {
    return uploadedCover;
  }

  return parseBookCoverUrl(readTrimmed(formData, "foto_url"));
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

async function removeGenreRelations(genreId: string) {
  const supabase = getServerSupabaseClient();

  for (const config of getBookGenreTableConfigs()) {
    await supabase.from(config.table).delete().eq(config.genreIdColumn, genreId);
  }
}

function genrePayloads(name: string, description: string) {
  return [
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
}

async function hasRowsByColumn(table: string, column: string, value: number | string) {
  const supabase = getServerSupabaseClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}

async function getBookCopyIds(bookId: number) {
  const supabase = getServerSupabaseClient();
  const copyIdColumns = ["id_copy", "id_copy_buku", "copy_id", "id_eksemplar", "id"];

  for (const config of getCopyTableConfigs()) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq(config.bookIdColumn, bookId);

    if (!error && data) {
      return (data as Record<string, unknown>[])
        .map((row) => {
          for (const column of copyIdColumns) {
            const value = row[column];

            if (typeof value === "number" && Number.isFinite(value)) {
              return value;
            }

            if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
              return Number(value);
            }
          }

          return null;
        })
        .filter((value): value is number => value !== null);
    }
  }

  return [];
}

function readCopyRowId(row: Record<string, unknown>) {
  const copyIdColumns = ["id_copy", "id_copy_buku", "copy_id", "id_eksemplar", "id"];

  for (const column of copyIdColumns) {
    const value = row[column];

    if (typeof value === "number" && Number.isFinite(value)) {
      return { column, value };
    }

    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return { column, value: Number(value) };
    }
  }

  return null;
}

function normalizeCopyStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isBorrowedCopyStatus(status: string) {
  return status.includes("dipinjam") || status.includes("borrowed");
}

function isRemovedCopyStatus(status: string) {
  return (
    status.includes("dikeluarkan") ||
    status.includes("hilang") ||
    status.includes("keluar") ||
    status.includes("dibuang") ||
    status.includes("musnah")
  );
}

function isRemovableCopy(row: Record<string, unknown>, statusColumn: string) {
  const status = normalizeCopyStatus(row[statusColumn]);

  return !isBorrowedCopyStatus(status) && !isRemovedCopyStatus(status);
}

async function updateCopyAsRemoved(
  table: string,
  statusColumn: string,
  idColumn: string,
  idValue: number,
  reason: string
) {
  const supabase = getServerSupabaseClient();
  let lastError = "";
  const normalizedReason = reason.trim().toLowerCase();
  const targetStatuses =
    normalizedReason === "rusak berat"
      ? ["dikeluarkan", "hilang"]
      : normalizedReason === "lainnya"
        ? ["dikeluarkan", "hilang"]
        : ["hilang", "dikeluarkan"];
  const payloads = targetStatuses.flatMap((status) => [
    {
      [statusColumn]: status,
      alasan_dikeluarkan: reason,
      catatan: reason,
    },
    {
      [statusColumn]: status,
      alasan_dikeluarkan: reason,
    },
    {
      [statusColumn]: status,
      catatan: reason,
    },
    {
      [statusColumn]: status,
    },
  ]);

  for (const payload of payloads) {
    const { error } = await supabase
      .from(table)
      .update(payload as never)
      .eq(idColumn, idValue);

    if (!error) {
      return { success: true, error: "" };
    }

    lastError = error.message;
  }

  return { success: false, error: lastError };
}

async function hasBorrowedCopyStatus(bookId: number) {
  const supabase = getServerSupabaseClient();

  for (const config of getCopyTableConfigs()) {
    const { count, error } = await supabase
      .from(config.table)
      .select("*", { count: "exact", head: true })
      .eq(config.bookIdColumn, bookId)
      .eq(config.statusColumn, "dipinjam");

    if (!error && (count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

async function bookHasBorrowingHistory(bookId: number) {
  const transactionTables = ["transaksi", "peminjaman"];
  const transactionDetailTables = [
    "detail_transaksi_peminjaman",
    "detail_transaksi",
    "transaksi_detail",
    "detail_peminjaman",
    "peminjaman_detail",
  ];
  const bookIdColumns = ["id_buku", "book_id"];
  const copyIdColumns = ["id_copy", "id_copy_buku", "copy_id", "id_eksemplar"];

  if (await hasBorrowedCopyStatus(bookId)) {
    return true;
  }

  for (const table of [...transactionTables, ...transactionDetailTables]) {
    for (const column of bookIdColumns) {
      if (await hasRowsByColumn(table, column, bookId)) {
        return true;
      }
    }
  }

  const copyIds = await getBookCopyIds(bookId);

  for (const copyId of copyIds) {
    for (const table of [...transactionTables, ...transactionDetailTables]) {
      for (const column of copyIdColumns) {
        if (await hasRowsByColumn(table, column, copyId)) {
          return true;
        }
      }
    }
  }

  return false;
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
    for (const payload of genrePayloads(name, description)) {
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

export async function updateCatalogGenre(
  genreId: string,
  name: string,
  description: string
): Promise<CatalogActionState> {
  await requireAdminAction();

  const id = genreId.trim();
  const nextName = name.trim();
  const nextDescription = description.trim();

  if (!id) {
    return { error: "Genre tidak valid.", success: "" };
  }

  if (!nextName) {
    return { error: "Nama genre wajib diisi.", success: "" };
  }

  const existingGenres = await getCatalogGenres();
  const isDuplicate = existingGenres.some(
    (genre) =>
      genre.id !== id &&
      genre.name.trim().toLowerCase() === nextName.toLowerCase()
  );

  if (isDuplicate) {
    return { error: "Genre dengan nama tersebut sudah ada.", success: "" };
  }

  const supabase = getServerSupabaseClient();
  const idColumns = ["id_genre", "genre_id", "id"];

  for (const table of ["genre", "genres"]) {
    for (const idColumn of idColumns) {
      for (const payload of genrePayloads(nextName, nextDescription)) {
        const { data, error } = await supabase
          .from(table)
          .update(payload as never)
          .eq(idColumn, id)
          .select("*")
          .limit(1);

        if (!error && data && data.length > 0) {
          revalidatePath("/admin/buku");
          revalidatePath("/admin/buku/tambah");
          return { error: "", success: "Genre berhasil diperbarui." };
        }
      }
    }
  }

  return {
    error:
      "Genre gagal diperbarui. Tabel genre belum tersedia atau kolomnya berbeda.",
    success: "",
  };
}

export async function deleteCatalogGenre(
  genreId: string
): Promise<CatalogActionState> {
  await requireAdminAction();

  const id = genreId.trim();

  if (!id) {
    return { error: "Genre tidak valid.", success: "" };
  }

  await removeGenreRelations(id);

  const supabase = getServerSupabaseClient();
  const idColumns = ["id_genre", "genre_id", "id"];
  let lastError = "";

  for (const table of ["genre", "genres"]) {
    for (const idColumn of idColumns) {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, id)
        .select("*")
        .limit(1);

      if (!error && data && data.length > 0) {
        revalidatePath("/admin/buku");
        revalidatePath("/admin/buku/tambah");
        return { error: "", success: "Genre berhasil dihapus." };
      }

      if (error) {
        lastError = error.message;
      }
    }
  }

  return {
    error: lastError
      ? `Genre gagal dihapus: ${lastError}`
      : "Genre gagal dihapus. Data genre tidak ditemukan.",
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
  const shelfLocation = normalizeCatalogShelfLocation(
    readTrimmed(formData, "lokasi_rak")
  );
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
  const cover = await resolveBookCoverUrl(supabase, formData);

  if (cover.error) {
    return { error: cover.error, success: "" };
  }

  const fullPayload = {
    judul: title,
    penulis: author,
    penerbit: publisher || null,
    isbn: isbn || null,
    tahun_terbit: year,
    lokasi_rak: shelfLocation || null,
    deskripsi: description || null,
    deskripsi_buku: description || null,
    foto_url: cover.coverUrl,
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
        isbn: isbn || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
        deskripsi_buku: description || null,
        foto_url: cover.coverUrl,
        stok_buku: initialCopies,
      } as never)
      .select("*")
      .single<Record<string, unknown>>();
  }

  if (insertBook.error) {
    insertBook = await supabase
      .from("buku")
      .insert({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        isbn: isbn || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
        foto_url: cover.coverUrl,
        stok_buku: initialCopies,
      } as never)
      .select("*")
      .single<Record<string, unknown>>();
  }

  if (insertBook.error) {
    insertBook = await supabase
      .from("buku")
      .insert({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        isbn: isbn || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
        stok_buku: initialCopies,
      } as never)
      .select("*")
      .single<Record<string, unknown>>();
  }

  if (insertBook.error || !insertBook.data) {
    await removeBookCoverPath(supabase, cover.coverPath);

    return {
      error: `Gagal menambahkan buku: ${insertBook.error?.message ?? "data tidak kembali"}`,
      success: "",
    };
  }

  const storedCoverUrl = readRowString(insertBook.data, [
    "foto_url",
    "foto_buku",
    "cover_url",
    "gambar",
  ]);

  if (cover.coverPath && !storedCoverUrl) {
    await removeBookCoverPath(supabase, cover.coverPath);
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
  const shelfLocation = normalizeCatalogShelfLocation(
    readTrimmed(formData, "lokasi_rak")
  );
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
  const previousCoverUrl = await getExistingBookCoverUrl(supabase, bookId);
  const cover = await resolveBookCoverUrl(supabase, formData);

  if (cover.error) {
    return { error: cover.error, success: "" };
  }

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
      deskripsi_buku: description || null,
      foto_url: cover.coverUrl,
    } as never)
    .eq("id_buku", bookId);
  let coverSaved = !error;

  if (error) {
    const fallbackWithBookDescription = await supabase
      .from("buku")
      .update({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        isbn: isbn || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
        deskripsi_buku: description || null,
        foto_url: cover.coverUrl,
      } as never)
      .eq("id_buku", bookId);

    if (!fallbackWithBookDescription.error) {
      if (hasDifferentStoredCover(previousCoverUrl, cover.coverUrl)) {
        await removeStoredBookCover(supabase, previousCoverUrl);
      }

      revalidatePath("/admin/buku");
      revalidatePath("/admin/buku/tambah");
      revalidatePath("/public/katalog");
      revalidatePath("/siswa/katalog");

      return { error: "", success: "Buku berhasil diperbarui." };
    }

    const fallbackWithCover = await supabase
      .from("buku")
      .update({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        isbn: isbn || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
        foto_url: cover.coverUrl,
      } as never)
      .eq("id_buku", bookId);

    if (!fallbackWithCover.error) {
      if (hasDifferentStoredCover(previousCoverUrl, cover.coverUrl)) {
        await removeStoredBookCover(supabase, previousCoverUrl);
      }

      revalidatePath("/admin/buku");
      revalidatePath("/admin/buku/tambah");
      revalidatePath("/public/katalog");
      revalidatePath("/siswa/katalog");

      return { error: "", success: "Buku berhasil diperbarui." };
    }

    const fallback = await supabase
      .from("buku")
      .update({
        judul: title,
        penulis: author,
        penerbit: publisher || null,
        isbn: isbn || null,
        tahun_terbit: year,
        lokasi_rak: shelfLocation || null,
      } as never)
      .eq("id_buku", bookId);

    if (fallback.error) {
      await removeBookCoverPath(supabase, cover.coverPath);

      return { error: `Gagal memperbarui buku: ${fallback.error.message}`, success: "" };
    }

    coverSaved = false;
  }

  if (coverSaved && hasDifferentStoredCover(previousCoverUrl, cover.coverUrl)) {
    await removeStoredBookCover(supabase, previousCoverUrl);
  }

  if (!coverSaved) {
    await removeBookCoverPath(supabase, cover.coverPath);
  }

  revalidatePath("/admin/buku");
  revalidatePath("/admin/buku/tambah");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return { error: "", success: "Buku berhasil diperbarui." };
}

export async function loadCatalogBookCopySummary(
  bookId: number
): Promise<CatalogCopySummaryState> {
  await requireAdminAction();

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return { error: "Buku tidak valid.", summary: null };
  }

  try {
    const summary = await getCatalogBookCopySummary(bookId);

    return { error: "", summary };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Gagal memuat ringkasan eksemplar: ${error.message}`
          : "Gagal memuat ringkasan eksemplar.",
      summary: null,
    };
  }
}

export async function loadCatalogBookBorrowSchedule(
  bookId: number,
  includeBorrowerDetails = false
): Promise<CatalogBorrowScheduleState> {
  const sessionUser = await getSessionUser();
  const canSeeBorrowerDetails =
    includeBorrowerDetails && sessionUser?.role === "admin";

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return { error: "Buku tidak valid.", items: [] };
  }

  try {
    const items = await getCatalogBookBorrowSchedule(bookId);

    return {
      error: "",
      items: canSeeBorrowerDetails
        ? items
        : items.map((item) => ({
            ...item,
            className: null,
            studentName: "",
            transactionId: 0,
          })),
    };
  } catch {
    return {
      error: "Gagal memuat kalender pengembalian buku.",
      items: [],
    };
  }
}

export async function addCatalogCopies(
  bookId: number,
  quantity: number
): Promise<CatalogActionState> {
  await requireAdminAction();

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return { error: "Buku tidak valid.", success: "" };
  }

  const parsedQuantity = parsePositiveInteger(String(quantity));

  if (parsedQuantity === null) {
    return { error: "Jumlah eksemplar harus minimal 1.", success: "" };
  }

  const inserted = await insertInitialCopies(bookId, parsedQuantity);

  if (!inserted) {
    return {
      error:
        "Tabel eksemplar belum tersedia atau kolomnya berbeda, sehingga eksemplar belum bisa ditambahkan.",
      success: "",
    };
  }

  await updateBookStock(bookId, parsedQuantity);

  revalidatePath("/admin/buku");
  revalidatePath("/admin/buku/tambah");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return {
    error: "",
    success: `${parsedQuantity} eksemplar berhasil ditambahkan.`,
  };
}

export async function deleteCatalogBook(bookId: number): Promise<CatalogActionState> {
  await requireAdminAction();

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return { error: "Buku tidak valid.", success: "" };
  }

  if (await bookHasBorrowingHistory(bookId)) {
    return {
      error:
        "Buku ini tidak dapat dihapus karena sudah pernah dipinjam. Riwayat peminjaman harus tetap tersimpan.",
      success: "",
      blockedByTransactions: true,
    };
  }

  const supabase = getServerSupabaseClient();
  const existingCoverUrl = await getExistingBookCoverUrl(supabase, bookId);

  await Promise.all([removeBookCopies(bookId), removeBookGenres(bookId)]);

  const { error } = await supabase.from("buku").delete().eq("id_buku", bookId);

  if (error) {
    const isRelationError =
      error.code === "23503" ||
      error.message.toLowerCase().includes("violates foreign key constraint") ||
      error.message.toLowerCase().includes("transaksi");

    if (isRelationError) {
      return {
        error:
          "Buku ini tidak dapat dihapus karena sudah pernah dipinjam. Riwayat peminjaman harus tetap tersimpan.",
        success: "",
        blockedByTransactions: true,
      };
    }

    return { error: `Gagal menghapus buku: ${error.message}`, success: "" };
  }

  await removeStoredBookCover(supabase, existingCoverUrl);

  revalidatePath("/admin/buku");
  revalidatePath("/admin/buku/tambah");
  revalidatePath("/public/katalog");
  revalidatePath("/siswa/katalog");

  return { error: "", success: "Buku berhasil dihapus." };
}

export async function removeCatalogCopies(
  bookId: number,
  quantity: number,
  reason: string
): Promise<CatalogActionState> {
  await requireAdminAction();

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return { error: "Buku tidak valid.", success: "" };
  }

  const parsedQuantity = parsePositiveInteger(String(quantity));

  if (parsedQuantity === null) {
    return { error: "Jumlah eksemplar harus minimal 1.", success: "" };
  }

  if (!reason.trim()) {
    return { error: "Alasan wajib dipilih.", success: "" };
  }

  const supabase = getServerSupabaseClient();
  if (reason.trim().toLowerCase() === "tidak kembali dari peminjam") {
    return {
      error:
        "Eksemplar yang tidak kembali dari peminjam harus diproses melalui modul pengembalian agar transaksi siswa ikut tercatat.",
      success: "",
    };
  }

  for (const config of getCopyTableConfigs()) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq(config.bookIdColumn, bookId);

    if (error || !data) {
      continue;
    }

    const selectedCopies = (data as Record<string, unknown>[])
      .filter((copy) => isRemovableCopy(copy, config.statusColumn))
      .slice(0, parsedQuantity);

    if (selectedCopies.length < parsedQuantity) {
      return {
        error: `Jumlah melebihi eksemplar aktif yang tidak sedang dipinjam. Maksimal ${selectedCopies.length} eksemplar.`,
        success: "",
      };
    }

    let updatedCount = 0;
    let lastUpdateError = "";

    for (const copy of selectedCopies) {
      const copyId = readCopyRowId(copy);

      if (!copyId) {
        return {
          error:
            "Eksemplar tidak memiliki kolom ID yang dikenali, sehingga belum bisa dikeluarkan dari UI.",
          success: "",
        };
      }

      const updated = await updateCopyAsRemoved(
        config.table,
        config.statusColumn,
        copyId.column,
        copyId.value,
        reason.trim()
      );

      if (updated.success) {
        updatedCount += 1;
      } else {
        lastUpdateError = updated.error;
      }
    }

    if (updatedCount !== parsedQuantity) {
      return {
        error: lastUpdateError
          ? `Eksemplar gagal dikeluarkan: ${lastUpdateError}`
          : "Sebagian eksemplar gagal dikeluarkan. Coba ulangi beberapa saat lagi.",
        success: "",
      };
    }

    revalidatePath("/admin/buku");
    revalidatePath("/admin/buku/tambah");
    revalidatePath("/public/katalog");
    revalidatePath("/siswa/katalog");

    return {
      error: "",
      success: `${parsedQuantity} eksemplar berhasil dikeluarkan.`,
    };
  }

  return {
    error:
      "Tabel eksemplar belum tersedia atau kolomnya berbeda, sehingga eksemplar belum bisa dikeluarkan.",
    success: "",
  };
}
