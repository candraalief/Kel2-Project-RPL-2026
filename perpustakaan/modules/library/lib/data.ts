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

export async function getAttendanceRecords(limit?: number) {
  const supabase = getServerSupabaseClient();
  let query = supabase
    .from("absensi")
    .select("id_absensi, nama, tujuan, jenis_pengunjung, waktu_kunjungan")
    .order("waktu_kunjungan", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query.returns<AbsensiRecord[]>();

  if (error) {
    throw new Error(`Failed to load attendance: ${error.message}`);
  }

  return data ?? [];
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
