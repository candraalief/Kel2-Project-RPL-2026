"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logoutUser, type LogoutState } from "@/app/actions/auth";
import type { UserRole } from "@/modules/access/lib/session";
import { PasswordInput } from "./password-input";

const initialState: LogoutState = {
  error: "",
};

export function LogoutForm({ role }: { role: UserRole }) {
  const [confirming, setConfirming] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [state, formAction, pending] = useActionState(logoutUser, initialState);
  const timeoutRef = useRef<number | null>(null);
  const publicPasswordRef = useRef<HTMLInputElement>(null);
  const isPublic = role === "public";

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!publicMenuOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      publicPasswordRef.current?.focus();
    }, 50);

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setPublicMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [pending, publicMenuOpen]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (confirming) {
      return;
    }

    event.preventDefault();
    setConfirming(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setConfirming(false);
      timeoutRef.current = null;
    }, 500);
  }

  if (isPublic) {
    if (!publicMenuOpen) {
      return (
        <button
          type="button"
          onClick={() => setPublicMenuOpen(true)}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#0e53b7] transition hover:bg-[#f5f9ff]"
        >
          Keluar
        </button>
      );
    }

    return (
      <form action={formAction} className="space-y-3">
        <PasswordInput
          id="logout_public_password"
          name="public_password"
          label="Password publik"
          required
          placeholder="Password untuk keluar"
          className="space-y-1"
          labelClassName="text-sm font-semibold text-white"
          inputClassName="min-h-[58px] w-full rounded-xl border border-white/40 bg-white px-4 py-3 pr-12 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-white focus:ring-2 focus:ring-white/30"
          inputRef={publicPasswordRef}
        />
        {state?.error ? (
          <p className="break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#0e53b7] transition hover:bg-[#f5f9ff] disabled:cursor-not-allowed disabled:bg-white/70"
        >
          {pending ? "Memverifikasi..." : "Keluar"}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="relative space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#0e53b7] transition hover:bg-[#f5f9ff] disabled:cursor-not-allowed disabled:bg-white/70"
      >
        {pending ? "Memverifikasi..." : "Keluar"}
      </button>
      {state?.error ? (
        <p className="break-words rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700">
          {state.error}
        </p>
      ) : null}
      {confirming ? (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/40 bg-white px-2 py-1 text-[10px] font-semibold text-[#0e53b7] shadow"
        >
          Ketuk 2 kali untuk keluar
        </span>
      ) : null}
    </form>
  );
}
