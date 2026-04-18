"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  resetSiswaPassword,
  type PasswordResetState,
} from "@/app/actions/auth";

const initialState: PasswordResetState = {
  error: "",
  success: "",
};

export function ResetSiswaPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetSiswaPassword,
    initialState
  );

  return (
    <div className="w-full max-w-2xl rounded-[1.75rem] border border-white/85 bg-white/95 p-6 shadow-[0_20px_80px_rgba(35,40,52,0.16)] backdrop-blur sm:p-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#145da0]">
          BANTUAN AKUN SISWA
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Atur ulang kata sandi
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          Hubungi admin perpustakaan untuk mengganti password jika kamu sudah
          tidak ingat password lama. Jika admin sudah mengosongkan password
          akunmu, kamu bisa langsung mengisi password baru di bawah tanpa
          memasukkan password lama.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-[#d7e7f6] bg-[#f5faff] p-4 text-sm leading-6 text-zinc-700">
        <p className="font-medium text-zinc-900">Cara pakai halaman ini:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Jika masih ingat password lama, isi password lama lalu buat password baru.</li>
          <li>Jika lupa password, minta admin perpustakaan mengosongkan password akunmu.</li>
          <li>Setelah password berhasil diganti, masuk kembali dari halaman login utama.</li>
        </ul>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="text-sm font-medium text-zinc-800"
          >
            Username / nama lengkap / email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            placeholder="Contoh : candraprasetyo"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="current_password"
            className="text-sm font-medium text-zinc-800"
          >
            Password lama
          </label>
          <input
            id="current_password"
            name="current_password"
            type="password"
            placeholder="Kosongkan jika admin sudah mereset password akunmu"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="new_password"
              className="text-sm font-medium text-zinc-800"
            >
              Password baru
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              minLength={8}
              required
              placeholder="Minimal 8 karakter"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-[#145da0]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm_password"
              className="text-sm font-medium text-zinc-800"
            >
              Konfirmasi password baru
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={8}
              required
              placeholder="Ulangi password baru"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-[#145da0]"
            />
          </div>
        </div>

        {state.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.success}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md bg-[#145da0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0f4f8a] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Menyimpan..." : "Simpan password baru"}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Kembali ke login
          </Link>
        </div>
      </form>
    </div>
  );
}
