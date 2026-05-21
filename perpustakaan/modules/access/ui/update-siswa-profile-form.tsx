"use client";

import { useActionState, useState } from "react";
import {
  updateOwnSiswaProfile,
  type UpdateSiswaProfileState,
} from "@/app/actions/auth";
import type { SiswaRecord } from "@/modules/library/lib/data";

const initialState: UpdateSiswaProfileState = {
  error: "",
  success: "",
};

type SiswaProfileFields = {
  nama: string;
  username: string;
  email: string;
  kelas: string;
  tahunMasuk: string;
  nomorWhatsapp: string;
};

function getInitialFields(siswa: SiswaRecord): SiswaProfileFields {
  return {
    nama: siswa.nama,
    username: siswa.username ?? "",
    email: siswa.email ?? "",
    kelas: siswa.kelas ?? "",
    tahunMasuk: siswa.tahun_masuk?.toString() ?? "",
    nomorWhatsapp: siswa.nomor_whatsapp ?? "",
  };
}

export function UpdateSiswaProfileForm({ siswa }: { siswa: SiswaRecord }) {
  const [fields, setFields] = useState(() => getInitialFields(siswa));
  const [state, formAction, pending] = useActionState(async (
    prevState: UpdateSiswaProfileState | undefined,
    formData: FormData
  ) => {
    const nextState = await updateOwnSiswaProfile(prevState, formData);

    if (nextState.profile) {
      setFields(nextState.profile);
    }

    return nextState;
  }, initialState);

  function updateField(field: keyof SiswaProfileFields, value: string) {
    setFields((currentFields) => ({
      ...currentFields,
      [field]: value,
    }));
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nama lengkap"
          name="nama"
          value={fields.nama}
          onChange={(value) => updateField("nama", value)}
          placeholder="Masukkan nama lengkap"
          disabled
        />
        <Field
          label="Username"
          name="username"
          value={fields.username}
          onChange={(value) => updateField("username", value)}
          placeholder="Masukkan username"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={fields.email}
          onChange={(value) => updateField("email", value)}
          placeholder="Masukkan email"
        />
        <Field
          label="Kelas"
          name="kelas"
          value={fields.kelas}
          onChange={(value) => updateField("kelas", value)}
          placeholder="Masukkan kelas resmi"
        />
        <Field
          label="Tahun masuk"
          name="tahun_masuk"
          type="number"
          value={fields.tahunMasuk}
          onChange={(value) => updateField("tahunMasuk", value)}
          placeholder="Masukkan tahun masuk"
          disabled
        />
        <Field
          label="Nomor WhatsApp"
          name="nomor_whatsapp"
          value={fields.nomorWhatsapp}
          onChange={(value) => updateField("nomorWhatsapp", value)}
          placeholder="Masukkan nomor WhatsApp aktif"
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
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
};

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
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
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition focus:border-[#145da0] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      />
    </div>
  );
}
