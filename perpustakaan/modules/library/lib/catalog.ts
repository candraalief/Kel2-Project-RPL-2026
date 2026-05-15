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

type TransactionDetailTableConfig = {
  table: string;
  transactionIdColumn: string;
  bookIdColumn: string;
  quantityColumn: string;
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

const transactionDetailTableConfigs: TransactionDetailTableConfig[] = [
  {
    table: "detail_transaksi",
    transactionIdColumn: "id_transaksi",
    bookIdColumn: "id_buku",
    quantityColumn: "jumlah",
  },
  {
    table: "detail_transaksi_peminjaman",
    transactionIdColumn: "id_transaksi",
    bookIdColumn: "id_buku",
    quantityColumn: "jumlah",
  },
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
const availableCopyStatusValues = ["tersedia", "available"];
const bookCoverBucket = "foto_buku";

type CopyCounts = {
  active: number;
  available: number;
  borrowed: number;
  removed: number;
};

export type CatalogCopySummary = {
  totalCopies: number;
  availableCount: number;
  borrowedCount: number;
  removedCount: number;
  unavailableCount: number;
};

export type CatalogBorrowScheduleItem = {
  transactionId: number;
  studentName: string;
  className: string | null;
  borrowedAt: string | null;
  dueDate: string;
  quantity: number;
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
  coverUrl: string | null;
  coverDisplayUrl: string | null;
  description: string | null;
  genres: CatalogGenre[];
  totalCopies: number;
  availableCount: number;
  borrowedCount: number;
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
    // Legacy rows may store only the storage object path.
  }

  if (/^covers\//i.test(value)) {
    return value;
  }

  return null;
}

async function getBookCoverDisplayUrl(
  supabase: ReturnType<typeof getServerSupabaseClient>,
  storedUrl: string | null
) {
  const path = getBookCoverPath(storedUrl);

  if (!path) {
    return storedUrl;
  }

  const { data, error } = await supabase.storage
    .from(bookCoverBucket)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return storedUrl;
  }

  return data.signedUrl;
}

function normalizeStatus(status: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (normalized === "rusak" || normalized === "damaged") {
    return "tersedia";
  }

  return normalized;
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
          removed: 0,
        };
        const status = readString(row, [config.statusColumn]);
        const normalizedStatus = normalizeStatus(status);

        if (isRemovedCopyStatus(normalizedStatus)) {
          current.removed += 1;
        } else {
          current.active += 1;

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
    removed: 0,
  };

  return toCopySummary(counts);
}

async function loadBookBorrowDetailRows(bookId: number) {
  const supabase = getServerSupabaseClient();
  let emptyResult:
    | { rows: Row[]; config: TransactionDetailTableConfig }
    | null = null;

  for (const config of transactionDetailTableConfigs) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq(config.bookIdColumn, bookId);

    if (!error && data) {
      const rows = data as Row[];

      if (rows.length > 0) {
        return { rows, config };
      }

      emptyResult ??= { rows, config };
    }
  }

  return emptyResult;
}

