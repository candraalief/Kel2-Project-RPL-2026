"use client";

import { useActionState } from "react";
import {
  submitPublicAttendance,
  type AttendanceState,
} from "@/app/actions/attendance";

const initialState: AttendanceState = {
  error: "",
  success: "",
};

export function PublicAttendanceForm() {
  const [state, formAction, pending] = useActionState(
    submitPublicAttendance,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field id="nama" label="Nama pengunjung" />
      <Field id="asal" label="Kelas / asal instansi" />
      <Field id="tujuan" label="Tujuan kunjungan" />

      {state?.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state?.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-full bg-[#6c3cff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#5a30db] disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Menyimpan..." : "Simpan absensi"}
      </button>
    </form>
  );
}

function Field({ id, label }: { id: string; label: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        required
        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-[#6c3cff]"
      />
    </div>
  );
}
