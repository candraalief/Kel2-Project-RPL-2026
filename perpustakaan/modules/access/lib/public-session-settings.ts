import bcrypt from "bcryptjs";
import { getServerSupabaseClient } from "@/lib/supabase-server";

export type PublicSessionSettings = {
  id: number;
  password_hash: string;
  updated_by: number | null;
  updated_at: string | null;
};

const DEFAULT_PUBLIC_PASSWORD = "public";

export async function getPublicSessionSettings() {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("public_session_settings")
    .select("id, password_hash, updated_by, updated_at")
    .eq("id", 1)
    .limit(1)
    .maybeSingle<PublicSessionSettings>();

  if (error) {
    throw new Error(`Gagal membaca password sesi publik: ${error.message}`);
  }

  return data;
}

export async function verifyPublicSessionPassword(password: string) {
  const settings = await getPublicSessionSettings();

  if (!settings?.password_hash) {
    return password === DEFAULT_PUBLIC_PASSWORD;
  }

  return bcrypt.compare(password, settings.password_hash);
}

export async function updatePublicSessionPassword({
  password,
  adminId,
}: {
  password: string;
  adminId: number;
}) {
  const supabase = getServerSupabaseClient();
  const passwordHash = await bcrypt.hash(password, 10);
  const updatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("public_session_settings")
    .upsert(
      {
        id: 1,
        password_hash: passwordHash,
        updated_by: adminId,
        updated_at: updatedAt,
      } as never,
      { onConflict: "id" }
    )
    .select("id, password_hash, updated_by, updated_at")
    .single<PublicSessionSettings>();

  if (error) {
    throw new Error(`Gagal menyimpan password sesi publik: ${error.message}`);
  }

  return data;
}
