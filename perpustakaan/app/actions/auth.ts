"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import {
  findSessionUserByCredentials,
  findSiswaAccountByIdentifier,
} from "@/modules/access/lib/database-auth";
import {
  registerSiswaAccount,
  type SignupState,
} from "@/modules/access/lib/student-registration";
import {
  clearSession,
  createSession,
  getSessionUser,
  type UserRole,
} from "@/modules/access/lib/session";

export type LoginState = {
  error: string;
};

export type SignupFormState = SignupState;
export type PasswordResetState = {
  error: string;
  success: string;
};
export type UpdateSiswaProfileState = {
  error: string;
  success: string;
};

function redirectByRole(role: UserRole) {
  if (role === "admin") {
    redirect("/admin");
  }

  if (role === "siswa") {
    redirect("/siswa");
  }

  redirect("/public");
}

export async function loginFromHome(
  _prevState: LoginState | undefined,
  formData: FormData
) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return {
      error: "Nama, username, atau email dan password wajib diisi.",
    };
  }

  let sessionUser;

  try {
    sessionUser = await findSessionUserByCredentials(identifier, password);

    if (!sessionUser) {
      return {
        error: "Login gagal. Periksa kembali identifier dan password.",
      };
    }

    await createSession(sessionUser);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat login.";

    if (message.includes("Missing Supabase server credentials")) {
      return {
        error:
          "Konfigurasi Supabase server belum siap. Pastikan .env.local berisi SUPABASE_SECRET_KEY yang aktif, lalu restart dev server.",
      };
    }

    if (process.env.NODE_ENV !== "production") {
      return {
        error: message.startsWith("Failed")
          ? `Supabase login error: ${message}`
          : message,
      };
    }

    return {
      error: "Login gagal. Periksa konfigurasi server dan kredensial database.",
    };
  }

  redirectByRole(sessionUser.role);
}

export async function signupSiswa(
  _prevState: SignupFormState | undefined,
  formData: FormData
) {
  try {
    const state = await registerSiswaAccount(formData);
    revalidatePath("/admin");
    return state;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat mendaftar.";

    return {
      error: message,
      success: "",
    };
  }
}

export async function approveSiswaRegistration(siswaId: number) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("siswa")
    .update({ status_keanggotaan: "aktif" } as never)
    .eq("id_siswa", siswaId);

  if (error) {
    throw new Error(`Failed to approve siswa: ${error.message}`);
  }

  revalidatePath("/admin");
}

export async function updateSiswaPassword(siswaId: number, formData: FormData) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const newPassword = String(formData.get("new_password") ?? "");

  if (newPassword.length < 8) {
    throw new Error("Password baru minimal 8 karakter.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("siswa")
    .update({ password: passwordHash } as never)
    .eq("id_siswa", siswaId);

  if (error) {
    throw new Error(`Failed to update siswa password: ${error.message}`);
  }

  revalidatePath("/admin");
}

export async function clearSiswaPassword(siswaId: number) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("siswa")
    .update({ password: null } as never)
    .eq("id_siswa", siswaId);

  if (error) {
    throw new Error(`Failed to clear siswa password: ${error.message}`);
  }

  revalidatePath("/admin/anggota");
}

export async function resetSiswaPassword(
  _prevState: PasswordResetState | undefined,
  formData: FormData
) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!identifier || !newPassword || !confirmPassword) {
    return {
      error: "Identifier, password baru, dan konfirmasi password wajib diisi.",
      success: "",
    };
  }

  if (newPassword.length < 8) {
    return {
      error: "Password baru minimal 8 karakter.",
      success: "",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: "Konfirmasi password baru belum sama.",
      success: "",
    };
  }

  try {
    const siswa = await findSiswaAccountByIdentifier(identifier);

    if (!siswa) {
      return {
        error: "Akun siswa tidak ditemukan.",
        success: "",
      };
    }

    if (siswa.status_keanggotaan !== "aktif") {
      return {
        error:
          "Akun siswa belum aktif. Hubungi admin perpustakaan untuk verifikasi akun.",
        success: "",
      };
    }

    if (siswa.password) {
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        siswa.password
      );

      if (!currentPassword || !isCurrentPasswordValid) {
        return {
          error:
            "Password lama wajib benar. Jika lupa, minta admin perpustakaan mengosongkan password akunmu terlebih dahulu.",
          success: "",
        };
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const supabase = getServerSupabaseClient();

    const { error } = await supabase
      .from("siswa")
      .update({ password: passwordHash } as never)
      .eq("id_siswa", siswa.id_siswa);

    if (error) {
      throw new Error(`Failed to reset siswa password: ${error.message}`);
    }

    return {
      error: "",
      success:
        "Password berhasil diperbarui. Silakan kembali ke halaman login dan masuk dengan password baru.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memperbarui password.";

    return {
      error: message,
      success: "",
    };
  }
}

export async function updateOwnSiswaProfile(
  _prevState: UpdateSiswaProfileState | undefined,
  formData: FormData
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || sessionUser.role !== "siswa") {
    return {
      error: "Sesi siswa tidak ditemukan.",
      success: "",
    };
  }

  const nama = String(formData.get("nama") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const kelas = String(formData.get("kelas") ?? "").trim();
  const tahunMasuk = String(formData.get("tahun_masuk") ?? "").trim();
  const nomorWhatsapp = String(formData.get("nomor_whatsapp") ?? "").trim();

  if (!nama || !username || !email || !kelas || !tahunMasuk || !nomorWhatsapp) {
    return {
      error: "Semua data profil wajib diisi.",
      success: "",
    };
  }

  const supabase = getServerSupabaseClient();

  const [usernameCheck, emailCheck] = await Promise.all([
    supabase
      .from("siswa")
      .select("id_siswa")
      .eq("username", username)
      .neq("id_siswa", sessionUser.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("siswa")
      .select("id_siswa")
      .eq("email", email)
      .neq("id_siswa", sessionUser.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (usernameCheck.error) {
    return {
      error: `Gagal memvalidasi username: ${usernameCheck.error.message}`,
      success: "",
    };
  }

  if (emailCheck.error) {
    return {
      error: `Gagal memvalidasi email: ${emailCheck.error.message}`,
      success: "",
    };
  }

  if (usernameCheck.data) {
    return {
      error: "Username sudah digunakan oleh akun siswa lain.",
      success: "",
    };
  }

  if (emailCheck.data) {
    return {
      error: "Email sudah digunakan oleh akun siswa lain.",
      success: "",
    };
  }

  const { error } = await supabase
    .from("siswa")
    .update({
      nama,
      username,
      email,
      kelas,
      tahun_masuk: Number(tahunMasuk),
      nomor_whatsapp: nomorWhatsapp,
    } as never)
    .eq("id_siswa", sessionUser.id);

  if (error) {
    return {
      error: `Gagal memperbarui profil siswa: ${error.message}`,
      success: "",
    };
  }

  await createSession({
    ...sessionUser,
    name: nama,
    identifier: username || email || nama,
    className: kelas,
  });

  revalidatePath("/siswa");
  revalidatePath("/siswa/profil");

  return {
    error: "",
    success: "Profil siswa berhasil diperbarui.",
  };
}

export async function loginAsPublic() {
  await createSession({
    id: 0,
    role: "public",
    name: "Monitor Publik",
    identifier: "public",
  });

  redirect("/public");
}

export async function logoutUser() {
  await clearSession();
  redirect("/");
}
