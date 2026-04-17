"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/modules/access/lib/session";

export type AttendanceState = {
  error: string;
  success: string;
};

export async function submitPublicAttendance(
  _prevState: AttendanceState | undefined,
  formData: FormData
) {
  const nama = String(formData.get("nama") ?? "").trim();
  const asal = String(formData.get("asal") ?? "").trim();
  const tujuan = String(formData.get("tujuan") ?? "").trim();

  if (!nama || !asal || !tujuan) {
    return { error: "Semua field absensi publik wajib diisi.", success: "" };
  }

  const supabase = getServerSupabaseClient();
  const insertAbsensi = await supabase
    .from("absensi")
    .insert({
      nama,
      tujuan,
      jenis_pengunjung: "umum",
    } as never)
    .select("id_absensi")
    .single<{ id_absensi: number }>();

  if (insertAbsensi.error) {
    return {
      error: `Gagal menyimpan absensi publik: ${insertAbsensi.error.message}`,
      success: "",
    };
  }

  const insertUmum = await supabase.from("absensi_umum").insert({
    id_absensi: insertAbsensi.data.id_absensi,
    instansi_asal: asal,
  } as never);

  if (insertUmum.error) {
    return {
      error: `Gagal menyimpan instansi asal: ${insertUmum.error.message}`,
      success: "",
    };
  }

  revalidatePath("/public");
  revalidatePath("/public/absensi");

  return { error: "", success: "Absensi pengunjung berhasil disimpan." };
}

export async function submitSiswaAttendance() {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "siswa") {
    throw new Error("Unauthorized");
  }

  const supabase = getServerSupabaseClient();
  const insertAbsensi = await supabase
    .from("absensi")
    .insert({
      nama: sessionUser.name,
      tujuan: "Kunjungan perpustakaan siswa",
      jenis_pengunjung: "siswa",
    } as never)
    .select("id_absensi")
    .single<{ id_absensi: number }>();

  if (insertAbsensi.error) {
    throw new Error(
      `Gagal menyimpan absensi siswa: ${insertAbsensi.error.message}`
    );
  }

  const insertSiswa = await supabase.from("absensi_siswa").insert({
    id_absensi: insertAbsensi.data.id_absensi,
    id_siswa: sessionUser.id,
    kelas_saat_absen: sessionUser.className ?? null,
  } as never);

  if (insertSiswa.error) {
    throw new Error(
      `Gagal menyimpan detail absensi siswa: ${insertSiswa.error.message}`
    );
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/absensi");
}
