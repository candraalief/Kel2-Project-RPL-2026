"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase-server";
import { findSessionUserByCredentials } from "@/modules/access/lib/database-auth";
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
