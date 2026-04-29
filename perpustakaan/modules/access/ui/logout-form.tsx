"use client";

import { useEffect, useRef, useState } from "react";
import { logoutUser } from "@/app/actions/auth";

export function LogoutForm() {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  return (
    <form action={logoutUser} onSubmit={handleSubmit} className="relative">
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 bg-white px-4 py-2 text-sm font-semibold text-[#0e53b7] transition hover:bg-[#f5f9ff]"
      >
        Keluar
      </button>
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