export async function getCatalogBookBorrowSchedule(
  bookId: number
): Promise<CatalogBorrowScheduleItem[]> {
  if (!Number.isInteger(bookId) || bookId <= 0) {
    return [];
  }

  const detailRows = await loadBookBorrowDetailRows(bookId);

  if (!detailRows) {
    return [];
  }

  const quantityByTransaction = new Map<number, number>();

  detailRows.rows.forEach((row) => {
    const transactionId = readNumber(row, [
      detailRows.config.transactionIdColumn,
      "id_transaksi",
      "transaction_id",
    ]);

    if (!transactionId) {
      return;
    }

    const quantity =
      readNumber(row, [
        detailRows.config.quantityColumn,
        "jumlah",
        "jumlah_buku",
        "qty",
        "quantity",
      ]) ?? 1;

    quantityByTransaction.set(
      transactionId,
      (quantityByTransaction.get(transactionId) ?? 0) + Math.max(quantity, 1)
    );
  });

  const transactionIds = Array.from(quantityByTransaction.keys());

  if (transactionIds.length === 0) {
    return [];
  }

  const supabase = getServerSupabaseClient();
  const { data: transactions, error } = await supabase
    .from("transaksi")
    .select(
      "id_transaksi, id_siswa, tanggal_pinjam, tanggal_jatuh_tempo, tanggal_kembali, status"
    )
    .in("id_transaksi", transactionIds)
    .is("tanggal_kembali", null)
    .order("tanggal_jatuh_tempo", { ascending: true })
    .returns<
      Array<{
        id_transaksi: number;
        id_siswa: number | null;
        tanggal_pinjam: string | null;
        tanggal_jatuh_tempo: string | null;
        tanggal_kembali: string | null;
        status: string | null;
      }>
    >();

  if (error || !transactions) {
    return [];
  }

  const activeTransactions = transactions.filter(
    (transaction) => transaction.tanggal_jatuh_tempo && !transaction.tanggal_kembali
  );
  const studentIds = activeTransactions
    .map((transaction) => transaction.id_siswa)
    .filter((id): id is number => typeof id === "number");
  const studentMap = new Map<number, { nama: string; kelas: string | null }>();

  if (studentIds.length > 0) {
    const { data: students } = await supabase
      .from("siswa")
      .select("id_siswa, nama, kelas")
      .in("id_siswa", [...new Set(studentIds)])
      .returns<Array<{ id_siswa: number; nama: string; kelas: string | null }>>();

    (students ?? []).forEach((student) => {
      studentMap.set(student.id_siswa, {
        nama: student.nama,
        kelas: student.kelas,
      });
    });
  }

  return activeTransactions.map((transaction) => {
    const student =
      typeof transaction.id_siswa === "number"
        ? studentMap.get(transaction.id_siswa)
        : null;

    return {
      transactionId: transaction.id_transaksi,
      studentName: student?.nama ?? "Siswa tidak diketahui",
      className: student?.kelas ?? null,
      borrowedAt: transaction.tanggal_pinjam,
      dueDate: transaction.tanggal_jatuh_tempo ?? "",
      quantity: quantityByTransaction.get(transaction.id_transaksi) ?? 1,
    };
  });
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

  const books = await Promise.all(bookRows.map(async (row) => {
    const id = readNumber(row, ["id_buku", "book_id", "id"]) ?? 0;
    const fallbackStock = readNumber(row, ["stok_buku", "stock", "jumlah_copy"]) ?? 0;
    const counts = copyCounts.get(id) ?? {
      active: fallbackStock,
      available: fallbackStock,
      borrowed: 0,
      removed: 0,
    };
    const inlineGenres = parseInlineGenres(row).map((name) => ({
      id: name,
      name,
      description: null,
    }));
    const relatedGenres = bookGenreMap.get(id) ?? inlineGenres;
    const coverUrl = readString(row, ["foto_url", "foto_buku", "cover_url", "gambar"]);

    return {
      id,
      title: readString(row, ["judul", "title", "judul_buku"]) ?? "Tanpa judul",
      author: readString(row, ["penulis", "author"]),
      publisher: readString(row, ["penerbit", "publisher"]),
      isbn: readString(row, ["isbn", "ISBN"]),
      publishedYear: readNumber(row, ["tahun_terbit", "published_year", "tahun"]),
      shelfLocation: readString(row, ["lokasi_rak", "rak", "shelf_location"]),
      coverUrl,
      coverDisplayUrl: await getBookCoverDisplayUrl(supabase, coverUrl),
      description: readString(row, [
        "deskripsi_buku",
        "deskripsi",
        "description",
        "sinopsis",
      ]),
      genres: relatedGenres,
      ...toCopySummary(counts),
    } satisfies AdminCatalogBook;
  }));

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
