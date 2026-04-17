"use client";

import Link from "next/link";
import { useActionState } from "react";
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

  return (
    <div className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/95 p-6 shadow-[0_20px_80px_rgba(35,40,52,0.18)] backdrop-blur">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#145da0]">
          Portal Perpustakaan
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          {title}
        </h1>
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="text-sm font-medium text-zinc-800"
          >
            Nama / Username / Email
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-800"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-950 outline-none transition focus:border-[#145da0]"
          />
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

      <div className="mt-5 space-y-3 border-t border-zinc-200 pt-4">
        <Link
          href="/signup"
          className="inline-flex w-full items-center justify-center rounded-md border border-[#145da0] px-4 py-2.5 text-sm font-medium text-[#145da0] transition hover:bg-[#f3f8ff]"
        >
          Daftar sebagai siswa
        </Link>

        <form action={loginAsPublic}>
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
