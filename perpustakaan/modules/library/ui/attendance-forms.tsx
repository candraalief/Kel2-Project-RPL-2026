"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  submitPublicAttendance,
  submitSiswaAttendance,
  type AttendanceState,
} from "@/app/actions/attendance";
import type { StudentSuggestion } from "@/modules/library/lib/data";

const initialState: AttendanceState = {
  error: "",
  success: "",
};

const visitorTypes = ["siswa", "umum"] as const;
type VisitorType = (typeof visitorTypes)[number];

function canCheckStudentSuggestions(name: string, debouncedName: string) {
  const trimmedName = name.trim().toLowerCase();
  const trimmedDebouncedName = debouncedName.trim().toLowerCase();

  return (
    /\s/.test(name) ||
    (trimmedDebouncedName.length >= 5 && trimmedDebouncedName === trimmedName)
  );
}

function normalizeStudentName(name: string) {
  return name.trim().toLowerCase();
}

export function PublicAttendanceForm({
  studentNameSuggestions,
}: {
  studentNameSuggestions: StudentSuggestion[];
}) {
  const [visitorType, setVisitorType] = useState<VisitorType | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [debouncedNameInput, setDebouncedNameInput] = useState("");
  const [kelasInput, setKelasInput] = useState("");
  const [tujuanInput, setTujuanInput] = useState("");
  const [hideSuccessNotice, setHideSuccessNotice] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitPublicAttendance,
    initialState
  );
  const wasPendingRef = useRef(false);

  function resetFormFields() {
    setVisitorType(null);
    setSelectedStudentId(null);
    setNameInput("");
    setDebouncedNameInput("");
    setKelasInput("");
    setTujuanInput("");
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedNameInput(nameInput);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [nameInput]);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current) {
      const timeoutId = window.setTimeout(() => {
        if (state?.success) {
          resetFormFields();
          setHideSuccessNotice(false);
        }
      }, 0);

      wasPendingRef.current = false;

      return () => window.clearTimeout(timeoutId);
    }
  }, [pending, state?.success]);

  const studentLookupByName = useMemo(() => {
    const map = new Map<string, StudentSuggestion>();

    studentNameSuggestions.forEach((student) => {
      const key = normalizeStudentName(student.nama);

      if (!map.has(key)) {
        map.set(key, student);
      }
    });

    return map;
  }, [studentNameSuggestions]);

  const wordBasedSuggestions = useMemo(() => {
    if (visitorType !== "siswa") {
      return [];
    }

    if (!canCheckStudentSuggestions(nameInput, debouncedNameInput)) {
      return [];
    }

    const queryWords = nameInput
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    if (queryWords.length === 0) {
      return [];
    }

    return studentNameSuggestions
      .filter((student) => {
        const nameWords = student.nama
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);

        return queryWords.every((queryWord) =>
          nameWords.some((nameWord) => nameWord.startsWith(queryWord))
        );
      })
      .slice(0, 8);
  }, [debouncedNameInput, nameInput, studentNameSuggestions, visitorType]);

  const suggestionCheckReady = useMemo(() => {
    if (visitorType !== "siswa") {
      return false;
    }

    return canCheckStudentSuggestions(nameInput, debouncedNameInput);
  }, [debouncedNameInput, nameInput, visitorType]);

  const asalLabel = useMemo(() => {
    if (visitorType === "siswa") {
      return "Kelas";
    }

    if (visitorType === "umum") {
      return "Asal instansi";
    }

    return "Kelas / Asal instansi";
  }, [visitorType]);

  const asalPlaceholder = useMemo(() => {
    if (visitorType === "siswa") {
      return "Kelas terisi otomatis dari database";
    }

    if (visitorType === "umum") {
      return "Contoh: SMPN 7 Bogor";
    }

    return "Pilih jenis pengunjung terlebih dahulu";
  }, [visitorType]);

  const formLocked = visitorType === null;

  function handleVisitorTypeChange(nextType: VisitorType) {
    setHideSuccessNotice(true);
    setVisitorType(nextType);
    setSelectedStudentId(null);
    setNameInput("");
    setDebouncedNameInput("");
    setKelasInput("");
    setTujuanInput("");
  }

  function handleNameChange(value: string) {
    setNameInput(value);

    if (visitorType !== "siswa") {
      return;
    }

    const matched = studentLookupByName.get(normalizeStudentName(value));

    if (matched) {
      setSelectedStudentId(matched.id_siswa);
      setKelasInput(matched.kelas ?? "-");
      return;
    }

    setSelectedStudentId(null);
    setKelasInput("");
  }

  const siswaSelectionIncomplete =
    visitorType === "siswa" && (selectedStudentId === null || !kelasInput);

  const shouldShowSuggestions =
    visitorType === "siswa" &&
    selectedStudentId === null &&
    wordBasedSuggestions.length > 0;

  const showNotRegisteredWarning =
    visitorType === "siswa" &&
    selectedStudentId === null &&
    suggestionCheckReady &&
    nameInput.trim().length > 0 &&
    wordBasedSuggestions.length === 0;

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-800">
          Jenis pengunjung <span className="text-red-500">*</span>
        </p>
        <input type="hidden" name="jenis_pengunjung" value={visitorType ?? ""} />
        <div className="inline-flex rounded-xl border border-zinc-300 bg-white p-1">
          {visitorTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleVisitorTypeChange(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                visitorType === type
                  ? "bg-[#1d66d6] text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              aria-pressed={visitorType === type}
            >
              {type === "siswa" ? "Siswa SMAN 10" : "Umum"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="nama" className="text-sm font-medium text-zinc-800">
          Nama pengunjung <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="nama"
            name="nama"
            required
            placeholder="Nama lengkap"
            disabled={formLocked}
            value={nameInput}
            autoComplete="off"
            onChange={(event) => handleNameChange(event.currentTarget.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
          />

          {shouldShowSuggestions ? (
            <div className="absolute z-10 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
              {wordBasedSuggestions.map((student) => (
                <button
                  key={student.id_siswa}
                  type="button"
                  onClick={() => {
                    setNameInput(student.nama);
                    setSelectedStudentId(student.id_siswa);
                    setKelasInput(student.kelas ?? "-");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
                >
                  <span>{student.nama}</span>
                  <span className="text-xs text-zinc-500">{student.kelas ?? "-"}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {visitorType === "siswa" ? (
        <input type="hidden" name="id_siswa" value={selectedStudentId ?? ""} />
      ) : null}

      <Field
        id="asal"
        label={asalLabel}
        placeholder={asalPlaceholder}
        required
        disabled={formLocked}
        value={kelasInput}
        onChange={visitorType === "umum" ? setKelasInput : undefined}
        readOnly={visitorType === "siswa"}
      />

      <Field
        id="tujuan"
        label="Tujuan kunjungan"
        placeholder="Meminjam buku"
        required
        disabled={formLocked}
        value={tujuanInput}
        onChange={setTujuanInput}
      />

      {formLocked ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Pilih jenis pengunjung terlebih dahulu untuk mengisi form.
        </p>
      ) : null}

      {siswaSelectionIncomplete && !showNotRegisteredWarning ? (
        <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <p>
            Siswa belum terdaftar? Daftar melalui{" "}
            <Link href="/signup" className="font-semibold text-[#1d66d6] underline">
              halaman pendaftaran
            </Link>{" "}
            lalu minta pustakawan untuk menyetujuinya.
          </p>
        </div>
      ) : null}

      {showNotRegisteredWarning ? (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>Nama siswa belum terdaftar di sistem.</p>
          <p>
            Daftar melalui{" "}
            <Link href="/signup" className="font-semibold text-[#1d66d6] underline">
              halaman pendaftaran
            </Link>{" "}
            lalu minta pustakawan untuk menyetujuinya.
          </p>
        </div>
      ) : null}

      {state?.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state?.success && !hideSuccessNotice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      {pending ? (
        <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-600" />
          Menyimpan absensi, mohon tunggu...
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || formLocked || siswaSelectionIncomplete}
        className="inline-flex min-w-44 items-center justify-center rounded-xl bg-[#1d66d6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1553b2] disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Menyimpan..." : "Simpan absensi"}
      </button>
    </form>
  );
}

export function SiswaAttendanceForm({
  userName,
  className,
}: {
  userName: string;
  className: string | null;
}) {
  const [tujuanInput, setTujuanInput] = useState("Kunjungan perpustakaan siswa");
  const [hideSuccessNotice, setHideSuccessNotice] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitSiswaAttendance,
    initialState
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current) {
      const timeoutId = window.setTimeout(() => {
        if (state?.success) {
          setTujuanInput("Kunjungan perpustakaan siswa");
          setHideSuccessNotice(false);
        }
      }, 0);

      wasPendingRef.current = false;

      return () => window.clearTimeout(timeoutId);
    }
  }, [pending, state?.success]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
        <p>Nama: {userName}</p>
        <p>Kelas: {className ?? "-"}</p>
      </div>

      <Field
        id="tujuan"
        label="Tujuan kunjungan"
        placeholder="Kunjungan perpustakaan siswa"
        required
        value={tujuanInput}
        onChange={(value) => {
          setHideSuccessNotice(true);
          setTujuanInput(value);
        }}
      />

      {state?.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state?.success && !hideSuccessNotice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      {pending ? (
        <div className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-600" />
          Menyimpan absensi, mohon tunggu...
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-w-44 items-center justify-center rounded-xl bg-[#1d66d6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1553b2] disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {pending ? "Menyimpan..." : "Catat absensi saya"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  placeholder,
  required,
  disabled,
  value,
  onChange,
  readOnly,
}: {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        id={id}
        name={id}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.currentTarget.value)}
        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#1d66d6] read-only:cursor-not-allowed read-only:bg-zinc-100 read-only:text-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      />
    </div>
  );
}
