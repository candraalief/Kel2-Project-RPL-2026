import { getServerSupabaseClient } from "@/lib/supabase-server";

export type BukuRecord = {
  id_buku: number;
  judul: string;
  penulis: string | null;
  penerbit: string | null;
  tahun_terbit: number | null;
  lokasi_rak: string | null;
  stok_buku: number | null;
};

export type SiswaRecord = {
  id_siswa: number;
  nama: string;
  nisn: string | null;
  username: string | null;
  email: string | null;
  kelas: string | null;
  tahun_masuk: number | null;
  nomor_whatsapp: string | null;
  status_keanggotaan: string | null;
};

export type TransaksiRecord = {
  id_transaksi: number;
  id_siswa: number;
  id_admin: number;
  tanggal_pinjam: string;
  tanggal_jatuh_tempo: string;
  tanggal_kembali: string | null;
  status: string | null;
  catatan: string | null;
};

type Row = Record<string, unknown>;

type DetailTableConfig = {
  table: string;
  transactionIdColumn: string;
  bookIdColumn: string;
  copyIdColumn: string;
  quantityColumn: string;
};

const detailTableConfigs: DetailTableConfig[] = [
  {
    table: "detail_transaksi",
    transactionIdColumn: "id_transaksi",
    bookIdColumn: "id_buku",
    copyIdColumn: "id_copy_buku",
    quantityColumn: "jumlah",
  },
];

export type TransactionBookItem = {
  key: string;
  transactionId: number;
  bookId: number | null;
  copyIds: number[];
  title: string;
  author: string | null;
  code: string | null;
  category: string | null;
  quantity: number;
};

export type DetailedTransactionRecord = TransaksiRecord & {
  siswa: {
    id_siswa: number;
    nama: string;
    nisn: string | null;
    kelas: string | null;
    nomor_whatsapp: string | null;
  } | null;
  items: TransactionBookItem[];
};

export type AbsensiRecord = {
  id_absensi: number;
  nama: string;
  tujuan: string | null;
  jenis_pengunjung: string | null;
  waktu_kunjungan: string | null;
};

export type AttendanceRecordFilters = {
  limit?: number;
  page?: number;
  search?: string;
  visitorType?: "siswa" | "umum" | "";
  startDate?: string;
  endDate?: string;
};

export type AttendanceRecordPage = {
  records: AbsensiRecord[];
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
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

export async function getBooks() {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("buku")
    .select("id_buku, judul, penulis, penerbit, tahun_terbit, lokasi_rak, stok_buku")
    .order("id_buku", { ascending: true })
    .returns<BukuRecord[]>();

  if (error) {
    throw new Error(`Failed to load books: ${error.message}`);
  }

  return data ?? [];
}

export async function getStudents() {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("siswa")
    .select(
      "id_siswa, nama, nisn, username, email, kelas, tahun_masuk, nomor_whatsapp, status_keanggotaan"
    )
    .order("id_siswa", { ascending: false })
    .returns<SiswaRecord[]>();

  if (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }

  return data ?? [];
}

export async function getStudentById(idSiswa: number) {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("siswa")
    .select(
      "id_siswa, nama, nisn, username, email, kelas, tahun_masuk, nomor_whatsapp, status_keanggotaan"
    )
    .eq("id_siswa", idSiswa)
    .limit(1)
    .maybeSingle<SiswaRecord>();

  if (error) {
    throw new Error(`Failed to load student profile: ${error.message}`);
  }

  return data;
}

export async function getTransactions() {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("transaksi")
    .select(
      "id_transaksi, id_siswa, id_admin, tanggal_pinjam, tanggal_jatuh_tempo, tanggal_kembali, status, catatan"
    )
    .order("id_transaksi", { ascending: false })
    .returns<TransaksiRecord[]>();

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  return data ?? [];
}

async function loadTransactionDetailRows(transactionIds: number[]) {
  if (transactionIds.length === 0) {
    return { rows: [] as Row[], config: null as DetailTableConfig | null };
  }

  const supabase = getServerSupabaseClient();
  let emptyResult: { rows: Row[]; config: DetailTableConfig } | null = null;

  for (const config of detailTableConfigs) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .in(config.transactionIdColumn, transactionIds);

    if (!error && data) {
      const rows = data as Row[];

      if (rows.length > 0) {
        return { rows, config };
      }

      emptyResult ??= { rows, config };
    }
  }

  if (emptyResult) {
    return emptyResult;
  }

  return { rows: [] as Row[], config: null };
}

