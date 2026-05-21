"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  changePublicSessionPassword,
  type PublicSessionPasswordState,
} from "@/app/actions/auth";
import { PasswordInput } from "./password-input";

const initialState: PublicSessionPasswordState = {
  error: "",
  success: "",
};

function formatUpdatedAt(value: string | null | undefined) {
  if (!value) {
    return "Belum pernah diubah";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function PublicSessionPasswordForm({
  updatedAt,
}: {
  updatedAt?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    changePublicSessionPassword,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        Terakhir diubah:{" "}
        <span className="font-semibold text-zinc-900">
          {formatUpdatedAt(updatedAt)}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PasswordInput
          id="new_public_password"
          label="Password publik baru"
          required
          minLength={6}
          placeholder="Minimal 6 karakter"
          inputClassName="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 pr-12 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
        />
        <PasswordInput
          id="confirm_public_password"
          label="Konfirmasi password"
          required
          minLength={6}
          placeholder="Ulangi password publik"
          inputClassName="min-h-[44px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 pr-12 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
        />
      </div>

      {state.error ? (
        <p className="break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="break-words rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#2f7eea] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d66d6] disabled:cursor-not-allowed disabled:bg-zinc-400 sm:w-auto"
      >
        {pending ? "Menyimpan..." : "Simpan Password Publik"}
      </button>
    </form>
  );
}
