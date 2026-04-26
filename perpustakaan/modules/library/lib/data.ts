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
      "id_transaksi, id_siswa, id_admin, tanggal_pinjam, tanggal_jatuh_tempo, tanggal_kembali, status"
    )
    .order("id_transaksi", { ascending: false })
    .returns<TransaksiRecord[]>();

  if (error) {
    throw new Error(`Failed to load transactions: ${error.message}`);
  }

  return data ?? [];
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
