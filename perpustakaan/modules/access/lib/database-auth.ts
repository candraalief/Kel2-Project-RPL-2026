import bcrypt from "bcryptjs";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import type { SessionUser } from "./session";

type AdminRow = {
  id_admin: number;
  nama: string;
  username: string;
  password: string;
};

type SiswaRow = {
  id_siswa: number;
  nama: string;
  username: string | null;
  email: string | null;
  password: string | null;
  kelas: string | null;
  status_keanggotaan: string | null;
};

async function findAdminByIdentifier(identifier: string) {
  const supabase = getServerSupabaseClient();
  const normalizedIdentifier = identifier.trim();
  const lowerIdentifier = normalizedIdentifier.toLowerCase();

  const usernameResult = await supabase
    .from("admin")
    .select("id_admin, nama, username, password")
    .eq("username", lowerIdentifier)
    .limit(1)
    .maybeSingle<AdminRow>();

  if (usernameResult.error) {
    throw new Error(
      `Failed to query admin by username: ${usernameResult.error.message}`
    );
  }

  if (usernameResult.data) {
    return usernameResult.data;
  }

  const nameResult = await supabase
    .from("admin")
    .select("id_admin, nama, username, password")
    .ilike("nama", normalizedIdentifier)
    .limit(1)
    .maybeSingle<AdminRow>();

  if (nameResult.error) {
    throw new Error(`Failed to query admin by name: ${nameResult.error.message}`);
  }

  return nameResult.data;
}

async function findSiswaByIdentifier(identifier: string) {
  const supabase = getServerSupabaseClient();
  const normalizedIdentifier = identifier.trim();
  const lowerIdentifier = normalizedIdentifier.toLowerCase();

  const usernameResult = await supabase
    .from("siswa")
    .select("id_siswa, nama, username, email, password, kelas, status_keanggotaan")
    .eq("username", lowerIdentifier)
    .limit(1)
    .maybeSingle<SiswaRow>();

  if (usernameResult.error) {
    throw new Error(
      `Failed to query siswa by username: ${usernameResult.error.message}`
    );
  }

  if (usernameResult.data) {
    return usernameResult.data;
  }

  const emailResult = await supabase
    .from("siswa")
    .select("id_siswa, nama, username, email, password, kelas, status_keanggotaan")
    .eq("email", lowerIdentifier)
    .limit(1)
    .maybeSingle<SiswaRow>();

  if (emailResult.error) {
    throw new Error(`Failed to query siswa by email: ${emailResult.error.message}`);
  }

  if (emailResult.data) {
    return emailResult.data;
  }

  const nameResult = await supabase
    .from("siswa")
    .select("id_siswa, nama, username, email, password, kelas, status_keanggotaan")
    .ilike("nama", normalizedIdentifier)
    .limit(1)
    .maybeSingle<SiswaRow>();

  if (nameResult.error) {
    throw new Error(`Failed to query siswa by name: ${nameResult.error.message}`);
  }

  return nameResult.data;
}

export async function findSiswaAccountByIdentifier(identifier: string) {
  return findSiswaByIdentifier(identifier);
}

async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) {
    return false;
  }

  return bcrypt.compare(password, hash);
}

export async function findSessionUserByCredentials(
  identifier: string,
  password: string
): Promise<SessionUser | null> {
  const normalizedIdentifier = identifier.trim();

  if (
    normalizedIdentifier.toLowerCase() === "public" &&
    password === "public"
  ) {
    return {
      id: 0,
      role: "public",
      name: "Monitor Publik",
      identifier: "public",
    };
  }

  const admin = await findAdminByIdentifier(normalizedIdentifier);

  if (admin && (await verifyPassword(password, admin.password))) {
    return {
      id: admin.id_admin,
      role: "admin",
      name: admin.nama,
      identifier: admin.username || admin.nama,
    };
  }

  const siswa = await findSiswaByIdentifier(normalizedIdentifier);

  if (siswa && (await verifyPassword(password, siswa.password))) {
    if (siswa.status_keanggotaan !== "aktif") {
      throw new Error(
        "Akun siswa masih menunggu verifikasi admin perpustakaan."
      );
    }

    return {
      id: siswa.id_siswa,
      role: "siswa",
      name: siswa.nama,
      identifier: siswa.username || siswa.email || siswa.nama,
      className: siswa.kelas ?? undefined,
    };
  }

  return null;
}
