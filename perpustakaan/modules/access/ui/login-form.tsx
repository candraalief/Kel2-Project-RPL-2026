"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import {
  loginAsPublic,
  loginFromHome,
  type LoginState,
} from "@/app/actions/auth";

type LoginFormProps = {
  title: string;
  description: string;
};

const initialState: LoginState = {
  error: "",
};

export function LoginForm({ title, description }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginFromHome, initialState);
  const [isPublicPending, startPublicTransition] = useTransition();

  return (
    <div className="relative w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_20px_80px_rgba(35,40,52,0.18)] backdrop-blur sm:p-5">
      {pending || isPublicPending ? (
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
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-800"
          >
            Kata sandi
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Masukkan kata sandi"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-[#145da0]"
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
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-md bg-[#145da0] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0f4f8a] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {pending ? "Memverifikasi..." : "Masuk"}
        </button>
      </form>

      <div className="mt-3 space-y-2.5 border-t border-zinc-200 pt-3">
        <Link
          href="/signup"
          className="inline-flex w-full items-center justify-center rounded-md border border-[#145da0] px-4 py-2.5 text-sm font-medium text-[#145da0] transition hover:bg-[#f3f8ff]"
        >
          Daftar sebagai siswa
        </Link>

        <form
          action={loginAsPublic}
          onSubmit={(event) => {
            event.preventDefault();
            startPublicTransition(async () => {
              await loginAsPublic();
            });
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Masuk sebagai publik
          </button>
        </form>
      </div>
    </div>
  );
}
