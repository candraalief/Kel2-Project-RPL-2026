"use client";

import { useActionState } from "react";
import { signupSiswa, type SignupFormState } from "@/app/actions/auth";

const initialState: SignupFormState = {
  error: "",
  success: "",
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupSiswa, initialState);

  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/95 p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#145da0]">
          Registrasi Siswa
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Buat akun siswa baru
        </h2>
        <p className="text-sm leading-6 text-zinc-600">
          Akun baru akan berstatus <span className="font-medium">menunggu_verifikasi</span>
          {" "}sampai disetujui admin perpustakaan.
        </p>
      </div>

      <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
        <Field id="nama" label="Nama lengkap" />
        <Field id="nisn" label="NISN" />
        <Field id="username" label="Username" />
        <Field id="email" label="Email" type="email" />
        <Field id="kelas" label="Kelas" />
        <Field id="tahun_masuk" label="Tahun masuk" type="number" />
        <Field id="nomor_whatsapp" label="Nomor WhatsApp" />
        <Field id="password" label="Password" type="password" />

        <div className="md:col-span-2">
          {state?.error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          {state?.success ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {state.success}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#145da0] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0f4f8a] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "Mengirim pendaftaran..." : "Daftarkan akun siswa"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
}: {
  id: string;
  label: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        className="w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none transition focus:border-[#145da0]"
      />
    </div>
  );
}
