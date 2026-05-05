import { getServerSupabaseClient } from "@/lib/supabase-server";

type Row = Record<string, unknown>;

type CopyTableConfig = {
  table: string;
  bookIdColumn: string;
  statusColumn: string;
};

type BookGenreTableConfig = {
  table: string;
  bookIdColumn: string;
  genreIdColumn: string;
};

const copyTableConfigs: CopyTableConfig[] = [
  { table: "copy_buku", bookIdColumn: "id_buku", statusColumn: "status" },
  { table: "buku_copy", bookIdColumn: "id_buku", statusColumn: "status" },
  { table: "buku_copies", bookIdColumn: "id_buku", statusColumn: "status" },
  { table: "book_copies", bookIdColumn: "book_id", statusColumn: "status" },
];

const bookGenreTableConfigs: BookGenreTableConfig[] = [
  { table: "buku_genre", bookIdColumn: "id_buku", genreIdColumn: "id_genre" },
  { table: "genre_buku", bookIdColumn: "id_buku", genreIdColumn: "id_genre" },
  { table: "buku_genres", bookIdColumn: "id_buku", genreIdColumn: "id_genre" },
  { table: "book_genres", bookIdColumn: "book_id", genreIdColumn: "genre_id" },
];

const removedCopyStatusKeywords = [
  "dikeluarkan",
  "dihapus",
  "hapus",
  "keluar",
  "musnah",
  "dibuang",
  "hilang",
];
const borrowedCopyStatusKeywords = ["dipinjam"];
const availableCopyStatusValues = ["tersedia", "available", "rusak", "damaged"];
const damagedCopyConditionKeywords = ["rusak", "damaged"];

type CopyCounts = {
  active: number;
  available: number;
  borrowed: number;
  damaged: number;
  removed: number;
};

export type CatalogCopySummary = {
  totalCopies: number;
  availableCount: number;
  borrowedCount: number;
  damagedCount: number;
  removedCount: number;
  unavailableCount: number;
};

export type CatalogGenre = {
  id: string;
  name: string;
  description: string | null;
};

export type AdminCatalogBook = {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  publishedYear: number | null;
  shelfLocation: string | null;
  shelfMapUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  genres: CatalogGenre[];
  totalCopies: number;
  availableCount: number;
  borrowedCount: number;
  damagedCount: number;
  removedCount: number;
  unavailableCount: number;
};

export type AdminCatalogData = {
  books: AdminCatalogBook[];
  genres: CatalogGenre[];
};