async function loadBookMap(bookIds: number[]) {
  if (bookIds.length === 0) {
    return new Map<number, BukuRecord>();
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("buku")
    .select("id_buku, judul, penulis, penerbit, tahun_terbit, lokasi_rak, stok_buku")
    .in("id_buku", bookIds)
    .returns<BukuRecord[]>();

  if (error) {
    return new Map<number, BukuRecord>();
  }

  return new Map((data ?? []).map((book) => [book.id_buku, book]));
}

export async function getDetailedTransactions(): Promise<DetailedTransactionRecord[]> {
  const [transactions, students] = await Promise.all([
    getTransactions(),
    getStudents(),
  ]);
  const transactionIds = transactions.map((item) => item.id_transaksi);
  const { rows, config } = await loadTransactionDetailRows(transactionIds);
  const bookIdKeys = config
    ? [config.bookIdColumn, "id_buku", "book_id"]
    : ["id_buku", "book_id"];
  const copyIdKeys = config
    ? [
        config.copyIdColumn,
        "id_copy_buku",
        "id_copy",
        "copy_id",
        "id_eksemplar",
      ]
    : ["id_copy_buku", "id_copy", "copy_id", "id_eksemplar"];
  const bookIds = rows
    .map((row) => readNumber(row, bookIdKeys))
    .filter((id): id is number => typeof id === "number");
  const bookMap = await loadBookMap([...new Set(bookIds)]);
  const studentMap = new Map(students.map((student) => [student.id_siswa, student]));
  const itemMap = new Map<number, Map<string, TransactionBookItem>>();

  if (config) {
    rows.forEach((row, rowIndex) => {
      const transactionId = readNumber(row, [
        config.transactionIdColumn,
        "id_transaksi",
        "transaction_id",
      ]);

      if (!transactionId) {
        return;
      }

      const bookId = readNumber(row, bookIdKeys);
      const copyId = readNumber(row, copyIdKeys);
      const quantity = readNumber(row, [
        config.quantityColumn,
        "jumlah",
        "jumlah_buku",
        "qty",
        "quantity",
      ]);
      const book = bookId ? bookMap.get(bookId) : null;
      const key = bookId
        ? `book:${bookId}`
        : copyId
          ? `copy:${copyId}`
          : `row:${rowIndex}`;
      const transactionItems = itemMap.get(transactionId) ?? new Map<string, TransactionBookItem>();
      const current = transactionItems.get(key) ?? {
        key,
        transactionId,
        bookId,
        copyIds: [],
        title:
          readString(row, ["judul", "judul_buku", "title"]) ??
          book?.judul ??
          "Buku tidak diketahui",
        author: readString(row, ["penulis", "author"]) ?? book?.penulis ?? null,
        code: readString(row, ["kode", "kode_buku", "isbn"]) ?? null,
        category: readString(row, ["kategori", "genre", "nama_genre"]) ?? null,
        quantity: 0,
      };

      if (copyId && !current.copyIds.includes(copyId)) {
        current.copyIds.push(copyId);
      }

      current.quantity += quantity && quantity > 0 ? quantity : 1;
      transactionItems.set(key, current);
      itemMap.set(transactionId, transactionItems);
    });
  }

  return transactions.map((transaction) => {
    const siswa = studentMap.get(transaction.id_siswa) ?? null;

    return {
      ...transaction,
      siswa: siswa
        ? {
            id_siswa: siswa.id_siswa,
            nama: siswa.nama,
            nisn: siswa.nisn,
            kelas: siswa.kelas,
            nomor_whatsapp: siswa.nomor_whatsapp,
          }
        : null,
      items: Array.from(itemMap.get(transaction.id_transaksi)?.values() ?? []),
    };
  });
}

export async function getAttendanceRecords(
  options?: number | AttendanceRecordFilters
) {
  const filters = typeof options === "number" ? { limit: options } : options ?? {};
  const supabase = getServerSupabaseClient();
  let query = supabase
    .from("absensi")
    .select("id_absensi, nama, tujuan, jenis_pengunjung, waktu_kunjungan")
    .order("waktu_kunjungan", { ascending: false });

  const search = filters.search?.trim();

  if (search) {
    query = query.ilike("nama", `%${search}%`);
  }

  if (filters.visitorType) {
    query = query.eq("jenis_pengunjung", filters.visitorType);
  }

  if (filters.startDate) {
    query = query.gte("waktu_kunjungan", `${filters.startDate}T00:00:00+07:00`);
  }

  if (filters.endDate) {
    query = query.lte("waktu_kunjungan", `${filters.endDate}T23:59:59+07:00`);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.returns<AbsensiRecord[]>();

  if (error) {
    throw new Error(`Failed to load attendance: ${error.message}`);
  }

  return data ?? [];
}

export async function getAttendanceRecordPage(
  filters: AttendanceRecordFilters = {}
): Promise<AttendanceRecordPage> {
  const limit = Math.max(1, filters.limit ?? 25);
  const requestedPage = Math.max(1, filters.page ?? 1);
  const supabase = getServerSupabaseClient();

  let countQuery = supabase
    .from("absensi")
    .select("id_absensi", { count: "exact", head: true });

  const search = filters.search?.trim();

  if (search) {
    countQuery = countQuery.ilike("nama", `%${search}%`);
  }

  if (filters.visitorType) {
    countQuery = countQuery.eq("jenis_pengunjung", filters.visitorType);
  }

  if (filters.startDate) {
    countQuery = countQuery.gte(
      "waktu_kunjungan",
      `${filters.startDate}T00:00:00+07:00`
    );
  }

  if (filters.endDate) {
    countQuery = countQuery.lte(
      "waktu_kunjungan",
      `${filters.endDate}T23:59:59+07:00`
    );
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new Error(`Failed to count attendance: ${countError.message}`);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("absensi")
    .select("id_absensi, nama, tujuan, jenis_pengunjung, waktu_kunjungan")
    .order("waktu_kunjungan", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("nama", `%${search}%`);
  }

  if (filters.visitorType) {
    query = query.eq("jenis_pengunjung", filters.visitorType);
  }

  if (filters.startDate) {
    query = query.gte("waktu_kunjungan", `${filters.startDate}T00:00:00+07:00`);
  }

  if (filters.endDate) {
    query = query.lte("waktu_kunjungan", `${filters.endDate}T23:59:59+07:00`);
  }

  const { data, error } = await query.returns<AbsensiRecord[]>();

  if (error) {
    throw new Error(`Failed to load attendance page: ${error.message}`);
  }

  return {
    records: data ?? [],
    total,
    currentPage,
    totalPages,
    limit,
  };
}

export async function getSiswaTransactions(idSiswa: number) {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("transaksi")
    .select(
      "id_transaksi, id_siswa, id_admin, tanggal_pinjam, tanggal_jatuh_tempo, tanggal_kembali, status"
    )
    .eq("id_siswa", idSiswa)
    .order("id_transaksi", { ascending: false })
    .returns<TransaksiRecord[]>();

  if (error) {
    throw new Error(`Failed to load siswa transactions: ${error.message}`);
  }

  return data ?? [];
}

export type StudentSuggestion = {
  id_siswa: number;
  nama: string;
  kelas: string | null;
};

export async function getStudentNameSuggestions(limit = 250) {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("siswa")
    .select("id_siswa, nama, kelas")
    .eq("status_keanggotaan", "aktif")
    .not("nama", "is", null)
    .order("nama", { ascending: true })
    .limit(limit)
    .returns<StudentSuggestion[]>();

  if (error) {
    throw new Error(`Failed to load student name suggestions: ${error.message}`);
  }

  return (data ?? []).filter((item) => item.nama?.trim().length > 0);
}
