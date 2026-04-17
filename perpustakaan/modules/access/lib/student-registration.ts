import bcrypt from "bcryptjs";
import { getServerSupabaseClient } from "@/lib/supabase-server";

export type SignupState = {
  error: string;
  success: string;
};

export type PendingSiswa = {
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

export type SiswaAccount = PendingSiswa;

function normalizeValue(value: string | null) {
  return value?.trim() ?? "";
}

async function checkExistingSiswa(
  nisn: string,
  username: string,
  email: string
) {
  const supabase = getServerSupabaseClient();

  const [nisnCheck, usernameCheck, emailCheck] = await Promise.all([
    supabase
      .from("siswa")
      .select("id_siswa")
      .eq("nisn", nisn)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("siswa")
      .select("id_siswa")
      .eq("username", username)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("siswa")
      .select("id_siswa")
      .eq("email", email)
      .limit(1)
      .maybeSingle(),
  ]);

  if (nisnCheck.error) {
    throw new Error(`Failed to validate NISN: ${nisnCheck.error.message}`);
  }

  if (usernameCheck.error) {
    throw new Error(
      `Failed to validate username siswa: ${usernameCheck.error.message}`
    );
  }

  if (emailCheck.error) {
    throw new Error(`Failed to validate email siswa: ${emailCheck.error.message}`);
  }

  if (nisnCheck.data) {
    return "NISN sudah terdaftar.";
  }

  if (usernameCheck.data) {
    return "Username sudah digunakan.";
  }

  if (emailCheck.data) {
    return "Email sudah digunakan.";
  }

  return null;
}

export async function registerSiswaAccount(formData: FormData): Promise<SignupState> {
  const nama = normalizeValue(String(formData.get("nama") ?? ""));
  const nisn = normalizeValue(String(formData.get("nisn") ?? ""));
  const tahunMasuk = normalizeValue(String(formData.get("tahun_masuk") ?? ""));
  const nomorWhatsapp = normalizeValue(String(formData.get("nomor_whatsapp") ?? ""));
  const email = normalizeValue(String(formData.get("email") ?? "")).toLowerCase();
  const username = normalizeValue(String(formData.get("username") ?? "")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const kelas = normalizeValue(String(formData.get("kelas") ?? ""));

  if (
    !nama ||
    !nisn ||
    !tahunMasuk ||
    !nomorWhatsapp ||
    !email ||
    !username ||
    !password ||
    !kelas
  ) {
    return {
      error: "Semua data siswa wajib diisi.",
      success: "",
    };
  }

  if (password.length < 8) {
    return {
      error: "Password minimal 8 karakter.",
      success: "",
    };
  }

  const duplicateMessage = await checkExistingSiswa(nisn, username, email);

  if (duplicateMessage) {
    return {
      error: duplicateMessage,
      success: "",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const supabase = getServerSupabaseClient();

  const { error } = await supabase.from("siswa").insert({
    nama,
    nisn,
    tahun_masuk: Number(tahunMasuk),
    nomor_whatsapp: nomorWhatsapp,
    email,
    username,
    password: passwordHash,
    kelas,
    status_keanggotaan: "menunggu_verifikasi",
  } as never);

  if (error) {
    throw new Error(`Failed to register siswa: ${error.message}`);
  }

  return {
    error: "",
    success:
      "Pendaftaran berhasil. Akun kamu sedang menunggu verifikasi admin perpustakaan.",
  };
}

export async function getPendingSiswaRegistrations() {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("siswa")
    .select(
      "id_siswa, nama, nisn, username, email, kelas, tahun_masuk, nomor_whatsapp, status_keanggotaan"
    )
    .eq("status_keanggotaan", "menunggu_verifikasi")
    .order("id_siswa", { ascending: false })
    .returns<PendingSiswa[]>();

  if (error) {
    throw new Error(`Failed to load pending siswa: ${error.message}`);
  }

  return data ?? [];
}

export async function getAllSiswaAccounts() {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("siswa")
    .select(
      "id_siswa, nama, nisn, username, email, kelas, tahun_masuk, nomor_whatsapp, status_keanggotaan"
    )
    .order("id_siswa", { ascending: false })
    .returns<SiswaAccount[]>();

  if (error) {
    throw new Error(`Failed to load siswa accounts: ${error.message}`);
  }

  return data ?? [];
}