function readString(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function normalizeStatus(status: string | null) {
  return (status ?? "").trim().toLowerCase();
}

function isRemovedCopyStatus(normalizedStatus: string) {
  if (!normalizedStatus) {
    return false;
  }

  return removedCopyStatusKeywords.some((keyword) =>
    normalizedStatus.includes(keyword)
  );
}

function isBorrowedCopyStatus(normalizedStatus: string) {
  if (!normalizedStatus) {
    return false;
  }

  return borrowedCopyStatusKeywords.some((keyword) =>
    normalizedStatus.includes(keyword)
  );
}

function isAvailableCopyStatus(normalizedStatus: string) {
  if (!normalizedStatus) {
    return false;
  }

  return availableCopyStatusValues.includes(normalizedStatus);
}

function isDamagedCopyCondition(normalizedCondition: string) {
  if (!normalizedCondition) {
    return false;
  }

  return damagedCopyConditionKeywords.some((keyword) =>
    normalizedCondition.includes(keyword)
  );
}

function isDamagedCopyStatus(normalizedStatus: string) {
  return normalizedStatus === "rusak";
}

function parseInlineGenres(row: Row) {
  const genreValue = row.genre ?? row.genres ?? row.nama_genre;

  if (Array.isArray(genreValue)) {
    return genreValue
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  }

  if (typeof genreValue === "string") {
    return genreValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeGenre(row: Row): CatalogGenre | null {
  const id = readString(row, ["id_genre", "genre_id", "id"]) ?? String(readNumber(row, ["id_genre", "genre_id", "id"]) ?? "");
  const name = readString(row, ["nama_genre", "nama", "name", "genre"]);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    description: readString(row, ["deskripsi_genre", "deskripsi", "description"]),
  };
}

async function loadGenres() {
  const supabase = getServerSupabaseClient();

  for (const table of ["genre", "genres"]) {
    const { data, error } = await supabase.from(table).select("*");

    if (!error && data) {
      return (data as Row[])
        .map(normalizeGenre)
        .filter((item): item is CatalogGenre => item !== null)
        .sort((first, second) => first.name.localeCompare(second.name, "id-ID"));
    }
  }

  return [];
}

export async function getCatalogGenres() {
  return loadGenres();
}

async function loadBookGenreMap(bookIds: number[], genres: CatalogGenre[]) {
  const genreById = new Map(genres.map((genre) => [genre.id, genre]));

  if (bookIds.length === 0 || genreById.size === 0) {
    return new Map<number, CatalogGenre[]>();
  }

  const supabase = getServerSupabaseClient();

  for (const config of bookGenreTableConfigs) {
    const { data, error } = await supabase
      .from(config.table)
      .select(`${config.bookIdColumn}, ${config.genreIdColumn}`)
      .in(config.bookIdColumn, bookIds);

    if (!error && data) {
      const map = new Map<number, CatalogGenre[]>();

      (data as Row[]).forEach((row) => {
        const bookId = readNumber(row, [config.bookIdColumn]);
        const genreId =
          readString(row, [config.genreIdColumn]) ??
          String(readNumber(row, [config.genreIdColumn]) ?? "");
        const genre = genreById.get(genreId);

        if (!bookId || !genre) {
          return;
        }

        map.set(bookId, [...(map.get(bookId) ?? []), genre]);
      });

      return map;
    }
  }

  return new Map<number, CatalogGenre[]>();
}

async function loadCopyCounts(bookIds: number[]) {
  if (bookIds.length === 0) {
    return new Map<number, CopyCounts>();
  }

  const supabase = getServerSupabaseClient();

  for (const config of copyTableConfigs) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .in(config.bookIdColumn, bookIds);

    if (!error && data) {
      if (
        data.length > 0 &&
        !Object.prototype.hasOwnProperty.call(data[0], config.statusColumn)
      ) {
        continue;
      }

      const counts = new Map<number, CopyCounts>();

      (data as Row[]).forEach((row) => {
        const bookId = readNumber(row, [config.bookIdColumn]);

        if (!bookId) {
          return;
        }

        const current = counts.get(bookId) ?? {
          active: 0,
          available: 0,
          borrowed: 0,
          damaged: 0,
          removed: 0,
        };
        const status = readString(row, [config.statusColumn]);
        const normalizedStatus = normalizeStatus(status);
        const condition = readString(row, [
          "kondisi",
          "condition",
          "kondisi_fisik",
          "status_kondisi",
        ]);
        const normalizedCondition = normalizeStatus(condition);

        if (isRemovedCopyStatus(normalizedStatus)) {
          current.removed += 1;
        } else {
          current.active += 1;

          if (
            isDamagedCopyStatus(normalizedStatus) ||
            isDamagedCopyCondition(normalizedCondition)
          ) {
            current.damaged += 1;
          }

          if (isAvailableCopyStatus(normalizedStatus)) {
            current.available += 1;
          }

          if (isBorrowedCopyStatus(normalizedStatus)) {
            current.borrowed += 1;
          }
        }

        counts.set(bookId, current);
      });

      return counts;
    }
  }

  return new Map<number, CopyCounts>();
}

function toCopySummary(counts: CopyCounts): CatalogCopySummary {
  return {
    totalCopies: counts.active,
    availableCount: counts.available,
    borrowedCount: counts.borrowed,
    damagedCount: counts.damaged,
    removedCount: counts.removed,
    unavailableCount: Math.max(counts.active - counts.available, 0),
  };
}

export async function getCatalogBookCopySummary(
  bookId: number
): Promise<CatalogCopySummary> {
  const counts = (await loadCopyCounts([bookId])).get(bookId) ?? {
    active: 0,
    available: 0,
    borrowed: 0,
    damaged: 0,
    removed: 0,
  };

  return toCopySummary(counts);
}

export async function getAdminCatalogData(): Promise<AdminCatalogData> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("buku")
    .select("*")
    .order("id_buku", { ascending: true });

  if (error) {
    throw new Error(`Failed to load catalog books: ${error.message}`);
  }

  const bookRows = (data ?? []) as Row[];
  const bookIds = bookRows
    .map((row) => readNumber(row, ["id_buku", "book_id", "id"]))
    .filter((id): id is number => typeof id === "number");

  const [genres, copyCounts] = await Promise.all([
    loadGenres(),
    loadCopyCounts(bookIds),
  ]);
  const bookGenreMap = await loadBookGenreMap(bookIds, genres);

  const books = bookRows.map((row) => {
    const id = readNumber(row, ["id_buku", "book_id", "id"]) ?? 0;
    const fallbackStock = readNumber(row, ["stok_buku", "stock", "jumlah_copy"]) ?? 0;
    const counts = copyCounts.get(id) ?? {
      active: fallbackStock,
      available: fallbackStock,
      borrowed: 0,
      damaged: 0,
      removed: 0,
    };
    const inlineGenres = parseInlineGenres(row).map((name) => ({
      id: name,
      name,
      description: null,
    }));
    const relatedGenres = bookGenreMap.get(id) ?? inlineGenres;

    return {
      id,
      title: readString(row, ["judul", "title", "judul_buku"]) ?? "Tanpa judul",
      author: readString(row, ["penulis", "author"]),
      publisher: readString(row, ["penerbit", "publisher"]),
      isbn: readString(row, ["isbn", "ISBN"]),
      publishedYear: readNumber(row, ["tahun_terbit", "published_year", "tahun"]),
      shelfLocation: readString(row, ["lokasi_rak", "rak", "shelf_location"]),
      shelfMapUrl: readString(row, ["denah_rak", "denah_url", "shelf_map_url"]),
      coverUrl: readString(row, ["foto_buku", "foto_url", "cover_url", "gambar"]),
      description: readString(row, ["deskripsi", "description", "sinopsis"]),
      genres: relatedGenres,
      ...toCopySummary(counts),
    } satisfies AdminCatalogBook;
  });

  const inlineGenres = books.flatMap((book) => book.genres);
  const genreMap = new Map<string, CatalogGenre>();

  [...genres, ...inlineGenres].forEach((genre) => {
    genreMap.set(genre.id, genre);
  });

  return {
    books,
    genres: Array.from(genreMap.values()).sort((first, second) =>
      first.name.localeCompare(second.name, "id-ID")
    ),
  };
}

export function getCopyTableConfigs() {
  return copyTableConfigs;
}

export function getBookGenreTableConfigs() {
  return bookGenreTableConfigs;
}
