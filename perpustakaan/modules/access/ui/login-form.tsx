"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  loginAsPublic,
  loginFromHome,
  type LoginState,
  type PublicSessionPasswordState,
} from "@/app/actions/auth";
import { PasswordInput } from "@/modules/access/ui/password-input";

type LoginFormProps = {
  title: string;
  description: string;
};

const initialState: LoginState = {
  error: "",
};

const initialPublicState: PublicSessionPasswordState = {
  error: "",
  success: "",
};

export function LoginForm({ title, description }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginFromHome, initialState);
  const [publicState, publicAction, publicPending] = useActionState(
    loginAsPublic,
    initialPublicState
  );
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const publicPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!publicModalOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      publicPasswordRef.current?.focus();
    }, 50);

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !publicPending) {
        setPublicModalOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [publicModalOpen, publicPending]);

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_20px_80px_rgba(35,40,52,0.18)] backdrop-blur sm:p-5">
      {pending || publicPending ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[1.75rem] bg-white/92 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d6e7f8] border-t-[#145da0]" />
          <p className="mt-4 text-sm font-medium text-[#145da0]">
            Menyiapkan halaman...
          </p>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#145da0]">
          PORTAL PERPUSTAKAAN
        </p>
        <h1 className="text-[1.6rem] font-semibold tracking-tight text-zinc-950 sm:text-[1.85rem]">
          {title}
        </h1>
        <p className="text-sm leading-5 text-zinc-600 sm:text-[0.95rem]">
          {description}
        </p>
      </div>

      <form action={formAction} className="mt-3.5 space-y-3">
        <div className="space-y-1">
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
          className="min-h-[44px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
        </div>

        <div className="space-y-1">
          <PasswordInput
            id="password"
            label="Kata sandi"
            required
            placeholder="Masukkan kata sandi"
            className="space-y-1"
            inputClassName="min-h-[44px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
          <div className="flex justify-end">
            <Link
              href="/lupa-password"
              className="text-sm font-medium text-[#145da0] transition hover:text-[#0f4f8a]"
            >
              Lupa password?
            </Link>
          </div>
        </div>

        {state?.error ? (
          <p className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-[#145da0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0f4f8a] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {pending ? "Memverifikasi..." : "Masuk"}
        </button>
      </form>

      <div className="mt-3 space-y-2.5 border-t border-zinc-200 pt-3">
        <Link
          href="/signup"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-[#145da0] px-4 py-2.5 text-sm font-medium text-[#145da0] transition hover:bg-[#f3f8ff]"
        >
          Daftar sebagai siswa
        </Link>

        <button
          type="button"
          onClick={() => setPublicModalOpen(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Masuk sebagai publik
        </button>
      </div>

      {publicModalOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (!publicPending) {
              setPublicModalOpen(false);
            }
          }}
        >
          <section
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#145da0]">
                  Mode Publik
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  Masukkan password
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Mode ini khusus untuk komputer perpustakaan. Buat akun siswa
                  untuk mengakses aplikasi dari perangkat pribadi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublicModalOpen(false)}
                disabled={publicPending}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Tutup modal password publik"
              >
                x
              </button>
            </div>

            <form action={publicAction} className="mt-4 space-y-3">
              <PasswordInput
                id="public_password"
                label="Password mode publik"
                required
                placeholder="Masukkan password publik"
                className="space-y-1"
                inputClassName="min-h-[44px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
                inputRef={publicPasswordRef}
              />
              {publicState?.error ? (
                <p className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {publicState.error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={publicPending}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-[#145da0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0f4f8a] disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {publicPending ? "Memverifikasi..." : "Masuk ke Publik"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
