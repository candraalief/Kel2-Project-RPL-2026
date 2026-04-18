"use client";

import { useActionState } from "react";
import {
  updateOwnSiswaProfile,
  type UpdateSiswaProfileState,
} from "@/app/actions/auth";
import type { SiswaRecord } from "@/modules/library/lib/data";

const initialState: UpdateSiswaProfileState = {
  error: "",
  success: "",
};

export function UpdateSiswaProfileForm({ siswa }: { siswa: SiswaRecord }) {
  const [state, formAction, pending] = useActionState(
    updateOwnSiswaProfile,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nama lengkap"
          name="nama"
          defaultValue={siswa.nama}
          placeholder="Masukkan nama lengkap"
        />
        <Field
          label="Username"
          name="username"
          defaultValue={siswa.username ?? ""}
          placeholder="Masukkan username"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={siswa.email ?? ""}
          placeholder="Masukkan email"
        />
        <Field
          label="Kelas"
          name="kelas"
          defaultValue={siswa.kelas ?? ""}
          placeholder="Contoh: XII IPA 2"
        />
        <Field
          label="Tahun masuk"
          name="tahun_masuk"
          type="number"
          defaultValue={siswa.tahun_masuk?.toString() ?? ""}
          placeholder="Contoh: 2024"
        />
        <Field
          label="Nomor WhatsApp"
          name="nomor_whatsapp"
          defaultValue={siswa.nomor_whatsapp ?? ""}
          placeholder="08xxxxxxxxxx"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <p>NISN: {siswa.nisn ?? "-"}</p>
        <p>Status keanggotaan: {siswa.status_keanggotaan ?? "-"}</p>
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

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-[#145da0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0f4f8a] disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Menyimpan..." : "Simpan profil"}
      </button>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  type?: string;
};

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: FieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
      />
    </div>
  );
}
