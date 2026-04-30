import { getServerSupabaseClient } from "@/lib/supabase-server";

export type AdminProfile = {
  id: number;
  nama: string;
  username: string;
  email: string;
  nomorTelephone: string;
  supportsEmail: boolean;
  supportsNomorTelephone: boolean;
};

function readText(row: Record<string, unknown>, key: string) {
  const value = row[key];

  return typeof value === "string" ? value : "";
}

function readTelephone(row: Record<string, unknown>) {
  return readText(row, "nomor_telephone") || readText(row, "nomor_telepon");
}

function hasTelephoneColumn(row: Record<string, unknown>) {
  return (
    Object.prototype.hasOwnProperty.call(row, "nomor_telephone") ||
    Object.prototype.hasOwnProperty.call(row, "nomor_telepon")
  );
}

export async function getAdminProfileById(adminId: number) {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .eq("id_admin", adminId)
    .limit(1)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    throw new Error(`Gagal mengambil profil admin: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: Number(data.id_admin),
    nama: readText(data, "nama"),
    username: readText(data, "username"),
    email: readText(data, "email"),
    nomorTelephone: readTelephone(data),
    supportsEmail: Object.prototype.hasOwnProperty.call(data, "email"),
    supportsNomorTelephone: hasTelephoneColumn(data),
  } satisfies AdminProfile;
}

export async function getAdminProfiles() {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("admin")
    .select("*")
    .order("id_admin", { ascending: true })
    .returns<Record<string, unknown>[]>();

  if (error) {
    throw new Error(`Gagal mengambil daftar admin: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: Number(row.id_admin),
    nama: readText(row, "nama"),
    username: readText(row, "username"),
    email: readText(row, "email"),
    nomorTelephone: readTelephone(row),
    supportsEmail: Object.prototype.hasOwnProperty.call(row, "email"),
    supportsNomorTelephone: hasTelephoneColumn(row),
  })) satisfies AdminProfile[];
}

export async function getAdminProfileStats() {
  const supabase = getServerSupabaseClient();

  const [adminCount, siswaCount] = await Promise.all([
    supabase.from("admin").select("id_admin", { count: "exact", head: true }),
    supabase.from("siswa").select("id_siswa", { count: "exact", head: true }),
  ]);

  return {
    totalAdmin: adminCount.count ?? 0,
    totalSiswa: siswaCount.count ?? 0,
  };
}
